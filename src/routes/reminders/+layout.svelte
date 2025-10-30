<svelte:head>
  <link rel="icon" type="image/png" href="/favicon.png" />
</svelte:head>

<slot />

<script lang="ts">
    import { onMount } from 'svelte';
    import { derived } from 'svelte/store';
    import { notifications } from '$lib/notifications';
    import { page } from '$app/stores';
    import { fade } from 'svelte/transition';
  
    // Derived store for unread count
    const unread = derived(notifications, ($n) => $n.filter((x) => !x.read).length);
  
    // Automatically mark notifications as read when on /reminders
    $: if ($page.url.pathname === '/reminders') {
      notifications.update((n) => n.map((notif) => ({ ...notif, read: true })));
    }
  
    onMount(() => {
      console.log('Reminders layout mounted');
    });
  </script>
  
  <div class="min-h-screen bg-[#1e2530] text-gray-100">
    <main class="p-8" transition:fade>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-semibold tracking-wide">Reminders</h1>
  
        {#if $unread > 0}
          <span
            class="bg-red-600 text-white text-sm rounded-full px-3 py-1 shadow-lg"
            title="Unread reminders"
          >
            {$unread} new
          </span>
        {/if}
      </div>
  
      <!-- The page content (from +page.svelte) gets rendered here -->
      <slot />
    </main>
  </div>
  