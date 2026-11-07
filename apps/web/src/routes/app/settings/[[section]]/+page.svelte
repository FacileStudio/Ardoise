<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Page, SettingsLayout, orderSections, sectionHref, settingsRoute } from '@facile/muse';
  import { icons } from '$lib/icons';
  import ProfileSection from '$lib/components/settings/ProfileSection.svelte';
  import PreferencesPanel from '$lib/components/settings/PreferencesPanel.svelte';

  const BASE = '/app/settings';

  const sections = [
    { id: 'profile', label: 'Profil', icon: icons.userCircle, href: sectionHref(BASE, 'profile') },
    { id: 'preferences', label: 'Préférences', icon: icons.palette, href: sectionHref(BASE, 'preferences') },
  ];

  const requested = $derived(page.params.section);
  const route = $derived(settingsRoute(requested, orderSections(sections)));

  $effect(() => {
    if (requested === 'appearance') void goto(sectionHref(BASE, 'preferences'), { replaceState: true });
    else if (!route.known) void goto(BASE, { replaceState: true });
  });
</script>

<svelte:head>
  <title>Réglages - Ardoise</title>
</svelte:head>

<Page width="lg">
  <SettingsLayout {sections} active={requested} backHref={BASE} title="Réglages">
    {#snippet children(id)}
      {#if id === 'profile'}
        <ProfileSection area="client" />
      {:else if id === 'preferences'}
        <PreferencesPanel />
      {/if}
    {/snippet}
  </SettingsLayout>
</Page>
