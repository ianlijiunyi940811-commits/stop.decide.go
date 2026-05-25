# SDG Prototype Shell

這個資料夾已經整理成可上 GitHub、可接 Vercel 的版本。

## 專案內容

- `index.html`
  - 主流程 shell
- `app.js`
  - 畫面切換與狀態管理
- `styles.css`
  - 主 shell 樣式
- `api/detect.js`
  - 給 grounding 模組使用的 serverless API
- `modules/ar-ball/index.html`
  - 呼吸 AR 模組
- `modules/ar-grounding/`
  - grounding 模組與其靜態資源
- `vercel.json`
  - Vercel 部署設定

## 目前行為

- 主 shell 處理：
  - 情緒確認
  - 模組入口
  - 反思整理
  - 完成摘要
- `AR-ball` 從本地模組頁開啟
- `AR-grounding` 也從本地模組頁開啟
- grounding 需要呼叫根目錄的 `/api/detect`

## 本地預覽

如果你想先在本機看：

1. 在這個資料夾開終端
2. 執行：

```powershell
"C:\Program Files\nodejs\node.exe" "C:\Users\ianli\Documents\Codex\2026-05-25\files-mentioned-by-the-user-sdg\serve.js"
```

3. 打開：

- `http://localhost:8000/`

## 上 GitHub 與接 Vercel

你要上傳的是整個專案，不是只有 README。

### GitHub

```powershell
git add .
git commit -m "Initial SDG prototype shell"
git branch -M main
git remote add origin https://github.com/你的帳號/你的repo.git
git push -u origin main
```

### Vercel

1. Import Git Repository
2. 選你的 repo
3. Framework Preset 選 `Other`
4. Root Directory 保持 repo 根目錄
5. 加入環境變數：

```text
GEMINI_API_KEY=你的金鑰
```

6. Deploy

## 注意事項

- `AR-ball` 使用 8th Wall / A-Frame，如果正式網域有限制，需要再檢查 8th Wall 的網域設定。
- `api/detect.js` 依賴 `GEMINI_API_KEY`，沒有設就無法做 grounding 的 AI 物件辨識。
- 原始 `AR-ball` 與 `AR-grounding` 模組內仍有部分舊文案亂碼，這不影響先部署，但展示前建議再做一輪文案清理。
