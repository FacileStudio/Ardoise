<script lang="ts">
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import {
    Alert,
    Badge,
    Button,
    Card,
    EmptyState,
    Page,
    PageHeader,
    Section,
    Select,
    Skeleton,
    StatCard,
    toast,
  } from '@facile/muse';
  import { resolve } from '$app/paths';
  import { i18n, locale } from '@repo/i18n/svelte';
  import { ardoise, icons } from '$lib/icons';
  import { safeHttpUrl } from '$lib/safe-url';
  import { redirectToHosted, type Declaration, type PayerView } from '$lib/payments';
  import PaymentCard from '$lib/components/PaymentCard.svelte';
  import { page } from '$app/state';

  type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  type Signature = 'none' | 'sent' | 'signed' | 'declined';

  interface Overview {
    client: {
      id: string;
      companyName: string;
      contactFirstName: string;
      contactLastName: string;
    };
    totals: { billed: number; paid: number; due: number; overdue: number; currency: string };
    missions: Array<{
      id: string;
      name: string;
      status: string;
      description: string | null;
      price: number;
      paid: number;
      due: number;
      nextDueDate: string | null;
      documentCount: number;
      pendingSignatureCount: number;
    }>;
    actionRequired: Array<
      | {
          kind: 'pay';
          paymentId: string;
          description: string;
          amount: number;
          dueDate: string;
          overdue: boolean;
        }
      | { kind: 'sign'; documentId: string; name: string; missionName: string | null }
    >;
  }

  interface PortalDocument {
    id: string;
    name: string;
    type: string;
    missionId: string | null;
    missionName: string | null;
    number: string | null;
    issuedAt: string;
    total: number | null;
    signatureStatus: Signature;
    signedAt: string | null;
    canDownload: boolean;
    source: 'generated' | 'imported';
  }

  interface PaymentSummary {
    id: string;
    description: string;
    status: string;
    dueDate: string | Date;
    paidAt: string | null;
    createdAt: string | Date;
    amount: number | string;
    receiptUrl: string | null;
  }

  let overview = $state<Overview | null>(null);
  let overviewError = $state('');
  let overviewLoading = $state(true);

  let documents = $state<PortalDocument[]>([]);
  let documentsError = $state('');
  let documentsLoading = $state(true);
  let typeFilter = $state('');
  let missionFilter = $state('');

  let payments = $state<PaymentSummary[]>([]);
  let paymentsError = $state('');
  let paymentsLoading = $state(true);

  let openPayments = $state<Array<PayerView & { id: string }>>([]);
  const returnedFromCheckout = $derived(page.url.searchParams.get('payment'));

  async function loadOpenPayments() {
    try {
      openPayments = (await trpc.portal.payments.query()) as Array<PayerView & { id: string }>;
    } catch (err) {
      toast.danger(message(err));
    }
  }

  const checkout = (paymentId: string) =>
    redirectToHosted(() => trpc.portal.checkout.mutate({ paymentId }));
  const manageMaintenance = (paymentId: string) =>
    redirectToHosted(() => trpc.portal.manageMaintenance.mutate({ paymentId }));
  async function declare(paymentId: string, declaration: Declaration) {
    await trpc.portal.declarePayment.mutate({ paymentId, declaration });
    toast.success($i18n.t('pay.declare.sent'));
    await Promise.all([loadOpenPayments(), loadOverview(), loadPayments()]);
  }

  let busy = $state<Record<string, boolean>>({});

  const message = (err: unknown) => (err instanceof Error ? err.message : $i18n.t('portal.loadError'));

  async function loadOverview() {
    overviewLoading = true;
    overviewError = '';
    try {
      overview = (await trpc.portal.overview.query()) as Overview;
    } catch (err) {
      overviewError = message(err);
    } finally {
      overviewLoading = false;
    }
  }

  async function loadDocuments() {
    documentsLoading = true;
    documentsError = '';
    try {
      const input = {
        ...(missionFilter ? { missionId: missionFilter } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
      };
      documents = (await trpc.portal.documents.query(input)) as PortalDocument[];
    } catch (err) {
      documentsError = message(err);
    } finally {
      documentsLoading = false;
    }
  }

  async function loadPayments() {
    paymentsLoading = true;
    paymentsError = '';
    try {
      const result = await trpc.payment.myPayments.query();
      payments = (result.payments || []) as PaymentSummary[];
    } catch (err) {
      paymentsError = message(err);
    } finally {
      paymentsLoading = false;
    }
  }

  onMount(() => {
    void loadOverview();
    void loadDocuments();
    void loadPayments();
    void loadOpenPayments();
  });

  let filtersReady = false;
  $effect(() => {
    void typeFilter;
    void missionFilter;
    if (!filtersReady) {
      filtersReady = true;
      return;
    }
    void loadDocuments();
  });

  async function openLink(key: string, fetchUrl: () => Promise<{ url: string }>) {
    if (busy[key]) return;
    busy[key] = true;
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    try {
      const url = safeHttpUrl((await fetchUrl()).url);
      if (!url) throw new Error($i18n.t('portal.actions.openError'));
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (err) {
      tab?.close();
      toast.danger(err instanceof Error ? err.message : $i18n.t('portal.actions.openError'));
    } finally {
      busy[key] = false;
    }
  }

  const download = (id: string) =>
    openLink(`dl:${id}`, () => trpc.portal.documentDownload.query({ id }));
  const sign = (id: string) => openLink(`sign:${id}`, () => trpc.portal.signLink.mutate({ id }));

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString($locale, { year: 'numeric', month: 'short', day: 'numeric' });

  const formatAmount = (amount: number | string) =>
    new Intl.NumberFormat($locale, { style: 'currency', currency: 'EUR' }).format(
      typeof amount === 'string' ? parseFloat(amount) : amount
    );

  const known = (key: string, fallback: string) => {
    const label = $i18n.t(key);
    return label === key ? fallback : label;
  };

  const typeLabel = (type: string) => known(`portal.documentTypes.${type}`, type);
  const missionStatusLabel = (status: string) => known(`portal.missionStatus.${status}`, status);
  const paymentStatusLabel = (status: string) => known(`portal.status.${status}`, status);

  const missionTone = (status: string): Tone =>
    status === 'PAID'
      ? 'success'
      : status === 'CANCELLED'
        ? 'danger'
        : status === 'DRAFT'
          ? 'neutral'
          : 'info';

  const paymentTone = (status: string): Tone =>
    status === 'PAID'
      ? 'success'
      : status === 'PENDING'
        ? 'warning'
        : status === 'EXPIRED'
          ? 'danger'
          : 'neutral';

  const signatureTone = (status: Signature): Tone =>
    status === 'signed' ? 'success' : status === 'sent' ? 'warning' : 'danger';

  const progress = (paid: number, price: number) =>
    price > 0 ? Math.min(100, Math.round((paid / price) * 100)) : 0;

  const contactName = $derived(
    overview ? `${overview.client.contactFirstName} ${overview.client.contactLastName}`.trim() : ''
  );

  const typeOptions = Object.keys({
    devis: 1,
    facture_prestation: 1,
    appel_de_fonds: 1,
    contrat_prestation: 1,
    contrat_maintenance: 1,
    back_contractuel: 1,
    maintenance: 1,
  });

  const pendingPayments = $derived(payments.filter((p) => p.status === 'PENDING'));
  const paidPayments = $derived(payments.filter((p) => p.status === 'PAID'));
  const otherPayments = $derived(payments.filter((p) => !['PENDING', 'PAID'].includes(p.status)));
  const filtered = $derived(Boolean(typeFilter || missionFilter));
</script>

<svelte:head>
  <title>{$i18n.t('portal.title')} - Ardoise</title>
</svelte:head>

{#snippet sectionError(text: string, retry: () => void)}
  <Alert tone="danger">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span>{text}</span>
      <Button variant="ghost" size="sm" onclick={retry}>{$i18n.t('portal.retry')}</Button>
    </div>
  </Alert>
{/snippet}

{#snippet rowSkeleton()}
  <div class="flex flex-col gap-3" aria-hidden="true">
    <Skeleton class="h-20 w-full" />
    <Skeleton class="h-20 w-full" />
  </div>
{/snippet}

<Page width="lg">
  <PageHeader
    title={overview
      ? $i18n.t('portal.greeting', { name: contactName || overview.client.companyName })
      : $i18n.t('portal.title')}
    description={overview?.client.companyName ?? $i18n.t('portal.subtitle')}
  />

  {#if overviewLoading}
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
      {#each [0, 1, 2, 3] as i (i)}
        <Skeleton class="h-24 w-full" />
      {/each}
    </div>
  {:else if overviewError}
    {@render sectionError(overviewError, loadOverview)}
  {:else if overview}
    {#if overview.actionRequired.length > 0}
      <Section title={$i18n.t('portal.actions.title')}>
        {#snippet actions()}
          <Badge tone="warning">{overview?.actionRequired.length}</Badge>
        {/snippet}
        <div class="flex flex-col gap-3">
          {#each overview.actionRequired as item (item.kind === 'pay' ? `p${item.paymentId}` : `s${item.documentId}`)}
            <Card class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              {#if item.kind === 'pay'}
                <div class="flex min-w-0 flex-col gap-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-fc-md font-semibold text-fc-fg">{item.description}</span>
                    {#if item.overdue}
                      <Badge tone="danger">{$i18n.t('portal.overdue')}</Badge>
                    {/if}
                  </div>
                  <p class="text-fc-sm text-fc-fg-muted">
                    {$i18n.t('portal.dueOn', { date: formatDate(item.dueDate) })}
                  </p>
                </div>
                <div class="flex items-center justify-between gap-4 sm:justify-end">
                  <span class="text-fc-xl font-semibold text-fc-fg">{formatAmount(item.amount)}</span>
                  <Button href="#open-payments">
                    {$i18n.t('portal.actions.pay')}
                  </Button>
                </div>
              {:else}
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-fc-md font-semibold text-fc-fg">{item.name}</span>
                  <p class="text-fc-sm text-fc-fg-muted">
                    {$i18n.t('portal.actionSign')}{item.missionName ? ` - ${item.missionName}` : ''}
                  </p>
                </div>
                <Button
                  icon={ardoise.signature}
                  disabled={busy[`sign:${item.documentId}`]}
                  onclick={() => sign(item.documentId)}
                >
                  {$i18n.t('portal.actions.sign')}
                </Button>
              {/if}
            </Card>
          {/each}
        </div>
      </Section>
    {/if}

    {#if returnedFromCheckout === 'success'}
      <Alert tone="info" title={$i18n.t('pay.returnedTitle')}>{$i18n.t('pay.returned')}</Alert>
    {/if}

    {#if openPayments.length > 0}
      <div id="open-payments">
        <Section title={$i18n.t('pay.openTitle')} description={$i18n.t('pay.openDescription')}>
          <div class="flex flex-col gap-3">
            {#each openPayments as view (view.id)}
              <PaymentCard
                {view}
                onpay={() => checkout(view.id)}
                ondeclare={(declaration) => declare(view.id, declaration)}
                onmanage={() => manageMaintenance(view.id)}
              />
            {/each}
          </div>
        </Section>
      </div>
    {/if}

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label={$i18n.t('portal.totals.billed')} value={formatAmount(overview.totals.billed)} />
      <StatCard label={$i18n.t('portal.totals.paid')} value={formatAmount(overview.totals.paid)} />
      <StatCard label={$i18n.t('portal.totals.due')} value={formatAmount(overview.totals.due)} />
      <StatCard
        label={$i18n.t('portal.totals.overdue')}
        value={formatAmount(overview.totals.overdue)}
        class={overview.totals.overdue > 0 ? 'text-fc-danger' : ''}
      />
    </div>

    <Section title={$i18n.t('portal.projects.title')}>
      {#if overview.missions.length === 0}
        <EmptyState
          icon={ardoise.mission}
          title={$i18n.t('portal.projects.empty')}
          description={$i18n.t('portal.projects.emptyDescription')}
        />
      {:else}
        <div class="grid gap-3 md:grid-cols-2">
          {#each overview.missions as mission (mission.id)}
            <Card class="flex flex-col gap-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="truncate text-fc-md font-semibold text-fc-fg">{mission.name}</h3>
                  {#if mission.description}
                    <p class="line-clamp-2 text-fc-sm text-fc-fg-muted">{mission.description}</p>
                  {/if}
                </div>
                <Badge tone={missionTone(mission.status)}>{missionStatusLabel(mission.status)}</Badge>
              </div>
              <div class="flex flex-col gap-2">
                <div class="flex items-baseline justify-between gap-2">
                  <span class="text-fc-xl font-semibold text-fc-fg">{formatAmount(mission.price)}</span>
                  <span class="text-fc-xs text-fc-fg-muted">
                    {$i18n.t('portal.projects.paid', {
                      paid: formatAmount(mission.paid),
                      price: formatAmount(mission.price),
                    })}
                  </span>
                </div>
                <div
                  class="h-2 w-full overflow-hidden rounded-fc-pill bg-fc-surface"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress(mission.paid, mission.price)}
                >
                  <div
                    class="h-full rounded-fc-pill bg-fc-success"
                    style:width="{progress(mission.paid, mission.price)}%"
                  ></div>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-fc-xs text-fc-fg-muted">
                {#if mission.nextDueDate}
                  <span>{$i18n.t('portal.projects.nextDue', { date: formatDate(mission.nextDueDate) })}</span>
                {/if}
                <Badge>{$i18n.t('portal.projects.documents', { count: mission.documentCount })}</Badge>
                {#if mission.pendingSignatureCount > 0}
                  <Badge tone="warning">
                    {$i18n.t('portal.projects.toSign', { count: mission.pendingSignatureCount })}
                  </Badge>
                {/if}
              </div>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => {
                    missionFilter = mission.id;
                    document.getElementById('portal-documents')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {$i18n.t('portal.projects.viewDocuments')}
                </Button>
              </div>
            </Card>
          {/each}
        </div>
      {/if}
    </Section>
  {/if}

  <div id="portal-documents" class="scroll-mt-4">
    <Section title={$i18n.t('portal.documents.title')}>
      <div class="mb-3 grid gap-3 sm:grid-cols-2">
        <Select bind:value={typeFilter} aria-label={$i18n.t('portal.filterType')}>
          <option value="">{$i18n.t('portal.allTypes')}</option>
          {#each typeOptions as type (type)}
            <option value={type}>{typeLabel(type)}</option>
          {/each}
        </Select>
        <Select bind:value={missionFilter} aria-label={$i18n.t('portal.filterProject')}>
          <option value="">{$i18n.t('portal.allProjects')}</option>
          {#each overview?.missions ?? [] as mission (mission.id)}
            <option value={mission.id}>{mission.name}</option>
          {/each}
        </Select>
      </div>

      {#if documentsLoading}
        {@render rowSkeleton()}
      {:else if documentsError}
        {@render sectionError(documentsError, loadDocuments)}
      {:else if documents.length === 0}
        <EmptyState
          icon={ardoise.document}
          title={filtered ? $i18n.t('portal.documents.emptyFiltered') : $i18n.t('portal.documents.empty')}
          description={filtered ? '' : $i18n.t('portal.documents.emptyDescription')}
        />
      {:else}
        <div class="flex flex-col gap-3">
          {#each documents as doc (doc.id)}
            <Card class="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div class="flex min-w-0 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-fc-md font-semibold text-fc-fg">{doc.name}</h3>
                  <Badge>{typeLabel(doc.type)}</Badge>
                  {#if doc.signatureStatus !== 'none'}
                    <Badge tone={signatureTone(doc.signatureStatus)}>
                      {$i18n.t(`portal.signature.${doc.signatureStatus}`)}
                    </Badge>
                  {/if}
                </div>
                <p class="text-fc-sm text-fc-fg-muted">
                  {formatDate(doc.issuedAt)}
                  {#if doc.number}
                    · {$i18n.t('portal.documents.number', { number: doc.number })}
                  {/if}
                  {#if doc.missionName}
                    · {doc.missionName}
                  {/if}
                </p>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                {#if doc.total !== null}
                  <span class="text-fc-md font-semibold text-fc-fg">{formatAmount(doc.total)}</span>
                {/if}
                <div class="flex items-center gap-2">
                  {#if doc.signatureStatus === 'sent'}
                    <Button
                      size="sm"
                      icon={ardoise.signature}
                      disabled={busy[`sign:${doc.id}`]}
                      onclick={() => sign(doc.id)}
                    >
                      {$i18n.t('portal.actions.sign')}
                    </Button>
                  {/if}
                  {#if doc.canDownload}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={icons.download}
                      disabled={busy[`dl:${doc.id}`]}
                      onclick={() => download(doc.id)}
                    >
                      {$i18n.t('portal.actions.download')}
                    </Button>
                  {/if}
                </div>
              </div>
            </Card>
          {/each}
        </div>
      {/if}
    </Section>
  </div>

  <Section title={$i18n.t('portal.payments.title')}>
    {#if paymentsLoading}
      {@render rowSkeleton()}
    {:else if paymentsError}
      {@render sectionError(paymentsError, loadPayments)}
    {:else if payments.length === 0}
      <EmptyState
        icon={ardoise.payment}
        title={$i18n.t('portal.payments.empty')}
        description={$i18n.t('portal.payments.emptyDescription')}
      />
    {:else}
      <div class="flex flex-col gap-3">
        {#each [...pendingPayments, ...paidPayments, ...otherPayments] as payment (payment.id)}
          <Card class="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div class="flex min-w-0 flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-fc-md font-semibold text-fc-fg">{payment.description}</h3>
                <Badge tone={paymentTone(payment.status)}>{paymentStatusLabel(payment.status)}</Badge>
              </div>
              <p class="text-fc-sm text-fc-fg-muted">
                {#if payment.status === 'PAID' && payment.paidAt}
                  {$i18n.t('portal.payments.paidOn', { date: formatDate(payment.paidAt) })}
                {:else}
                  {$i18n.t('portal.dueOn', { date: formatDate(payment.dueDate) })}
                {/if}
              </p>
            </div>
            <div class="flex items-center justify-between gap-3 md:justify-end">
              <span class="text-fc-md font-semibold text-fc-fg">{formatAmount(payment.amount)}</span>
              {#if payment.status === 'PENDING'}
                <Button size="sm" href="#open-payments">
                  {$i18n.t('portal.actions.pay')}
                </Button>
              {:else if payment.receiptUrl}
                {@const receiptUrl = payment.receiptUrl}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={icons.download}
                  onclick={() => void window.open(receiptUrl, '_blank')}
                >
                  {$i18n.t('portal.actions.receipt')}
                </Button>
              {/if}
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  </Section>
</Page>
