<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let user: any = null;
	let tasks: any[] = [];
	let error: string | null = null;
	let loading = true;
	let currentDate = new Date();
	let selectedTask: any = null; // for pop-up modal

	onMount(async () => {
		const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
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
			.order('deadline', { ascending: true });

		if (fetchError) {
			error = fetchError.message;
		} else {
			tasks = fetchedTasks || [];
		}
		loading = false;
	}

	async function markComplete(id: number) {
		await supabase.from('tasks').update({ completed: true }).eq('id', id);
		selectedTask = null;
		await loadTasks();
	}

	async function deleteTask(id: number) {
		if (confirm('Are you sure you want to delete this task?')) {
			await supabase.from('tasks').delete().eq('id', id);
			selectedTask = null;
			await loadTasks();
		}
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

		const days: { date: Date; tasks: any[] }[] = [];

		for (let i = 0; i < startDay; i++) {
			days.push({ date: new Date(year, month, i - startDay + 1), tasks: [] });
		}

		for (let d = 1; d <= daysInMonth; d++) {
			const dateObj = new Date(year, month, d);
			const dayTasks = tasks.filter(t => {
				const taskDate = new Date(t.deadline);
				return (
					taskDate.getFullYear() === year &&
					taskDate.getMonth() === month &&
					taskDate.getDate() === d
				);
			});
			days.push({ date: dateObj, tasks: dayTasks });
		}

		return days;
	}

	function isToday(date: Date) {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
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

	<section class="calendar-controls">
		<button class="nav-btn" on:click={() => changeMonth(-1)}>← Prev</button>
		<h2 class="month-label">{getMonthName(currentDate)}</h2>
		<button class="nav-btn" on:click={() => changeMonth(1)}>Next →</button>
	</section>

	{#if loading}
		<div class="loading">Loading calendar...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else}
		<section class="calendar-container">
			<div class="calendar-header-row">
				{#each ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as day}
					<div class="weekday">{day}</div>
				{/each}
			</div>

			<div class="calendar-grid">
				{#each getCalendarDays() as day}
					<div class="day-cell {isToday(day.date) ? 'today' : ''}">
						<div class="date">{day.date.getDate()}</div>
						{#if day.tasks.length > 0}
							<ul class="task-list">
								{#each day.tasks.slice(0, 3) as task}
									<li>
										<button
											class="task-item {task.priority} {task.completed ? 'done' : ''}"
											type="button"
											on:click={() => selectedTask = task}>
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

	<!-- 🪟 Modal for viewing/editing a task -->
	{#if selectedTask}
		<div
			class="modal-overlay"
			role="button"
			tabindex="0"
			on:click={() => selectedTask = null}
			on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') ? selectedTask = null : null}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="task-modal" on:click|stopPropagation>
				<h2>{selectedTask.title}</h2>
				<p class="desc">{selectedTask.description || "No description provided."}</p>

				<div class="meta">
					<p><strong>Priority:</strong> {selectedTask.priority}</p>
					<p><strong>Due:</strong> {new Date(selectedTask.deadline).toLocaleString()}</p>
					{#if selectedTask.tags && selectedTask.tags.length}
						<p><strong>Tags:</strong> {selectedTask.tags.join(', ')}</p>
					{/if}
					<p><strong>Status:</strong> {selectedTask.completed ? '✅ Completed' : '🕓 Pending'}</p>
				</div>

				<div class="modal-actions">
					{#if !selectedTask.completed}
						<button class="complete-btn" on:click={() => markComplete(selectedTask.id)}>Mark Complete</button>
					{/if}
					<button class="delete-btn" on:click={() => deleteTask(selectedTask.id)}>Delete</button>
					<button class="close-btn" on:click={() => selectedTask = null}>Close</button>
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
	.navbar {
		background: #f6d7b0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.2rem 2.5rem;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
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

    .chronos-logo {
        max-height: 40px;
        object-fit: contain;
    }
	.add-task-btn {
		background: #323e55;
		color: white;
		padding: 0.6rem 1.2rem;
		border-radius: 8px;
		border: none;
		cursor: pointer;
		font-weight: 600;
	}

	.add-task-btn:hover {
		background: #2b3548;
	}

	.calendar-controls {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		padding: 1.5rem 0;
	}

	.nav-btn {
		background: #323e55;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.nav-btn:hover {
		background: #2b3548;
	}

	.calendar-container {
		width: 100%;
		max-width: 1000px;
		margin: 0 auto;
		background: rgba(255, 255, 255, 0.85);
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.calendar-header-row {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.5rem;
	}

	.day-cell {
		background: white;
		border-radius: 10px;
		padding: 0.5rem;
		min-height: 120px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.day-cell.today {
		border: 2px solid #323e55;
	}

	.task-item {
		all: unset;
		display: block;
		width: 100%;
		text-align: left;
		cursor: pointer;
		border-radius: 6px;
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
	}

	.task-item.low { background: #e0f2fe; color: #0369a1; }
	.task-item.medium { background: #fef9c3; color: #92400e; }
	.task-item.high { background: #fee2e2; color: #991b1b; }
	.task-item.done { opacity: 0.6; text-decoration: line-through; }

	.task-item:focus {
		outline: 2px solid #323e55;
		outline-offset: 2px;
	}

	/* 🌙 Modal styles */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 999;
	}

	.task-modal {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		width: 90%;
		max-width: 450px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.25);
		animation: fadeIn 0.2s ease;
	}

	.task-modal h2 {
		margin-bottom: 0.5rem;
		font-size: 1.4rem;
	}

	.task-modal .desc {
		margin-bottom: 1rem;
		font-size: 1rem;
		color: #444;
	}

	.task-modal .meta p {
		margin-bottom: 0.4rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 1rem;
	}

	.complete-btn {
		background: #16a34a;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
	}

	.delete-btn {
		background: #dc2626;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
	}

	.close-btn {
		background: #6b7280;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}
</style>
