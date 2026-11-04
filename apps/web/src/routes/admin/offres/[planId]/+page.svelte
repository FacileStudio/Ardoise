<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import {
    Alert,
    Badge,
    Button,
    Card,
    ConfirmModal,
    Field,
    Input,
    Modal,
    Page,
    PageHeader,
    Section,
    Select,
    Spinner,
    Table,
    toast,
  } from '@facile/muse';
  import { trpc } from '$lib/trpc';
  import { icons } from '$lib/icons';
  import {
    errorMessage,
    formatCents,
    formatDate,
    formatValue,
    fromFormValue,
    parseEuros,
    toFormValue,
    versionStatus,
    type BillingFeature,
    type BillingPlan,
    type BillingVersion,
    type PublishPreview,
  } from '$lib/offres';
  import ValueInput from '$lib/components/offres/ValueInput.svelte';

  const planId = $derived(page.params.planId ?? '');

  let loading = $state(true);
  let plan = $state<BillingPlan | null>(null);
  let features: BillingFeature[] = $state([]);
  let version = $state<BillingVersion | null>(null);
  let selectedId = $state('');
  let values: Record<string, string | boolean> = $state({});
  let prices = $state({ month: '', year: '' });
  let meta = $state({ name: '', sortOrder: '0' });
  let busy = $state(false);

  let publishOpen = $state(false);
  let preview = $state<PublishPreview | null>(null);
  let migrateOpen = $state(false);
  let migrateMode = $state<'period_end' | 'immediate'>('period_end');
  let deleteOpen = $state(false);

  const isDraft = $derived(version?.status === 'draft');
  const draft = $derived(plan?.versions.find((v) => v.status === 'draft'));
  const published = $derived(plan?.versions.find((v) => v.status === 'published'));
  const behind = $derived(
    plan?.versions.filter((v) => v.status !== 'published').reduce((sum, v) => sum + v._count.subscriptions, 0) ?? 0
  );

  onMount(() => load());

  async function load(select?: string) {
    try {
      const [plans, rows] = await Promise.all([trpc.billing.plans.query(), trpc.billing.features.query()]);
      plan = plans.find((p) => p.id === planId) ?? null;
      features = rows;
      if (!plan) return;
      meta = { name: plan.name, sortOrder: String(plan.sortOrder) };
      const pick = select ?? plan.versions.find((v) => v.status === 'draft')?.id ?? plan.versions[0]?.id;
      if (pick) await selectVersion(pick);
    } catch (err) {
      toast.danger(errorMessage(err, 'Impossible de charger l’offre'));
    } finally {
      loading = false;
    }
  }

  async function selectVersion(id: string) {
    selectedId = id;
    version = await trpc.billing.version.query({ id });
    const stored = version.values as Record<string, unknown>;
    values = Object.fromEntries(features.map((f) => [f.key, toFormValue(f.kind, stored[f.key] ?? f.defaultValue)]));
    const cents = (interval: string) => version?.prices.find((p) => p.interval === interval)?.amount;
    const euros = (value: number | undefined) => (value === undefined ? '' : String(value / 100));
    prices = { month: euros(cents('month')), year: euros(cents('year')) };
  }

  async function run<T>(action: () => Promise<T>, success: string, failure: string) {
    busy = true;
    try {
      const result = await action();
      toast.success(success);
      return result;
    } catch (err) {
      toast.danger(errorMessage(err, failure));
      return undefined;
    } finally {
      busy = false;
    }
  }

  function draftPayload() {
    const out: Record<string, boolean | number> = {};
    for (const feature of features) {
      const value = fromFormValue(feature.kind, values[feature.key] ?? '');
      if (value === null) throw new Error(`Valeur invalide pour ${feature.key}`);
      out[feature.key] = value;
    }
    const month = parseEuros(prices.month);
    const year = parseEuros(prices.year);
    if (month === undefined || year === undefined) throw new Error('Prix invalide');
    return { values: out, prices: { month, year } };
  }

  async function saveDraft() {
    if (!version) return false;
    const saved = await run(
      () => trpc.billing.saveDraft.mutate({ id: version!.id, ...draftPayload() }),
      'Brouillon enregistré',
      'Enregistrement impossible'
    );
    if (saved) await load(version.id);
    return !!saved;
  }

  async function openPublish() {
    if (!version || !(await saveDraft())) return;
    try {
      preview = await trpc.billing.previewPublish.query({ id: version.id });
      publishOpen = true;
    } catch (err) {
      toast.danger(errorMessage(err, 'Aperçu impossible'));
    }
  }

  async function publish() {
    if (!version) return;
    const done = await run(() => trpc.billing.publish.mutate({ id: version!.id }), 'Version publiée', 'Publication impossible');
    publishOpen = false;
    if (done) await load(version.id);
  }

  async function newDraft() {
    if (!plan) return;
    const created = await run(() => trpc.billing.createDraft.mutate({ planId: plan!.id }), 'Brouillon créé', 'Création impossible');
    if (created) await load(created.id);
  }

  async function deleteDraft() {
    if (!version) return;
    const done = await run(() => trpc.billing.deleteDraft.mutate({ id: version!.id }), 'Brouillon supprimé', 'Suppression impossible');
    if (done) await load();
  }

  async function saveMeta(event: SubmitEvent) {
    event.preventDefault();
    if (!plan) return;
    const saved = await run(
      () => trpc.billing.savePlan.mutate({ key: plan!.key, name: meta.name.trim(), sortOrder: Number(meta.sortOrder) || 0 }),
      'Offre enregistrée',
      'Enregistrement impossible'
    );
    if (saved) await load(selectedId);
  }

  async function migrate() {
    if (!plan) return;
    busy = true;
    try {
      const result = await trpc.billing.migrateSubscribers.mutate({ planId: plan.id, mode: migrateMode });
      toast.success(`${result.migrated} migré(s), ${result.skipped} ignoré(s), ${result.failed} en échec`);
      await load(selectedId);
    } catch (err) {
      toast.danger(errorMessage(err, 'Migration impossible'));
    } finally {
      busy = false;
      migrateOpen = false;
    }
  }

  const unitOf = (key: string) => features.find((f) => f.key === key)?.unit ?? null;
