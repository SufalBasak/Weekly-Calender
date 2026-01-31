// Main Logic for Weekly Planner - Google Calendar Style

// Load saved state or default to current week
let savedDate = sessionStorage.getItem('currentWeekStart');
let currentWeekStart = getStartOfWeek(savedDate ? new Date(savedDate) : new Date());

let currentCalendarDate = new Date(currentWeekStart); // Sync mini-cal with main view
const HOUR_HEIGHT = 50; // Must match CSS

// 2026 Indian Holidays (Sample Major Ones)
const indianHolidays = {
    '2026-01-26': 'Republic Day',
    '2026-03-03': 'Holi', // Approx
    '2026-03-20': 'Eid-ul-Fitr', // Approx
    '2026-04-14': 'Ambedkar Jayanti',
    '2026-08-15': 'Independence Day',
    '2026-10-02': 'Gandhi Jayanti',
    '2026-10-20': 'Dussehra', // Approx
    '2026-11-08': 'Diwali', // Approx
    '2026-12-25': 'Christmas'
};

document.addEventListener('DOMContentLoaded', () => {
    // Initial Render
    renderApp();
    setupEventListeners();

    // Request Notification Permission on load
    if ("Notification" in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    // Start Reminder Loop (Check every 60 seconds)
    setInterval(checkReminders, 60000);
});

function setupEventListeners() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderMiniCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderMiniCalendar();
    });

    // Close modal on outside click (excluding menu clicks)
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('eventModal');
        const menu = document.getElementById('moreOptionsMenu');
        const menuBtn = document.querySelector('button[onclick="toggleMoreOptions()"]');

        if (e.target === modal) {
            closeModal();
        }

        // Close menu if clicking outside
        if (menu && !menu.classList.contains('hidden')) {
            if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
                menu.classList.add('hidden');
            }
        }
    });
}

function renderApp() {
    renderMainView();
    renderMiniCalendar();
}

function goToToday() {
    currentWeekStart = getStartOfWeek(new Date());
    currentCalendarDate = new Date();

    // Save state
    sessionStorage.setItem('currentWeekStart', currentWeekStart.toISOString());

    renderApp();
}

// --- Reminder Logic ---
function checkReminders() {
    if (!("Notification" in window) || Notification.permission !== 'granted') return;

    const tasks = getTasks();
    const now = new Date();

    // Load already notified events to prevent spam
    let notifiedEvents = JSON.parse(sessionStorage.getItem('notifiedEvents')) || [];
    let updatedNotified = false;

    tasks.forEach(task => {
        if (!task.startTime || !task.date) return;
        if (task.completed) return; // Don't notify for completed tasks
        if (notifiedEvents.includes(task.id)) return; // Already notified

        const eventStart = new Date(`${task.date}T${task.startTime}`);
        const diffMs = eventStart - now;
        const diffMins = diffMs / (1000 * 60);

        // Notify if within 15 minutes (and not in the past by too much)
        if (diffMins > 0 && diffMins <= 15) {
            showNotification(task);
            notifiedEvents.push(task.id);
            updatedNotified = true;
        }
    });

    if (updatedNotified) {
        sessionStorage.setItem('notifiedEvents', JSON.stringify(notifiedEvents));
    }
}

function showNotification(task) {
    const title = `Upcoming Event: ${task.title}`;
    const options = {
        body: `Starts at ${task.startTime}. ${task.location ? 'at ' + task.location : ''}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png' // Generic Calendar Icon
    };
    new Notification(title, options);
}

// --- Utility Functions ---

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTasks() {
    return JSON.parse(sessionStorage.getItem('weeklyTasks')) || [];
}

function saveTasks(tasks) {
    sessionStorage.setItem('weeklyTasks', JSON.stringify(tasks));
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

// --- Main View Rendering (Time Grid) ---

function renderMainView() {
    const weekHeader = document.getElementById('weekHeader');
    const timeSidebar = document.getElementById('timeSidebar');
    const weekGrid = document.getElementById('weekGrid');

    // Clear dynamic content
    weekHeader.innerHTML = '<div class="time-header-spacer"></div>';
    timeSidebar.innerHTML = '';
    weekGrid.innerHTML = '';

    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);

    // Update Header Text
    document.getElementById('weekRangeDisplay').textContent =
        `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Render Time Sidebar
    for (let i = 0; i < 24; i++) {
        const slot = document.createElement('div');
        slot.className = 'time-slot-label';
        const displayProps = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
        slot.innerText = displayProps;
        timeSidebar.appendChild(slot);
    }

    // Prepare Date Slots
    const tasks = getTasks();
    const filterSelect = document.getElementById('filterSelect');
    const filterStatus = filterSelect ? filterSelect.value : 'all';

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + i);
        const dateString = formatDate(currentDate);
        const isToday = formatDate(new Date()) === dateString;

        // Check for holiday
        const holidayName = indianHolidays[dateString];

        // Header Cell
        const headerCell = document.createElement('div');
        headerCell.className = `day-header-cell ${isToday ? 'is-today' : ''} ${holidayName ? 'is-holiday' : ''}`;

        // Add holiday display
        headerCell.innerHTML = `
            <h3>${currentDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</h3>
            <span class="${holidayName ? 'holiday-circle' : ''}">${currentDate.getDate()}</span>
            ${holidayName ? `<div class="holiday-label">${holidayName}</div>` : ''}
        `;
        weekHeader.appendChild(headerCell);

        // Grid Column
        const dayColumn = document.createElement('div');
        dayColumn.className = `day-column ${isToday ? 'is-today' : ''}`;

        // Highlight column background slightly if holiday? (Optional, maybe just header is enough like GCal)
        if (holidayName) dayColumn.classList.add('holiday-bg');

        let dayTasks = tasks.filter(t => t.date === dateString);

        if (filterStatus === 'completed') dayTasks = dayTasks.filter(t => t.completed);
        if (filterStatus === 'pending') dayTasks = dayTasks.filter(t => !t.completed);

        dayTasks.forEach(task => {
            const el = createEventElement(task);
            dayColumn.appendChild(el);
        });

        weekGrid.appendChild(dayColumn);
    }
}

