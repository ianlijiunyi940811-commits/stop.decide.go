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
    "受試者代碼",
    "開始時間",
    "完成時間",
    "完成狀態",
    "使用分鐘",
    "初始情緒",
    "呼吸後情緒",
    "是否改善",
    "衝突原因",
    "身體感受",
    "強度分數",
    "GO行動選擇",
    "完成後感覺",
    "AI回覆次數",
    "AI高風險次數",
    "完整AI陪伴紀錄",
    "完整流程紀錄"
  ];

  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push([
      row.participantLabel,
      row.startedAt,
      row.completedAt,
      row.completed ? "完成" : "進行中",
      row.durationMinutes,
      row.homeEmotion,
      row.postBreathingEmotion,
      row.emotionImproved,
      row.trigger,
      row.body,
      row.scale,
      row.action,
      row.feedback,
      row.aiReplyCount,
      row.highRiskCount,
      JSON.stringify(row.aiConversation || []),
      JSON.stringify(row.timeline || [])
    ].map(csvEscape).join(","));
  }

  return "\uFEFF" + lines.join("\n");
}

function emotionScore(value) {
  const map = {
    angry: 4,
    sad: 3,
    confused: 2,
    okay: 1,
    calm: 1,
    low: 2,
    medium: 3,
    high: 4
  };
  return map[String(value || "").toLowerCase()] || null;
}

function labelEmotion(value) {
  const labels = {
    angry: "很生氣",
    sad: "很難過",
    confused: "很混亂",
    okay: "還不錯",
    calm: "很平靜",
    low: "低",
    medium: "中",
    high: "高"
  };
  return labels[value] || value || "";
}

function labelStep(step) {
  const labels = {
    home: "初始情緒",
    breathing: "STOP 呼吸",
    post_breathing: "呼吸後情緒",
    emotion: "情緒確認",
    grounding: "STOP 接地",
    trigger: "DECIDE 衝突原因",
    body: "DECIDE 身體感受",
    scale: "DECIDE 強度分數",
    action: "GO 行動選擇",
    feedback: "GO 完成後感覺",
    complete: "完成"
  };
  return labels[step] || step || "";
}

function labelValue(step, value) {
  if (step === "home" || step === "post_breathing" || step === "emotion") {
    return labelEmotion(value);
  }
  if (step === "scale") return value ? `${value} 分` : "";
  return value || "";
}

function publicSessionId(index) {
  return `S${String(index + 1).padStart(3, "0")}`;
}

function safePayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  return payload;
}

function summarizeSession(session, events, index) {
  const summary = {
    id: session.id,
    participantId: session.participant_id || "",
    participantLabel: session.participant_id || publicSessionId(index),
    startedAt: session.started_at,
    completedAt: session.completed_at || "",
    completed: Boolean(session.completed_at),
    durationMinutes: "",
    eventCount: events.length,
    homeEmotion: "",
    postBreathingEmotion: "",
    emotionImproved: "資料不足",
    trigger: "",
    body: "",
    scale: "",
    action: "",
    feedback: "",
    aiReplyCount: 0,
    highRiskCount: 0,
    aiConversation: [],
    timeline: []
  };

  if (summary.startedAt && summary.completedAt) {
    const ms = new Date(summary.completedAt).getTime() - new Date(summary.startedAt).getTime();
    if (Number.isFinite(ms) && ms >= 0) summary.durationMinutes = Math.round(ms / 60000);
  }

  for (const event of events) {
    const payload = safePayload(event.payload);

    if (event.event_type === "emotion_selected" && event.step === "home") {
      summary.homeEmotion = labelEmotion(event.value);
    }
    if (event.event_type === "emotion_selected" && event.step === "post_breathing") {
      summary.postBreathingEmotion = labelEmotion(event.value);
    }
    if (event.event_type === "decide_answered") {
      if (event.step === "trigger") summary.trigger = event.value || "";
      if (event.step === "body") summary.body = event.value || "";
      if (event.step === "scale") summary.scale = event.value || "";
      if (event.step === "action") summary.action = event.value || "";
      if (event.step === "feedback") summary.feedback = event.value || "";
    }
    if (event.event_type === "ai_guidance") {
      summary.aiReplyCount += 1;
      if (String(event.value || "").toLowerCase() === "high") summary.highRiskCount += 1;
      summary.aiConversation.push({
        time: event.created_at,
        step: labelStep(event.step),
        risk: event.value || "",
        source: payload.source || "",
        acknowledgement: payload.acknowledgement || "",
        supportiveLine: payload.supportiveLine || "",
        transition: payload.transition || ""
      });
    }

    summary.timeline.push({
      time: event.created_at,
      type: event.event_type,
      step: labelStep(event.step),
      value: labelValue(event.step, event.value),
      rawValue: event.value || "",
      payload
    });
  }

  const before = emotionScore(events.find((e) => e.event_type === "emotion_selected" && e.step === "home")?.value);
  const after = emotionScore(events.find((e) => e.event_type === "emotion_selected" && e.step === "post_breathing")?.value);
  if (before && after) {
    summary.emotionImproved = after < before ? "有改善" : after === before ? "持平" : "變強";
  }

  return summary;
}

