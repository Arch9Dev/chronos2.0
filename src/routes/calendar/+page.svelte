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

	// View mode: 'year', 'month', 'week', 'day'
	let viewMode: 'year' | 'month' | 'week' | 'day' = 'month';

	// Recurrence fields
	let newRecurrenceType = '';
	let newRecurrenceInterval: number | null = 1;
	let newRecurrenceEnd: string = '';

	// Fetch current user and tasks
	onMount(async () => {
		const {
			data: { user: currentUser },
			error: authError
		} = await supabase.auth.getUser();
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

	function changeDate(offset: number) {
		if (viewMode === 'year') {
			currentDate = new Date(currentDate.getFullYear() + offset, 0, 1);
		} else if (viewMode === 'month') {
			currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
		} else if (viewMode === 'week') {
			currentDate = new Date(currentDate.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
		} else if (viewMode === 'day') {
			currentDate = new Date(currentDate.getTime() + offset * 24 * 60 * 60 * 1000);
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

	// Get tasks for a specific date
	function getTasksForDate(date: Date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const day = date.getDate();

		return tasks.filter((t) => {
			if (!t.deadline) return false;
			const taskDate = new Date(t.deadline);

			// Direct match
			if (
				taskDate.getFullYear() === year &&
				taskDate.getMonth() === month &&
				taskDate.getDate() === day
			)
				return true;

			// Recurring match
			const occurrences = generateOccurrences(
				t,
				new Date(year, month, day),
				new Date(year, month, day, 23, 59, 59)
			);
			return occurrences.some(
				(occ) => occ.getFullYear() === year && occ.getMonth() === month && occ.getDate() === day
			);
		});
	}

	// Build calendar days for month view
	function getCalendarDays() {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startDay = firstDay.getDay();

		const days: { date: Date; tasks: any[]; currentMonth: boolean }[] = [];

		// Current month
		for (let d = 1; d <= daysInMonth; d++) {
			const dateObj = new Date(year, month, d);
			days.push({ date: dateObj, tasks: getTasksForDate(dateObj), currentMonth: true });
		}

		return days;
	}

	// Get week days
	function getWeekDays() {
		const startOfWeek = new Date(currentDate);
		startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

		const days = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek);
			date.setDate(startOfWeek.getDate() + i);
			days.push({ date, tasks: getTasksForDate(date) });
		}
		return days;
	}

	// Get year months
	function getYearMonths() {
		const year = currentDate.getFullYear();
		const months = [];

		for (let m = 0; m < 12; m++) {
			const monthDate = new Date(year, m, 1);
			const lastDay = new Date(year, m + 1, 0);
			const daysInMonth = lastDay.getDate();

			const monthTasks = tasks.filter((t) => {
				if (!t.deadline) return false;
				const taskDate = new Date(t.deadline);
				return taskDate.getFullYear() === year && taskDate.getMonth() === m;
			});

			months.push({
				name: monthDate.toLocaleString('default', { month: 'short' }),
				date: monthDate,
				taskCount: monthTasks.length
			});
		}
		return months;
	}

	function getViewTitle() {
		if (viewMode === 'year') {
			return currentDate.getFullYear().toString();
		} else if (viewMode === 'month') {
			return getMonthName(currentDate);
		} else if (viewMode === 'week') {
			const startOfWeek = new Date(currentDate);
			startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6);
			return `${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
		} else {
			return currentDate.toLocaleDateString('default', {
				weekday: 'long',
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			});
		}
	}

	$: calendarDays = viewMode === 'month' && tasks ? getCalendarDays() : [];
	$: weekDays = viewMode === 'week' && tasks ? getWeekDays() : [];
	$: yearMonths = viewMode === 'year' && tasks ? getYearMonths() : [];
	$: dayTasks = viewMode === 'day' && tasks ? getTasksForDate(currentDate) : [];

	// Open modal for editing
	function openEdit(task: any) {
		selectedTask = { ...task };
		newPriority = task.priority;
		newDeadline = task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '';
		newDescription = task.description || '';

		newRecurrenceType = task.recurrence_type || '';
		newRecurrenceInterval = task.recurrence_interval || 1;
		newRecurrenceEnd = task.recurrence_end
			? new Date(task.recurrence_end).toISOString().slice(0, 10)
			: '';

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

	function switchToMonth(monthIndex: number) {
		currentDate = new Date(currentDate.getFullYear(), monthIndex, 1);
		viewMode = 'month';
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
			<h2 class="month-label">{getViewTitle()}</h2>
		</header>

		<!-- View Mode Selector -->
		<div class="view-selector">
			<button
				class="view-btn {viewMode === 'year' ? 'active' : ''}"
				on:click={() => (viewMode = 'year')}>Year</button
			>
			<button
				class="view-btn {viewMode === 'month' ? 'active' : ''}"
				on:click={() => (viewMode = 'month')}>Month</button
			>
			<button
				class="view-btn {viewMode === 'week' ? 'active' : ''}"
				on:click={() => (viewMode = 'week')}>Week</button
			>
			<button
				class="view-btn {viewMode === 'day' ? 'active' : ''}"
				on:click={() => (viewMode = 'day')}>Day</button
			>
		</div>

		{#if loading}
			<div class="loading">Loading calendar...</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else}
			<!-- YEAR VIEW -->
			{#if viewMode === 'year'}
				<section class="year-container">
					<div class="year-grid">
						{#each yearMonths as month}
							<button class="month-card" on:click={() => switchToMonth(month.date.getMonth())}>
								<h3>{month.name}</h3>
								<div class="task-count">
									{month.taskCount}
									{month.taskCount === 1 ? 'task' : 'tasks'}
								</div>
							</button>
						{/each}
					</div>
				</section>
			{/if}

			<!-- MONTH VIEW -->
			{#if viewMode === 'month'}
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

			<!-- WEEK VIEW -->
			{#if viewMode === 'week'}
				<section class="week-container">
					<div class="week-grid">
						{#each weekDays as day}
							<div class="week-day {isToday(day.date) ? 'today' : ''}">
								<div class="week-day-header">
									<div class="day-name">
										{day.date.toLocaleDateString('default', { weekday: 'short' })}
									</div>
									<div class="day-number">{day.date.getDate()}</div>
								</div>
								<div class="week-tasks">
									{#if day.tasks.length > 0}
										{#each day.tasks as task}
											<button
												class="week-task-item {task.priority}"
												on:click={() => openEdit(task)}
											>
												<div class="task-time">
													{new Date(task.deadline).toLocaleTimeString('default', {
														hour: '2-digit',
														minute: '2-digit'
													})}
												</div>
												<div class="task-title">{task.title}</div>
											</button>
										{/each}
									{:else}
										<div class="no-tasks">No tasks</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- DAY VIEW -->
			{#if viewMode === 'day'}
				<section class="day-container">
					<div class="day-tasks-list">
						{#if dayTasks.length > 0}
							{#each dayTasks as task}
								<button class="day-task-card {task.priority}" on:click={() => openEdit(task)}>
									<div class="day-task-header">
										<h3>{task.title}</h3>
										<span class="priority-badge">{task.priority}</span>
									</div>
									{#if task.description}
										<p class="day-task-description">{task.description}</p>
									{/if}
									<div class="day-task-time">
										⏰ {new Date(task.deadline).toLocaleTimeString('default', {
											hour: '2-digit',
											minute: '2-digit'
										})}
									</div>
								</button>
							{/each}
						{:else}
							<div class="no-tasks-message">
								<p>No tasks scheduled for this day</p>
							</div>
						{/if}
					</div>
				</section>
			{/if}
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
					<textarea bind:value={newDescription} rows="4" placeholder="Optional description"
					></textarea>
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
						<option value="weekly">Monthly</option>
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
						<input
							type="date"
							bind:value={newRecurrenceEnd}
							min={newDeadline ? newDeadline.slice(0, 10) : ''}
						/>
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

	.calendar-controls {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		background: #d8a15c;
		color: #323e55;
		padding: 1rem 2rem;
		border-radius: 16px;
		margin-bottom: 1rem;
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

	/* View Selector */
	.view-selector {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		justify-content: center;
		background: #2a3648;
		padding: 0.5rem;
		border-radius: 12px;
		width: fit-content;
		margin-left: auto;
		margin-right: auto;
	}

	.view-btn {
		background: transparent;
		color: #f6d7b0;
		border: none;
		padding: 0.5rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.3s ease;
	}

	.view-btn:hover {
		background: rgba(216, 161, 92, 0.2);
	}

	.view-btn.active {
		background: #d8a15c;
		color: #323e55;
	}

	/* MONTH VIEW */
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
		height: calc(100vh - 300px);
		min-height: 600px;
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
		background: #e0f2fe;
		color: #0369a1;
	}
	.task-item.medium {
		background: #fef9c3;
		color: #92400e;
	}
	.task-item.high {
		background: #fee2e2;
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

	/* YEAR VIEW */
	.year-container {
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

	.month-card {
		background: linear-gradient(135deg, #f6d7b0 0%, #d8a15c 100%);
		border: none;
		border-radius: 12px;
		padding: 2rem;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		text-align: center;
	}

	.month-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
	}

	.month-card h3 {
		color: #323e55;
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.task-count {
		color: #2a3648;
		font-weight: 600;
		font-size: 0.9rem;
	}

	/* WEEK VIEW */
	.week-container {
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
		padding: 1.5rem;
		color: #323e55;
		flex-grow: 1;
	}

	.week-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 1rem;
	}

	.week-day {
		background: #fafafa;
		padding: 1rem;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1px #eee;
	}

	.week-day.today {
		box-shadow: inset 0 0 0 2px #d8a15c;
		background: #fffaf1;
	}

	.week-day-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.week-tasks {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.week-task-item {
		border: none;
		padding: 0.5rem;
		background: #fff;
		border-radius: 8px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		text-align: left;
	}

	.week-task-item.low {
		background: #e0f2fe;
		color: #0369a1;
	}
	.week-task-item.medium {
		background: #fef9c3;
		color: #92400e;
	}
	.week-task-item.high {
		background: #fee2e2;
		color: #991b1b;
	}

	.no-tasks {
		font-size: 0.85rem;
		color: #777;
	}

	/* DAY VIEW */
	.day-container {
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
		padding: 1.5rem;
		color: #323e55;
		flex-grow: 1;
	}

	.day-tasks-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.day-task-card {
		background: #fff;
		padding: 1rem;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		text-align: left;
		border: none;
		cursor: pointer;
	}

	.day-task-card.low {
		border-left: 6px solid #60a5fa;
	}
	.day-task-card.medium {
		border-left: 6px solid #facc15;
	}
	.day-task-card.high {
		border-left: 6px solid #ef4444;
	}

	.day-task-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.priority-badge {
		font-size: 0.8rem;
		padding: 0.2rem 0.4rem;
		background: #d8a15c;
		border-radius: 6px;
		color: #323e55;
		font-weight: 600;
	}

	.day-task-description {
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.no-tasks-message {
		text-align: center;
		padding: 2rem;
		opacity: 0.7;
	}

	/* MODAL */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 999;
	}

	.modal {
		background: #fff;
		color: #323e55;
		padding: 2rem;
		width: 420px;
		border-radius: 16px;
		box-shadow: 0 4px 30px rgba(0, 0, 0, 0.25);
	}

	.modal h2 {
		margin-bottom: 1rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	textarea,
	input,
	select {
		width: 100%;
		padding: 0.5rem;
		border-radius: 8px;
		border: 1px solid #ccc;
		background: #fdfdfd;
	}

	.modal-actions {
		display: flex;
		justify-content: space-between;
		margin-top: 1.5rem;
	}

	.modal-actions button {
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: none;
		cursor: pointer;
		font-weight: 600;
	}

	.save {
		background: #4ade80;
		color: #fff;
	}
	.delete {
		background: #ef4444;
		color: #fff;
	}
	.cancel {
		background: #e5e7eb;
		color: #333;
	}

	.save:hover {
		background: #22c55e;
	}
	.delete:hover {
		background: #dc2626;
	}
	.cancel:hover {
		background: #d1d5db;
	}
</style>
