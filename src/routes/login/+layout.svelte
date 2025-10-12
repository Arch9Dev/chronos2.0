<script>
  import { page } from '$app/stores';
</script>

<svelte:head>
  <link rel="icon" type="image/png" href="/favicon.png" />
</svelte:head>

{#if $page.url.pathname === '/login'}
  <!-- No layout padding for the login page -->
  <slot />
{:else}
  <!-- Default layout for the rest of the app -->
  <div class="min-h-screen p-4">
    <slot />
  </div>
{/if}
