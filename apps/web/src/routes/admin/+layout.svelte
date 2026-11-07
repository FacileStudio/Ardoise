<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { MobileNav, PageTransition, SideBar, Topbar } from '@facile/muse';
  import { i18n } from '@repo/i18n/svelte';
  import authStore from '$lib/auth-store';
  import { userMenuOptions } from '$lib/user-menu.svelte';
  import { ardoise, icons } from '$lib/icons';
  import { spaceFilter } from '$lib/space-filter.svelte';
  import { trpc } from '$lib/trpc';
  import { platformStaff } from '$lib/platform-staff.svelte';

  let { children } = $props();

  let collapsed = $state(false);
  let scroller: HTMLElement | null = $state(null);
  let canSeeRevenue = $state(false);
  onMount(async () => {
    void platformStaff.load();
    try {
      const rows = await trpc.space.list.query();
      spaceFilter.setSpaces(rows.map(({ id, name, role }) => ({ id, name, role })));
      canSeeRevenue = rows.some(({ role }) => role === 'ADMIN' || role === 'OWNER');
    } catch {
      return;
    }
  });

  const pathname = $derived(page.url.pathname);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  const links = $derived([
    { href: '/admin/clients', label: $i18n.t('nav.clients'), icon: ardoise.client },
    { href: '/admin/prestataires', label: $i18n.t('nav.providers'), icon: ardoise.provider },
    { href: '/admin/missions', label: $i18n.t('nav.missions'), icon: ardoise.mission },
    { href: '/admin/documents', label: $i18n.t('nav.documents'), icon: ardoise.document },
    { href: '/admin/payments', label: $i18n.t('nav.payments'), icon: icons.card },
    ...(canSeeRevenue
      ? [{ href: '/admin/revenus', label: $i18n.t('nav.revenue'), icon: ardoise.revenue }]
      : []),
    { href: '/admin/statistics', label: $i18n.t('nav.statistics'), icon: icons.dashboard },
    ...(platformStaff.staff
      ? [{ href: '/admin/offres', label: $i18n.t('nav.offers'), icon: ardoise.offer }]
      : []),
  ]);

  const MOBILE_HREFS = $derived([
    '/admin/clients',
    canSeeRevenue ? '/admin/revenus' : '/admin/prestataires',
    '/admin/missions',
    '/admin/documents',
    '/admin/payments',
    '/admin/statistics',
  ]);

  const navPages = $derived(links.map((link) => ({ ...link, active: isActive(link.href) })));
  const mobilePages = $derived(
    MOBILE_HREFS.map((href) => navPages.find((link) => link.href === href)!)
  );
  const settingsActive = $derived(isActive('/admin/settings'));

  const userMenu = $derived(userMenuOptions('admin'));

  const identity = $derived(
    $authStore.user
      ? {
          name:
            `${$authStore.user.firstName ?? ''} ${$authStore.user.lastName ?? ''}`.trim() ||
            $authStore.user.email,
          email: $authStore.user.email,
          avatar: $authStore.user.avatarUrl || undefined,
        }
      : undefined
  );

  const filteredSpaceId = $derived(spaceFilter.spaceId ?? null);

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
      userHref="/admin/settings"
      userActive={settingsActive}
      {userMenu}
      class="h-full"
    />
  </div>

  <main bind:this={scroller} class="min-w-0 flex-1 overflow-auto overscroll-contain pb-28 md:pb-0">
    <Topbar class="md:hidden">
      <span class="text-fc-md font-semibold text-fc-fg">Ardoise</span>
    </Topbar>

    <PageTransition key={pathname}>
      {#key filteredSpaceId}
        {@render children()}
      {/key}
    </PageTransition>
  </main>

  <MobileNav
    items={mobilePages}
    user={identity}
    profileHref="/admin/settings"
    profileActive={settingsActive}
    {userMenu}
  />
</div>
