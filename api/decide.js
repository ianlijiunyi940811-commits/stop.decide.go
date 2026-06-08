const STEP_CONFIG = {
  trigger: {
    goal: "Respond to what made the child uncomfortable. Validate the event without judging who is right or wrong.",
    transition: "Ask where the child's body feels most uncomfortable."
  },
  body: {
    goal: "Respond to the child's body sensation and connect it gently to emotional awareness.",
    transition: "Ask what thought or meaning came up when the event happened."
  },
  scale: {
    goal: "Respond to the child's current intensity score after they have explored the reason.",
    transition: "Invite the child to move into GO and choose one small doable action."
  },
  need: {
    goal: "Respond to the thought, belief, or meaning behind the emotion. Help the child name why the event felt upsetting.",
    transition: "Ask what part of the situation matters most or feels most stuck."
  },
  wish: {
    goal: "Respond to the deeper reason the child identifies. Help them feel understood before rating the current feeling.",
    transition: "Ask the child to rate how strong the feeling is now from 1 to 5."
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

function getStepConfig(step) {
  return STEP_CONFIG[step] || STEP_CONFIG.trigger;
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
- scale: ${context.scale || "none"}
- need: ${context.need || "none"}
- wish: ${context.wish || "none"}
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
    acknowledgement: "謝謝你願意告訴我。",
    supportiveLine: "我們先一起慢慢整理，不用急。",
    transition: "我們看下一步。",
    riskLevel: "low"
  };

  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text);
    return {
      acknowledgement: parsed.acknowledgement || fallback.acknowledgement,
      supportiveLine: parsed.supportiveLine || fallback.supportiveLine,
      transition: parsed.transition || fallback.transition,
      riskLevel: parsed.riskLevel || "low"
    };
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    try {
      const parsed = JSON.parse(match[0]);
      return {
        acknowledgement: parsed.acknowledgement || fallback.acknowledgement,
        supportiveLine: parsed.supportiveLine || fallback.supportiveLine,
        transition: parsed.transition || fallback.transition,
        riskLevel: parsed.riskLevel || "low"
      };
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
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const step = body && body.step;
  const inputText = body && body.input && typeof body.input.text === "string"
    ? body.input.text.trim()
    : "";

  if (!step || !inputText) {
    return res.status(400).json({ error: "Missing step or input.text" });
  }

  const payload = {
    model,
    reasoning: { effort: "low" },
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
    return res.status(500).json({ error: error.message || "OpenAI request failed" });
  }

  if (!response.ok) {
    return res.status(response.status).json({
      error: (data && data.error && data.error.message) || "OpenAI API error"
    });
  }

  const result = parseResult(extractOutputText(data));

  return res.status(200).json({
    result,
    model,
    usage: data.usage || null
  });
}
