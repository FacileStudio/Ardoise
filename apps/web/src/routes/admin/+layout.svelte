<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { MobileNav, PageTransition, SideBar, SpaceSwitcher, Topbar } from '@facile/muse';
  import { i18n } from '@repo/i18n/svelte';
  import authStore from '$lib/auth-store';
  import { ardoise, icons } from '$lib/icons';
  import { spaceContext } from '$lib/space-context.svelte';
  import { trpc } from '$lib/trpc';

  let { children } = $props();

  type SpaceRow = { id: string; name: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' };

  let collapsed = $state(false);
  let scroller: HTMLElement | null = $state(null);
  let spaceRows: SpaceRow[] = $state([]);

  onMount(async () => {
    try {
      spaceRows = (await trpc.space.list.query()) as SpaceRow[];
    } catch {
      return;
    }
    const stored = spaceRows.find((space) => space.id === spaceContext.spaceId);
    if (stored) spaceContext.switchToSpace(stored.id, stored.name, stored.role);
    else spaceContext.switchToPersonal();
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
    { href: '/admin/statistics', label: $i18n.t('nav.statistics'), icon: icons.dashboard },
    { href: '/admin/spaces', label: $i18n.t('nav.spaces'), icon: icons.usersGroup },
  ]);

  const MOBILE_HREFS = [
    '/admin/clients',
    '/admin/prestataires',
    '/admin/missions',
    '/admin/documents',
    '/admin/payments',
    '/admin/statistics',
  ];

  const navPages = $derived(links.map((link) => ({ ...link, active: isActive(link.href) })));
  const mobilePages = $derived(
    MOBILE_HREFS.map((href) => navPages.find((link) => link.href === href)!)
  );
  const settingsActive = $derived(isActive('/admin/settings'));

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

  const switcherSpaces = $derived(spaceRows.map(({ id, name }) => ({ id, name })));
  const activeSpaceId = $derived(spaceContext.spaceId ?? null);

  function selectSpace(id: string | null) {
    const before = spaceContext.spaceId;
    const row = spaceRows.find((space) => space.id === id);
    if (row) spaceContext.switchToSpace(row.id, row.name, row.role);
    else spaceContext.switchToPersonal();
    if (spaceContext.spaceId === before) return;
    const section = links.find((link) => isActive(link.href))?.href;
    if (section && section !== pathname) goto(resolve(section as '/admin'));
  }

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
      spaces={switcherSpaces}
      {activeSpaceId}
      onSpaceSelect={selectSpace}
      personalSpaceLabel={$i18n.t('nav.personalSpace')}
      manageSpacesLabel={$i18n.t('nav.manageSpaces')}
      manageSpacesHref="/admin/spaces"
      user={identity}
      userHref="/admin/settings"
      userActive={settingsActive}
      class="h-full"
    />
  </div>

  <main bind:this={scroller} class="min-w-0 flex-1 overflow-auto overscroll-contain pb-28 md:pb-0">
    <Topbar class="md:hidden">
      <span class="text-fc-md font-semibold text-fc-fg">Ardoise</span>
      {#if switcherSpaces.length > 0}
        <div class="max-w-56 min-w-0 flex-1">
          <SpaceSwitcher
            spaces={switcherSpaces}
            activeId={activeSpaceId}
            onSelect={selectSpace}
            personalLabel={$i18n.t('nav.personalSpace')}
            manageLabel={$i18n.t('nav.manageSpaces')}
            manageHref="/admin/spaces"
          />
        </div>
      {/if}
    </Topbar>

    <PageTransition key={pathname}>
      {#key activeSpaceId}
        {@render children()}
      {/key}
    </PageTransition>
  </main>

  <MobileNav
    items={mobilePages}
    user={identity}
    profileHref="/admin/settings"
    profileActive={settingsActive}
  />
</div>