// --- Mini Calendar ---
function renderMiniCalendar() {
    const grid = document.getElementById('miniCalendarGrid');
    grid.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    document.getElementById('currentMonthYear').textContent =
        new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        const span = document.createElement('div');
        span.className = 'calendar-day other-month';
        grid.appendChild(span);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = i;

        const dateStr = formatDate(new Date(year, month, i));

        if (dateStr === formatDate(new Date())) div.classList.add('today');

        // Holiday Indicator
        if (indianHolidays[dateStr]) {
            div.classList.add('has-holiday');
            div.title = indianHolidays[dateStr]; // Tooltip
        }

        const thisDate = new Date(year, month, i);
        const thisWeekStart = getStartOfWeek(thisDate);
        if (formatDate(thisWeekStart) === formatDate(currentWeekStart)) div.classList.add('active');

        div.onclick = () => {
            const selectedDate = new Date(year, month, i);
            currentWeekStart = getStartOfWeek(selectedDate);

            // Save state
            sessionStorage.setItem('currentWeekStart', currentWeekStart.toISOString());

            renderMainView();
            renderMiniCalendar();
        };

        grid.appendChild(div);
    }
}

function createEventElement(task) {
    const el = document.createElement('div');
    el.className = `calendar-event ${task.completed ? 'completed' : ''}`;

    // Calculate Position
    const startMinutes = timeToMinutes(task.startTime || "00:00");
    const endMinutes = timeToMinutes(task.endTime || "01:00");
    let duration = endMinutes - startMinutes;
    if (duration < 30) duration = 30;

    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT;

    el.style.top = `${top}px`;
    el.style.height = `${height}px`;

    // Dynamic styling based on task type
    const typeColor = task.type === 'task' ? '#34a853' : task.type === 'appointment' ? '#ea4335' : '#5474b4';
    if (!task.completed) el.style.backgroundColor = typeColor;

    // Content with Checkbox
    el.innerHTML = `
        <div style="display: flex; gap: 6px; align-items: flex-start; height: 100%; overflow: hidden;">
            <input type="checkbox" class="event-checkbox" ${task.completed ? 'checked' : ''} style="margin-top: 3px; cursor: pointer;">
            <div style="flex: 1; min-width: 0;">
                <strong style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(task.title)}</strong>
                <small>${task.startTime || ''} - ${task.endTime || ''}</small>
                ${task.hasMeet ? '<br><i class="fa-solid fa-video" style="font-size: 10px; margin-top: 2px;"></i>' : ''}
            </div>
        </div>
    `;

    // Handle Checkbox Click
    const checkbox = el.querySelector('.event-checkbox');
    checkbox.onclick = (e) => {
        e.stopPropagation(); // Prevent opening modal
        toggleComplete(task.id);
    };

    // Handle Card Click
    el.onclick = (e) => {
        openModal(task.id);
    };

    return el;
}

function toggleComplete(taskId) {
    let tasks = getTasks();
    const taskIndex = tasks.findIndex(t => t.id == taskId);
    if (taskIndex > -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveTasks(tasks);
        renderMainView();
    }
}

// --- Modal & Create Logic ---

