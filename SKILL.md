# Todo App Skill

*記錄開發中遇到的問題與解決方案*

---

## 🔧 Bug 修復經驗

### 1. cron 重複註冊
**問題：** Railway 重部署時會註冊多個 cron，導致通知發送多次

**修復：**
```javascript
let cronInitialized = false;
if (!cronInitialized) {
    cron.schedule('* * * * *', () => { checkTodosForNotification(); });
    cronInitialized = true;
}
```

### 2. 時區計算錯誤
**問題：** `new Date().getTime() + 8小時` 在某些情況下會出問題

**修復：**
```javascript
function getTaiwanNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
}
```

### 3. HTML 注入風險
**問題：** Telegram 訊息未轉義特殊字符

**修復：**
```javascript
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
```

### 4. 語法錯誤 (toLocaleString)
**問題：** 缺少 `)` 導致伺服器無法啟動，健康檢查失敗

**錯誤：**
```javascript
return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' ));
```

**正確：**
```javascript
return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
```

---

## 📋 設計原則

### 通知策略
- 只發送**時間相關**的通知
- 不要發送「新增」「刪除」這類操作通知
- 使用 if-else if 確保只發送一次通知
- 優先級：時間到 > 一小時前 > 一天前

### Git 工作流程
```
git add -A && git commit -m "訊息" && git push origin main && git status
```

### Code Review 檢查清單
- [ ] cron 是否只註冊一次
- [ ] 時區計算是否正確
- [ ] HTML 是否有轉義
- [ ] 語法是否正確（用 `node -c` 檢查）
- [ ] 通知邏輯是否合理

---

## 🛠️ Railway 部署筆記

- healthcheckPath 設為 `/`
- startCommand 設為 `node server.js`
- 需要環境變數：TELEGRAM_TOKEN、TELEGRAM_CHAT_ID
- 語法錯誤會導致 healthcheck 失敗 (service unavailable)
