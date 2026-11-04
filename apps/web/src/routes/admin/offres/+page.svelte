<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert, Button, Page, PageHeader, Tabs, toast } from '@facile/muse';
  import { trpc } from '$lib/trpc';
  import { icons } from '$lib/icons';
  import { errorMessage, formatDate } from '$lib/offres';
  import PlansTab from '$lib/components/offres/PlansTab.svelte';
  import FeaturesTab from '$lib/components/offres/FeaturesTab.svelte';
  import OverridesTab from '$lib/components/offres/OverridesTab.svelte';
  import CompsTab from '$lib/components/offres/CompsTab.svelte';
  import SpaceCompsTab from '$lib/components/offres/SpaceCompsTab.svelte';
  import SubscriptionsTab from '$lib/components/offres/SubscriptionsTab.svelte';

  type PushState = Awaited<ReturnType<typeof trpc.billing.pushState.query>>;

  const tabs = [
    { id: 'plans', label: 'Offres' },
    { id: 'features', label: 'Fonctionnalités' },
    { id: 'overrides', label: 'Dérogations' },
    { id: 'comps', label: 'Personnes offertes' },
    { id: 'spaceComps', label: 'Espaces offerts' },
    { id: 'subscriptions', label: 'Abonnements' },
  ];

  let tab = $state('plans');
  let push = $state<PushState>(null);
  let pushing = $state(false);

  onMount(loadPush);

  async function loadPush() {
    try {
      push = await trpc.billing.pushState.query();
    } catch {
      push = null;
    }
  }

  async function pushNow() {
    pushing = true;
    try {
      const outcome = await trpc.billing.pushNow.mutate();
      if (outcome.status === 'failed') toast.danger(`Envoi impossible: ${outcome.error}`);
      else if (outcome.status === 'unchanged') toast.success('Registre est déjà à jour');
      else toast.success(`Droits envoyés à Registre (révision ${outcome.revision})`);
      if (outcome.status !== 'failed' && outcome.unresolvedComps.length > 0) {
        toast.warning(`Absents de Registre: ${outcome.unresolvedComps.join(', ')}`);
      }
      await loadPush();
    } catch (err) {
      toast.danger(errorMessage(err, 'Envoi impossible'));
    } finally {
      pushing = false;
    }
  }
</script>

<svelte:head><title>Offres - Ardoise</title></svelte:head>

<Page width="xl">
  <PageHeader
    title="Offres"
    description="Fonctionnalités, offres versionnées, dérogations et abonnements de la suite Facile"
  >
    {#snippet actions()}
      <Button variant="ghost" icon={icons.refresh} onclick={pushNow} disabled={pushing}>
        Envoyer à Registre
      </Button>
    {/snippet}
  </PageHeader>

  {#if push?.lastError}
    <Alert tone="danger" title="Dernier envoi vers Registre en échec">{push.lastError}</Alert>
  {:else if push}
    <p class="text-fc-xs text-fc-fg-muted">
      Révision {push.revision}, dernier envoi le {formatDate(push.lastPushedAt)}
    </p>
  {/if}

  <Tabs items={tabs} bind:value={tab} label="Sections des offres" />

  {#if tab === 'plans'}
    <PlansTab />
  {:else if tab === 'features'}
    <FeaturesTab />
  {:else if tab === 'overrides'}
    <OverridesTab />
  {:else if tab === 'comps'}
    <CompsTab />
  {:else if tab === 'spaceComps'}
    <SpaceCompsTab />
  {:else}
    <SubscriptionsTab />
  {/if}
</Page>
