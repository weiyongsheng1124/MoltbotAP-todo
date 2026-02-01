# 代辦事項 (To-Do List)

簡約的代辦事項管理網頁。

## 功能

- 新增當天代辦事項 (含時間)
- 設定事項完成狀態
- 事前 Telegram 通知

## 執行方式

```bash
cd todo-app
npm install
npm start
```

## 說明

- 伺服器運行於 `http://localhost:3000`
- 代辦事項儲存於 `data/todos.json`
- 每分鐘檢查事項時間，自動通知
- 通知透過 OpenClaw 發送至 Telegram
