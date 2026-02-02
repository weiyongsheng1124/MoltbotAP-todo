const API_URL = '/api';

// 顯示當天日期和星期
function showDate() {
    const now = new Date();
    const options = { month: 'long', day: 'numeric', weekday: 'long' };
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

    if (dateStr === today) return '📅 今天';
    if (dateStr === tomorrowStr) return '📅 明天';
    // 轉換為民國年顯示
    const [year, month, day] = dateStr.split('-');
    const rocYear = parseInt(year) - 1911;
    return `📅 ${rocYear}/${month}/${day}`;
}

// 格式化相對時間
function formatRelativeTime(dateStr, timeStr) {
    const today = getTodayDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === today) {
        return `🕐 今天 ${timeStr}`;
    } else if (dateStr === tomorrowStr) {
        return `🕐 明天 ${timeStr}`;
    } else {
        const [year, month, day] = dateStr.split('-');
        const rocYear = parseInt(year) - 1911;
        return `🕐 ${rocYear}/${month}/${day} ${timeStr}`;
    }
}

// 取得代辦事項列表
async function fetchTodos() {
    try {
        const res = await fetch(`${API_URL}/todos`);
        const todos = await res.json();
        renderTodos(todos);
    } catch (err) {
        console.error('取得代辦事項失敗:', err);
    }
}

// 渲染代辦事項（按日期分組）
function renderTodos(todos) {
    const list = document.getElementById('todo-list');

    if (todos.length === 0) {
        list.innerHTML = `
            <li class="empty-state">
                <div class="icon">📝</div>
                <p>目前沒有待辦事項</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">新增一個事項開始追蹤吧！</p>
            </li>
        `;
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
        html += `<li class="date-header">${formatDateDisplay(date)}</li>`;
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
                <button class="delete-btn" onclick="deleteTodo('${todo.id}')" title="刪除">✕</button>
            </div>
        </li>`;
        });
    });

    list.innerHTML = html;

    // 添加滑動刪除提示
    addSwipeHints();
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

    // 驗證
    if (!thing.value.trim()) {
        thing.focus();
        return;
    }
    if (!time.value) {
        time.focus();
        return;
    }

    const submitBtn = document.querySelector('#todo-form button');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '新增中...';
    submitBtn.disabled = true;

    try {
        await fetch(`${API_URL}/todos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                thing: thing.value.trim(),
                person: person.value.trim(),
                date: date.value,
                time: time.value,
                place: place.value.trim(),
                stuff: stuff.value.trim(),
                reminderMinutes: reminder.value || null
            })
        });

        // 重置表單
        thing.value = '';
        person.value = '';
        date.value = getTodayDateString();
        time.value = '';
        place.value = '';
        stuff.value = '';
        reminder.value = '';
        thing.focus();

        // 重新載入列表
        await fetchTodos();

    } catch (err) {
        console.error('新增失敗:', err);
        alert('新增失敗，請稍後再試');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// 切換完成狀態
async function toggleTodo(id) {
    try {
        await fetch(`${API_URL}/todos/${id}/toggle`, { method: 'POST' });
        await fetchTodos();
    } catch (err) {
        console.error('更新失敗:', err);
    }
}

// 刪除代辦事項（帶確認）
async function deleteTodo(id) {
    if (!confirm('確定要刪除這個代辦事項嗎？')) return;

    try {
        await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' });
        await fetchTodos();
    } catch (err) {
        console.error('刪除失敗:', err);
    }
}

// 添加滑動提示
function addSwipeHints() {
    if (window.innerWidth > 768) return;

    const items = document.querySelectorAll('.todo-item:not(.completed)');
    items.forEach(item => {
        let startX = 0;
        let isSwiping = false;

        item.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isSwiping = true;
        }, { passive: true });

        item.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            const currentX = e.touches[0].clientX;
            const diff = startX - currentX;

            if (diff > 50) {
                // 左滑顯示刪除按鈕
                item.style.transform = 'translateX(-50px)';
            } else if (diff < -50) {
                // 右滑復原
                item.style.transform = 'translateX(0)';
            }
        }, { passive: true });

        item.addEventListener('touchend', () => {
            isSwiping = false;
            item.style.transform = '';
        });
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    showDate();
    fetchTodos();
});

// 定期刷新 (每分鐘)
setInterval(fetchTodos, 60000);

// 網頁可見時刷新
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        fetchTodos();
    }
});
