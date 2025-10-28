<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let user: any = null;
	let tasks: any[] = [];
	let filteredTasks: any[] = [];
	let loading = true;
	let error: string | null = null;

	let filterPriority = 'all';
	let sortBy = 'due_date';

	let showModal = false;
	let selectedTask: any = null;
	let newPriority = '';
	let newDeadline = '';

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
			.select('id, title, description, deadline, priority, completed, tags, created_at')
			.eq('user_id', user.id);

		if (fetchError) {
			error = fetchError.message;
		} else {
			tasks = fetchedTasks || [];
			applyFilters();
		}
		loading = false;
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleString();
	}

	function goToCreate() {
		goto('/create-task');
	}

	function applyFilters() {
		let filtered = [...tasks];

		if (filterPriority !== 'all') {
			filtered = filtered.filter((t) => t.priority === filterPriority);
		}

		if (sortBy === 'due_date') {
			filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
		} else if (sortBy === 'priority') {
			const order: Record<'high' | 'medium' | 'low', number> = { high: 1, medium: 2, low: 3 };
			filtered.sort(
				(a, b) =>
					order[a.priority as 'high' | 'medium' | 'low'] -
					order[b.priority as 'high' | 'medium' | 'low']
			);
		}

		filteredTasks = filtered;
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

		tasks = tasks.map((t) => (t.id === taskId ? { ...t, completed: status } : t));
		applyFilters();
	}

	function openEdit(task: any) {
		selectedTask = { ...task };
		newPriority = task.priority;
		newDeadline = task.deadline ? task.deadline.slice(0, 16) : '';
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
		applyFilters();
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
		tasks = tasks.filter((t) => t.id !== selectedTask.id);
		applyFilters();
		showModal = false;
	}
</script>

<main class="tasks-page">
	<aside class="sidebar">
		<div class="sidebar-logo">
			<a href="/" class="home-btn">CHRONOS</a>
		</div>

		<nav class="sidebar-nav">
			<a href="/calendar">Calendar</a>
			<a href="/view" class="active">View Tasks</a>
			<a href="/create-task">Create Task</a>
			<hr />
			<a href="/login">Log Out</a>
		</nav>

		<div class="sidebar-user">
			<p>{user?.email}</p>
		</div>
	</aside>

	<section class="tasks-content">
		<header class="tasks-controls">
			<h2>All Tasks</h2>

			<div class="filters">
				<div>
					<label>
						Filter by Priority:
						<select bind:value={filterPriority} on:change={applyFilters}>
						  <option value="all">All</option>
						  <option value="low">Low</option>
						  <option value="medium">Medium</option>
						  <option value="high">High</option>
						</select>
					</label>
				</div>
				<div>
					<label>
						Sort By:
						<select bind:value={sortBy} on:change={applyFilters}>
						  <option value="due_date">Due Date</option>
						  <option value="priority">Priority</option>
						</select>
					  </label>
				</div>
			</div>
		</header>

		{#if loading}
			<div class="loading">Loading tasks...</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else if filteredTasks.length === 0}
			<div class="empty">
				<p>No tasks yet.</p>
				<button class="btn add" on:click={goToCreate}>Create Task</button>
			</div>
		{:else}
			<ul class="task-list">
				{#each filteredTasks as task}
					<li class="task-card {task.completed ? 'done' : ''}">
						<div class="task-main">
							<h3>{task.title}</h3>
							<span class="tag {task.priority}">{task.priority}</span>
						</div>
						{#if task.description}
							<p class="desc">{task.description}</p>
						{/if}
						<p class="meta"><strong>Due:</strong> {formatDate(task.deadline)}</p>
						<p class="meta">
							<strong>Status:</strong>
							{task.completed ? '✅ Completed' : '🕓 Pending'}
						</p>
						<div class="actions">
							<button class="edit" on:click={() => openEdit(task)}>Edit</button>
							<button
								class="complete"
								on:click={() => toggleCompleted(task.id, !task.completed)}
								disabled={task.completed}
							>
								{task.completed ? 'Completed' : 'Mark Complete'}
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if showModal}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-overlay" on:click={() => (showModal = false)}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="modal" on:click|stopPropagation>
				<h2>{selectedTask.title}</h2>
				<div class="form-group">
					<!-- svelte-ignore a11y_label_has_associated_control -->
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

	.tasks-page {
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

	.sidebar-logo a {
		text-decoration: none;
		font-family: Georgia, serif;
		font-size: 1.8rem;
		color: #d8a15c;
		letter-spacing: 0.08em;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.sidebar-nav a {
		text-decoration: none;
		color: #f6d7b0;
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

	.tasks-content {
		flex-grow: 1;
		padding: 2rem;
		display: flex;
		flex-direction: column;
	}

	.tasks-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #d8a15c;
		color: #323e55;
		padding: 1rem 2rem;
		border-radius: 16px;
		margin-bottom: 2rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}

	.filters {
		display: flex;
		gap: 1rem;
	}

	select {
		border-radius: 8px;
		padding: 0.5rem 1rem;
		border: none;
		font-weight: 500;
	}

	.task-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.2rem;
	}

	.task-card {
		background: #fff;
		color: #323e55;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		transition: transform 0.2s ease;
	}

	.task-card.done {
		opacity: 0.7;
	}

	.task-card:hover {
		transform: translateY(-4px);
	}

	.task-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.tag {
		text-transform: capitalize;
		padding: 0.3rem 0.7rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
	}
	.tag.low {
		background: #e0f2fe;
		color: #0369a1;
	}
	.tag.medium {
		background: #fef9c3;
		color: #92400e;
	}
	.tag.high {
		background: #fee2e2;
		color: #991b1b;
	}

	.desc {
		margin: 0.5rem 0;
		font-size: 0.9rem;
	}

	.meta {
		font-size: 0.85rem;
		color: #555;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.8rem;
	}

	button {
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s ease;
	}
	button.edit {
		background: #6b7280;
		color: white;
	}
	button.edit:hover {
		background: #4b5563;
	}
	button.complete {
		background: #16a34a;
		color: white;
	}
	button.complete:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.empty {
		text-align: center;
		margin-top: 3rem;
		color: #f6d7b0;
	}
	.btn.add {
		background: #d8a15c;
		color: #323e55;
		font-weight: 700;
		padding: 0.8rem 1.5rem;
		border-radius: 8px;
		margin-top: 1rem;
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

	.modal-actions {
		display: flex;
		justify-content: space-between;
		margin-top: 1rem;
	}
	button.save {
		background: #16a34a;
		color: white;
	}
	button.delete {
		background: #dc2626;
		color: white;
	}
	button.cancel {
		background: #6b7280;
		color: white;
	}
</style>
