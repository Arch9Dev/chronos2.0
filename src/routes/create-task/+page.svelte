<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let user: any = null;
	let loading = false;
	let error: string | null = null;
	let success = false;

	// Form fields
	let title = '';
	let description = '';
	let date = '';
	let time = '';
	let priorityLevel = '';
	let tags = '';
	let selectedCalendar = '';
	let calendars: any[] = [];

	// Utility functions
	function getCurrentDate() {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	}

	function getCurrentTime() {
		const now = new Date();
		return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	}

	function getNext30Minutes() {
		const now = new Date();
		now.setMinutes(now.getMinutes() + 30);
		return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	}

	$: today = getCurrentDate();
	$: minTime = date === today ? getCurrentTime() : '00:00';

	onMount(async () => {
		// Set defaults
		date = getCurrentDate();
		time = getNext30Minutes();

		const {
			data: { user: currentUser },
			error: authError
		} = await supabase.auth.getUser();
		if (authError || !currentUser) return goto('/login');

		user = currentUser;
		const { data: calendarsData, error: fetchError } = await supabase
			.from('calendars')
			.select('id, name')
			.eq('user_id', user.id);
			
		if (fetchError) {
			error = fetchError.message;
			return;
		}

		calendars = calendarsData || [];
		if (calendars.length > 0) {
			selectedCalendar = calendars[0].id;
		}
	});

	function combineDateTime(date: string, time: string): Date | null {
		if (!date || !time) return null;
		const dt = new Date(`${date}T${time}`);
		return isNaN(dt.getTime()) ? null : dt;
	}

	async function handleSubmit() {
		if (!title.trim()) return (error = 'Title is required');
		if (!date) return (error = 'Date is required');
		if (!time) return (error = 'Time is required');
		if (!priorityLevel) return (error = 'Priority level is required');

		const deadline = combineDateTime(date, time);
		if (!deadline) return (error = 'Invalid date/time');

		if (deadline < new Date()) return (error = 'You cannot create a task in the past');

		loading = true;
		error = null;

		try {
			const { error: insertError } = await supabase.from('tasks').insert([
				{
					user_id: user.id,
					title: title.trim(),
					description: description.trim() || null,
					deadline: deadline.toISOString(),
					priority: priorityLevel,
					tags: tags
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean),
					calendar_id: selectedCalendar || null,
					completed: false,
					created_at: new Date().toISOString()
				}
			]);
			if (insertError) throw insertError;
			success = true;
			title = description = date = time = priorityLevel = tags = selectedCalendar = '';
			setTimeout(() => goto('/calendar'), 1500);
		} catch (err: any) {
			error = err?.message || 'Failed to create task';
		} finally {
			loading = false;
		}
	}

	function goBack() {
		goto('/calendar');
	}
</script>

