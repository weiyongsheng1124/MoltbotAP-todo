const API_URL = '/api';

// Show today's date
function showDate() {
    const now = new Date();
    const options = { month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', options);

    // Initialize date picker to today
    const dateInput = document.getElementById('todo-date');
    const taiwanNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    dateInput.value = taiwanNow.toISOString().split('T')[0];
}

// Format date display
function formatDateDisplay(dateStr) {
    const today = getTodayDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === today) return '📅 Today';
    if (dateStr === tomorrowStr) return '📅 Tomorrow';
    // Convert to ROC year format
    const [year, month, day] = dateStr.split('-');
    const rocYear = parseInt(year) - 1911;
    return `📅 ${rocYear}/${month}/${day}`;
}

// Fetch todos from API
async function fetchTodos() {
    try {
        const res = await fetch(`${API_URL}/todos`);
        const todos = await res.json();
        renderTodos(todos);
    } catch (err) {
        console.error('Failed to fetch todos:', err);
    }
}

// Render todos (grouped by date)
function renderTodos(todos) {
    const list = document.getElementById('todo-list');

    if (todos.length === 0) {
        list.innerHTML = `
            <li class="empty-state">
                <div class="icon">📝</div>
                <p>No todo items yet</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Add a task to get started!</p>
            </li>
        `;
        return;
    }

    // Group by date
    const grouped = {};
    todos.forEach(todo => {
        if (!grouped[todo.date]) {
            grouped[todo.date] = [];
        }
        grouped[todo.date].push(todo);
    });

    // Generate HTML
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
                <button class="delete-btn" onclick="deleteTodo('${todo.id}')" title="Delete">✕</button>
            </div>
        </li>`;
        });
    });

    list.innerHTML = html;

    // Add swipe hints for mobile
    addSwipeHints();
}

// Get today's date string (Taiwan)
function getTodayDateString() {
    const taiwanNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    return taiwanNow.toISOString().split('T')[0];
}

// HTML escape
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add new todo
document.getElementById('todo-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const thing = document.getElementById('todo-thing');
    const person = document.getElementById('todo-person');
    const date = document.getElementById('todo-date');
    const time = document.getElementById('todo-time');
    const place = document.getElementById('todo-place');
    const stuff = document.getElementById('todo-stuff');
    const reminder = document.getElementById('todo-reminder');

    // Validation
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
    submitBtn.textContent = 'Adding...';
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

        // Reset form
        thing.value = '';
        person.value = '';
        date.value = getTodayDateString();
        time.value = '';
        place.value = '';
        stuff.value = '';
        reminder.value = '';
        thing.focus();

        // Reload list
        await fetchTodos();

    } catch (err) {
        console.error('Failed to add:', err);
        alert('Failed to add. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Toggle completion status
async function toggleTodo(id) {
    try {
        await fetch(`${API_URL}/todos/${id}/toggle`, { method: 'POST' });
        await fetchTodos();
    } catch (err) {
        console.error('Failed to update:', err);
    }
}

// Delete todo with confirmation
async function deleteTodo(id) {
    if (!confirm('Delete this todo?')) return;

    try {
        await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' });
        await fetchTodos();
    } catch (err) {
        console.error('Failed to delete:', err);
    }
}

// Add swipe hints for mobile
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
                item.style.transform = 'translateX(-50px)';
            } else if (diff < -50) {
                item.style.transform = 'translateX(0)';
            }
        }, { passive: true });

        item.addEventListener('touchend', () => {
            isSwiping = false;
            item.style.transform = '';
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showDate();
    fetchTodos();
});

// Refresh every minute
setInterval(fetchTodos, 60000);

// Refresh when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        fetchTodos();
    }
});
