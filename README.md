# SDG Prototype Shell

這個專案是 `Stop・Decide・Go` 的整合版 prototype，包含：

- 主流程 shell
- `AR-ball` 呼吸模組
- `AR-grounding` 接地模組
- `DECIDE` 引導式 AI 對話
- grounding 影像辨識 API

## 專案結構

- `index.html`
  - 主畫面與流程頁面
- `app.js`
  - 前端流程控制與 DECIDE 互動
- `styles.css`
  - 主介面樣式
- `api/detect.js`
  - grounding 用的 Gemini 影像辨識 API
- `api/decide.js`
  - DECIDE 用的 OpenAI 引導式對話 API
- `modules/ar-ball/`
  - 呼吸 AR 模組
- `modules/ar-grounding/`
  - 接地 AR 模組
- `vercel.json`
  - Vercel 設定

## 本地預覽

如果只是看前端畫面，可以直接用本地靜態伺服器打開。

如果要測試正式 AI API：

1. 專案部署到 Vercel
2. 在 Vercel 設定環境變數
3. 使用 Vercel 網址打開

## Vercel 環境變數

至少需要：

```text
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

## DECIDE API

### `POST /api/decide`

用途：
- 根據目前 DECIDE 的步驟
- 接收孩子的選項、打字或語音轉文字
- 產生一段短的、適齡的引導回應

請求格式：

```json
{
  "step": "trigger",
  "selectedEmotion": "angry",
  "context": {
    "trigger": "",
    "body": "",
    "scale": "",
    "action": "",
    "feedback": ""
  },
  "input": {
    "text": "有人說了讓我很生氣的話"
  }
}
```

回應格式：

```json
{
  "result": {
    "acknowledgement": "被這樣說真的很容易一下子火起來。",
    "supportiveLine": "謝謝你願意告訴我，我有在聽。",
    "transition": "我想再陪你看看，你的身體哪裡最不舒服？",
    "riskLevel": "low"
  },
  "model": "gpt-5-mini",
  "usage": {}
}
```

## 部署

1. 把整個 repo push 到 GitHub
2. 在 Vercel 匯入這個 repo
3. Framework Preset 選 `Other`
4. Root Directory 選 repo 根目錄
5. 設定上面的環境變數
6. Deploy

## 注意

- `file://` 直接打開時，DECIDE 會退回前端示範模式，不會真的呼叫 OpenAI API。
- 真正的 OpenAI API 版本需要透過 Vercel 網址或其他有 serverless API 的環境來測。
- `AR-ball` 若使用 8th Wall / A-Frame，正式網域可能還需要對應平台設定。
