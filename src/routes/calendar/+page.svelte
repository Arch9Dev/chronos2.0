<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let user: any = null;
  let calendars: any[] = [];
  let tasks: any[] = [];
  let error: string | null = null;
  let currentDate = new Date();
  let calendarDays: Array<{ date: number; isCurrentMonth: boolean; isToday: boolean; tasks?: any[] }> = [];



  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // ✅ Generate calendar with attached tasks
  function generateCalendar(date: Date, taskList = tasks) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday start

    const days = [];
    const prevMonth = new Date(year, month, 0);

    // Previous month filler days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonth.getDate() - i,
        isCurrentMonth: false,
        isToday: false,
        tasks: []
      });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

      const dayTasks = (taskList ?? []).filter((t) => {
        if (!t.deadline) return false;
        const due = new Date(t.deadline);
        return (
          due.getFullYear() === year &&
          due.getMonth() === month &&
          due.getDate() === day
        );
      });

      days.push({
        date: day,
        isCurrentMonth: true,
        isToday,
        tasks: dayTasks
      });
    }

    // Fillers for next month
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        date: day,
        isCurrentMonth: false,
        isToday: false,
        tasks: []
      });
    }

    calendarDays = days;
  }

  // ✅ Navigation
  function previousMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  }
  function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }
  function goToToday() {
    currentDate = new Date();
  }

  // ✅ Fetch user, calendars, and tasks
  onMount(async () => {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      goto('/login');
      return;
    }

    user = currentUser;

    const { data: calendarsData, error: calError } = await supabase
      .from('calendars')
      .select('*')
      .eq('user_id', currentUser.id);

    if (calError) {
      error = calError.message;
      return;
    }

    calendars = calendarsData ?? [];

    if (calendars.length === 0) {
      tasks = [];
      generateCalendar(currentDate);
      return;
    }

    const { data: tasksData, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, description, deadline, priority, completed, calendar_id')
      .in('calendar_id', calendars.map((c) => c.id));

    if (taskError) {
      error = taskError.message;
      return;
    }

    tasks = (tasksData ?? []).map((t) => ({
      ...t,
      deadline: t.deadline ? new Date(t.deadline) : null
    }));

    // ✅ Force calendar refresh once tasks are ready
    generateCalendar(currentDate);
  });

  // ✅ Regenerate when month OR tasks change
  $: generateCalendar(currentDate, tasks);

  // ✅ Split into weeks
  $: calendarRows = calendarDays.reduce((rows, day, index) => {
    if (index % 7 === 0) rows.push([]);
    rows[rows.length - 1].push(day);
    return rows;
  }, [] as Array<Array<{ date: number; isCurrentMonth: boolean; isToday: boolean; tasks?: any[] }>>);

  // ✅ Task click preview
  function viewTask(task: any) {
    alert(`📝 ${task.title}\n\n${task.description || 'No description.'}`);
  }
</script>

