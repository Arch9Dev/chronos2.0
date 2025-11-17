<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let user: any = null;
	let tasks: any[] = [];
	let error: string | null = null;
	let loading = true;
	let currentDate = new Date();
	let selectedTask: any = null;

	let showModal = false;
	let newPriority = '';
	let newDeadline = '';
	let newDescription = '';

	// View mode: 'day' | 'week' | 'month' | 'year'
	let currentView = 'month';

	// Recurrence fields
	let newRecurrenceType = '';
	let newRecurrenceInterval: number | null = 1;
	let newRecurrenceEnd: string = '';

	// Fetch current user and tasks
	onMount(async () => {
		const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
		if (authError || !currentUser) {
			goto('/login');
			return;
		}
		user = currentUser;
		await loadTasks();
	});

	// Load all tasks
	async function loadTasks() {
		const { data: fetchedTasks, error: fetchError } = await supabase
			.from('tasks')
			.select('*')
			.eq('user_id', user.id)
			.order('deadline', { ascending: true });

		if (fetchError) {
			error = fetchError.message;
		} else {
			tasks = fetchedTasks || [];
		}
		loading = false;
	}

	// Utility: get month name
	function getMonthName(date: Date) {
		return date.toLocaleString('default', { month: 'long', year: 'numeric' });
	}

	function changeMonth(offset: number) {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
	}

	function changeView(offset: number) {
		if (currentView === 'day') {
			currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + offset);
		} else if (currentView === 'week') {
			currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + offset * 7);
		} else if (currentView === 'month') {
			changeMonth(offset);
		} else if (currentView === 'year') {
			currentDate = new Date(currentDate.getFullYear() + offset, currentDate.getMonth(), 1);
		}
	}

	function getViewLabel() {
		if (currentView === 'day') {
			return currentDate.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
		} else if (currentView === 'week') {
			const startOfWeek = new Date(currentDate);
			startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6);
			return `${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
		} else if (currentView === 'month') {
			return getMonthName(currentDate);
		} else if (currentView === 'year') {
			return currentDate.getFullYear().toString();
		}
	}

	function isToday(date: Date) {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	}

	// Generate occurrences for a recurring task between start and end
	function generateOccurrences(task: any, start: Date, end: Date) {
		const occurrences: Date[] = [];
		if (!task.recurrence_type || !task.deadline) return occurrences;

		const startDate = new Date(task.deadline);
		const recurrenceEnd = task.recurrence_end ? new Date(task.recurrence_end) : end;
		const interval = task.recurrence_interval || 1;

		let current = new Date(startDate);

		while (current <= end && current <= recurrenceEnd) {
			if (current >= start) occurrences.push(new Date(current));

			switch (task.recurrence_type) {
				case 'daily':
					current.setDate(current.getDate() + interval);
					break;
				case 'weekly':
					current.setDate(current.getDate() + 7 * interval);
					break;
				case 'monthly':
					current.setMonth(current.getMonth() + interval);
					break;
				case 'yearly':
					current.setFullYear(current.getFullYear() + interval);
					break;
				default:
					return occurrences;
			}
		}

		return occurrences;
	}

	// Build calendar days
	function getCalendarDays() {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startDay = firstDay.getDay();

		const days: { date: Date; tasks: any[]; currentMonth: boolean }[] = [];

		// Previous month padding
		for (let i = 0; i < startDay; i++) {
			const date = new Date(year, month, i - startDay + 1);
			days.push({ date, tasks: [], currentMonth: false });
		}

		// Current month
		for (let d = 1; d <= daysInMonth; d++) {
			const dateObj = new Date(year, month, d);

			const dayTasks = tasks.filter((t) => {
				if (!t.deadline) return false;
				const taskDate = new Date(t.deadline);

				// Direct match
				if (
					taskDate.getFullYear() === year &&
					taskDate.getMonth() === month &&
					taskDate.getDate() === d
				) return true;

				// Recurring match
				const occurrences = generateOccurrences(
					t,
					new Date(year, month, 1),
					new Date(year, month + 1, 0)
				);
				return occurrences.some(
					occ => occ.getFullYear() === year && occ.getMonth() === month && occ.getDate() === d
				);
			});

			days.push({ date: dateObj, tasks: dayTasks, currentMonth: true });
		}

		// Next month padding
		const totalCells = Math.ceil(days.length / 7) * 7;
		for (let i = days.length; i < totalCells; i++) {
			const date = new Date(year, month, i - startDay + 1);
			days.push({ date, tasks: [], currentMonth: false });
		}

		return days;
	}

	$: calendarDays = tasks && currentDate ? getCalendarDays() : [];

	// Get tasks for a specific date
	function getTasksForDate(date: Date) {
		return tasks.filter((t) => {
			if (!t.deadline) return false;
			const taskDate = new Date(t.deadline);
			const year = date.getFullYear();
			const month = date.getMonth();
			const day = date.getDate();

			// Direct match
			if (
				taskDate.getFullYear() === year &&
				taskDate.getMonth() === month &&
				taskDate.getDate() === day
			) return true;

			// Recurring match
			const occurrences = generateOccurrences(
				t,
				new Date(year, month, day),
				new Date(year, month, day, 23, 59, 59)
			);
			return occurrences.some(
				occ => occ.getFullYear() === year && occ.getMonth() === month && occ.getDate() === day
			);
		});
	}

	// Get week days starting from Sunday
	function getWeekDays() {
		const startOfWeek = new Date(currentDate);
		startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
		
		const days = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek);
			date.setDate(startOfWeek.getDate() + i);
			days.push({
				date,
				tasks: getTasksForDate(date)
			});
		}
		return days;
	}

	// Get all months for year view
	function getYearMonths() {
		const year = currentDate.getFullYear();
		const months = [];
		
		for (let month = 0; month < 12; month++) {
			const monthDate = new Date(year, month, 1);
			const daysInMonth = new Date(year, month + 1, 0).getDate();
			
			let taskCount = 0;
			for (let day = 1; day <= daysInMonth; day++) {
				const date = new Date(year, month, day);
				taskCount += getTasksForDate(date).length;
			}
			
			months.push({
				name: monthDate.toLocaleString('default', { month: 'long' }),
				monthIndex: month,
				taskCount
			});
		}
		return months;
	}

	$: weekDays = currentView === 'week' ? getWeekDays() : [];
	$: dayTasks = currentView === 'day' ? getTasksForDate(currentDate) : [];
	$: yearMonths = currentView === 'year' ? getYearMonths() : [];

	// Open modal for editing
	function openEdit(task: any) {
		selectedTask = { ...task };
		newPriority = task.priority;
		newDeadline = task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '';
		newDescription = task.description || '';

		newRecurrenceType = task.recurrence_type || '';
		newRecurrenceInterval = task.recurrence_interval || 1;
		newRecurrenceEnd = task.recurrence_end ? new Date(task.recurrence_end).toISOString().slice(0, 10) : '';

		showModal = true;
	}

	// Update task
	async function updateTask() {
		if (!selectedTask) return;

		const { error: updateError } = await supabase
			.from('tasks')
			.update({
				description: newDescription,
				priority: newPriority,
				deadline: newDeadline,
				recurrence_type: newRecurrenceType || null,
				recurrence_interval: newRecurrenceType ? newRecurrenceInterval : null,
				recurrence_end: newRecurrenceType && newRecurrenceEnd ? newRecurrenceEnd : null
			})
			.eq('id', selectedTask.id);

		if (updateError) {
			alert('Error updating task: ' + updateError.message);
			return;
		}

		tasks = tasks.map((t) =>
			t.id === selectedTask.id
				? {
						...t,
						description: newDescription,
						priority: newPriority,
						deadline: newDeadline,
						recurrence_type: newRecurrenceType,
						recurrence_interval: newRecurrenceInterval,
						recurrence_end: newRecurrenceEnd
				  }
				: t
		);
		showModal = false;
	}

	// Delete task
	async function deleteTask() {
		if (!selectedTask) return;
		if (!confirm('Are you sure you want to delete this task?')) return;

		const { error: delErr } = await supabase.from('tasks').delete().eq('id', selectedTask.id);
		if (delErr) {
			alert('Error deleting task: ' + delErr.message);
			return;
		}

		const deletedTaskId = selectedTask.id;
		showModal = false;
		selectedTask = null;
		tasks = [...tasks.filter((t) => t.id !== deletedTaskId)];
	}
</script>

<main class="calendar-page">
	<aside class="sidebar">
		<div class="sidebar-logo">
			<a href="/" class="home-btn">CHRONOS</a>
		</div>
		<nav class="sidebar-nav">
			<a href="/calendar" class="active">Calendar</a>
			<a href="/view">View Tasks</a>
			<a href="/create-task">Create Task</a>
			<hr />
			<a href="/login">Log Out</a>
		</nav>
		<div class="sidebar-user">
			<p>{user?.email}</p>
		</div>
	</aside>

	<section class="calendar-content">
		<header class="calendar-controls">
			<button class="nav-btn" on:click={() => changeView(-1)}>← Prev</button>
			<h2 class="month-label">{getViewLabel()}</h2>
			<div class="nav-btn-group">
				<button class="nav-btn" on:click={() => changeView(1)}>Next →</button>
				<button class="nav-btn today-btn" on:click={() => (currentDate = new Date())}>TODAY</button>
			</div>
		</header>

		<div class="view-selector">
			<button class="view-btn {currentView === 'day' ? 'active' : ''}" on:click={() => currentView = 'day'}>Day</button>
			<button class="view-btn {currentView === 'week' ? 'active' : ''}" on:click={() => currentView = 'week'}>Week</button>
			<button class="view-btn {currentView === 'month' ? 'active' : ''}" on:click={() => currentView = 'month'}>Month</button>
			<button class="view-btn {currentView === 'year' ? 'active' : ''}" on:click={() => currentView = 'year'}>Year</button>
		</div>

		{#if loading}
			<div class="loading">Loading calendar...</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else if currentView === 'day'}
			<!-- Day View -->
			<section class="day-view">
				<div class="day-header">
					<h3>{currentDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
					<p class="task-count">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</p>
				</div>
				<div class="day-tasks">
					{#if dayTasks.length === 0}
						<p class="no-tasks">No tasks scheduled for this day</p>
					{:else}
						{#each dayTasks as task}
							<button
								class="day-task-item {task.priority} {task.completed ? 'done' : ''}"
								type="button"
								on:click={() => openEdit(task)}
							>
								<div class="task-title">{task.title}</div>
								{#if task.description}
									<div class="task-desc">{task.description}</div>
								{/if}
								<div class="task-meta">
									<span class="priority-badge {task.priority}">{task.priority}</span>
									{#if task.deadline}
										<span class="time">{new Date(task.deadline).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}</span>
									{/if}
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</section>
		{:else if currentView === 'week'}
			<!-- Week View -->
			<section class="week-view">
				<div class="week-grid">
					{#each weekDays as day}
						<div class="week-day {isToday(day.date) ? 'today' : ''}">
							<div class="week-day-header">
								<div class="weekday-name">{day.date.toLocaleDateString('default', { weekday: 'short' })}</div>
								<div class="day-number">{day.date.getDate()}</div>
							</div>
							<div class="week-tasks">
								{#if day.tasks.length === 0}
									<p class="no-tasks-small">No tasks</p>
								{:else}
									{#each day.tasks as task}
										<button
											class="week-task-item {task.priority} {task.completed ? 'done' : ''}"
											type="button"
											on:click={() => openEdit(task)}
										>
											<div class="task-title-small">{task.title}</div>
											{#if task.deadline}
												<div class="task-time">{new Date(task.deadline).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}</div>
											{/if}
										</button>
									{/each}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{:else if currentView === 'year'}
			<!-- Year View -->
			<section class="year-view">
				<div class="year-grid">
					{#each yearMonths as month}
						<button
							class="year-month"
							on:click={() => {
								currentDate = new Date(currentDate.getFullYear(), month.monthIndex, 1);
								currentView = 'month';
							}}
						>
							<div class="month-name">{month.name}</div>
							<div class="month-task-count">{month.taskCount} task{month.taskCount !== 1 ? 's' : ''}</div>
						</button>
					{/each}
				</div>
			</section>
		{:else}
			<!-- Month View (existing) -->
			<section class="calendar-container">
				<div class="calendar-header-row">
					{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
						<div class="weekday">{day}</div>
					{/each}
				</div>

				<div class="calendar-grid">
					{#each calendarDays as day}
						<div
							class="day-cell {isToday(day.date) ? 'today' : ''} {day.currentMonth
								? ''
								: 'other-month'}"
						>
							<div class="date">{day.date.getDate()}</div>

							{#if day.currentMonth && day.tasks.length > 0}
								<ul class="task-list">
									{#each day.tasks.slice(0, 3) as task}
										<li>
											<button
												class="task-item {task.priority} {task.completed ? 'done' : ''}"
												type="button"
												on:click={() => openEdit(task)}
											>
												{task.title}
											</button>
										</li>
									{/each}
									{#if day.tasks.length > 3}
										<li class="task-more">+{day.tasks.length - 3} more</li>
									{/if}
								</ul>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</section>

	{#if showModal}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-overlay" on:click={() => (showModal = false)}>
			<div class="modal" on:click|stopPropagation>
				<h2>{selectedTask.title}</h2>

				<div class="form-group">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Description:</label>
					<textarea bind:value={newDescription} rows="4" placeholder="Optional description"></textarea>
				</div>

				<div class="form-group">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Priority:</label>
					<select bind:value={newPriority}>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</div>

				<div class="form-group">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Deadline:</label>
					<input type="datetime-local" bind:value={newDeadline} />
				</div>

				<div class="form-group">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Recurrence:</label>
					<select bind:value={newRecurrenceType}>
						<option value="">Does not repeat</option>
						<option value="daily">Daily</option>
						<option value="weekly">Weekly</option>
						<option value="monthly">Monthly</option>
						<option value="yearly">Yearly</option>
					</select>
				</div>

				{#if newRecurrenceType}
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<div class="form-group">
						<label>Repeat every (interval):</label>
						<input type="number" min="1" bind:value={newRecurrenceInterval} />
					</div>
					<div class="form-group">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>End Date (optional):</label>
						<input type="date" bind:value={newRecurrenceEnd} min={newDeadline ? newDeadline.slice(0,10) : ''} />
					</div>
				{/if}

				<div class="modal-actions">
					<button class="save" on:click={updateTask}>Save</button>
					<button class="delete" on:click={deleteTask}>Delete</button>
					<button class="cancel" on:click={() => (showModal = false)}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}
</main>


<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	.calendar-page {
		display: flex;
		min-height: 100vh;
		background: #323e55;
		color: #f6d7b0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.sidebar {
		width: 260px;
		background: #2a3648;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 2rem 1.5rem;
		box-shadow: 4px 0 20px rgba(0, 0, 0, 0.25);
	}

	.sidebar-logo {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		margin-bottom: 2rem;
	}

	.sidebar-logo a {
		text-decoration: none;
		font-family: Georgia, serif;
		font-size: 1.8rem;
		letter-spacing: 0.08em;
		color: #d8a15c;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sidebar-nav a {
		text-decoration: none;
		color: #f6d7b0;
		font-size: 1rem;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		transition: all 0.3s ease;
	}

	.sidebar-nav a:hover,
	.sidebar-nav a.active {
		background: #d8a15c;
		color: #323e55;
		font-weight: 600;
	}

	.sidebar-nav hr {
		border: 1px solid rgba(255, 255, 255, 0.1);
		margin: 1rem 0;
	}

	.sidebar-user {
		text-align: center;
		font-size: 0.9rem;
		color: #c4c4c4;
		margin-top: 1rem;
	}

	.calendar-content {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		padding: 2rem;
	}

	.view-selector {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.view-btn {
		background: #2a3648;
		color: #f6d7b0;
		border: none;
		padding: 0.6rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.3s ease;
	}

	.view-btn:hover {
		background: #d8a15c;
		color: #323e55;
	}

	.view-btn.active {
		background: #d8a15c;
		color: #323e55;
	}

	.calendar-controls {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		background: #d8a15c;
		color: #323e55;
		padding: 1rem 2rem;
		border-radius: 16px;
		margin-bottom: 2rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}

	.nav-btn {
		background: #323e55;
		color: #f6d7b0;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.3s ease;
	}

	.nav-btn-group {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.today-btn {
		background: #323e55;
		color: #f0b868;
		font-weight: 650;
	}

	.today-btn:hover {
		background: #f0b868;
		color: #fff;
	}

	.nav-btn:hover {
		background: #2a3648;
	}

	.calendar-container {
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
		padding-bottom: 1rem;
		color: #323e55;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		height: 100%;
	}

	.calendar-header-row {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-weight: 600;
		background: #f6d7b0;
		color: #323e55;
		padding: 0.75rem 0;
		border-top-left-radius: 16px;
		border-top-right-radius: 16px;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		grid-template-rows: repeat(6, 1fr);
		border-top: 1px solid #eee;
		flex-grow: 1;
		height: calc(100vh - 250px);
		min-height: 600px;
		max-height: 80vh;
		transition: height 0.3s ease;
	}

	.day-cell {
		border: 1px solid #f3f4f6;
		padding: 0.5rem;
		background: #fff;
		transition: all 0.2s ease;
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		overflow: hidden;
	}

	.day-cell.today {
		box-shadow: inset 0 0 0 2px #d8a15c;
		background: #fffaf1;
	}

	.day-cell.other-month {
		background: #fafafa;
		color: #c0c0c0;
	}

	.day-cell:hover {
		background: #f9f7f4;
	}

	.date {
		font-weight: 600;
		margin-bottom: 0.3rem;
		font-size: clamp(0.8rem, 1vw, 1rem);
	}

	.task-list {
		list-style: none;
		padding: 0;
		margin: 0;
		flex-grow: 1;
		overflow-y: auto;
	}

	.task-item {
		display: block;
		padding: 0.25rem 0.4rem;
		border-radius: 4px;
		font-size: clamp(0.7rem, 0.9vw, 0.85rem);
		margin-bottom: 0.25rem;
		cursor: pointer;
		border: none;
		text-align: left;
		width: 100%;
	}

	.task-item.low {
		background: #d1fae5;
		color: #065f46;
	}
	.task-item.medium {
		background: #fed7aa;
		color: #9a3412;
	}
	.task-item.high {
		background: #fecaca;
		color: #991b1b;
	}
	.task-item.done {
		opacity: 0.6;
		text-decoration: line-through;
	}

	.task-item:hover {
		transform: translateX(2px);
		background: #f0f0f0;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 999;
		backdrop-filter: blur(4px);
	}

	.modal {
		background: #fff;
		padding: 2rem;
		border-radius: 16px;
		max-width: 400px;
		width: 90%;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
		color: #323e55;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #323e55;
	}

	.form-group select,
	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 80px;
	}

	.form-group select:focus,
	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #d8a15c;
		box-shadow: 0 0 0 3px rgba(216, 161, 92, 0.1);
	}

	.modal-actions {
		display: flex;
		justify-content: space-between;
		margin-top: 1rem;
	}

	.modal-actions button {
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	button.save {
		background: #16a34a;
		color: white;
	}

	button.save:hover {
		background: #15803d;
	}

	button.delete {
		background: #dc2626;
		color: white;
	}

	button.delete:hover {
		background: #b91c1c;
	}

	button.cancel {
		background: #6b7280;
		color: white;
	}

	button.cancel:hover {
		background: #4b5563;
	}

	/* Day View Styles */
	.day-view {
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
		padding: 2rem;
		color: #323e55;
		max-height: calc(100vh - 280px);
		overflow-y: auto;
	}

	.day-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #f6d7b0;
	}

	.day-header h3 {
		font-size: 1.8rem;
		color: #323e55;
		margin-bottom: 0.5rem;
	}

	.task-count {
		color: #6b7280;
		font-size: 1rem;
	}

	.day-tasks {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.day-task-item {
		background: #fff;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
	}

	.day-task-item:hover {
		transform: translateX(4px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.day-task-item.low {
		border-left: 4px solid #10b981;
	}
	.day-task-item.medium {
		border-left: 4px solid #f97316;
	}
	.day-task-item.high {
		border-left: 4px solid #ef4444;
	}

	.task-title {
		font-size: 1.2rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #323e55;
	}

	.task-desc {
		color: #6b7280;
		margin-bottom: 0.75rem;
		font-size: 0.95rem;
	}

	.task-meta {
		display: flex;
		gap: 1rem;
		align-items: center;
		font-size: 0.9rem;
	}

	.priority-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.75rem;
	}

	.priority-badge.low {
		background: #d1fae5;
		color: #065f46;
	}
	.priority-badge.medium {
		background: #fed7aa;
		color: #9a3412;
	}
	.priority-badge.high {
		background: #fecaca;
		color: #991b1b;
	}

	.time {
		color: #6b7280;
	}

	.no-tasks {
		text-align: center;
		color: #9ca3af;
		font-size: 1.1rem;
		padding: 3rem;
	}

	/* Week View Styles */
	.week-view {
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
		padding: 1rem;
		color: #323e55;
		overflow-x: auto;
	}

	.week-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 1rem;
		min-width: 900px;
	}

	.week-day {
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1rem;
		background: #fff;
		display: flex;
		flex-direction: column;
		min-height: 400px;
	}

	.week-day.today {
		border-color: #d8a15c;
		background: #fffaf1;
	}

	.week-day-header {
		text-align: center;
		padding-bottom: 1rem;
		border-bottom: 2px solid #f3f4f6;
		margin-bottom: 1rem;
	}

	.weekday-name {
		font-weight: 600;
		color: #6b7280;
		font-size: 0.9rem;
		margin-bottom: 0.25rem;
	}

	.day-number {
		font-size: 1.5rem;
		font-weight: 700;
		color: #323e55;
	}

	.week-tasks {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		overflow-y: auto;
	}

	.week-task-item {
		background: #f9fafb;
		border: none;
		border-left: 3px solid;
		border-radius: 6px;
		padding: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
	}

	.week-task-item.low {
		border-left-color: #10b981;
	}
	.week-task-item.medium {
		border-left-color: #f97316;
	}
	.week-task-item.high {
		border-left-color: #ef4444;
	}

	.week-task-item:hover {
		transform: translateY(-2px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.task-title-small {
		font-weight: 600;
		color: #323e55;
		font-size: 0.9rem;
		margin-bottom: 0.25rem;
	}

	.task-time {
		color: #6b7280;
		font-size: 0.8rem;
	}

	.no-tasks-small {
		text-align: center;
		color: #d1d5db;
		font-size: 0.9rem;
		padding: 1rem;
	}

	/* Year View Styles */
	.year-view {
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
		padding: 2rem;
		color: #323e55;
	}

	.year-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
	}

	.year-month {
		background: linear-gradient(135deg, #f6d7b0 0%, #d8a15c 100%);
		border: none;
		border-radius: 12px;
		padding: 2rem 1.5rem;
		cursor: pointer;
		transition: all 0.3s ease;
		text-align: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.year-month:hover {
		transform: translateY(-4px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
	}

	.month-name {
		font-size: 1.4rem;
		font-weight: 700;
		color: #323e55;
		margin-bottom: 0.75rem;
	}

	.month-task-count {
		color: #323e55;
		font-size: 1rem;
		font-weight: 600;
		opacity: 0.8;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (max-width: 768px) {
		.sidebar {
			display: none;
		}
		.calendar-content {
			padding: 1rem;
		}
	}
</style>