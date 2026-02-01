const API_URL = '/api';

// 顯示當天日期
function showDate() {
    const now = new Date();
    const options = { month: 'long', day: 'numeric', weekday: 'short' };
    document.getElementById('date').textContent = now.toLocaleDateString('zh-TW', options);
}

// 取得代辦事項列表
async function fetchTodos() {
    const res = await fetch(`${API_URL}/todos`);
    const todos = await res.json();
    renderTodos(todos);
}

// 渲染代辦事項
function renderTodos(todos) {
    const list = document.getElementById('todo-list');
    if (todos.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #888; padding: 2rem;">尚無代辦事項</li>';
        return;
    }
    list.innerHTML = todos.map(todo => `
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
        </li>
    `).join('');
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
    const time = document.getElementById('todo-time');
    const place = document.getElementById('todo-place');
    const stuff = document.getElementById('todo-stuff');
    
    await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            thing: thing.value,
            person: person.value,
            time: time.value,
            place: place.value,
            stuff: stuff.value
        })
    });
    
    thing.value = '';
    person.value = '';
    time.value = '';
    place.value = '';
    stuff.value = '';
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

// 每 5 分鐘自動重整頁面
setInterval(() => {
    window.location.reload();
}, 5 * 60 * 1000);