<main class="calendar-page">
  <header class="calendar-header">
    <h1>Welcome, {user?.email}</h1>
    <nav class="calendar-nav">
      <a href="/calendar">Calendar</a>
      <a href="/view">View Tasks</a>
      <a href="/settings">Settings</a>
    </nav>
    <img src="/logo.svg" alt="Logo" class="chronos-logo" />
  </header>

  <section class="calendar-body">
    <aside class="task-key">
      <h3>Task Priority</h3>
      <ul>
        <li><span class="dot low"></span>Low Priority</li>
        <li><span class="dot medium"></span>Medium Priority</li>
        <li><span class="dot high"></span>High Priority</li>
      </ul>
    </aside>

    <div class="calendar-container">
      <div class="calendar-header-section">
        <h2 class="calendar-title">Calendar</h2>
        <div class="month-navigation">
          <button class="nav-btn" on:click={previousMonth} aria-label="Previous month">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 16L6 10L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="month-display">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <button class="nav-btn" on:click={nextMonth} aria-label="Next month">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M8 4L14 10L8 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <table class="calendar-table">
        <thead>
          <tr>
            <th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th>
            <th>Fri</th><th>Sat</th><th>Sun</th>
          </tr>
        </thead>
        <tbody>
          {#each calendarRows as row}
            <tr>
              {#each row as day}
                <td
                  class="calendar-day"
                  class:other-month={!day.isCurrentMonth}
                  class:today={day.isToday}
                >
                  <div class="day-content">
                    <span class="day-number">{day.date}</span>

                    {#if day.tasks && day.tasks.length > 0}
                      <ul class="task-list">
                        {#each day.tasks as task}
                          <button
                            type="button"
                            class="task-item {task.priority} {task.completed ? 'completed' : ''}"
                            title={task.description}
                            on:click={() => viewTask(task)}
                            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && viewTask(task)}
                          >
                            <span class="task-dot"></span>
                            <span class="task-text">{task.title}</span>
                          </button>
                        {/each}
                      </ul>
                    {/if}
                  </div>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <aside class="task-controls">
      <a class="add-task-btn" href="/tasks">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Add New Task
      </a>
    </aside>
  </section>
</main>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  * {
    box-sizing: border-box;
  }

  .calendar-page {
    background-image: url('/Bg.svg');
    background-size: cover;
    background-attachment: fixed;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  .calendar-header {
    background: #f6d7b0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 2.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .calendar-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #323e55;
    margin: 0;
  }

  .chronos-logo {
    max-height: 40px;
    object-fit: contain;
  }

  .calendar-nav {
    display: flex;
    gap: 2rem;
    align-items: center;
  }

  .calendar-nav a {
    font-size: 1rem;
    text-decoration: none;
    font-weight: 500;
    color: #323e55;
    padding: 0.5rem 0;
    transition: all 0.2s ease;
    border-bottom: 2px solid transparent;
  }

  .calendar-nav a:hover {
    color: #1a2332;
    border-bottom-color: #323e55;
  }

  .calendar-body {
    display: grid;
    grid-template-columns: 220px 1fr 220px;
    gap: 1.5rem;
    padding: 2rem 2.5rem;
    flex: 1;
    max-width: 1600px;
    width: 100%;
    margin: 0 auto;
  }

  .task-key {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    height: fit-content;
  }

  .task-key h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #323e55;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .task-key ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .task-key li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    font-size: 0.9rem;
    color: #5a6a7f;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot.low { 
    background: #22c55e;
  }
  
  .dot.medium { 
    background: #f59e0b;
  }
  
  .dot.high { 
    background: #ef4444;
  }

  .calendar-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .calendar-header-section {
    background: linear-gradient(135deg, #323e55 0%, #4a5568 100%);
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .calendar-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin: 0;
    letter-spacing: 0.5px;
  }

  .month-navigation {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 8px;
  }

  .month-display {
    font-size: 1.1rem;
    font-weight: 500;
    color: white;
    min-width: 180px;
    text-align: center;
  }

  .nav-btn {
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: white;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.05);
  }

  .nav-btn:active {
    transform: scale(0.95);
  }

  .calendar-table {
    width: 100%;
    border-collapse: collapse;
  }

  .calendar-table thead th {
    background: #f9fafb;
    padding: 1rem;
    font-weight: 600;
    font-size: 0.85rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #e5e7eb;
  }

  .calendar-table tbody td {
    border: 1px solid #e5e7eb;
    padding: 0;
    height: 110px;
    vertical-align: top;
    position: relative;
  }

  .day-content {
    padding: 0.75rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .day-number {
    font-size: 0.9rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
    display: inline-block;
  }

  .calendar-day.other-month .day-number {
    color: #d1d5db;
  }

  .calendar-day.other-month {
    background: #fafafa;
  }

  .calendar-day.today {
    background: #eff6ff;
  }

  .calendar-day.today .day-number {
    background: #323e55;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .task-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    overflow-y: auto;
    flex: 1;
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    transition: background 0.15s ease;
  }

  .task-item:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  .task-item.low {
    border-left: 3px solid #22c55e;
  }

  .task-item.medium {
    border-left: 3px solid #f59e0b;
  }

  .task-item.high {
    border-left: 3px solid #ef4444;
  }

  .task-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: currentColor;
  }

  .task-item.low .task-dot {
    color: #22c55e;
  }

  .task-item.medium .task-dot {
    color: #f59e0b;
  }

  .task-item.high .task-dot {
    color: #ef4444;
  }

  .task-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #374151;
    flex: 1;
  }

  .task-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .add-task-btn {
    background: #323e55;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(50, 62, 85, 0.2);
  }

  .add-task-btn:hover {
    background: #2a3546;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(50, 62, 85, 0.3);
  }

  .add-task-btn:active {
    transform: translateY(0);
  }

  @media (max-width: 1200px) {
    .calendar-body {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .task-key,
    .task-controls {
      display: none;
    }
  }
</style>