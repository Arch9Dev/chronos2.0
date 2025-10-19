<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let user: any = null;
	let tasks: any[] = [];
	let filteredTasks: any[] = [];
	let loading = true;
	let error: string | null = null;

	// Filters
	let filterPriority = 'all';
	let sortBy = 'due_date'; // can be 'due_date' or 'priority'

	// Modal state
	let showModal = false;
	let selectedTask: any = null;
	let newPriority = '';
	let newDeadline = '';

	onMount(async () => {
		const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
		if (authError || !currentUser) {
			goto('/login');
			return;
		}

		user = currentUser;

		const { data: fetchedTasks, error: fetchError } = await supabase
			.from('tasks')
			.select('id, title, description, deadline, priority, completed, tags, calendar_id, created_at')
			.eq('user_id', user.id);

		if (fetchError) {
			error = fetchError.message;
			loading = false;
			return;
		}

		tasks = fetchedTasks || [];
		applyFilters();
		loading = false;
	});

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleString();
	}

	function goToCreate() {
		goto('/tasks');
	}

	function goToCalendar() {
		goto('/calendar');
	}

	function goToEdit(taskId: string) {
		const task = tasks.find(t => t.id === taskId);
		if (!task) return;
		selectedTask = { ...task };
		newPriority = task.priority;
		newDeadline = task.deadline ? task.deadline.slice(0, 16) : '';
		showModal = true;
	}

	async function toggleCompleted(taskId: string, status: boolean) {
		const { error: updateError } = await supabase
			.from('tasks')
			.update({ completed: status })
			.eq('id', taskId);

		if (updateError) {
			alert('Error updating task: ' + updateError.message);
			return;
		}

		tasks = tasks.map(t => t.id === taskId ? { ...t, completed: status } : t);
		applyFilters();
	}

	async function updateTask() {
		if (!selectedTask) return;

		const { error: updateError } = await supabase
			.from('tasks')
			.update({ 
				priority: newPriority, 
				deadline: newDeadline 
			})
			.eq('id', selectedTask.id);

		if (updateError) {
			alert('Error updating task: ' + updateError.message);
			return;
		}

		tasks = tasks.map(t => 
			t.id === selectedTask.id 
				? { ...t, priority: newPriority, deadline: newDeadline } 
				: t
		);
		applyFilters();
		showModal = false;
	}

	async function deleteTask() {
		if (!selectedTask) return;

		const confirmed = confirm('Are you sure you want to delete this task?');
		if (!confirmed) return;

		const { error: deleteError } = await supabase
			.from('tasks')
			.delete()
			.eq('id', selectedTask.id);

		if (deleteError) {
			alert('Error deleting task: ' + deleteError.message);
			return;
		}

		tasks = tasks.filter(t => t.id !== selectedTask.id);
		applyFilters();
		showModal = false;
	}

	function applyFilters() {
		let filtered = [...tasks];

		if (filterPriority !== 'all') {
			filtered = filtered.filter(t => t.priority === filterPriority);
		}

		if (sortBy === 'due_date') {
			filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
		} else if (sortBy === 'priority') {
			const priorityOrder = { high: 1, medium: 2, low: 3 } as const;

			filtered.sort((a, b) =>
				(priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4) -
				(priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4)
			);
		}

		filteredTasks = filtered;
	}
</script>

