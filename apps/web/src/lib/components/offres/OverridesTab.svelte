<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Badge,
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
  import {
    errorMessage,
    formatDate,
    formatValue,
    fromFormValue,
    type BillingFeature,
    type BillingOverride,
  } from '$lib/offres';
  import ValueInput from './ValueInput.svelte';

  let overrides: BillingOverride[] = $state([]);
  let features: BillingFeature[] = $state([]);
  let loading = $state(true);
  let open = $state(false);
  let saving = $state(false);
  let pending = $state<BillingOverride | null>(null);
  let confirm = $state(false);
  let form = $state({
    scope: 'space' as 'space' | 'person',
    target: '',
    feature: '',
    value: '' as string | boolean,
    reason: '',
    expiresAt: '',
  });

  const selected = $derived(features.find((f) => f.key === form.feature));

  onMount(load);

  async function load() {
    try {
      [overrides, features] = await Promise.all([
        trpc.billing.overrides.query(),
        trpc.billing.features.query(),
      ]);
    } catch (err) {
      toast.danger(errorMessage(err, 'Impossible de charger les dérogations'));
    } finally {
      loading = false;
    }
  }

  function create() {
    form = { scope: 'space', target: '', feature: features[0]?.key ?? '', value: '', reason: '', expiresAt: '' };
    open = true;
  }

  function expired(override: BillingOverride) {
    return !!override.expiresAt && new Date(override.expiresAt).getTime() <= Date.now();
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!selected) return;
    const value = fromFormValue(selected.kind, form.value);
    if (value === null) {
      toast.danger('Valeur invalide: un entier, ou -1 pour illimité');
      return;
    }
    saving = true;
    try {
      await trpc.billing.createOverride.mutate({
        scope: form.scope,
        registreSpaceId: form.scope === 'space' ? form.target.trim() : null,
        personEmail: form.scope === 'person' ? form.target.trim() : null,
        feature: selected.key,
        value,
        reason: form.reason.trim(),
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`) : null,
      });
      toast.success('Dérogation créée');
      open = false;
      await load();
    } catch (err) {
      toast.danger(errorMessage(err, 'Création impossible'));
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!pending) return;
    try {
      await trpc.billing.deleteOverride.mutate({ id: pending.id });
      toast.success('Dérogation supprimée');
      await load();
    } catch (err) {
      toast.danger(errorMessage(err, 'Suppression impossible'));
    } finally {
      pending = null;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex justify-end">
    <Button icon={icons.plus} onclick={create} disabled={features.length === 0}>Nouvelle dérogation</Button>
  </div>

  {#if loading}
    <div class="flex justify-center py-12"><Spinner /></div>
  {:else if overrides.length === 0}
    <EmptyState
      icon={ardoise.offer}
      title="Aucune dérogation"
      description="Une dérogation fixe une valeur pour un espace ou une personne, au-dessus de l’offre."
    />
  {:else}
    <div class="hidden md:block">
      <Table>
        <thead>
          <tr>
            <th scope="col">Cible</th>
            <th scope="col">Fonctionnalité</th>
            <th scope="col">Valeur</th>
            <th scope="col">Motif</th>
            <th scope="col">Expire</th>
            <th scope="col" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {#each overrides as override (override.id)}
            <tr class={expired(override) ? 'opacity-60' : ''}>
              <td>
                <div class="flex flex-col">
                  <Badge tone={override.scope === 'space' ? 'info' : 'accent'}>
                    {override.scope === 'space' ? 'Espace' : 'Personne'}
                  </Badge>
                  <span class="font-mono text-fc-xs text-fc-fg-muted">{override.registreSpaceId ?? override.personEmail}</span>
                </div>
              </td>
              <td class="font-mono text-fc-sm">{override.feature.key}</td>
              <td class="text-fc-fg">{formatValue(override.value)}</td>
              <td class="text-fc-fg-muted">{override.reason}</td>
              <td class="text-fc-fg-muted">{expired(override) ? 'Expirée' : formatDate(override.expiresAt)}</td>
              <td>
                <div class="flex justify-end">
                  <Button variant="ghost-danger" size="sm" icon={icons.remove} aria-label="Supprimer"
                    onclick={() => ((pending = override), (confirm = true))} />
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </Table>
    </div>
    <div class="flex flex-col gap-2 md:hidden">
      {#each overrides as override (override.id)}
        <Card class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate font-mono text-fc-sm text-fc-fg">{override.feature.key} = {formatValue(override.value)}</span>
            <Button variant="ghost-danger" size="lg" icon={icons.remove} aria-label="Supprimer"
              onclick={() => ((pending = override), (confirm = true))} />
          </div>
          <span class="truncate text-fc-xs text-fc-fg-muted">{override.registreSpaceId ?? override.personEmail}</span>
          <span class="text-fc-xs text-fc-fg-muted">{override.reason} · {expired(override) ? 'Expirée' : formatDate(override.expiresAt)}</span>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<Modal bind:open title="Nouvelle dérogation" showClose>
  <form class="flex flex-col gap-4" onsubmit={save}>
    <Field label="Portée">
      <Select bind:value={form.scope}>
        <option value="space">Un espace</option>
        <option value="person">Une personne</option>
      </Select>
    </Field>
    <Field label={form.scope === 'space' ? 'Identifiant Registre de l’espace' : 'Email de la personne'}>
      <Input bind:value={form.target} required type={form.scope === 'person' ? 'email' : 'text'} />
    </Field>
    <Field label="Fonctionnalité">
      <Select bind:value={form.feature}>
        {#each features as feature (feature.id)}
          <option value={feature.key}>{feature.key}</option>
        {/each}
      </Select>
    </Field>
    {#if selected}
      <Field label="Valeur">
        {#key selected.key}
          <ValueInput kind={selected.kind} bind:value={form.value} label="Valeur" unit={selected.unit} />
        {/key}
      </Field>
    {/if}
    <Field label="Motif">
      <Textarea bind:value={form.reason} rows={2} required />
    </Field>
    <Field label="Expire le" helper="Vide: sans limite">
      <Input type="date" bind:value={form.expiresAt} />
    </Field>
    <div class="flex justify-end gap-2">
      <Button variant="ghost" type="button" onclick={() => (open = false)}>Annuler</Button>
      <Button type="submit" disabled={saving}>Créer</Button>
    </div>
  </form>
</Modal>

<ConfirmModal
  bind:open={confirm}
  tone="danger"
  title="Supprimer cette dérogation ?"
  description="La valeur revient à celle de l’offre au prochain envoi vers Registre."
  confirmLabel="Supprimer"
  cancelLabel="Garder"
  onConfirm={remove}
  onCancel={() => (pending = null)}
/>
