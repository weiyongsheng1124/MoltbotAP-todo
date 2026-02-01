const express = require('express');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

// 設定台灣時區 (UTC+8)
process.env.TZ = 'Asia/Taipei';

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'todos.json');

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

// 取得今天的代辦事項 (台灣時區)
function getTodayTodos(todos) {
    const now = new Date();
    const taiwanDate = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
    return todos.filter(todo => todo.date === taiwanDate);
}

// 取得台灣現在時間 (ISO 字串)
function getTaiwanNow() {
    return new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
}

// API: 取得代辦事項
app.get('/api/todos', (req, res) => {
    const todos = readTodos();
    const todayTodos = getTodayTodos(todos).sort((a, b) => a.time.localeCompare(b.time));
    res.json(todayTodos);
});

// API: 新增代辦事項
app.post('/api/todos', (req, res) => {
    const { thing, person, time, place, stuff } = req.body;
    if (!thing || !time) {
        return res.status(400).json({ error: '缺少必要欄位' });
    }
    
    const todos = readTodos();
    const taiwanNow = getTaiwanNow();
    const newTodo = {
        id: uuidv4(),
        date: taiwanNow.toISOString().split('T')[0],
        thing,
        person: person || '',
        time,
        place: place || '',
        stuff: stuff || '',
        completed: false,
        notifiedDayBefore: false,  // 一天前
        notifiedHourBefore: false, // 一小時前
        notified: false            // 時間到
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

// 檢查代辦事項是否需要通知 (台灣時區)
function checkTodosForNotification() {
    const todos = readTodos();
    const now = getTaiwanNow();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    todos.forEach(todo => {
        if (todo.completed) return;
        
        const todoDateTime = `${todo.date}T${todo.time}`;
        const todoTime = new Date(todoDateTime);
        
        // 計算提醒時間
        const dayBeforeTime = new Date(todoTime);
        dayBeforeTime.setDate(dayBeforeTime.getDate() - 1);
        const dayBeforeStr = dayBeforeTime.toISOString().split('T')[0] + 'T' + 
            `${String(dayBeforeTime.getHours()).padStart(2, '0')}:${String(dayBeforeTime.getMinutes()).padStart(2, '0')}`;
        
        const hourBeforeTime = new Date(todoTime);
        hourBeforeTime.setHours(hourBeforeTime.getHours() - 1);
        const hourBeforeStr = hourBeforeTime.toISOString().split('T')[0] + 'T' + 
            `${String(hourBeforeTime.getHours()).padStart(2, '0')}:${String(hourBeforeTime.getMinutes()).padStart(2, '0')}`;
        
        const nowStr = now.toISOString().slice(0, 16);
        
        // 一天前提醒
        if (!todo.notifiedDayBefore && nowStr >= dayBeforeStr) {
            todo.notifiedDayBefore = true;
            saveTodos(todos);
            let msg = `【提醒】明天 ${todo.time}`;
            if (todo.thing) msg += ` - ${todo.thing}`;
            if (todo.person) msg += `\n👤 ${todo.person}`;
            if (todo.place) msg += `\n📍 ${todo.place}`;
            if (todo.stuff) msg += `\n📦 ${todo.stuff}`;
            console.log(`[一天前] ${msg}`);
        }
        
        // 一小時前提醒
        if (!todo.notifiedHourBefore && nowStr >= hourBeforeStr) {
            todo.notifiedHourBefore = true;
            saveTodos(todos);
            let msg = `【提醒】一小時後 ${todo.time}`;
            if (todo.thing) msg += ` - ${todo.thing}`;
            if (todo.person) msg += `\n👤 ${todo.person}`;
            if (todo.place) msg += `\n📍 ${todo.place}`;
            if (todo.stuff) msg += `\n📦 ${todo.stuff}`;
            console.log(`[一小時前] ${msg}`);
        }
        
        // 時間到提醒
        if (!todo.notified && nowStr >= todoDateTime) {
            todo.notified = true;
            saveTodos(todos);
            let msg = `【現在】${todo.time}`;
            if (todo.thing) msg += ` - ${todo.thing}`;
            if (todo.person) msg += `\n👤 ${todo.person}`;
            if (todo.place) msg += `\n📍 ${todo.place}`;
            if (todo.stuff) msg += `\n📦 ${todo.stuff}`;
            console.log(`[時間到] ${msg}`);
        }
    });
}

// 每分鐘檢查一次代辦事項
cron.schedule('* * * * *', () => {
    checkTodosForNotification();
});

// API: 手動觸發通知檢查 (測試用)
app.post('/api/check-notifications', (req, res) => {
    checkTodosForNotification();
    res.json({ success: true, message: '通知檢查已完成' });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行中: http://localhost:${PORT}`);
    console.log('代辦事項通知監控已啟動');
});
