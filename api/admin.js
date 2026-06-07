import { ensureSchema, getPool, jsonError } from "./_db.js";

function setHeaders(res, contentType = "application/json; charset=utf-8") {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-password");
  res.setHeader("Content-Type", contentType);
}

function requireAdmin(req, res) {
  const expected = process.env.ADMIN_PASSWORD;
  const actual = req.headers["x-admin-password"];

  if (!expected) {
    jsonError(res, 500, "ADMIN_PASSWORD not configured");
    return false;
  }

  if (!actual || actual !== expected) {
    jsonError(res, 401, "Unauthorized");
    return false;
  }

  return true;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
  const headers = [
    "session_id",
    "participant_id",
    "started_at",
    "completed_at",
    "event_id",
    "event_type",
    "step",
    "value",
    "created_at",
    "payload"
  ];

  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push([
      row.session_id,
      row.participant_id,
      row.started_at,
      row.completed_at,
      row.event_id,
      row.event_type,
      row.step,
      row.value,
      row.created_at,
      JSON.stringify(row.payload || {})
    ].map(csvEscape).join(","));
  }

  return lines.join("\n");
}

async function getSummary(db) {
  const [sessionStats, eventStats, recentSessions, choiceStats] = await Promise.all([
    db.query(`
      select
        count(*)::int as total_sessions,
        count(completed_at)::int as completed_sessions,
        count(*) filter (where started_at >= now() - interval '7 days')::int as sessions_7d
      from research_sessions
    `),
    db.query(`
      select event_type, count(*)::int as count
      from research_events
      group by event_type
      order by count desc
    `),
    db.query(`
      select
        s.id,
        s.participant_id,
        s.started_at,
        s.completed_at,
        count(e.id)::int as event_count
      from research_sessions s
      left join research_events e on e.session_id = s.id
      group by s.id
      order by s.started_at desc
      limit 12
    `),
    db.query(`
      select step, value, count(*)::int as count
      from research_events
      where value is not null and value <> ''
      group by step, value
      order by count desc, step asc
      limit 20
    `)
  ]);

  return {
    stats: sessionStats.rows[0],
    events: eventStats.rows,
    recentSessions: recentSessions.rows,
    choices: choiceStats.rows
  };
}

export default async function handler(req, res) {
  setHeaders(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return jsonError(res, 405, "Method not allowed");
  if (!requireAdmin(req, res)) return;

  try {
    await ensureSchema();
    const db = getPool();
    const view = req.query.view || "summary";

    if (view === "summary") {
      return res.status(200).json({ ok: true, data: await getSummary(db) });
    }

    if (view === "sessions") {
      const result = await db.query(`
        select
          s.id,
          s.participant_id,
          s.started_at,
          s.completed_at,
          s.metadata,
          count(e.id)::int as event_count
        from research_sessions s
        left join research_events e on e.session_id = s.id
        group by s.id
        order by s.started_at desc
        limit 100
      `);

      return res.status(200).json({ ok: true, data: result.rows });
    }

    if (view === "events") {
      const sessionId = String(req.query.sessionId || "");
      if (!sessionId) return jsonError(res, 400, "Missing sessionId");

      const result = await db.query(
        `
          select id, session_id, event_type, step, value, payload, created_at
          from research_events
          where session_id = $1
          order by created_at asc
        `,
        [sessionId]
      );

      return res.status(200).json({ ok: true, data: result.rows });
    }

    if (view === "export") {
      const result = await db.query(`
        select
          s.id as session_id,
          s.participant_id,
          s.started_at,
          s.completed_at,
          e.id as event_id,
          e.event_type,
          e.step,
          e.value,
          e.created_at,
          e.payload
        from research_sessions s
        left join research_events e on e.session_id = s.id
        order by s.started_at desc, e.created_at asc
      `);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=stop-decide-go-research.csv");
      return res.status(200).send(toCsv(result.rows));
    }

    return jsonError(res, 400, "Unknown view");
  } catch (error) {
    return jsonError(res, 500, error.message || "Admin API failed");
  }
}
