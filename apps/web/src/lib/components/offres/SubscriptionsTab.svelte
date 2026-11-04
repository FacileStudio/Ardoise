<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Card, EmptyState, Spinner, Table, toast } from '@facile/muse';
  import { trpc } from '$lib/trpc';
  import { ardoise } from '$lib/icons';
  import { errorMessage, formatDate, subscriptionStatus, type BillingSubscription } from '$lib/offres';

  let rows: BillingSubscription[] = $state([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      rows = await trpc.billing.subscriptions.query();
    } catch (err) {
      toast.danger(errorMessage(err, 'Impossible de charger les abonnements'));
    } finally {
      loading = false;
    }
  });

  function planLabel(row: BillingSubscription) {
    return row.planVersion ? `${row.planVersion.plan.name} v${row.planVersion.version}` : '-';
  }
</script>

{#if loading}
  <div class="flex justify-center py-12"><Spinner /></div>
{:else if rows.length === 0}
  <EmptyState icon={ardoise.offer} title="Aucun abonnement" description="Les abonnements apparaissent ici dès le premier paiement Stripe." />
{:else}
  <div class="hidden md:block">
    <Table>
      <thead>
        <tr>
          <th scope="col">Espace</th>
          <th scope="col">Offre</th>
          <th scope="col">Statut</th>
          <th scope="col">Fin de période</th>
          <th scope="col">Client Stripe</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          {@const status = subscriptionStatus(row.status)}
          <tr>
            <td class="font-mono text-fc-xs text-fc-fg">{row.registreSpaceId}</td>
            <td class="text-fc-fg">{planLabel(row)}</td>
            <td>
              <div class="flex flex-wrap gap-1">
                <Badge tone={status.tone}>{status.label}</Badge>
                {#if row.cancelAtPeriodEnd}<Badge tone="warning">Résiliation prévue</Badge>{/if}
              </div>
            </td>
            <td class="text-fc-fg-muted">{formatDate(row.currentPeriodEnd)}</td>
            <td class="font-mono text-fc-xs text-fc-fg-muted">{row.stripeCustomerId ?? '-'}</td>
          </tr>
        {/each}
      </tbody>
    </Table>
  </div>
  <div class="flex flex-col gap-2 md:hidden">
    {#each rows as row (row.id)}
      {@const status = subscriptionStatus(row.status)}
      <Card class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-fc-sm font-medium text-fc-fg">{planLabel(row)}</span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <span class="truncate font-mono text-fc-xs text-fc-fg-muted">{row.registreSpaceId}</span>
        <span class="text-fc-xs text-fc-fg-muted">Fin de période: {formatDate(row.currentPeriodEnd)}</span>
      </Card>
    {/each}
  </div>
{/if}
