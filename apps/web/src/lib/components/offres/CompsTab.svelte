<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Button,
    Card,
    ConfirmModal,
    EmptyState,
    Field,
    Input,
    Modal,
    Select,
    Spinner,
    Table,
    Textarea,
    toast,
  } from '@facile/muse';
  import { trpc } from '$lib/trpc';
  import { icons, ardoise } from '$lib/icons';
  import { errorMessage, formatDate, type BillingComp, type BillingPlan } from '$lib/offres';

  let comps: BillingComp[] = $state([]);
  let plans: BillingPlan[] = $state([]);
  let loading = $state(true);
  let open = $state(false);
  let saving = $state(false);
  let editing = $state(false);
  let pending = $state<BillingComp | null>(null);
  let confirm = $state(false);
  let form = $state({ email: '', reason: '', planKey: '' });

  onMount(load);

  async function load() {
    try {
      [comps, plans] = await Promise.all([trpc.billing.comps.query(), trpc.billing.plans.query()]);
    } catch (err) {
      toast.danger(errorMessage(err, 'Impossible de charger les personnes offertes'));
    } finally {
      loading = false;
    }
  }

  function planName(key: string) {
    return plans.find((plan) => plan.key === key)?.name ?? key;
  }

  function edit(comp: BillingComp | null) {
    editing = !!comp;
    form = comp
      ? { email: comp.email, reason: comp.reason, planKey: comp.planKey }
      : { email: '', reason: '', planKey: plans.at(-1)?.key ?? '' };
    open = true;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await trpc.billing.saveComp.mutate({
        email: form.email.trim(),
        reason: form.reason.trim(),
        planKey: form.planKey,
      });
      toast.success('Personne enregistrée');
      open = false;
      await load();
    } catch (err) {
      toast.danger(errorMessage(err, 'Enregistrement impossible'));
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!pending) return;
    try {
      await trpc.billing.deleteComp.mutate({ id: pending.id });
      toast.success('Personne retirée');
      await load();
    } catch (err) {
      toast.danger(errorMessage(err, 'Suppression impossible'));
    } finally {
      pending = null;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <p class="text-fc-sm text-fc-fg-muted">
    Une personne offerte reçoit la dernière version de l’offre choisie, même en brouillon, sur ses
    espaces et ses ressources personnelles, sans objet Stripe. Elle est reconnue par son email
    vérifié dans Registre.
  </p>
  <div class="flex justify-end">
    <Button icon={icons.plus} onclick={() => edit(null)} disabled={plans.length === 0}>Offrir une offre</Button>
  </div>

  {#if loading}
    <div class="flex justify-center py-12"><Spinner /></div>
  {:else if comps.length === 0}
    <EmptyState icon={ardoise.offer} title="Personne n’est offert" description="Ajoutez les propriétaires du studio." />
  {:else}
    <div class="hidden md:block">
      <Table>
        <thead>
          <tr>
            <th scope="col">Email</th>
            <th scope="col">Offre</th>
            <th scope="col">Motif</th>
            <th scope="col">Depuis</th>
            <th scope="col" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {#each comps as comp (comp.id)}
            <tr>
              <td class="text-fc-fg">{comp.email}</td>
              <td class="text-fc-fg">{planName(comp.planKey)}</td>
              <td class="text-fc-fg-muted">{comp.reason}</td>
              <td class="text-fc-fg-muted">{formatDate(comp.createdAt)}</td>
              <td>
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" icon={icons.edit} aria-label="Modifier" onclick={() => edit(comp)} />
                  <Button variant="ghost-danger" size="sm" icon={icons.remove} aria-label="Retirer"
                    onclick={() => ((pending = comp), (confirm = true))} />
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </Table>
    </div>
    <div class="flex flex-col gap-2 md:hidden">
      {#each comps as comp (comp.id)}
        <Card class="flex items-center justify-between gap-2">
          <button type="button" class="flex min-w-0 flex-col text-left" onclick={() => edit(comp)}>
            <span class="truncate text-fc-sm font-medium text-fc-fg">{comp.email}</span>
            <span class="text-fc-xs text-fc-fg-muted">{planName(comp.planKey)} · {comp.reason}</span>
          </button>
          <Button variant="ghost-danger" size="lg" icon={icons.remove} aria-label="Retirer"
            onclick={() => ((pending = comp), (confirm = true))} />
        </Card>
      {/each}
    </div>
  {/if}
</div>

<Modal bind:open title={editing ? 'Modifier la personne offerte' : 'Offrir une offre'} showClose>
  <form class="flex flex-col gap-4" onsubmit={save}>
    <Field label="Email">
      <Input type="email" bind:value={form.email} required disabled={editing} />
    </Field>
    <Field label="Offre">
      <Select bind:value={form.planKey}>
        {#each plans as plan (plan.id)}
          <option value={plan.key}>{plan.name}</option>
        {/each}
      </Select>
    </Field>
    <Field label="Motif">
      <Textarea bind:value={form.reason} rows={2} required />
    </Field>
    <div class="flex justify-end gap-2">
      <Button variant="ghost" type="button" onclick={() => (open = false)}>Annuler</Button>
      <Button type="submit" disabled={saving}>Enregistrer</Button>
    </div>
  </form>
</Modal>

<ConfirmModal
  bind:open={confirm}
  tone="danger"
  title="Retirer {pending?.email ?? 'cette personne'} ?"
  description="Ses espaces reviennent à leur abonnement, ou à l’offre gratuite, au prochain envoi vers Registre."
  confirmLabel="Retirer"
  cancelLabel="Garder"
  onConfirm={remove}
  onCancel={() => (pending = null)}
/>
