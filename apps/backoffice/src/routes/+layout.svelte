<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/auth-store';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { ToastContainer } from '@repo/ui';
  import { logger } from '@repo/logger';
  import '../app.css';

  let { children } = $props();

  onMount(async () => {
    await authStore.init();
    logger.info('Auth store initialized');
  });

  $effect(() => {
    if (!$authStore.loading) {
      const path = page.url.pathname;
      const user = $authStore.user;

      if (path.startsWith('/admin') && !user)
        goto('/');

      if (path === '/' && user)
        goto('/admin/contacts');
    }
  });
</script>

{#if $authStore.loading}
  <div class="h-screen flex items-center justify-center bg-white">
    <iconify-icon icon="line-md:loading-twotone-loop" width="30" class="text-indigo-600"></iconify-icon>
  </div>
{:else}
  {@render children()}
{/if}

<ToastContainer />
