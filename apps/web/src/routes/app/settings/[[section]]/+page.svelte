<script lang="ts">
  import { page } from '$app/state';
  import { Divider, Page, PageHeader, Tabs } from '@facile/muse';
  import { icons } from '$lib/icons';
  import ProfileSection from '$lib/components/settings/ProfileSection.svelte';
  import AppearanceSection from '$lib/components/settings/AppearanceSection.svelte';

  const SECTIONS = [
    { id: 'profile', label: 'Profil', icon: icons.userCircle },
    { id: 'appearance', label: 'Apparence', icon: icons.palette },
  ] as const;

  const section = $derived(
    SECTIONS.some((s) => s.id === page.params.section) ? page.params.section! : 'profile'
  );
  const tabs = SECTIONS.map((s) => ({ ...s, href: `/app/settings/${s.id}` }));
</script>

<svelte:head>
  <title>Réglages - Ardoise</title>
</svelte:head>

<Page width="lg">
  <div class="flex flex-col gap-4">
    <PageHeader title="Réglages" />
    <Tabs items={tabs} value={section} label="Sections des réglages" />
    <Divider class="my-0" />
  </div>

  {#if section === 'profile'}
    <ProfileSection area="client" />
  {:else}
    <AppearanceSection />
  {/if}
</Page>
