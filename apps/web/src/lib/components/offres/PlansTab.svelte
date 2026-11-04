<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner, toast } from '@facile/muse';
  import { trpc } from '$lib/trpc';
  import { icons, ardoise } from '$lib/icons';
  import { errorMessage, formatDate, versionStatus, type BillingPlan } from '$lib/offres';

  let plans: BillingPlan[] = $state([]);
  let loading = $state(true);
  let open = $state(false);
  let saving = $state(false);
  let form = $state({ key: '', name: '', sortOrder: '0' });

  onMount(load);

  async function load() {
    try {
      plans = await trpc.billing.plans.query();
    } catch (err) {
      toast.danger(errorMessage(err, 'Impossible de charger les offres'));
    } finally {
      loading = false;
    }
  }

  function subscribers(plan: BillingPlan) {
    return plan.versions.reduce((sum, version) => sum + version._count.subscriptions, 0);
  }

  async function create(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      const plan = await trpc.billing.savePlan.mutate({
        key: form.key.trim(),
        name: form.name.trim(),
        sortOrder: Number(form.sortOrder) || 0,
      });
      await trpc.billing.createDraft.mutate({ planId: plan.id });
      toast.success('Offre créée en brouillon');
      open = false;
      await load();
    } catch (err) {
      toast.danger(errorMessage(err, 'Création impossible'));
    } finally {
      saving = false;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex justify-end">
    <Button icon={icons.plus} onclick={() => ((form = { key: '', name: '', sortOrder: String(plans.length) }), (open = true))}>
      Nouvelle offre
    </Button>
  </div>

  {#if loading}
    <div class="flex justify-center py-12"><Spinner /></div>
  {:else if plans.length === 0}
    <EmptyState icon={ardoise.offer} title="Aucune offre" description="Créez Solo, Pro et Studio, ou lancez le seed de facturation." />
  {:else}
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {#each plans as plan (plan.id)}
        {@const current = plan.versions.find((v) => v.status === 'published')}
        {@const draft = plan.versions.find((v) => v.status === 'draft')}
        <a
          href={resolve(`/admin/offres/${plan.id}`)}
          class="rounded-fc-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
        >
          <Card class="flex h-full flex-col gap-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex flex-col">
                <span class="text-fc-md font-semibold text-fc-fg">{plan.name}</span>
                <span class="font-mono text-fc-xs text-fc-fg-muted">{plan.key}</span>
              </div>
              {#if current}
                <Badge tone="success">v{current.version} publiée</Badge>
              {:else}
                <Badge tone="warning">Non publiée</Badge>
              {/if}
            </div>
            <div class="flex flex-wrap gap-2 text-fc-xs text-fc-fg-muted">
              {#if current}<span>Publiée le {formatDate(current.publishedAt)}</span>{/if}
              {#if draft}<Badge tone={versionStatus('draft').tone}>Brouillon v{draft.version}</Badge>{/if}
              <span>{subscribers(plan)} abonnement(s) actif(s)</span>
            </div>
          </Card>
        </a>
      {/each}
    </div>
  {/if}
</div>

<Modal bind:open title="Nouvelle offre" showClose>
  <form class="flex flex-col gap-4" onsubmit={create}>
    <Field label="Clé" helper="Minuscules, chiffres et _; elle forme les clés Stripe plan_<clé>_month">
      <Input bind:value={form.key} required placeholder="pro" />
    </Field>
    <Field label="Nom">
      <Input bind:value={form.name} required placeholder="Pro" />
    </Field>
    <Field label="Ordre d’affichage">
      <Input bind:value={form.sortOrder} inputmode="numeric" />
    </Field>
    <div class="flex justify-end gap-2">
      <Button variant="ghost" type="button" onclick={() => (open = false)}>Annuler</Button>
      <Button type="submit" disabled={saving}>Créer</Button>
    </div>
  </form>
</Modal>