async function getFlowRows(db, limit = 500) {
  const sessions = await db.query(
    `
      select id, participant_id, started_at, completed_at, metadata
      from research_sessions
      order by started_at desc
      limit $1
    `,
    [limit]
  );

  if (!sessions.rows.length) return [];

  const ids = sessions.rows.map((row) => row.id);
  const events = await db.query(
    `
      select id, session_id, event_type, step, value, payload, created_at
      from research_events
      where session_id = any($1::text[])
      order by created_at asc
    `,
    [ids]
  );

  const grouped = new Map();
  for (const event of events.rows) {
    if (!grouped.has(event.session_id)) grouped.set(event.session_id, []);
    grouped.get(event.session_id).push(event);
  }

  return sessions.rows.map((session, index) => summarizeSession(session, grouped.get(session.id) || [], index));
}

function countBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key] || "未填答";
    map.set(value, (map.get(value) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hant"));
}

async function getSummary(db) {
  const rows = await getFlowRows(db, 200);
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const completed = rows.filter((row) => row.completed).length;
  const sessions7d = rows.filter((row) => now - new Date(row.startedAt).getTime() <= sevenDays).length;

  return {
    stats: {
      total_sessions: rows.length,
      completed_sessions: completed,
      sessions_7d: sessions7d,
      completion_rate: rows.length ? Math.round((completed / rows.length) * 100) : 0
    },
    recentSessions: rows.slice(0, 12),
    charts: {
      triggers: countBy(rows, "trigger").slice(0, 8),
      homeEmotions: countBy(rows, "homeEmotion").slice(0, 8),
      postBreathingEmotions: countBy(rows, "postBreathingEmotion").slice(0, 8),
      actions: countBy(rows, "action").slice(0, 8),
      emotionImprovement: countBy(rows, "emotionImproved")
    }
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

    if (view === "flows") {
      return res.status(200).json({ ok: true, data: await getFlowRows(db, 500) });
    }

    if (view === "flow") {
      const sessionId = String(req.query.sessionId || "");
      if (!sessionId) return jsonError(res, 400, "Missing sessionId");
      const rows = await getFlowRows(db, 500);
      const row = rows.find((item) => item.id === sessionId);
      return res.status(200).json({ ok: true, data: row || null });
    }

    if (view === "export") {
      const rows = await getFlowRows(db, 5000);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=stop-decide-go-flow-records.csv");
      return res.status(200).send(toCsv(rows));
    }

    return jsonError(res, 400, "Unknown view");
  } catch (error) {
    return jsonError(res, 500, error.message || "Admin API failed");
  }
}
