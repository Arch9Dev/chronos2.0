<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { notifications, addNotification, markAllRead } from '$lib/notifications';

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

	// Fetch reminders from Supabase
	async function fetchReminders() {
		loading = true;
		const { data, error } = await supabase
			.from('reminders')
			.select('id, remind_at, sent, tasks (title, deadline)')
			.order('remind_at', { ascending: true });

		if (error) {
			console.error(error);
			errorMsg = 'Error loading reminders';
		} else {
			reminders = data as unknown as Reminder[];
			errorMsg = null;

			// Trigger notifications for pending reminders
			await notifyPendingReminders();
		}

		loading = false;
	}

	// Mark reminder as sent in Supabase
	async function markReminderSent(id: string) {
		const { error } = await supabase
			.from('reminders')
			.update({ sent: true })
			.eq('id', id);

		if (error) console.error('Error marking reminder as sent:', error);
	}

	// Generate notifications for reminders that are not sent
	async function notifyPendingReminders() {
		for (const r of reminders) {
			if (!r.sent) {
				addNotification(`Reminder: ${r.tasks.title} at ${new Date(r.remind_at).toLocaleString()}`);
				await markReminderSent(r.id);
				r.sent = true; // Update local state
			}
		}
	}

	function clearAllNotifications() {
		markAllRead();
	}

	onMount(async () => {
		// Fetch logged-in user
		const { data: { user: currentUser } } = await supabase.auth.getUser();
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
			<button on:click={clearAllNotifications} class="px-3 py-1 bg-red-600 rounded text-white text-sm">
				Mark All Notifications Read
			</button>
		</header>

		{#if loading}
			<p class="text-gray-400 italic">Loading reminders...</p>
		{:else if errorMsg}
			<p class="text-red-500">{errorMsg}</p>
		{:else if reminders.length === 0}
			<p class="text-gray-400 italic">No reminders found.</p>
		{:else}
			<ul class="space-y-3">
				{#each reminders as r}
					<li class="bg-[#2b3245] hover:bg-[#343d54] rounded-xl p-4 transition-all duration-150 shadow">
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-lg font-medium text-white">{r.tasks.title}</h3>
								<p class="text-sm text-gray-400">
									Reminder time:
									<span class="text-gray-200 font-medium">{new Date(r.remind_at).toLocaleString()}</span>
								</p>
								<p class="text-sm text-gray-400">
									Task deadline:
									<span class="text-gray-200 font-medium">{new Date(r.tasks.deadline).toLocaleString()}</span>
								</p>
							</div>
							{#if r.sent}
								<span class="text-xs bg-green-700 text-white px-2 py-1 rounded-full">Sent</span>
							{:else}
								<span class="text-xs bg-yellow-600 text-white px-2 py-1 rounded-full">Pending</span>
							{/if}
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
</style>