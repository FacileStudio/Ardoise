<script lang="ts">
  import { page } from '$app/state';
  import { MobileNav, PageTransition, SideBar } from '@facile/muse';
  import { i18n } from '@repo/i18n/svelte';
  import authStore from '$lib/auth-store';
  import { ardoise } from '$lib/icons';

  let { children } = $props();

  let collapsed = $state(false);
  let scroller: HTMLElement | null = $state(null);

  const pathname = $derived(page.url.pathname);
  const settingsActive = $derived(
    pathname === '/app/settings' || pathname.startsWith('/app/settings/')
  );

  const navPages = $derived([
    {
      href: '/app',
      label: $i18n.t('portal.nav'),
      icon: ardoise.payment,
      active: pathname === '/app',
    },
  ]);

  const identity = $derived(
    $authStore.user
      ? {
          name:
            `${$authStore.user.firstName ?? ''} ${$authStore.user.lastName ?? ''}`.trim() ||
            $authStore.user.email,
          avatar: $authStore.user.avatarUrl || undefined,
        }
      : undefined
  );

  $effect(() => {
    void pathname;
    scroller?.scrollTo({ top: 0 });
  });
</script>

<div class="flex h-dvh w-full overflow-hidden bg-fc-page">
  <div class="hidden h-full shrink-0 p-3 md:block">
    <SideBar
      icon={ardoise.brand}
      title="Ardoise"
      bind:collapsed
      pages={navPages}
      user={identity}
      userHref="/app/settings"
      userActive={settingsActive}
      class="h-full"
    />
  </div>

  <main bind:this={scroller} class="min-w-0 flex-1 overflow-auto overscroll-contain pb-28 md:pb-0">
    <PageTransition key={pathname}>
      {@render children()}
    </PageTransition>
  </main>

  <MobileNav
    items={navPages}
    user={identity}
    profileHref="/app/settings"
    profileActive={settingsActive}
  />
</div>
