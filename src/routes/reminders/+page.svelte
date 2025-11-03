<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { addNotification, markAllRead } from '$lib/notifications';

	interface Reminder {
		id: string;
		remind_at: string;
		sent: boolean;
		tasks: {
			title: string;
			deadline: string;
		};
	}

	let user: any = null;
	let reminders: Reminder[] = [];
	let loading = true;
	let errorMsg: string | null = null;

	const ONE_HOUR = 60 * 60 * 1000;

	async function fetchReminders() {
		loading = true;
		const now = new Date();
		const oneHourLater = new Date(now.getTime() + ONE_HOUR);

		const { data: tasks, error: taskErr } = await supabase
			.from('tasks')
			.select('id, title, deadline, completed')
			.eq('user_id', user.id)
			.eq('completed', false)
			.lte('deadline', oneHourLater.toISOString())
			.gte('deadline', now.toISOString());

		if (taskErr) {
			console.error(taskErr);
			errorMsg = 'Error loading reminders';
			loading = false;
			return;
		}

		for (const task of tasks || []) {
			const { error: upsertErr } = await supabase
				.from('reminders')
				.upsert(
					{
						task_id: task.id,
						remind_at: now.toISOString(),
						sent: false
					},
					{ onConflict: 'task_id' }
				);
			if (upsertErr && upsertErr.code !== '23505') console.error(upsertErr);
		}

		const { data, error } = await supabase
			.from('reminders')
			.select('id, remind_at, sent, tasks (title, deadline)')
			.eq('tasks.user_id', user.id)
			.order('remind_at', { ascending: true });

		if (error) {
			console.error(error);
			errorMsg = 'Error loading reminders';
		} else {
			reminders = data as unknown as Reminder[];
			errorMsg = null;
			await notifyPendingReminders();
		}

		loading = false;
	}

	async function markReminderSent(id: string) {
		const { error } = await supabase.from('reminders').update({ sent: true }).eq('id', id);
		if (error) console.error('Error marking reminder as sent:', error);
	}

	async function markReminderDone(id: string) {
		await markReminderSent(id);
		addNotification('Reminder marked as done');
		const reminder = reminders.find((r) => r.id === id);
		if (reminder) reminder.sent = true;
	}

	async function snoozeReminder(id: string, minutes: number) {
		const newTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
		const { error } = await supabase
			.from('reminders')
			.update({ remind_at: newTime, sent: false })
			.eq('id', id);
		if (!error) {
			addNotification(`Reminder snoozed for ${minutes} minutes`);
			await fetchReminders();
		} else console.error(error);
	}

	async function deleteReminder(id: string) {
		if (!confirm('Delete this reminder?')) return;
		const { error } = await supabase.from('reminders').delete().eq('id', id);
		if (!error) {
			addNotification('Reminder deleted');
			reminders = reminders.filter((r) => r.id !== id);
		} else console.error(error);
	}

	async function notifyPendingReminders() {
		for (const r of reminders) {
			if (!r.sent) {
				addNotification(
					`Reminder: ${r.tasks.title} (Deadline: ${new Date(
						r.tasks.deadline
					).toLocaleString()})`
				);
				await markReminderSent(r.id);
				r.sent = true;
			}
		}
	}

	function clearAllNotifications() {
		markAllRead();
	}

	function goToCreate() {
		goto('/create-task');
	}

	async function refreshReminders() {
		await fetchReminders();
		addNotification('Reminders refreshed');
	}

	onMount(async () => {
		const {
			data: { user: currentUser }
		} = await supabase.auth.getUser();
		user = currentUser;
		await fetchReminders();
	});
</script>

<main class="reminders-page">
	<aside class="sidebar">
		<div class="sidebar-logo">
			<a href="/" class="home-btn">CHRONOS</a>
		</div>
		<nav class="sidebar-nav">
			<a href="/calendar">Calendar</a>
			<a href="/view">View Tasks</a>
			<a href="/create-task">Create Task</a>
			<a href="/reminders" class="active">Reminders</a>
			<hr />
			<a href="/login">Log Out</a>
		</nav>
		<div class="sidebar-user">
			<p>{user?.email}</p>
		</div>
	</aside>

	<section class="reminder-content">
		<header class="reminder-controls">
			<h2>Reminders</h2>
			<div class="filters">
				<button on:click={refreshReminders} class="btn refresh">↻ Refresh</button>
				<button on:click={clearAllNotifications} class="btn clear">
					Mark All Notifications Read
				</button>
			</div>
		</header>

		{#if loading}
			<div class="loading">Loading reminders...</div>
		{:else if errorMsg}
			<div class="error">{errorMsg}</div>
		{:else if reminders.length === 0}
			<div class="empty">
				<p>No tasks yet.</p>
				<button class="btn add" on:click={goToCreate}>Create Task</button>
			</div>
		{:else}
			<ul class="reminder-list">
				{#each reminders as r}
					<li class="reminder-card {r.sent ? 'done' : ''}">
						<div class="reminder-main">
							<h3>{r.tasks.title}</h3>
							<span class="tag {r.sent ? 'sent' : 'pending'}">
								{r.sent ? 'Sent' : 'Pending'}
							</span>
						</div>

						<p class="meta">
							<strong>Reminder Time:</strong> {new Date(r.remind_at).toLocaleString()}
						</p>
						<p class="meta">
							<strong>Deadline:</strong> {new Date(r.tasks.deadline).toLocaleString()}
						</p>

						<div class="actions">
							<button on:click={() => snoozeReminder(r.id, 10)} class="snooze">Snooze 10m</button>
							<button on:click={() => markReminderDone(r.id)} class="done">Done</button>
							<button on:click={() => deleteReminder(r.id)} class="delete">Delete</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	.reminders-page {
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

	.reminder-content {
		flex-grow: 1;
		padding: 2rem;
		display: flex;
		flex-direction: column;
	}

	.reminder-controls {
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

	.btn {
		border: none;
		border-radius: 8px;
		padding: 0.6rem 1.2rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.btn.refresh {
		background: #2563eb;
		color: white;
	}
	.btn.clear {
		background: #dc2626;
		color: white;
	}
	.btn.add {
		background: #d8a15c;
		color: #323e55;
		font-weight: 700;
		padding: 0.8rem 1.5rem;
		border-radius: 8px;
		margin-top: 1rem;
	}

	.reminder-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.2rem;
	}

	.reminder-card {
		background: #fff;
		color: #323e55;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		transition: transform 0.2s ease;
	}
	.reminder-card:hover {
		transform: translateY(-4px);
	}

	.reminder-main {
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
	.tag.pending {
		background: #fef9c3;
		color: #92400e;
	}
	.tag.sent {
		background: #dcfce7;
		color: #166534;
	}

	.meta {
		font-size: 0.85rem;
		color: #555;
		margin-top: 0.3rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.8rem;
	}

	.actions button {
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s ease;
	}


	.actions button:active {
		transform: translateY(0px);
		box-shadow: none;
	}

	.actions button.snooze {
		background: #eab308;
		color: white;
	}

	.actions button.done {
		background: #16a34a;
		color: white;
	}

	.actions button.delete {
		background: #dc2626;
		color: white;
	}


	.loading,
	.error,
	.empty {
		text-align: center;
		margin-top: 3rem;
		color: #f6d7b0;
	}
</style>