<main class="tasks-page">
	<header class="tasks-header">
		<div class="header-left">
			<button class="back-btn" on:click={goToCalendar}>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M12 16L6 10L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				Back to Calendar
			</button>
		</div>
        <nav class="task-nav">
            <a href="/calendar">Calendar</a>
            <a href="/view">View Tasks</a>
            <a href="/settings">Settings</a>
        </nav>
		<button class="btn btn-primary" on:click={goToCreate}>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
			</svg>
			New Task
		</button>
	</header>

	<section class="filter-bar">
		<div class="filter-group">
			<label for="filterPriority">Filter by Priority:</label>
			<select id="filterPriority" bind:value={filterPriority} on:change={applyFilters}>
				<option value="all">All</option>
				<option value="low">Low</option>
				<option value="medium">Medium</option>
				<option value="high">High</option>
			</select>
		</div>

		<div class="filter-group">
			<label for="sortBy">Sort by:</label>
			<select id="sortBy" bind:value={sortBy} on:change={applyFilters}>
				<option value="due_date">Due Date</option>
				<option value="priority">Priority</option>
			</select>
		</div>
	</section>

	<section class="tasks-container">
		{#if loading}
			<div class="loading">Loading tasks...</div>
		{:else if error}
			<div class="alert alert-error">{error}</div>
		{:else if filteredTasks.length === 0}
			<div class="empty">
				<p>NO TASKS</p>
				<button class="btn btn-primary" on:click={goToCreate}>Create Your First Task</button>
			</div>
		{:else}
			<ul class="task-list">
				{#each filteredTasks as task}
					<li class="task-item {task.completed ? 'completed' : ''}">
						<div class="task-info">
							<div class="task-top">
								<h2>{task.title}</h2>
								<span class="priority {task.priority}">{task.priority}</span>
							</div>
							{#if task.description}
								<p class="description">{task.description}</p>
							{/if}
							<div class="meta">
								<p><strong>Due:</strong> {formatDate(task.deadline)}</p>
								<p><strong>Status:</strong> {task.completed ? '✅ Completed' : '⏳ Pending'}</p>
							</div>
                            <div class="task-actions">
                                <button class="btn btn-secondary" on:click={() => goToEdit(task.id)}>Edit</button>
								<button class="btn btn-complete" on:click={() => toggleCompleted(task.id, !task.completed)} disabled={task.completed}>
                                    {task.completed ? 'Completed' : 'Mark Completed'}
                                </button>
                            </div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if showModal}
	<div class="modal-overlay">
		<div class="modal">
			<h2>Edit Task</h2>
			<p><strong>{selectedTask.title}</strong></p>

			<div class="form-group">
                <label for="edit-priority">Priority:</label>
                <select id="edit-priority" bind:value={newPriority}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
            <div class="form-group">
            <label for="edit-deadline">Due Date:</label>
            <input id="edit-deadline" type="datetime-local" bind:value={newDeadline} />
            </div>

			<div class="modal-actions">
				<button class="btn btn-primary" on:click={updateTask}>Save</button>
				<button class="btn btn-danger" on:click={deleteTask}>Delete</button>
				<button class="btn btn-secondary" on:click={() => showModal = false}>Cancel</button>
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

	.tasks-page {
		background-image: url('/Bg.svg');
		background-size: cover;
		background-attachment: fixed;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		font-family: system-ui, sans-serif;
	}

	.tasks-header {
		background: #f6d7b0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 2.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

    .task-nav {
        display: flex;
        gap: 2rem;
        align-items: center;
    }

    .task-nav a {
        font-size: 1rem;
        text-decoration: none;
        font-weight: 500;
        color: #323e55;
        padding: 0.5rem 0;
        transition: all 0.2s ease;
        border-bottom: 2px solid transparent;
    }

    .task-nav a:hover {
        color: #1a2332;
        border-bottom-color: #323e55;
    }

	.header-left {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(50, 62, 85, 0.1);
		border: none;
		padding: 0.6rem 1rem;
		border-radius: 8px;
		color: #323e55;
		font-weight: 500;
		cursor: pointer;
	}
	.back-btn:hover { background: rgba(50, 62, 85, 0.15); }

	.filter-bar {
		display: flex;
		justify-content: center;
		gap: 2rem;
		padding: 1rem 0;
		background: #fffaf3;
		border-bottom: 1px solid #f3f4f6;
	}
	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	select {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		border: 1px solid #d1d5db;
		background: white;
		font-size: 0.9rem;
	}

	.tasks-container {
		flex: 1;
		padding: 2rem;
		display: flex;
		justify-content: center;
	}

	.task-list {
		list-style: none;
		width: 100%;
		max-width: 700px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.task-item {
		background: white;
		padding: 1.5rem;
		border-radius: 10px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
		border-left: 5px solid #323e55;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}
	.task-item:hover {
		transform: translateY(-3px);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
	}
	.task-item.completed {
		opacity: 0.7;
		border-left-color: #22c55e;
	}

	.task-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.priority {
		text-transform: capitalize;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
	}
	.priority.low { background: #e0f2fe; color: #0369a1; }
	.priority.medium { background: #fef9c3; color: #92400e; }
	.priority.high { background: #fee2e2; color: #991b1b; }

	.description {
		color: #374151;
		font-size: 0.95rem;
		margin-bottom: 0.5rem;
	}

	.meta {
		font-size: 0.85rem;
		color: #4b5563;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.loading, .empty {
		text-align: center;
		margin-top: 3rem;
		color: #F6D7B0;
		font-size: 1.3rem;
        font-weight: 800;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		border: none;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: center;
	}
	.btn-primary {
		background: #d8A15C;
		color: white;
		box-shadow: 0 2px 8px rgba(50, 62, 85, 0.2);
	}
	.btn-primary:hover {
		background: #2a3546;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(50, 62, 85, 0.3);
	}
	.btn-danger {
		background: #dc2626;
		color: white;
	}
	.btn-danger:hover {
		background: #b91c1c;
	}
	.btn-secondary {
		background: #e5e7eb;
		color: #111827;
	}
	.btn-secondary:hover {
		background: #d1d5db;
	}
	.btn-complete {
		background: #22c55e;
		color: white;
	}
	.btn-complete:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		padding: 2rem;
		border-radius: 10px;
		width: 90%;
		max-width: 400px;
		box-shadow: 0 5px 20px rgba(0,0,0,0.2);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.modal-actions {
		display: flex;
		justify-content: space-between;
		margin-top: 1rem;
	}
</style>
