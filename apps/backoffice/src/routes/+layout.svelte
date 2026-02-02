<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/auth-store';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import '../app.css';

  onMount(async () => {
    await authStore.init();
    console.log('Auth store initialized');
  });

  $: if (!$authStore.loading) {
    const path = $page.url.pathname;
    const user = $authStore.user;

    if (path.startsWith('/admin') && !user) {
      goto('/');
    }

    if ((path === '/' ) && user) {
      goto('/admin/contacts');
    }
  }
</script>

{#if $authStore.loading}
  <div class="h-screen flex items-center justify-center bg-white">
    <iconify-icon icon="line-md:loading-twotone-loop" width="30" class="text-indigo-600"></iconify-icon>
  </div>
{:else}
  <slot />
{/if}