// Toggle Meet Link UI
function toggleMeetLink(forceState = null) {
    const btn = document.getElementById('addMeetBtn');
    const display = document.getElementById('meetLinkDisplay');

    // If forceState is provided (true = show link, false = show button)
    // If null, toggle based on current display
    const showLink = forceState !== null ? forceState : btn.style.display !== 'none';

    if (showLink) {
        btn.style.display = 'none';
        display.classList.remove('hidden');
    } else {
        btn.style.display = 'flex';
        display.classList.add('hidden');
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    // Check if mobile or desktop
    if (window.innerWidth <= 900) {
        // Mobile Behavior: Slide in/out with overlay
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');

        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    } else {
        // Desktop Behavior: Collapse/Expand
        sidebar.classList.toggle('closed');
    }
}

function openModal(editId = null, prefillDate = null) {
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDate = document.getElementById('modalDate');
    const modalStart = document.getElementById('modalStart');
    const modalEnd = document.getElementById('modalEnd');
    const modalDesc = document.getElementById('modalDesc');
    const modalEditId = document.getElementById('modalEditId');
    const modalLocation = document.getElementById('modalLocation'); // New

    // Reset UI
    document.getElementById('moreOptionsMenu').classList.add('hidden');
    modal.classList.remove('hidden');
    toggleMeetLink(false); // Reset to "Add Button"
    modalLocation.value = '';

    const deleteBtn = document.querySelector('.menu-item.delete');
    if (deleteBtn) deleteBtn.style.display = editId ? 'flex' : 'none';

    if (editId) {
        // Edit Mode
        const tasks = getTasks();
        const task = tasks.find(t => t.id == editId);
        if (task) {
            modalTitle.value = task.title;
            modalDate.value = task.date;
            modalStart.value = task.startTime;
            modalEnd.value = task.endTime;
            modalDesc.value = task.description || '';
            modalEditId.value = task.id;
            modalLocation.value = task.location || ''; // Load location

            // Load Meet Link Status
            if (task.hasMeet) toggleMeetLink(true);

            // Set Type
            let type = task.type || 'event';
            // Switch tab Logic
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
                if (b.textContent.toLowerCase().includes(type)) {
                    b.classList.add('active');
                    switchTab(b, type); // Trigger visibility logic
                }
            });
        }
    } else {
        // Create Mode
        modalEditId.value = '';
        modalTitle.value = '';
        modalDesc.value = '';

        modalDate.value = prefillDate || formatDate(new Date());

        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);
        const endHour = new Date(nextHour);
        endHour.setHours(nextHour.getHours() + 1);

        const pad = n => n.toString().padStart(2, '0');
        modalStart.value = `${pad(nextHour.getHours())}:${pad(nextHour.getMinutes())}`;
        modalEnd.value = `${pad(endHour.getHours())}:${pad(endHour.getMinutes())}`;

        // Default Tab -> Event
        const eventBtn = document.querySelector('.tab-btn'); // Assuming first is Event
        eventBtn.classList.add('active');
        switchTab(eventBtn, 'event');
    }

    modalTitle.focus();
}

function closeModal() {
    document.getElementById('eventModal').classList.add('hidden');
    document.getElementById('moreOptionsMenu').classList.add('hidden');
}

function switchTab(btn, type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Show/Hide Event Fields
    const eventFields = document.getElementById('eventFields');
    if (eventFields) { // Check if exists
        if (type === 'event') {
            eventFields.classList.remove('hidden');
        } else {
            eventFields.classList.add('hidden');
        }
    }
}

function toggleMoreOptions() {
    const menu = document.getElementById('moreOptionsMenu');
    menu.classList.toggle('hidden');
}

function focusEdit() {
    document.getElementById('moreOptionsMenu').classList.add('hidden');
    document.getElementById('modalTitle').focus();
}

function deleteCurrentTask() {
    const editId = document.getElementById('modalEditId').value;
    if (!editId) return;

    if (confirm("Delete this event?")) {
        let tasks = getTasks();
        tasks = tasks.filter(t => t.id != editId);
        saveTasks(tasks);
        renderMainView();
        closeModal();
    }
}

function saveTaskFromModal() {
    const title = document.getElementById('modalTitle').value.trim();
    const date = document.getElementById('modalDate').value;
    const startTime = document.getElementById('modalStart').value;
    const endTime = document.getElementById('modalEnd').value;
    const desc = document.getElementById('modalDesc').value;
    const editId = document.getElementById('modalEditId').value;
    const location = document.getElementById('modalLocation').value;

    // Check Meet Link State (if display is visible)
    const meetDisplay = document.getElementById('meetLinkDisplay');
    const hasMeet = meetDisplay && !meetDisplay.classList.contains('hidden');

    if (!title) {
        alert("Please add a title");
        return;
    }

    if (startTime >= endTime) {
        alert("End time must be after start time");
        return;
    }

    let tasks = getTasks();
    const activeTab = document.querySelector('.tab-btn.active');
    let type = 'event';
    if (activeTab) {
        if (activeTab.textContent.includes('Task')) type = 'task';
        else if (activeTab.textContent.includes('Appointment')) type = 'appointment';
    }

    if (editId) {
        const index = tasks.findIndex(t => t.id == editId);
        if (index > -1) {
            tasks[index].title = title;
            tasks[index].date = date;
            tasks[index].startTime = startTime;
            tasks[index].endTime = endTime;
            tasks[index].description = desc;
            tasks[index].type = type;
            tasks[index].location = location; // Save Location
            tasks[index].hasMeet = hasMeet;   // Save Meet Status
        }
    } else {
        const newTask = {
            id: Date.now(),
            title: title,
            date: date,
            startTime: startTime,
            endTime: endTime,
            description: desc,
            completed: false,
            type: type,
            location: location,
            hasMeet: hasMeet
        };
        tasks.push(newTask);
    }

    saveTasks(tasks);
    renderMainView();
    closeModal();
}

function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
