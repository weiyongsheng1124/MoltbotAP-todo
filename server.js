const express = require('express');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const TelegramBot = require('node-telegram-bot-api');

// 設定台灣時區 (UTC+8)
process.env.TZ = 'Asia/Taipei';

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'todos.json');

// Telegram Bot 初始化
let telegramBot = null;

function initTelegramBot() {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (token && chatId) {
        try {
            telegramBot = new TelegramBot(token, { polling: false });
            global.telegramConfig = { chatId };
            console.log('✅ Telegram Bot 已初始化');
        } catch (err) {
            console.log(`⚠️ Telegram Bot 初始化失敗: ${err.message}`);
        }
    } else {
        console.log('⚠️ Telegram 未設定（需要環境變數 TELEGRAM_TOKEN 和 TELEGRAM_CHAT_ID）');
    }
}

initTelegramBot();

// 中介軟體
app.use(express.json());

// 靜態檔案服務
app.use(express.static('public'));

// 確保資料目錄存在
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 確保資料檔案存在
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

// 讀取代辦事項
function readTodos() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('讀取代辦事項失敗:', err);
        return [];
    }
}

// 儲存代辦事項
function saveTodos(todos) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2), 'utf8');
}

// 發送 Telegram 通知
function sendTelegramNotification(message) {
    if (!telegramBot || !global.telegramConfig?.chatId) {
        console.log('Telegram 未設定，無法發送通知');
        return false;
    }
    
    telegramBot.sendMessage(global.telegramConfig.chatId, message, { parse_mode: 'HTML' })
        .then(() => console.log('✅ Telegram 通知已發送'))
        .catch(err => console.log(`⚠️ Telegram 發送失敗: ${err.message}`));
}

// 格式化代辦事項訊息
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatTodoMessage(todo, type) {
    let emoji = '📝';
    if (type === 'completed') emoji = '✅';
    else if (type === 'deleted') emoji = '🗑️';
    else if (type === 'dayBefore') emoji = '📅';
    else if (type === 'hourBefore') emoji = '⏰';
    else if (type === 'now') emoji = '🔔';
    
    let msg = `${emoji} <b>代辦事項</b>\n`;
    msg += `━━━━━━━━━━━━━━━━\n`;
    msg += `📌 ${escapeHtml(todo.thing)}\n`;
    if (todo.time) msg += `🕐 時間: ${escapeHtml(todo.time)}\n`;
    if (todo.date) msg += `📅 日期: ${escapeHtml(todo.date)}\n`;
    if (todo.person) msg += `👤 人員: ${escapeHtml(todo.person)}\n`;
    if (todo.place) msg += `📍 地點: ${escapeHtml(todo.place)}\n`;
    if (todo.stuff) msg += `📦 物品: ${escapeHtml(todo.stuff)}\n`;
    msg += `━━━━━━━━━━━━━━━━`;
    return msg;
}

// 取得今天的代辦事項 (台灣時區)
function getTodayTodos(todos) {
    const now = new Date();
    const taiwanDate = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
    return todos.filter(todo => todo.date === taiwanDate);
}

// 取得台灣現在時間 (ISO 字串)
function getTaiwanNow() {
    // 使用 toLocaleString 正確取得台灣時間
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
}

// 取得台灣日期字串 (YYYY-MM-DD)
function getTaiwanDateString() {
    return getTaiwanNow().toISOString().split('T')[0];
}

// API: 取得代辦事項
app.get('/api/todos', (req, res) => {
    const todos = readTodos();
    const todayTodos = getTodayTodos(todos).sort((a, b) => a.time.localeCompare(b.time));
    res.json(todayTodos);
});

// API: 新增代辦事項
app.post('/api/todos', (req, res) => {
    const { thing, person, time, place, stuff, date } = req.body;
    if (!thing || !time) {
        return res.status(400).json({ error: '缺少必要欄位' });
    }
    
    const todos = readTodos();
    // 優先使用前端傳入的日期，否則使用台灣當天日期
    const todoDate = date || getTaiwanDateString();
    const newTodo = {
        id: uuidv4(),
        date: todoDate,
        thing,
        person: person || '',
        time,
        place: place || '',
        stuff: stuff || '',
        completed: false,
        notifiedDayBefore: false,
        notifiedHourBefore: false,
        notified: false
    };
    
    todos.push(newTodo);
    saveTodos(todos);
    
    res.json(newTodo);
});

