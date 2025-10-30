<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { notifications } from '$lib/notifications';
	import { derived } from 'svelte/store';
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

	// Derived store for unread notifications
	const unread = derived(notifications, ($n) => $n.filter((x) => !x.read).length);

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

	function getMonthName(date: Date) {
		return date.toLocaleString('default', { month: 'long', year: 'numeric' });
	}

	function changeMonth(offset: number) {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
	}

	function getCalendarDays() {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startDay = firstDay.getDay();

		const days: { date: Date; tasks: any[]; currentMonth: boolean }[] = [];

		for (let i = 0; i < startDay; i++) {
			const date = new Date(year, month, i - startDay + 1);
			days.push({ date, tasks: [], currentMonth: false });
		}

		for (let d = 1; d <= daysInMonth; d++) {
			const dateObj = new Date(year, month, d);
			const dayTasks = tasks.filter((t) => {
				const taskDate = new Date(t.deadline);
				return (
					taskDate.getFullYear() === year &&
					taskDate.getMonth() === month &&
					taskDate.getDate() === d
				);
			});
			days.push({ date: dateObj, tasks: dayTasks, currentMonth: true });
		}

		const totalCells = Math.ceil(days.length / 7) * 7;
		for (let i = days.length; i < totalCells; i++) {
			const date = new Date(year, month, i - startDay + 1);
			days.push({ date, tasks: [], currentMonth: false });
		}

		return days;
	}

	// Make this reactive to both tasks and currentDate
	$: calendarDays = tasks && currentDate ? getCalendarDays() : [];

	function isToday(date: Date) {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	}

	function openEdit(task: any) {
		selectedTask = { ...task };
		newPriority = task.priority;
		newDeadline = task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '';
		showModal = true;
	}

	async function updateTask() {
		if (!selectedTask) return;
		const { error: updateError } = await supabase
			.from('tasks')
			.update({ priority: newPriority, deadline: newDeadline })
			.eq('id', selectedTask.id);

		if (updateError) {
			alert('Error updating task: ' + updateError.message);
			return;
		}

		tasks = tasks.map((t) =>
			t.id === selectedTask.id ? { ...t, priority: newPriority, deadline: newDeadline } : t
		);
		showModal = false;
	}

	async function deleteTask() {
		if (!selectedTask) return;
		if (!confirm('Are you sure you want to delete this task?')) return;

		const { error: delErr } = await supabase.from('tasks').delete().eq('id', selectedTask.id);
		if (delErr) {
			alert('Error deleting task: ' + delErr.message);
			return;
		}
		
		// Store the task ID before clearing
		const deletedTaskId = selectedTask.id;
		
		// Close modal first
		showModal = false;
		selectedTask = null;
		
		// Force reactivity by creating a completely new array
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
			<a href="/reminders">Reminders</a>
			<hr />
			<a href="/login">Log Out</a>
		</nav>
		<div class="sidebar-user">
			<p>{user?.email}</p>
		</div>
	</aside>

	<section class="calendar-content">
		<header class="calendar-controls">
			<button class="nav-btn" on:click={() => changeMonth(-1)}>← Prev</button>
			<h2 class="month-label">{getMonthName(currentDate)}</h2>
			<div class="nav-btn-group">
				<button class="nav-btn" on:click={() => changeMonth(1)}>Next →</button>
				<button class="nav-btn today-btn" on:click={() => (currentDate = new Date())}>TODAY</button>
			</div>
		</header>

		{#if loading}
			<div class="loading">Loading calendar...</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else}
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
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-overlay" on:click={() => (showModal = false)}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="modal" on:click|stopPropagation>
				<h2>{selectedTask.title}</h2>
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
	.form-group input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
	}

	.form-group select:focus,
	.form-group input:focus {
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