<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/auth-store';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { ToastContainer } from '@repo/ui';
  import { setLocale } from '@repo/i18n/svelte';
  import { isAdmin, type SessionUser } from '@repo/auth-shared';
  import { trpc } from '$lib/trpc';
  import env from '$lib/env';
  import '../app.css';

  let { children } = $props();

  const apiBase = env.API_URL?.replace(/\/trpc\/?$/, '').replace(/\/$/, '') || '';

  async function syncProfile() {
    try {
      const res = await fetch(`${apiBase}/auth/sync-profile`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.synced) {
        const me = await trpc.auth.me.query({});
        if (me) authStore.setAuth(me as SessionUser);
      }
    } catch {}
  }

  onMount(async () => {
    await authStore.init();
    setLocale('fr');

    if (authStore.getState().user) {
      syncProfile();
    }
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
