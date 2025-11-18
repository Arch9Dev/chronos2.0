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
	let hour = '12';
	let minute = '00';
	let period = 'PM';
	let priorityLevel = '';
	let tags = '';
	let calendars: any[] = [];

	// Recurrence fields
	let recurrenceType: string = '';
	let selectedDays: string[] = [];
	let recurrenceEnd: string = '';

	const daysOfWeek = [
		{ value: 'monday', label: 'Monday', short: 'Mon' },
		{ value: 'tuesday', label: 'Tuesday', short: 'Tue' },
		{ value: 'wednesday', label: 'Wednesday', short: 'Wed' },
		{ value: 'thursday', label: 'Thursday', short: 'Thu' },
		{ value: 'friday', label: 'Friday', short: 'Fri' },
		{ value: 'saturday', label: 'Saturday', short: 'Sat' },
		{ value: 'sunday', label: 'Sunday', short: 'Sun' }
	];

	// Utility functions
	function getCurrentDate() {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	}

	function getNext30Minutes() {
		const now = new Date();
		now.setMinutes(now.getMinutes() + 30);
		const hours = now.getHours();
		const mins = now.getMinutes();
		
		const hour12 = hours % 12 || 12;
		const period = hours >= 12 ? 'PM' : 'AM';
		
		return {
			hour: String(hour12).padStart(2, '0'),
			minute: String(mins).padStart(2, '0'),
			period
		};
	}

	$: today = getCurrentDate();

	onMount(async () => {
		// Set defaults
		date = getCurrentDate();
		const defaultTime = getNext30Minutes();
		hour = defaultTime.hour;
		minute = defaultTime.minute;
		period = defaultTime.period;

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
	});

	function toggleDay(day: string) {
		if (selectedDays.includes(day)) {
			selectedDays = selectedDays.filter(d => d !== day);
		} else {
			selectedDays = [...selectedDays, day];
		}
	}

	function combineDateTime(date: string, hour: string, minute: string, period: string): Date | null {
		if (!date || !hour || !minute || !period) return null;
		
		let hour24 = parseInt(hour);
		if (period === 'PM' && hour24 !== 12) hour24 += 12;
		if (period === 'AM' && hour24 === 12) hour24 = 0;
		
		const dt = new Date(`${date}T${String(hour24).padStart(2, '0')}:${minute}`);
		return isNaN(dt.getTime()) ? null : dt;
	}

	async function handleSubmit() {
		// Basic validation
		if (!title.trim()) return (error = 'Title is required');
		if (!date) return (error = 'Date is required');
		if (!hour || !minute) return (error = 'Time is required');
		if (!priorityLevel) return (error = 'Priority level is required');

		const deadline = combineDateTime(date, hour, minute, period);
		if (!deadline) return (error = 'Invalid date/time');
		if (deadline < new Date()) return (error = 'You cannot create a task in the past');

		// Recurrence validation
		if (recurrenceType === 'weekly' && selectedDays.length === 0) {
			return (error = 'Please select at least one day for weekly recurrence');
		}
		if (recurrenceEnd && new Date(recurrenceEnd) < deadline) {
			return (error = 'Recurrence end date must be after the start date');
		}

		loading = true;
		error = null;

		try {
			const taskData: any = {
				user_id: user.id,
				title: title.trim(),
				description: description.trim() || null,
				deadline: deadline.toISOString(),
				priority: priorityLevel,
				tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
				completed: false,
				created_at: new Date().toISOString(),
				recurrence_type: recurrenceType || null,
				recurrence_end: recurrenceEnd || null
			};

			// Store selected days as JSON for weekly recurrence
			if (recurrenceType === 'weekly') {
				taskData.recurrence_days = selectedDays;
			}

			const { error: insertError } = await supabase.from('tasks').insert([taskData]);
			if (insertError) throw insertError;

			success = true;
			title = description = date = priorityLevel = tags;
			hour = '12';
			minute = '00';
			period = 'PM';
			recurrenceType = '';
			selectedDays = [];
			recurrenceEnd = '';
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

	// Quick select options for days
	function selectWeekdays() {
		selectedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
	}

	function selectWeekend() {
		selectedDays = ['saturday', 'sunday'];
	}

	function selectAllDays() {
		selectedDays = daysOfWeek.map(d => d.value);
	}

	function clearDays() {
		selectedDays = [];
	}
</script>

<main class="calendar-page">
	<aside class="sidebar">
		<div class="sidebar-logo">
			<a href="/" class="home-btn">CHRONOS</a>
		</div>
		<nav class="sidebar-nav">
			<a href="/calendar">Calendar</a>
			<a href="/view">View Tasks</a>
			<a href="/create-task" class="active">Create Task</a>
			<hr />
			<a href="/login">Log Out</a>
		</nav>
		<div class="sidebar-user">
			<p>{user?.email}</p>
		</div>
	</aside>

	<section class="calendar-content">
		<header class="calendar-controls">
			<h2>Create New Task</h2>
			<button class="nav-btn back-btn" on:click={goBack}>Back to Calendar</button>
		</header>

		<div class="task-form">
			{#if error}<div class="alert alert-error">{error}</div>{/if}
			{#if success}<div class="alert alert-success">
					Task created successfully! Redirecting...
				</div>{/if}

			<div class="form-grid">
				<div class="form-group full-width">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Title <span class="required">*</span></label>
					<input type="text" bind:value={title} placeholder="Task title" class="form-input" />
				</div>

				<div class="form-group full-width">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Description</label>
					<textarea bind:value={description} placeholder="Optional" rows="4" class="form-textarea"></textarea>
				</div>

				<div class="form-group full-width">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Date <span class="required">*</span></label>
					<input type="date" bind:value={date} min={getCurrentDate()} class="form-input" />
				</div>

				<div class="form-group">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Time <span class="required">*</span></label>
					<div class="time-picker">
						<div class="time-input-group">
							<select bind:value={hour} class="time-select">
								{#each Array(12) as _, i}
									<option value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>
								{/each}
							</select>
							<span class="time-separator">:</span>
							<select bind:value={minute} class="time-select">
								{#each Array(60) as _, i}
									<option value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
								{/each}
							</select>
						</div>
						<div class="period-selector">
							<button 
								type="button"
								class="period-btn {period === 'AM' ? 'active' : ''}"
								on:click={() => period = 'AM'}
							>
								AM
							</button>
							<button 
								type="button"
								class="period-btn {period === 'PM' ? 'active' : ''}"
								on:click={() => period = 'PM'}
							>
								PM
							</button>
						</div>
					</div>
				</div>

				<div class="form-group">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Priority <span class="required">*</span></label>
					<select bind:value={priorityLevel} class="form-select">
						<option value="" disabled selected>Select priority</option>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</div>

				<div class="form-group">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Tags <span class="label-hint">(comma-separated)</span></label>
					<input type="text" bind:value={tags} placeholder="work, urgent" class="form-input" />
				</div>

				<div class="form-group full-width">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Recurrence</label>
					<select bind:value={recurrenceType} class="form-select">
						<option value="">Does not repeat</option>
						<option value="daily">Daily</option>
						<option value="weekly">Weekly (select days below)</option>
						<option value="monthly">Monthly</option>
						<option value="yearly">Yearly</option>
					</select>
				</div>

				{#if recurrenceType === 'weekly'}
					<div class="form-group full-width">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Repeat on <span class="required">*</span></label>
						<div class="quick-select-buttons">
							<button type="button" class="quick-btn" on:click={selectWeekdays}>Weekdays</button>
							<button type="button" class="quick-btn" on:click={selectWeekend}>Weekend</button>
							<button type="button" class="quick-btn" on:click={selectAllDays}>All Days</button>
							<button type="button" class="quick-btn clear" on:click={clearDays}>Clear</button>
						</div>
						<div class="day-selector">
							{#each daysOfWeek as day}
								<button
									type="button"
									class="day-btn {selectedDays.includes(day.value) ? 'selected' : ''}"
									on:click={() => toggleDay(day.value)}
								>
									<span class="day-short">{day.short}</span>
									<span class="day-full">{day.label}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if recurrenceType}
					<div class="form-group full-width">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>End Date <span class="label-hint">(optional)</span></label>
						<input type="date" bind:value={recurrenceEnd} min={getCurrentDate()} class="form-input" />
					</div>
				{/if}
			</div>

			<div class="form-actions">
				<button type="button" on:click={goBack} class="btn btn-secondary" disabled={loading}>Cancel</button>
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
		padding: 0.75rem 1rem;
		border-radius: 8px;
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
		justify-content: space-between;
		align-items: center;
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
	}
	.nav-btn.back-btn {
		background: #323e55;
		color: #f0b868;
		font-weight: 650;
	}
	.nav-btn.back-btn:hover {
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

	/* Time Picker Styles */
	.time-picker {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.time-input-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
	}

	.time-select {
		padding: 0.75rem 0.5rem;
		border-radius: 8px;
		border: 2px solid #e5e7eb;
		font-size: 1.1rem;
		font-weight: 600;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		padding-right: 2rem;
		cursor: pointer;
		flex: 1;
	}

	.time-separator {
		font-size: 1.5rem;
		font-weight: 700;
		color: #374151;
	}

	.period-selector {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.period-btn {
		padding: 0.5rem 0.75rem;
		border: 2px solid #e5e7eb;
		background: white;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.85rem;
		transition: all 0.2s ease;
		color: #6b7280;
	}

	.period-btn:hover {
		border-color: #d8a15c;
		color: #323e55;
	}

	.period-btn.active {
		background: #323e55;
		color: white;
		border-color: #323e55;
	}

	/* Day Selector Styles */
	.quick-select-buttons {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}

	.quick-btn {
		padding: 0.5rem 0.75rem;
		border: 2px solid #e5e7eb;
		background: white;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s ease;
		color: #374151;
	}

	.quick-btn:hover {
		border-color: #d8a15c;
		background: #fffaf1;
	}

	.quick-btn.clear {
		border-color: #fca5a5;
		color: #dc2626;
	}

	.quick-btn.clear:hover {
		background: #fef2f2;
		border-color: #dc2626;
	}

	.day-selector {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 0.75rem;
	}

	.day-btn {
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		background: white;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.day-btn:hover {
		border-color: #d8a15c;
		background: #fffaf1;
	}

	.day-btn.selected {
		background: #323e55;
		border-color: #323e55;
		color: white;
	}

	.day-short {
		font-weight: 700;
		font-size: 1rem;
	}

	.day-full {
		font-size: 0.75rem;
		opacity: 0.8;
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
		.day-selector {
			grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		}
		.time-picker {
			flex-direction: column;
			align-items: stretch;
		}
		.period-selector {
			flex-direction: row;
		}
	}
</style>