// API: 切換完成狀態
app.post('/api/todos/:id/toggle', (req, res) => {
    const { id } = req.params;
    const todos = readTodos();
    const todo = todos.find(t => t.id === id);
    
    if (!todo) {
        return res.status(404).json({ error: '代辦事項不存在' });
    }
    
    todo.completed = !todo.completed;
    saveTodos(todos);
    
    // 發送 Telegram 通知
    if (todo.completed) {
        sendTelegramNotification(formatTodoMessage(todo, 'completed'));
    }
    
    res.json(todo);
});

// API: 刪除代辦事項
app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    let todos = readTodos();
    todos = todos.filter(t => t.id !== id);
    saveTodos(todos);
    
    res.json({ success: true });
});

// 確保 cron 只註冊一次
let cronInitialized = false;

// 檢查代辦事項是否需要通知 (台灣時區)
function checkTodosForNotification() {
    const todos = readTodos();
    const now = getTaiwanNow();
    const nowStr = now.toISOString().slice(0, 16);
    
    todos.forEach(todo => {
        if (todo.completed) return;
        
        const todoDateTime = `${todo.date}T${todo.time}`;
        
        // 計算提醒時間
        const todoTime = new Date(todoDateTime);
        const dayBeforeTime = new Date(todoTime);
        dayBeforeTime.setDate(dayBeforeTime.getDate() - 1);
        const dayBeforeStr = dayBeforeTime.toISOString().slice(0, 16);
        
        const hourBeforeTime = new Date(todoTime);
        hourBeforeTime.setHours(hourBeforeTime.getHours() - 1);
        const hourBeforeStr = hourBeforeTime.toISOString().slice(0, 16);
        
        // 時間到提醒 (優先檢查)
        if (!todo.notified && nowStr >= todoDateTime) {
            todo.notified = true;
            todo.notifiedHourBefore = true;
            todo.notifiedDayBefore = true;
            saveTodos(todos);
            console.log(`[時間到] ${todo.time} - ${todo.thing}`);
            sendTelegramNotification(formatTodoMessage(todo, 'now'));
        }
        
        // 一小時前提醒
        else if (!todo.notifiedHourBefore && nowStr >= hourBeforeStr) {
            todo.notifiedHourBefore = true;
            saveTodos(todos);
            console.log(`[一小時前] ${todo.time} - ${todo.thing}`);
            sendTelegramNotification(formatTodoMessage(todo, 'hourBefore'));
        }
        
        // 一天前提醒
        else if (!todo.notifiedDayBefore && nowStr >= dayBeforeStr) {
            todo.notifiedDayBefore = true;
            saveTodos(todos);
            console.log(`[一天前] ${todo.time} - ${todo.thing}`);
            sendTelegramNotification(formatTodoMessage(todo, 'dayBefore'));
        }
    });
}

// 每分鐘檢查一次代辦事項 (只註冊一次)
if (!cronInitialized) {
    cron.schedule('* * * * *', () => {
        checkTodosForNotification();
    });
    cronInitialized = true;
    console.log('✅ 代辦事項通知監控已啟動');
}

// API: 手動觸發通知檢查 (測試用)
app.post('/api/check-notifications', (req, res) => {
    checkTodosForNotification();
    res.json({ success: true, message: '通知檢查已完成' });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行中: http://localhost:${PORT}`);
    
    // 啟動時清理過期的代辦事項（日期已過且未完成）
    const todos = readTodos();
    const taiwanNow = getTaiwanNow();
    const todayStr = taiwanNow.toISOString().split('T')[0];
    const currentTime = `${String(taiwanNow.getHours()).padStart(2, '0')}:${String(taiwanNow.getMinutes()).padStart(2, '0')}`;
    
    const expiredTodos = todos.filter(todo => {
        if (todo.completed) return false;
        if (todo.date > todayStr) return false;
        if (todo.date === todayStr && todo.time > currentTime) return false;
        return true;
    });
    
    if (expiredTodos.length > 0) {
        const remainingTodos = todos.filter(todo => {
            if (todo.completed) return true;
            if (todo.date > todayStr) return true;
            if (todo.date === todayStr && todo.time > currentTime) return true;
            return false;
        });
        saveTodos(remainingTodos);
        console.log(`🧹 已清理 ${expiredTodos.length} 個過期代辦事項`);
    }
});
});
