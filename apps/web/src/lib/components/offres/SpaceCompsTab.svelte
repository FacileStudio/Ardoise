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
    Tooltip,
  } from '@facile/muse';
  import { trpc } from '$lib/trpc';
  import { icons, ardoise } from '$lib/icons';
  import { errorMessage, formatDate, type BillingPlan, type BillingSpaceComp } from '$lib/offres';

  let rows: BillingSpaceComp[] = $state([]);
  let plans: BillingPlan[] = $state([]);
  let loading = $state(true);
  let open = $state(false);
  let saving = $state(false);
  let pending = $state<BillingSpaceComp | null>(null);
  let confirm = $state(false);
  let form = $state({ registreSpaceId: '', reason: '', planKey: '' });

  onMount(load);

  async function load() {
    try {
      [rows, plans] = await Promise.all([trpc.billing.spaceComps.query(), trpc.billing.plans.query()]);
    } catch (err) {
      toast.danger(errorMessage(err, 'Impossible de charger les espaces offerts'));
    } finally {
      loading = false;
    }
  }

  const planName = (key: string) => plans.find((plan) => plan.key === key)?.name ?? key;

  function edit(row: BillingSpaceComp | null) {
    form = row
      ? { registreSpaceId: row.registreSpaceId, reason: row.reason, planKey: row.planKey }
      : { registreSpaceId: '', reason: '', planKey: plans.at(-1)?.key ?? '' };
    open = true;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await trpc.billing.saveSpaceComp.mutate({
        registreSpaceId: form.registreSpaceId.trim(),
        reason: form.reason.trim(),
        planKey: form.planKey,
      });
      toast.success('Espace offert enregistré');
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
      await trpc.billing.deleteSpaceComp.mutate({ id: pending.id });
      toast.success('Espace retiré');
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
    Un espace offert reçoit la version publiée de l’offre choisie, quels que soient ses
    propriétaires. C’est le seul moyen d’offrir un espace.
  </p>
  <div class="flex justify-end">
    <Button icon={icons.plus} onclick={() => edit(null)} disabled={plans.length === 0}>Offrir un espace</Button>
  </div>

  {#if loading}
    <div class="flex justify-center py-12"><Spinner /></div>
  {:else if rows.length === 0}
    <EmptyState icon={ardoise.offer} title="Aucun espace offert" description="Les espaces paient leur abonnement." />
  {:else}
    <div class="hidden md:block">
      <Table>
        <thead>
          <tr>
            <th scope="col">Espace Registre</th>
            <th scope="col">Offre</th>
            <th scope="col">Motif</th>
            <th scope="col">Par</th>
            <th scope="col">Depuis</th>
            <th scope="col" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr>
              <td class="font-mono text-fc-xs text-fc-fg">{row.registreSpaceId}</td>
              <td class="text-fc-fg">{planName(row.planKey)}</td>
              <td class="text-fc-fg-muted">{row.reason}</td>
              <td class="text-fc-fg-muted">{row.createdBy}</td>
              <td class="text-fc-fg-muted">{formatDate(row.createdAt)}</td>
              <td>
                <div class="flex justify-end gap-1">
                  <Tooltip text="Modifier" describe={false} class="contents">
                    <Button variant="ghost" size="sm" icon={icons.edit} aria-label="Modifier" onclick={() => edit(row)} />
                  </Tooltip>
                  <Tooltip text="Retirer" describe={false} class="contents">
                    <Button variant="ghost-danger" size="sm" icon={icons.remove} aria-label="Retirer"
                      onclick={() => ((pending = row), (confirm = true))} />
                  </Tooltip>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </Table>
    </div>
    <div class="flex flex-col gap-2 md:hidden">
      {#each rows as row (row.id)}
        <Card class="flex items-center justify-between gap-2">
          <button type="button" class="flex min-w-0 flex-col text-left" onclick={() => edit(row)}>
            <span class="truncate font-mono text-fc-xs text-fc-fg">{row.registreSpaceId}</span>
            <span class="text-fc-xs text-fc-fg-muted">{planName(row.planKey)} · {row.reason}</span>
          </button>
          <Tooltip text="Retirer" describe={false} class="contents">
            <Button variant="ghost-danger" size="lg" icon={icons.remove} aria-label="Retirer"
              onclick={() => ((pending = row), (confirm = true))} />
          </Tooltip>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<Modal bind:open title="Offrir un espace" showClose>
  <form class="flex flex-col gap-4" onsubmit={save}>
    <Field label="Identifiant Registre de l’espace">
      <Input bind:value={form.registreSpaceId} required />
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
  title="Retirer cet espace offert ?"
  description="L’espace revient à son abonnement, ou à l’offre gratuite, au prochain envoi vers Registre."
  confirmLabel="Retirer"
  cancelLabel="Garder"
  onConfirm={remove}
  onCancel={() => (pending = null)}
/>
