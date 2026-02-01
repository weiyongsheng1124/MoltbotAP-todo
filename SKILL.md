# Todo List Skill

代辦事項管理系統，支援 Telegram 通知提醒。

## 功能

- 新增/刪除代辦事項 (人事時地物)
- 一天前、一小時前、時間到 三重提醒
- 台灣時區 (UTC+8)
- Telegram 自動通知

## API

### 新增代辦事項
```bash
POST /api/todos
{
  "thing": "事項",
  "person": "參與者",
  "time": "HH:MM",
  "place": "地點",
  "stuff": "物品"
}
```

### 取得代辦事項
```bash
GET /api/todos
```

### 刪除代辦事項
```bash
DELETE /api/todos/:id
```

## 部署

1. Railway 部署 `todo-app` 資料夾
2. 設定 PORT 環境變數
3. 資料儲存在 `data/todos.json`

## 網址

- Web: https://todo-app-xxxx.up.railway.app/
