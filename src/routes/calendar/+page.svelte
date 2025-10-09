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

  function generateCalendar(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

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

      const dayTasks = tasks.filter((t) => {
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

    // Next month filler days
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

  function previousMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  }

  function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  function goToToday() {
    currentDate = new Date();
  }

  // --- Fetch user, calendars, and tasks ---
  onMount(async () => {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      goto('/login');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      error = profileError.message;
      return;
    }

    user = { ...currentUser, username: profile?.username };

    const { data: calendarsData, error: calError } = await supabase.from('calendars').select('*');
    if (calError) {
      error = calError.message;
      return;
    }

    calendars = calendarsData ?? [];

    const { data: tasksData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .in('calendar_id', calendars.map((c) => c.id));

    if (taskError) {
      error = taskError.message;
      return;
    }

    tasks = tasksData ?? [];
  });

  // --- Reactive: regenerate calendar when tasks or date change ---
  $: if (tasks.length > 0 || currentDate) {
    generateCalendar(currentDate);
  }

  // --- Create rows of 7 days for display ---
  $: calendarRows = calendarDays.reduce((rows, day, index) => {
    if (index % 7 === 0) rows.push([]);
    rows[rows.length - 1].push(day);
    return rows;
  }, [] as Array<Array<{ date: number; isCurrentMonth: boolean; isToday: boolean; tasks?: any[] }>>);
</script>

<main class="calendar-page">
  <header class="calendar-header">
    <h1>Welcome {user?.username}</h1>
    <nav class="calendar-nav">
      <a href="/calendars">Main Calendar</a>
      <a href="/calendars/add_calendar">Add Calendar</a>
      <a href="/calendars/view">View Calendars</a>
      <a href="/tasks/view">View Tasks</a>
      <a href="/tasks/upcoming">Upcoming</a>
    </nav>
    <img src="/logo.svg" alt="Logo" class="chronos-logo" />
  </header>

  <section class="calendar-body">
    <aside class="task-key">
      <h3>TASK KEY</h3>
      <ul>
        <li><span class="dot low"></span> = LOW</li>
        <li><span class="dot medium"></span> = MEDIUM</li>
        <li><span class="dot high"></span> = HIGH</li>
      </ul>
    </aside>

    <div class="calendar-container">
      <table class="calendar-table">
        <thead>
          <tr>
            <th colspan="7" class="calendar-title">
              <div class="calendar-header-controls">
                <span>CALENDAR</span>
              </div>
            </th>
          </tr>
          <tr>
            <th colspan="7" class="calendar-subtitle">
              <div class="month-header">
                <button class="nav-btn" onclick={previousMonth}>‹</button>
                <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                <button class="nav-btn" onclick={nextMonth}>›</button>
              </div>
            </th>
          </tr>
          <tr>
            <th>MON</th>
            <th>TUE</th>
            <th>WED</th>
            <th>THU</th>
            <th>FRI</th>
            <th>SAT</th>
            <th>SUN</th>
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
                  <span class="day-number">{day.date}</span>
                  {#if day.tasks && day.tasks.length > 0}
                    <ul class="task-list">
                      {#each day.tasks as task}
                        <li class="task-item">
                          <span class="dot {task.priority}"></span>
                          {task.title}
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <aside class="task-controls">
      <a class="add-task" href="/tasks">Add new Task</a>
    </aside>
  </section>
</main>

<style>
  .task-list {
    margin: 0.25rem 0 0;
    padding: 0;
    list-style: none;
    font-size: 0.8rem;
    text-align: left;
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 2px 0;
  }

  .task-item .dot {
    width: 10px;
    height: 10px;
  }

  .calendar-page {
    background-image: url('/Bg.svg');
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .calendar-header {
    background: #f6d7b0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
  }

  .calendar-header h1 {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .chronos-logo {
    max-height: 30px;
    object-fit: contain;
  }

  .calendar-nav {
    display: flex;
    gap: 2rem;
  }

  .calendar-nav a {
    font-size: 1.1rem;
    text-decoration: none;
    font-weight: bold;
    color: #323e55;
  }

  .calendar-nav a:hover {
    color: #000;
    border-bottom: 2px solid #323e55;
  }

  .calendar-body {
    display: grid;
    grid-template-columns: 200px 1fr 200px;
    padding: 2rem;
    flex: 1;
  }

  .task-key {
    background: #f6d7b0;
    border-radius: 0.5rem;
    padding: 1rem;
    font-size: 0.9rem;
    height: 10rem;
  }

  .dot {
    display: inline-block;
    width: 15px;
    height: 15px;
    border-radius: 50%;
  }

  .dot.low { background: green; }
  .dot.medium { background: orange; }
  .dot.high { background: red; }

  .calendar-container {
    background: #fff;
    border-radius: 1rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    overflow: hidden;
  }

  .calendar-table {
    width: 100%;
    border-collapse: collapse;
    text-align: center;
  }

  .calendar-title {
    font-size: 1.5rem;
    font-weight: bold;
    padding: 1rem;
  }

  .calendar-subtitle {
    font-size: 1.2rem;
    font-weight: bold;
    background: #d8a15c;
    padding: 0.75rem;
  }

  .month-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .nav-btn:hover {
    background: rgba(0,0,0,0.1);
  }

  .calendar-table th {
    border: 1px solid #ddd;
    padding: 1rem;
    height: 30px;
    vertical-align: top;
  }

  .calendar-table td {
    border: 1px solid #ddd;
    padding: 1rem;
    height: 60px;
    vertical-align: top;
  }

  .calendar-table th {
    background: #f6d7b0;
  }

  .calendar-day.other-month {
    color: #ccc;
    background: #fafafa;
  }

  .calendar-day.today {
    background: #8eaebb;
    font-weight: bold;
  }

  .calendar-day.today .day-number {
    background: #323e55;
    color: #f6d7b0;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .task-controls {
    display: flex;
    justify-content: center;
    align-items: start;
  }

  .add-task {
    background: #323e55;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: bold;
  }

  .add-task:hover {
    background: #2f3b57;
  }
</style>
