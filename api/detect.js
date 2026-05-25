export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  if (!body) return res.status(400).json({ error: "Empty request body" });

  const { imageBase64, itemsToFind } = body;
  if (!imageBase64) return res.status(400).json({ error: "Missing imageBase64" });
  if (!itemsToFind) return res.status(400).json({ error: "Missing itemsToFind" });

  const prompt =
    "請判斷這張圖片裡是否看得到以下物品：" +
    itemsToFind +
    "。請只回傳 JSON 物件，不要多加說明。格式固定為 " +
    '{"backpack":false,"pen":false,"book":false,"bottle":false,"phone":false}';

  let response;
  let data;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: { temperature: 0, maxOutputTokens: 150 },
          }),
        }
      );

      clearTimeout(timer);
      data = await response.json();

      if (response.status === 429) {
        return res.status(429).json({ error: "目前使用量較高，請稍後再試。", retryAfter: 30 });
      }

      if (response.status === 503 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        continue;
      }

      break;
    } catch (error) {
      clearTimeout(timer);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        continue;
      }
      return res.status(500).json({
        error: error.name === "AbortError" ? "Gemini timeout" : error.message,
      });
    }
  }

  if (!response?.ok) {
    return res.status(response?.status || 500).json({
      error: data?.error?.message || "Gemini error",
    });
  }

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  let result = {};
  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    result = match ? JSON.parse(match[0]) : {};
  } catch (error) {}

  return res.status(200).json({ result });
}
