import { ensureSchema, getPool, jsonError } from "./_db.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function cleanText(value, max = 500) {
  return String(value || "").slice(0, max);
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return jsonError(res, 405, "Method not allowed");

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return jsonError(res, 400, "Invalid JSON body");
    }
  }

  const action = body && body.action;
  const sessionId = cleanText(body && body.sessionId, 120);

  if (!action || !sessionId) {
    return jsonError(res, 400, "Missing action or sessionId");
  }

  try {
    await ensureSchema();
    const db = getPool();

    if (action === "start") {
      await db.query(
        `
          insert into research_sessions (id, participant_id, user_agent, metadata)
          values ($1, $2, $3, $4)
          on conflict (id) do update set
            participant_id = coalesce(excluded.participant_id, research_sessions.participant_id),
            metadata = research_sessions.metadata || excluded.metadata
        `,
        [
          sessionId,
          cleanText(body.participantId, 120) || null,
          cleanText(req.headers["user-agent"], 500),
          body.metadata || {}
        ]
      );

      return res.status(200).json({ ok: true, sessionId });
    }

    if (action === "event") {
      await db.query(
        `
          insert into research_events (session_id, event_type, step, value, payload)
          values ($1, $2, $3, $4, $5)
        `,
        [
          sessionId,
          cleanText(body.eventType, 120) || "unknown",
          cleanText(body.step, 120) || null,
          cleanText(body.value, 1000) || null,
          body.payload || {}
        ]
      );

      return res.status(200).json({ ok: true });
    }

    if (action === "complete") {
      await db.query(
        `
          update research_sessions
          set completed_at = now(), metadata = metadata || $2
          where id = $1
        `,
        [sessionId, body.metadata || {}]
      );

      await db.query(
        `
          insert into research_events (session_id, event_type, step, value, payload)
          values ($1, 'session_complete', 'complete', null, $2)
        `,
        [sessionId, body.metadata || {}]
      );

      return res.status(200).json({ ok: true });
    }

    return jsonError(res, 400, "Unknown action");
  } catch (error) {
    return jsonError(res, 500, error.message || "Session API failed");
  }
}
