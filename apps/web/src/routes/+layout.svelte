<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, verifySession } from '$lib/auth-store';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { Spinner, Toaster } from '@facile/muse';
  import { setLocale } from '@repo/i18n/svelte';
  import { isMember, type SessionUser } from '@repo/auth-shared';
  import SmtpRequiredModal from '$lib/components/SmtpRequiredModal.svelte';
  import mdi from '$lib/icons/mdi.json';
  import solar from '$lib/icons/solar.json';
  import '../app.css';

  let { children } = $props();

  let verified = $state(false);

  if (browser) {
    void import('iconify-icon').then(({ addCollection }) => {
      addCollection(solar);
      addCollection(mdi);
    });
  }

  onMount(async () => {
    const serverUser = page.data.user as SessionUser | undefined;
    if (serverUser) authStore.setAuth(serverUser);
    else await authStore.init();
    setLocale('fr');
    if (page.url.pathname === '/login') verified = await verifySession();
  });

  $effect(() => {
    if ($authStore.loading) return;
    const path = page.url.pathname;
    const user = $authStore.user;

    if ((path.startsWith('/app') || path.startsWith('/admin')) && !user) goto(resolve('/login'));

    if (path === '/login' && user && verified) {
      const next = page.url.searchParams.get('next');
      if (next?.startsWith('/') && !next.startsWith('//')) goto(resolve(next as '/'));
      else goto(resolve(isMember(user) ? '/admin/missions' : '/app'));
    }

    if (path.startsWith('/admin') && user && !isMember(user)) goto(resolve('/app'));
  });
</script>

{#if $authStore.loading}
  <div class="flex h-dvh items-center justify-center bg-fc-page">
    <Spinner />
  </div>
{:else}
  {@render children()}
{/if}

<Toaster class="pb-28 md:pb-6" />
<SmtpRequiredModal />