<main class="calendar-page">
	<aside class="sidebar">
		<div class="sidebar-logo"><h1>CHRONOS</h1></div>
		<nav class="sidebar-nav">
			<a href="/calendar">Calendar</a>
			<a href="/view">View Tasks</a>
			<a href="/create-task" class="active">Create Task</a>
			<a href="/settings">Settings</a>
			<hr />
			<a href="/login">Log Out</a>
		</nav>
		<div class="sidebar-user"><p>{user?.email}</p></div>
	</aside>

	<section class="calendar-content">
		<header class="calendar-controls">
			<h2>Create New Task</h2>
			<button class="nav-btn today-btn" on:click={goBack}>Back to Calendar</button>
		</header>

		<div class="task-form">
			{#if error}<div class="alert alert-error">{error}</div>{/if}
			{#if success}<div class="alert alert-success">
					Task created successfully! Redirecting...
				</div>{/if}

			<div class="form-grid">
				<div class="form-group full-width">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Title <span class="required">*</span></label>
					<input type="text" bind:value={title} placeholder="Task title" class="form-input" />
				</div>

				<div class="form-group full-width">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Description</label>
					<textarea bind:value={description} placeholder="Optional" rows="4" class="form-textarea"
					></textarea>
				</div>

				<!-- svelte-ignore a11y_label_has_associated_control -->
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<div class="form-group">
					<label>Date <span class="required">*</span></label>
					<input type="date" bind:value={date} min={getCurrentDate()} class="form-input" />
				</div>

				<!-- svelte-ignore a11y_label_has_associated_control -->
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<div class="form-group">
					<label>Time <span class="required">*</span></label>
					<input type="time" bind:value={time} min={minTime} class="form-input" />
				</div>

				<!-- svelte-ignore a11y_label_has_associated_control -->
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<div class="form-group">
					<label>Priority <span class="required">*</span></label>
					<select bind:value={priorityLevel} class="form-select">
						<option value="" disabled selected>Select priority</option>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</div>

				<!-- svelte-ignore a11y_label_has_associated_control -->
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<div class="form-group">
					<label>Tags <span class="label-hint">(comma-separated)</span></label>
					<input type="text" bind:value={tags} placeholder="work, urgent" class="form-input" />
				</div>
			</div>

			<div class="form-actions">
				<button type="button" on:click={goBack} class="btn btn-secondary" disabled={loading}
					>Cancel</button
				>
				<button type="button" on:click={handleSubmit} class="btn btn-primary" disabled={loading}>
					{#if loading}<span class="spinner"></span> Creating...{:else}Create Task{/if}
				</button>
			</div>
		</div>
	</section>
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
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #323e55;
		color: #f6d7b0;
	}

	.sidebar {
		width: 260px;
		background: #2a3648;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 2rem 1.5rem;
	}
	.sidebar-logo h1 {
		font-family: Georgia, serif;
		font-size: 1.8rem;
		color: #d8a15c;
		text-align: center;
	}
	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.sidebar-nav a {
		text-decoration: none;
		color: #f6d7b0;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		transition: all 0.3s;
	}
	.sidebar-nav a.active {
		background: #d8a15c;
		color: #323e55;
		font-weight: 600;
	}
	.sidebar-nav a:hover,
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
		justify-content: space-between;
		align-items: center;
		background: #d8a15c;
		color: #323e55;
		padding: 1rem 2rem;
		border-radius: 16px;
		margin-bottom: 2rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}
	.nav-btn.today-btn {
		background: #323e55;
		color: #f0b868;
		font-weight: 650;
	}
	.nav-btn.today-btn:hover {
		background: #f0b868;
		color: #fff;
	}

	.task-form {
		background: white;
		border-radius: 16px;
		padding: 2rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
		max-width: 800px;
		width: 100%;
		margin: auto;
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.form-group.full-width {
		grid-column: 1/-1;
	}
	.form-input,
	.form-textarea,
	.form-select {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		border: 2px solid #e5e7eb;
		font-size: 0.95rem;
	}
	.form-textarea {
		resize: vertical;
		min-height: 100px;
	}
	.form-select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 1rem center;
		padding-right: 2.5rem;
	}

	label {
		font-weight: 600;
		font-size: 0.9rem;
		color: #374151;
	}
	.required {
		color: #ef4444;
	}
	.label-hint {
		font-weight: 400;
		color: #6b7280;
		font-size: 0.85rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}
	.btn {
		padding: 0.875rem 1.75rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		border: none;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: center;
		min-width: 140px;
	}
	.btn-primary {
		background: #323e55;
		color: white;
		box-shadow: 0 2px 8px rgba(50, 62, 85, 0.2);
	}
	.btn-primary:hover {
		background: #2a3546;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(50, 62, 85, 0.3);
	}
	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
	}
	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.alert {
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.alert-error {
		background: #fef2f2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}
	.alert-success {
		background: #f0fdf4;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.calendar-page {
			flex-direction: column;
		}
		.sidebar {
			width: 100%;
			flex-direction: row;
			overflow-x: auto;
			padding: 1rem;
		}
		.calendar-content {
			padding: 1rem;
		}
		.form-grid {
			grid-template-columns: 1fr;
		}
		.form-actions {
			flex-direction: column-reverse;
		}
		.btn {
			width: 100%;
		}
	}
</style>
