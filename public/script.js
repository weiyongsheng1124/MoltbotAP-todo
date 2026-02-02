const API_URL = '/api';

// 顯示當天日期
function showDate() {
    const now = new Date();
    const options = { month: 'long', day: 'numeric', weekday: 'short' };
    document.getElementById('date').textContent = now.toLocaleDateString('zh-TW', options);
    
    // 初始化日期選擇器為今天
    const dateInput = document.getElementById('todo-date');
    const taiwanNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    dateInput.value = taiwanNow.toISOString().split('T')[0];
}

// 格式化日期顯示
function formatDateDisplay(dateStr) {
    const today = getTodayDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    if (dateStr === today) return '今天';
    if (dateStr === tomorrowStr) return '明天';
    // 轉換為民國年顯示
    const [year, month, day] = dateStr.split('-');
    const rocYear = parseInt(year) - 1911;
    return `${rocYear}/${month}/${day}`;
}

// 取得代辦事項列表
async function fetchTodos() {
    const res = await fetch(`${API_URL}/todos`);
    const todos = await res.json();
    renderTodos(todos);
}

// 渲染代辦事項（按日期分組）
function renderTodos(todos) {
    const list = document.getElementById('todo-list');
    if (todos.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #888; padding: 2rem;">尚無代辦事項</li>';
        return;
    }
    
    // 按日期分組
    const grouped = {};
    todos.forEach(todo => {
        if (!grouped[todo.date]) {
            grouped[todo.date] = [];
        }
        grouped[todo.date].push(todo);
    });
    
    // 產生 HTML
    let html = '';
    Object.keys(grouped).sort().forEach(date => {
        html += `<li class="date-header">📅 ${formatDateDisplay(date)}</li>`;
        grouped[date].forEach(todo => {
            html += `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo('${todo.id}')">
            <div class="todo-info">
                <span class="todo-thing">${escapeHtml(todo.thing)}</span>
                <div class="todo-detail">
                    ${todo.person ? `<span>👤 ${escapeHtml(todo.person)}</span>` : ''}
                    ${todo.place ? `<span>📍 ${escapeHtml(todo.place)}</span>` : ''}
                    ${todo.stuff ? `<span>📦 ${escapeHtml(todo.stuff)}</span>` : ''}
                </div>
            </div>
            <div class="todo-actions">
                <span class="todo-time">${todo.time}</span>
                <button class="delete-btn" onclick="deleteTodo('${todo.id}')">×</button>
            </div>
        </li>`;
        });
    });
    
    list.innerHTML = html;
}

// 取得今天台灣日期字串
function getTodayDateString() {
    const taiwanNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    return taiwanNow.toISOString().split('T')[0];
}

// HTML 跳脫
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 新增代辦事項
document.getElementById('todo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const thing = document.getElementById('todo-thing');
    const person = document.getElementById('todo-person');
    const date = document.getElementById('todo-date');
    const time = document.getElementById('todo-time');
    const place = document.getElementById('todo-place');
    const stuff = document.getElementById('todo-stuff');
    const reminder = document.getElementById('todo-reminder');
    
    await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            thing: thing.value,
            person: person.value,
            date: date.value,
            time: time.value,
            place: place.value,
            stuff: stuff.value,
            reminderMinutes: reminder.value || null
        })
    });
    
    thing.value = '';
    person.value = '';
    date.value = getTodayDateString();
    time.value = '';
    place.value = '';
    stuff.value = '';
    reminder.value = '';
    fetchTodos();
});

// 切換完成狀態
async function toggleTodo(id) {
    await fetch(`${API_URL}/todos/${id}/toggle`, { method: 'POST' });
    fetchTodos();
}

// 刪除代辦事項
async function deleteTodo(id) {
    await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' });
    fetchTodos();
}

// 初始化
showDate();
fetchTodos();

// 定期刷新 (每分鐘)
setInterval(fetchTodos, 60000);

// 不再全頁重整，改用局部刷新
