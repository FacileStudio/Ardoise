<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/auth-store';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { ToastContainer } from '@repo/ui';
  import { setLocale } from '@repo/i18n/svelte';
  import { isAdmin } from '@repo/auth-shared';
  import '../app.css';

  let { children } = $props();

  onMount(async () => {
    await authStore.init();
    setLocale('fr');
  });

  $effect(() => {
    if (!$authStore.loading) {
      const path = page.url.pathname;
      const user = $authStore.user;

      if ((path.startsWith('/app') || path.startsWith('/admin')) && !user)
        goto(resolve('/login'));

      if (path === '/login' && user)
        goto(resolve(isAdmin(user) ? '/admin/clients' : '/app'));

      if (path.startsWith('/admin') && user && !isAdmin(user))
        goto(resolve('/app'));
    }
  });
</script>

{#if $authStore.loading}
  <div class="h-screen flex items-center justify-center bg-background">
    <iconify-icon icon="line-md:loading-twotone-loop" width="30" class="text-foreground"></iconify-icon>
  </div>
{:else}
  {@render children()}
{/if}

<ToastContainer />
