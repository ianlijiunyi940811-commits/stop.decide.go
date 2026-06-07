const DECIDE_STEPS = {
  trigger: {
    goal: "回應孩子剛剛提到的不舒服原因，讓孩子感到被理解，並自然過渡到身體感受。",
    transitionTarget: "請帶到「你的身體哪裡最不舒服？」",
  },
  body: {
    goal: "回應孩子的身體不舒服感受，幫孩子覺察情緒和身體的連結，並自然過渡到量表問題。",
    transitionTarget: "請帶到「如果現在用 1 到 5 分來看，你覺得大概有幾分？」",
  },
  scale: {
    goal: "回應孩子目前的情緒強度，不把分數評價成好或不好，並自然過渡到下一步行動。",
    transitionTarget: "請帶到「你想先做哪一件事，讓自己舒服一點？」",
  },
  action: {
    goal: "支持孩子選擇一個可以開始的行動，強調先做一小步就很好，並過渡到完成後回報。",
    transitionTarget: "請帶到「做完後再回來告訴我，你現在感覺怎麼樣。」",
  },
  feedback: {
    goal: "回應孩子完成行動後的感覺，肯定孩子有嘗試，如果仍然不舒服也要接住。",
    transitionTarget: "請做溫和收尾。",
  },
};

function getStepConfig(step) {
  return DECIDE_STEPS[step] || DECIDE_STEPS.trigger;
}

function buildMessages({ step, selectedEmotion, context, inputText }) {
  const stepConfig = getStepConfig(step);

  const developerPrompt = `
你是一位為兒童與青少年設計的情緒支持 AI 夥伴，使用繁體中文（zh-TW）回應。

你的角色不是自由聊天機器人，也不是心理治療師，而是在固定的情緒引導流程中，根據孩子的當前輸入，生成簡短、溫柔、安全、適齡的回應。

請遵守以下規則：
1. 回應對象是孩子或青少年，語氣要簡單、溫柔、直接。
2. 每次只回應當前步驟，不要自行跳題，不要擴展成長篇對話。
3. 先接住感受，再陪他往下一步走。
4. 不要說教，不要責備，不要評價對錯。
5. 不要使用艱深心理學術語。
6. 每次回應控制在 2 到 3 句內。
7. 如果孩子只選了選項、沒有自由輸入，也要像在真實回應他。
8. 不要提供醫療診斷、危險建議或不適齡內容。
9. 如果內容涉及自傷、傷人、極端危機，請把 riskLevel 設成 high，並在 transition 中提醒立刻找可信任的大人協助。
10. 你必須輸出 JSON，欄位固定為 acknowledgement、supportiveLine、transition、riskLevel。

當前步驟：${step}
步驟目標：${stepConfig.goal}
過渡方向：${stepConfig.transitionTarget}
  `.trim();

  const userPrompt = `
孩子目前的初始情緒：${selectedEmotion || "unknown"}

目前流程上下文：
- trigger: ${context.trigger || "none"}
- body: ${context.body || "none"}
- scale: ${context.scale || "none"}
- action: ${context.action || "none"}
- feedback: ${context.feedback || "none"}

孩子這一步的實際輸入：
${inputText}

請輸出 JSON：
{
  "acknowledgement": "先接住孩子感受的一句話",
  "supportiveLine": "溫柔支持的一句話",
  "transition": "自然帶往下一步的一句話",
  "riskLevel": "low"
}
  `.trim();

  return [
    {
      role: "developer",
      content: [{ type: "input_text", text: developerPrompt }],
    },
    {
      role: "user",
      content: [{ type: "input_text", text: userPrompt }],
    },
  ];
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text) {
    return data.output_text;
  }

  const texts = [];
  for (const item of data.output || []) {
    if (!item?.content) continue;
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
    acknowledgement: "我有收到你剛剛說的內容。",
    supportiveLine: "謝謝你願意告訴我，我會陪你慢慢整理。",
    transition: "我們一起看下一步。",
    riskLevel: "low",
  };

  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text);
    return {
      acknowledgement: parsed.acknowledgement || fallback.acknowledgement,
      supportiveLine: parsed.supportiveLine || fallback.supportiveLine,
      transition: parsed.transition || fallback.transition,
      riskLevel: parsed.riskLevel || "low",
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
        riskLevel: parsed.riskLevel || "low",
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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

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

  const step = body?.step;
  const inputText = body?.input?.text?.trim();

  if (!step || !inputText) {
    return res.status(400).json({ error: "Missing step or input.text" });
  }

  const payload = {
    model,
    reasoning: { effort: "low" },
    input: buildMessages({
      step,
      selectedEmotion: body?.selectedEmotion,
      context: body?.context || {},
      inputText,
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
            riskLevel: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["acknowledgement", "supportiveLine", "transition", "riskLevel"],
        },
        strict: true,
      },
    },
  };

  let response;
  let data;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    data = await response.json();
  } catch (error) {
    return res.status(500).json({ error: error.message || "OpenAI request failed" });
  }

  if (!response.ok) {
    return res.status(response.status).json({
      error: data?.error?.message || "OpenAI API error",
    });
  }

  const outputText = extractOutputText(data);
  const result = parseResult(outputText);

  return res.status(200).json({
    result,
    model,
    usage: data.usage || null,
  });
}
