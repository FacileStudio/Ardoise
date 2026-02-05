<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/auth-store';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { ToastContainer } from '@repo/ui';
  import '../app.css';

  onMount(async () => {
    await authStore.init();
  });

  $: if (!$authStore.loading) {
    const path = $page.url.pathname;
    const user = $authStore.user;

    if (path.startsWith('/app') && !user) {
      goto('/login');
    }

    if ((path === '/login' || path === '/register') && user) {
      goto('/app/profile');
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
<ToastContainer />
