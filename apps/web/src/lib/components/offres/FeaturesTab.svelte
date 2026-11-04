<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Badge,
    Button,
    Card,
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
    formatValue,
    fromFormValue,
    toFormValue,
    type BillingFeature,
  } from '$lib/offres';
  import ValueInput from './ValueInput.svelte';

  let features: BillingFeature[] = $state([]);
  let loading = $state(true);
  let open = $state(false);
  let saving = $state(false);
  let editing = $state(false);
  let form = $state({
    key: '',
    app: '',
    kind: 'limit' as 'bool' | 'limit',
    unit: '',
    description: '',
    defaultValue: '' as string | boolean,
  });

  onMount(load);

  async function load() {
    try {
      features = await trpc.billing.features.query();
    } catch (err) {
      toast.danger(errorMessage(err, 'Impossible de charger les fonctionnalités'));
    } finally {
      loading = false;
    }
  }

  function create() {
    editing = false;
    form = { key: '', app: '', kind: 'limit', unit: '', description: '', defaultValue: '' };
    open = true;
  }

  function edit(feature: BillingFeature) {
    editing = true;
    form = {
      key: feature.key,
      app: feature.app,
      kind: feature.kind,
      unit: feature.unit ?? '',
      description: feature.description ?? '',
      defaultValue: toFormValue(feature.kind, feature.defaultValue),
    };
    open = true;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    const defaultValue = fromFormValue(form.kind, form.defaultValue);
    if (defaultValue === null) {
      toast.danger('Valeur par défaut invalide: un entier, ou -1 pour illimité');
      return;
    }
    saving = true;
    try {
      await trpc.billing.saveFeature.mutate({
        key: form.key.trim(),
        app: form.app.trim() || form.key.split('.')[0] || '',
        kind: form.kind,
        unit: form.unit.trim() || null,
        description: form.description.trim() || null,
        defaultValue,
      });
      toast.success('Fonctionnalité enregistrée');
      open = false;
      await load();
    } catch (err) {
      toast.danger(errorMessage(err, 'Enregistrement impossible'));
    } finally {
      saving = false;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex justify-end">
    <Button icon={icons.plus} onclick={create}>Nouvelle fonctionnalité</Button>
  </div>

  {#if loading}
    <div class="flex justify-center py-12"><Spinner /></div>
  {:else if features.length === 0}
    <EmptyState
      icon={ardoise.offer}
      title="Aucune fonctionnalité"
      description="Lancez le seed de facturation ou créez la première fonctionnalité."
    />
  {:else}
    <div class="hidden md:block">
      <Table>
        <thead>
          <tr>
            <th scope="col">Clé</th>
            <th scope="col">Description</th>
            <th scope="col">Type</th>
            <th scope="col">Par défaut</th>
            <th scope="col" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {#each features as feature (feature.id)}
            <tr>
              <td class="font-mono text-fc-sm text-fc-fg">{feature.key}</td>
              <td class="text-fc-fg-muted">{feature.description || '-'}</td>
              <td><Badge>{feature.kind === 'bool' ? 'Oui / non' : 'Limite'}</Badge></td>
              <td class="text-fc-fg">{formatValue(feature.defaultValue, feature.unit)}</td>
              <td>
                <div class="flex justify-end">
                  <Button variant="ghost" size="sm" icon={icons.edit} aria-label="Modifier" onclick={() => edit(feature)} />
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </Table>
    </div>
    <div class="flex flex-col gap-2 md:hidden">
      {#each features as feature (feature.id)}
        <Card class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 flex-col">
            <span class="truncate font-mono text-fc-sm text-fc-fg">{feature.key}</span>
            <span class="text-fc-xs text-fc-fg-muted">
              Par défaut: {formatValue(feature.defaultValue, feature.unit)}
            </span>
          </div>
          <Button variant="ghost" size="lg" icon={icons.edit} aria-label="Modifier" onclick={() => edit(feature)} />
        </Card>
      {/each}
    </div>
  {/if}
</div>

<Modal bind:open title={editing ? 'Modifier la fonctionnalité' : 'Nouvelle fonctionnalité'} showClose>
  <form class="flex flex-col gap-4" onsubmit={save}>
    <Field label="Clé" helper="app.fonctionnalite, en minuscules">
      <Input bind:value={form.key} required disabled={editing} placeholder="nuage.storage_gb" />
    </Field>
    <Field label="Application">
      <Input bind:value={form.app} placeholder="nuage" />
    </Field>
    <Field label="Type" helper={editing ? 'Le type ne change plus après la création' : undefined}>
      <Select bind:value={form.kind} disabled={editing}>
        <option value="limit">Limite</option>
        <option value="bool">Oui / non</option>
      </Select>
    </Field>
    {#if form.kind === 'limit'}
      <Field label="Unité">
        <Input bind:value={form.unit} placeholder="Go" />
      </Field>
    {/if}
    <Field label="Description">
      <Textarea bind:value={form.description} rows={2} />
    </Field>
    <Field label="Valeur par défaut (offre gratuite)">
      {#key form.kind}
        <ValueInput kind={form.kind} bind:value={form.defaultValue} label="Valeur par défaut" unit={form.unit} />
      {/key}
    </Field>
    <div class="flex justify-end gap-2">
      <Button variant="ghost" type="button" onclick={() => (open = false)}>Annuler</Button>
      <Button type="submit" disabled={saving}>Enregistrer</Button>
    </div>
  </form>
</Modal>
