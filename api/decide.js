const STEP_CONFIG = {
  trigger: {
    goal: "Respond to what made the child uncomfortable. Validate the event without judging who is right or wrong.",
    transition: "Ask where the child's body feels most uncomfortable."
  },
  body: {
    goal: "Respond to the child's body sensation and connect it gently to emotional awareness.",
    transition: "Ask what thought or meaning came up when the event happened."
  },
  need: {
    goal: "Respond to the thought, belief, or meaning behind the emotion. Help the child name why the event felt upsetting.",
    transition: "Ask what part of the situation matters most or feels most stuck."
  },
  wish: {
    goal: "Respond to the deeper reason the child identifies. Help them feel understood before rating the current feeling.",
    transition: "Ask the child to rate how strong the feeling is now from 1 to 5."
  },
  scale: {
    goal: "Respond to the child's current intensity score after they have explored the reason.",
    transition: "Invite the child to move into GO and choose one small doable action."
  },
  action: {
    goal: "Support the child's chosen action and encourage one small doable step.",
    transition: "Ask the child to come back after finishing and report how they feel."
  },
  feedback: {
    goal: "Respond to how the child feels after the action. Affirm the attempt whether or not the feeling improved.",
    transition: "Close the practice gently or invite another support step if needed."
  }
};

function jsonError(res, status, error, detail) {
  return res.status(status).json({
    ok: false,
    error,
    detail: detail || null
  });
}

function cleanText(value, maxLength = 600) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getStepConfig(step) {
  return STEP_CONFIG[step] || STEP_CONFIG.trigger;
}

function normalizeBody(reqBody) {
  if (!reqBody) return {};
  if (typeof reqBody === "string") {
    try {
      return JSON.parse(reqBody);
    } catch (error) {
      return { __invalidJson: true };
    }
  }
  return reqBody;
}

function getInputText(body) {
  return cleanText(
    body?.input?.text ||
    body?.text ||
    body?.message ||
    body?.value ||
    body?.answer ||
    ""
  );
}

function buildMessages({ step, selectedEmotion, context, inputText }) {
  const stepConfig = getStepConfig(step);

  const developerPrompt = `
You are a child-safe emotional support companion for the Stop Decide Go flow.

Reply in Traditional Chinese for Taiwan, using short, warm, age-appropriate language.
You are not a therapist, doctor, teacher, or emergency responder.
You do not control the flow. The app controls the next screen.

Current step: ${step}
Step goal: ${stepConfig.goal}
Transition target: ${stepConfig.transition}

Rules:
1. Output JSON only.
2. Use Traditional Chinese in all user-facing fields.
3. Keep the total response under 3 short sentences.
4. First acknowledge the child's feeling, then support them, then transition to the next app step.
5. Do not blame, lecture, diagnose, or over-explain.
6. Do not add new choices or change the flow.
7. If the child mentions self-harm, wanting to disappear, wanting to die, or hurting someone else, set riskLevel to "high" and tell them to immediately find a trusted adult.
  `.trim();

  const userPrompt = `
Initial emotion: ${selectedEmotion || "unknown"}

Session context:
- trigger: ${context.trigger || "none"}
- body: ${context.body || "none"}
- need: ${context.need || "none"}
- wish: ${context.wish || "none"}
- scale: ${context.scale || "none"}
- action: ${context.action || "none"}
- feedback: ${context.feedback || "none"}

Child input for this step:
${inputText}
  `.trim();

  return [
    {
      role: "developer",
      content: [{ type: "input_text", text: developerPrompt }]
    },
    {
      role: "user",
      content: [{ type: "input_text", text: userPrompt }]
    }
  ];
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text) {
    return data.output_text;
  }

  const texts = [];
  for (const item of data.output || []) {
    if (!item || !item.content) continue;
    for (const part of item.content) {
      if (part.type === "output_text" && part.text) {
        texts.push(part.text);
      }
    }
  }

  return texts.join("\n").trim();
}

function parseResult(text) {
  const fallback = {
    acknowledgement: "謝謝你願意說出來。",
    supportiveLine: "我們可以慢慢整理，不需要急著一次解決。",
    transition: "接下來跟著畫面走下一步就好。",
    riskLevel: "low"
  };

  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text);
    return {
      acknowledgement: cleanText(parsed.acknowledgement, 180) || fallback.acknowledgement,
      supportiveLine: cleanText(parsed.supportiveLine, 180) || fallback.supportiveLine,
      transition: cleanText(parsed.transition, 180) || fallback.transition,
      riskLevel: ["low", "medium", "high"].includes(parsed.riskLevel) ? parsed.riskLevel : "low"
    };
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      return parseResult(match[0]);
    } catch (innerError) {
      return fallback;
    }
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return jsonError(res, 405, "Method not allowed");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return jsonError(res, 500, "OPENAI_API_KEY not configured");
  }

  const body = normalizeBody(req.body);
  if (body.__invalidJson) {
    return jsonError(res, 400, "Invalid JSON body");
  }

  const step = cleanText(body.step || "trigger", 40);
  const inputText = getInputText(body);

  if (!inputText) {
    return jsonError(res, 400, "Missing input text", {
      expected: "Send { step, input: { text } }",
      receivedKeys: Object.keys(body || {})
    });
  }

  const payload = {
    model,
    input: buildMessages({
      step,
      selectedEmotion: body.selectedEmotion,
      context: body.context || {},
      inputText
    }),
    text: {
      format: {
        type: "json_schema",
        name: "decide_guidance",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            acknowledgement: { type: "string" },
            supportiveLine: { type: "string" },
            transition: { type: "string" },
            riskLevel: { type: "string", enum: ["low", "medium", "high"] }
          },
          required: ["acknowledgement", "supportiveLine", "transition", "riskLevel"]
        },
        strict: true
      }
    }
  };

  let response;
  let data;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    data = await response.json();
  } catch (error) {
    return jsonError(res, 500, error.message || "OpenAI request failed");
  }

  if (!response.ok) {
    return jsonError(
      res,
      response.status,
      data?.error?.message || "OpenAI API error",
      data?.error || null
    );
  }

  return res.status(200).json({
    ok: true,
    result: parseResult(extractOutputText(data)),
    model,
    usage: data.usage || null
  });
}