</script>

<svelte:head><title>{plan?.name ?? 'Offre'} - Ardoise</title></svelte:head>

{#if loading}
  <div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
{:else if !plan}
  <Page width="lg">
    <PageHeader title="Offre introuvable" back={{ href: resolve('/admin/offres'), label: 'Offres' }} />
  </Page>
{:else}
  <Page width="lg">
    <PageHeader title={plan.name} description="Clé {plan.key}" back={{ href: resolve('/admin/offres'), label: 'Offres' }}>
      {#snippet actions()}
        {#if !draft}
          <Button icon={icons.plus} onclick={newDraft} disabled={busy}>Nouvelle version</Button>
        {/if}
      {/snippet}
    </PageHeader>

    {#if behind > 0 && published}
      <Alert tone="warning" title="{behind} abonnement(s) sur une ancienne version">
        <div class="flex flex-col gap-2">
          <span>Ils gardent leurs anciens droits et leur ancien prix tant qu’ils ne sont pas migrés.</span>
          <Button variant="outline" size="sm" class="w-fit" onclick={() => (migrateOpen = true)}>
            Migrer vers la v{published.version}
          </Button>
        </div>
      </Alert>
    {/if}

    <Section title="Versions">
      <div class="flex flex-wrap gap-2">
        {#each plan.versions as row (row.id)}
          {@const status = versionStatus(row.status)}
          <button
            type="button"
            onclick={() => selectVersion(row.id)}
            class="flex items-center gap-2 rounded-fc-pill border px-3 py-1.5 text-fc-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring {row.id === selectedId ? 'border-fc-accent text-fc-fg' : 'border-fc-border text-fc-fg-muted'}"
          >
            v{row.version}
            <Badge tone={status.tone}>{status.label}</Badge>
            <span class="text-fc-xs">{row._count.subscriptions} abo.</span>
          </button>
        {/each}
      </div>
    </Section>

    {#if version}
      <Section title="Version {version.version}">
        {#if !isDraft}
          <Alert tone="info">
            Une version {versionStatus(version.status).label.toLowerCase()} ne se modifie pas
            {#if version.publishedAt}(publiée le {formatDate(version.publishedAt)}){/if}. Créez une
            nouvelle version pour changer les droits ou les prix.
          </Alert>
        {/if}

        <Card class="flex flex-col gap-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prix mensuel (EUR)" helper="Vide: pas de prix mensuel">
              <Input bind:value={prices.month} inputmode="decimal" disabled={!isDraft} />
            </Field>
            <Field label="Prix annuel (EUR)" helper="Vide: pas de prix annuel">
              <Input bind:value={prices.year} inputmode="decimal" disabled={!isDraft} />
            </Field>
          </div>

          <div class="flex flex-col divide-y divide-fc-border">
            {#each features as feature (feature.id)}
              <div class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 flex-col">
                  <span class="text-fc-sm font-medium text-fc-fg">{feature.description || feature.key}</span>
                  <span class="font-mono text-fc-xs text-fc-fg-muted">{feature.key}</span>
                </div>
                <ValueInput
                  kind={feature.kind}
                  bind:value={values[feature.key]}
                  label={feature.key}
                  unit={feature.unit}
                  disabled={!isDraft}
                />
              </div>
            {/each}
          </div>

          {#if isDraft}
            <div class="flex flex-wrap justify-end gap-2">
              {#if plan.versions.length > 1}
                <Button variant="ghost-danger" icon={icons.remove} onclick={() => (deleteOpen = true)} disabled={busy}>
                  Supprimer le brouillon
                </Button>
              {/if}
              <Button variant="outline" onclick={saveDraft} disabled={busy}>Enregistrer</Button>
              <Button icon={icons.check} onclick={openPublish} disabled={busy}>Publier</Button>
            </div>
          {/if}
        </Card>
      </Section>
    {/if}

    <Section title="Réglages de l’offre">
      <Card>
        <form class="flex flex-col gap-4 sm:flex-row sm:items-end" onsubmit={saveMeta}>
          <Field label="Nom" class="flex-1">
            <Input bind:value={meta.name} required />
          </Field>
          <Field label="Ordre d’affichage">
            <Input bind:value={meta.sortOrder} inputmode="numeric" class="sm:w-24" />
          </Field>
          <Button type="submit" variant="outline" disabled={busy}>Enregistrer</Button>
        </form>
      </Card>
    </Section>
  </Page>
{/if}

<Modal bind:open={publishOpen} title="Publier la version {version?.version ?? ''}" size="lg" showClose>
  {#if preview}
    <div class="flex flex-col gap-4">
      <p class="text-fc-sm text-fc-fg-muted">
        La version publiée ne pourra plus être modifiée. Les prix sont créés dans Stripe sous les
        clés <span class="font-mono">plan_{plan?.key}_month</span> et
        <span class="font-mono">plan_{plan?.key}_year</span>; ceux de la version précédente sont
        archivés.
      </p>
      {#if preview.features.length === 0 && preview.prices.length === 0}
        <Alert tone="info">Aucun changement par rapport à la version publiée.</Alert>
      {:else}
        <Table>
          <thead>
            <tr>
              <th scope="col">Élément</th>
              <th scope="col">Avant</th>
              <th scope="col">Après</th>
            </tr>
          </thead>
          <tbody>
            {#each preview.prices as row (row.interval)}
              <tr>
                <td>Prix {row.interval === 'month' ? 'mensuel' : 'annuel'}</td>
                <td class="text-fc-fg-muted">{formatCents(row.before)}</td>
                <td class="text-fc-fg">{formatCents(row.after)}</td>
              </tr>
            {/each}
            {#each preview.features as row (row.key)}
              <tr>
                <td class="font-mono text-fc-xs">{row.key}</td>
                <td class="text-fc-fg-muted">{formatValue(row.before, unitOf(row.key))}</td>
                <td class="text-fc-fg">{formatValue(row.after, unitOf(row.key))}</td>
              </tr>
            {/each}
          </tbody>
        </Table>
      {/if}
      <Alert tone={preview.affectedSubscriptions > 0 ? 'warning' : 'neutral'}>
        {preview.affectedSubscriptions} abonnement(s) actif(s) sur cette offre. Ils restent sur leur
        version jusqu’à une migration.
      </Alert>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" onclick={() => (publishOpen = false)}>Annuler</Button>
        <Button onclick={publish} disabled={busy}>Publier</Button>
      </div>
    </div>
  {/if}
</Modal>

<Modal bind:open={migrateOpen} title="Migrer les abonnés" showClose>
  <div class="flex flex-col gap-4">
    <p class="text-fc-sm text-fc-fg-muted">
      {behind} abonnement(s) passent au prix de la v{published?.version} pour le même rythme de facturation.
    </p>
    <Field label="Quand appliquer le nouveau prix">
      <Select bind:value={migrateMode}>
        <option value="period_end">À la prochaine échéance, sans prorata</option>
        <option value="immediate">Tout de suite, avec facture au prorata</option>
      </Select>
    </Field>
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={() => (migrateOpen = false)}>Annuler</Button>
      <Button onclick={migrate} disabled={busy}>Migrer</Button>
    </div>
  </div>
</Modal>

<ConfirmModal
  bind:open={deleteOpen}
  tone="danger"
  title="Supprimer ce brouillon ?"
  description="Les valeurs et prix de ce brouillon sont perdus. Les versions publiées ne changent pas."
  confirmLabel="Supprimer"
  cancelLabel="Garder"
  onConfirm={deleteDraft}
/>
