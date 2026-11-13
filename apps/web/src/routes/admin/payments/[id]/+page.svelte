<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import {
    Alert,
    Badge,
    Button,
    ConfirmModal,
    EmptyState,
    Field,
    Icon,
    Input,
    Modal,
    Page,
    PageHeader,
    Section,
    Spinner,
    Textarea,
    toast,
    Tooltip,
  } from '@facile/muse';
  import { icons, ardoise } from '$lib/icons';
  import { logger } from '@repo/logger';
  import { isSmtpNotConfigured } from '@repo/trpc-client';
  import { i18n } from '@repo/i18n/svelte';

  type PaymentStatus =
    | 'PENDING'
    | 'PAID'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'FAILED'
    | 'PAST_DUE'
    | 'PROCESSING'
    | 'AWAITING_CONFIRMATION';
  type PaymentFrequency = 'ONE_TIME' | 'MONTHLY' | 'YEARLY';

  interface Client {
    id: string;
    companyName: string;
    billingAddress: string;
    billingCity: string;
    billingCountry: string;
    siret: string | null;
    contactFirstName: string;
    contactLastName: string;
    contactEmail?: string | null;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }

  interface Payment {
    id: string;
    amount: number;
    stripeFee: number | null;
    totalWithFees: number | null;
    description: string;
    status: PaymentStatus;
    frequency: PaymentFrequency;
    collectionMethod?: 'STRIPE' | 'MANUAL';
    reference?: string | null;
    declaredMethod?: 'TRANSFER' | 'CHEQUE' | 'OTHER' | null;
    declaredReference?: string | null;
    declaredPaidOn?: Date | null;
    declaredVia?: string | null;
    needsAttention?: string | null;
    dueDate: Date;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    client: Client;
    attachedFiles: string[];
    stripePaymentIntentId: string | null;
    stripeSubscriptionId: string | null;
    receiptUrl: string | null;
    lastReminderSentAt: Date | null;
    reminderCount: number;
    invoices?: Array<{
      id: string;
      stripeInvoiceId: string;
      amount: number | string;
      status: 'PAID' | 'FAILED';
      periodStart: string | Date | null;
      periodEnd: string | Date | null;
      paidAt: string | Date | null;
      createdAt: string | Date;
    }>;
  }

  let paymentId = $derived($page.params.id as string);
  let pageLoading = $state(true);
  let actionLoading = $state(false);
  let payment: Payment | null = $state(null);
  let showCancelDialog = $state(false);
  let reminderLoading = $state(false);
  let reminderSent = $state(false);
  let reminderError = $state('');
  let cancelError = $state('');
  let showEdit = $state(false);
  let showPaid = $state(false);
  let showUnpaid = $state(false);
  let showDelete = $state(false);
  let manualBusy = $state(false);
  let editAttempted = $state(false);
  let editForm = $state({ amount: '', description: '', reference: '', dueDate: '', paidAt: '' });
  let paidDate = $state(new Date().toISOString().slice(0, 10));

  onMount(async () => {
    await fetchPayment();
  });

  async function fetchPayment() {
    pageLoading = true;
    try {
      payment = (await trpc.payment.getById.query({ id: paymentId })) as unknown as Payment;
    } catch (err) {
      logger.error({ err }, 'Failed to fetch payment');
    } finally {
      pageLoading = false;
    }
  }

  const isManual = $derived((payment as Payment | null)?.collectionMethod === 'MANUAL');

  const editErrors = $derived.by(() => {
    const e: Record<string, string> = {};
    if (!(Number(editForm.amount) > 0)) e.amount = $i18n.t('import.payment.errors.amount');
    if (!editForm.description.trim()) e.description = $i18n.t('import.payment.errors.description');
    if (!editForm.dueDate) e.dueDate = $i18n.t('import.payment.errors.dueDate');
    return e;
  });

  function openEdit() {
    if (!payment) return;
    editAttempted = false;
    editForm = {
      amount: String(Number(payment.amount)),
      description: payment.description,
      reference: payment.reference ?? '',
      dueDate: new Date(payment.dueDate).toISOString().slice(0, 10),
      paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString().slice(0, 10) : '',
    };
    showEdit = true;
  }

  async function runManual(action: () => Promise<unknown>, success: string, close: () => void) {
    manualBusy = true;
    try {
      await action();
      toast.success(success);
      close();
      await fetchPayment();
    } catch (err: any) {
      logger.error({ err }, 'Manual payment action failed');
      toast.danger(err?.message || $i18n.t('errors.serverError'));
    } finally {
      manualBusy = false;
    }
  }

  async function saveEdit() {
    if (!payment) return;
    editAttempted = true;
    if (Object.keys(editErrors).length > 0) return;
    const id = payment.id;

    await runManual(
      () =>
        trpc.payment.update.mutate({
          id,
          amount: Number(editForm.amount),
          description: editForm.description.trim(),
          reference: editForm.reference.trim() || undefined,
          dueDate: new Date(editForm.dueDate),
          paidAt:
            payment?.status === 'PAID' && editForm.paidAt ? new Date(editForm.paidAt) : undefined,
        }),
      $i18n.t('import.payment.edited'),
      () => (showEdit = false)
    );
  }

  async function markPaid() {
    if (!payment || !paidDate) return;
    const id = payment.id;
    await runManual(
      () => trpc.payment.setStatus.mutate({ id, status: 'PAID', paidAt: new Date(paidDate) }),
      $i18n.t('import.payment.markedPaid'),
      () => (showPaid = false)
    );
  }

  async function markUnpaid() {
    if (!payment) return;
    const id = payment.id;
    await runManual(
      () => trpc.payment.setStatus.mutate({ id, status: 'PENDING' }),
      $i18n.t('import.payment.markedUnpaid'),
      () => (showUnpaid = false)
    );
  }

  async function removePayment() {
    if (!payment) return;
    const id = payment.id;
    manualBusy = true;
    try {
      await trpc.payment.delete.mutate({ id });
      toast.success($i18n.t('import.payment.deleted'));
      await goto(resolve('/admin/payments'));
    } catch (err: any) {
      logger.error({ err }, 'Failed to delete payment');
      toast.danger(err?.message || $i18n.t('errors.serverError'));
    } finally {
      manualBusy = false;
    }
  }

  let declaredBusy = $state(false);
  let rejectReason = $state('');
  let showReject = $state(false);

  async function handleConfirmDeclared() {
    if (!payment || declaredBusy) return;
    declaredBusy = true;
    try {
      await trpc.payment.confirmDeclared.mutate({ id: payment.id });
      toast.success($i18n.t('admin.payments.declared.confirmed'));
      await fetchPayment();
    } catch (err: any) {
      toast.danger(err?.message || 'Erreur');
    } finally {
      declaredBusy = false;
    }
  }

  async function handleRejectDeclared() {
    if (!payment || declaredBusy) return;
    declaredBusy = true;
    try {
      await trpc.payment.rejectDeclared.mutate({
        id: payment.id,
        ...(rejectReason.trim() ? { reason: rejectReason.trim() } : {}),
      });
      toast.success($i18n.t('admin.payments.declared.rejected'));
      showReject = false;
      rejectReason = '';
      await fetchPayment();
    } catch (err: any) {
      toast.danger(err?.message || 'Erreur');
    } finally {
      declaredBusy = false;
    }
  }

  async function handleDismissAttention() {
    if (!payment) return;
    try {
      await trpc.payment.dismissAttention.mutate({ id: payment.id });
      toast.success($i18n.t('admin.payments.attention.dismissed'));
      await fetchPayment();
    } catch (err: any) {
      toast.danger(err?.message || 'Erreur');
    }
  }

  async function handleCopyLink() {
    if (!payment) return;
    try {
      const link = await trpc.payment.createLink.mutate({ id: payment.id });
      await navigator.clipboard.writeText(link.url);
      toast.success(
        $i18n.t('admin.payments.link.created', {
          date: new Date(link.expiresAt).toLocaleDateString('fr-FR'),
        })
      );
    } catch (err: any) {
      toast.danger(err?.message || 'Erreur');
    }
  }

  async function handleRevokeLinks() {
    if (!payment) return;
    try {
      await trpc.payment.revokeLinks.mutate({ id: payment.id });
      toast.success($i18n.t('admin.payments.link.revoked'));
    } catch (err: any) {
      toast.danger(err?.message || 'Erreur');
    }
  }

  async function handleSendReminder() {
    if (!payment) return;
    reminderLoading = true;
    reminderError = '';
    reminderSent = false;
    try {
      await trpc.payment.sendReminder.mutate({ id: payment.id });
      reminderSent = true;
      await fetchPayment();
      setTimeout(() => {
        reminderSent = false;
      }, 4000);
    } catch (err: any) {
      reminderError = isSmtpNotConfigured(err) ? '' : err?.message || "Echec de l'envoi du rappel";
      setTimeout(() => {
        reminderError = '';
      }, 5000);
    } finally {
      reminderLoading = false;
    }
  }

  async function handleCancelPayment() {
    if (!payment) return;

    actionLoading = true;
    try {
      await trpc.payment.cancel.mutate({ id: payment.id });
      await fetchPayment();
      showCancelDialog = false;
    } catch (err: any) {
      logger.error({ err }, 'Failed to cancel payment');
      cancelError = err?.message || "Echec de l'annulation du paiement";
      showCancelDialog = false;
      setTimeout(() => {
        cancelError = '';
      }, 5000);
    } finally {
      actionLoading = false;
    }
  }

  function getStatusColor(status: PaymentStatus) {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
      case 'PROCESSING':
      case 'AWAITING_CONFIRMATION':
        return 'warning';
      case 'PAST_DUE':
        return 'warning';
      case 'EXPIRED':
        return 'danger';
      case 'FAILED':
        return 'danger';
      case 'CANCELLED':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  function getStatusLabel(status: PaymentStatus) {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'PAID':
        return 'Payé';
      case 'EXPIRED':
        return 'Expiré';
      case 'CANCELLED':
        return 'Annulé';
      case 'FAILED':
        return 'Échec';
      case 'PAST_DUE':
        return 'En retard';
      case 'PROCESSING':
        return 'En cours de traitement';
      case 'AWAITING_CONFIRMATION':
        return 'À confirmer';
      default:
        return status;
    }
  }

  function getFrequencyLabel(frequency: PaymentFrequency) {
    switch (frequency) {
      case 'ONE_TIME':
        return $i18n.t('admin.payments.oneTime');
      case 'MONTHLY':
        return $i18n.t('admin.payments.monthly');
      case 'YEARLY':
        return $i18n.t('admin.payments.yearly');
      default:
        return frequency;
    }
  }

  function formatDate(date: Date | string | null) {
    if (!date) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  function formatDateShort(date: Date | string | null) {
    if (!date) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }
</script>

<svelte:head><title>Détails du paiement - Ardoise</title></svelte:head>

{#snippet meta(label: string, value: string)}
  <div class="flex flex-col gap-1">
    <span class="text-fc-xs text-fc-fg-muted">{label}</span>
    <span class="text-fc-sm font-medium text-fc-fg">{value}</span>
  </div>
{/snippet}

{#snippet step(icon: string, tone: string, title: string, date: Date | string)}
  <div class="flex items-start gap-3">
    <div class="flex size-8 shrink-0 items-center justify-center rounded-fc-pill {tone}">
      <Icon {icon} size={16} />
    </div>
    <div class="flex-1">
      <div class="text-fc-sm font-medium text-fc-fg">{title}</div>
      <div class="text-fc-xs text-fc-fg-muted">{formatDate(date)}</div>
    </div>
  </div>
{/snippet}

{#if pageLoading}
  <div class="flex min-h-[40dvh] items-center justify-center">
    <Spinner size="lg" />
  </div>
{:else if payment}
  {@const status = payment.status}
  <Page width="lg">
    <PageHeader
      title="Détails du paiement"
      description="#{payment.id.slice(0, 8)}"
      back={{ href: resolve('/admin/payments'), label: 'Retour aux paiements' }}
    >
      {#snippet actions()}
        <Badge tone={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
      {/snippet}
    </PageHeader>

    {#if cancelError}
      <Alert tone="danger">{cancelError}</Alert>
    {/if}

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="flex flex-col gap-6 lg:col-span-2">
        <Section title="Informations du paiement" card>
          {@render meta('Description', payment.description)}

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <span class="text-fc-xs text-fc-fg-muted">Montant</span>
              <span class="text-fc-xl font-semibold text-fc-fg">
                {formatCurrency(Number(payment.amount))}
              </span>
            </div>

            {#if payment.stripeFee && Number(payment.stripeFee) > 0}
              <div class="flex flex-col gap-1">
                <span class="text-fc-xs text-fc-fg-muted">Frais Stripe</span>
                <span class="text-fc-xl font-semibold text-fc-warning">
                  {formatCurrency(Number(payment.stripeFee))}
                </span>
              </div>
            {/if}
          </div>

          {#if payment.totalWithFees && Number(payment.totalWithFees) > Number(payment.amount)}
            <div class="flex flex-col gap-1 rounded-fc-md bg-fc-surface p-4">
              <span class="text-fc-xs text-fc-fg-muted">Montant total (avec frais)</span>
              <span class="text-fc-2xl font-semibold text-fc-fg">
                {formatCurrency(Number(payment.totalWithFees))}
              </span>
            </div>
          {/if}

          <div class="grid gap-4 sm:grid-cols-2">
            {@render meta('Fréquence', getFrequencyLabel(payment.frequency))}
            {@render meta('Mode', payment.collectionMethod === 'MANUAL' ? 'Manuel' : 'Stripe')}
            {@render meta("Date d'échéance", formatDateShort(payment.dueDate))}
          </div>

          {#if payment.reference}
            {@render meta('Référence', payment.reference)}
          {/if}

          {#if payment.paidAt}
            <Alert tone="success" title="Payé le">{formatDate(payment.paidAt)}</Alert>
          {/if}
        </Section>

        {#if payment.attachedFiles && payment.attachedFiles.length > 0}
          <Section title="Fichiers joints" card>
            <div class="flex flex-col gap-1">
              {#each payment.attachedFiles as file (file)}
                <div class="flex items-center gap-3 rounded-fc-md bg-fc-surface p-2">
                  <Icon icon={ardoise.document} size={16} class="text-fc-fg-muted" />
                  <span class="flex-1 text-fc-sm font-medium text-fc-fg">{file}</span>
                  <Tooltip text="Télécharger le fichier" describe={false} class="contents">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={icons.download}
                      aria-label="Télécharger le fichier"
                    />
                  </Tooltip>
                </div>
              {/each}
            </div>
          </Section>
        {/if}

        <Section title="Chronologie" card>
          {#if payment.paidAt}
            {@render step(
              icons.check,
              'bg-fc-success/10 text-fc-success',
              'Paiement reçu',
              payment.paidAt
            )}
          {/if}
          {@render step(
            icons.calendar,
            'bg-fc-warning/10 text-fc-warning',
            'Échéance',
            payment.dueDate
          )}
          {@render step(
            icons.plus,
            'bg-fc-surface text-fc-fg-muted',
            'Paiement créé',
            payment.createdAt
          )}
        </Section>

        {#if payment.frequency !== 'ONE_TIME' && payment.invoices && payment.invoices.length > 0}
          <Section title="Historique des prélèvements" card>
            <div class="flex flex-col gap-2">
              {#each payment.invoices as invoice (invoice.id)}
                <div class="flex items-center gap-3 rounded-fc-md bg-fc-surface p-3">
                  <div class="flex-1">
                    <div class="text-fc-sm font-medium text-fc-fg">
                      {formatCurrency(Number(invoice.amount))}
                    </div>
                    <div class="text-fc-xs text-fc-fg-muted">
                      {formatDate(invoice.paidAt ?? invoice.createdAt)}
                    </div>
                  </div>
                  <Badge tone={invoice.status === 'PAID' ? 'success' : 'danger'}>
                    {invoice.status === 'PAID' ? 'Payé' : 'Échec'}
                  </Badge>
                </div>
              {/each}
            </div>
          </Section>
        {/if}
      </div>

      <div class="flex flex-col gap-6">
        <Section title="Client" card>
          {@render meta('Entreprise', payment.client.companyName)}

          <div class="flex flex-col gap-1">
            <span class="text-fc-xs text-fc-fg-muted">Contact</span>
            <span class="text-fc-sm font-medium text-fc-fg">
              {payment.client.contactFirstName}
              {payment.client.contactLastName}
            </span>
            <span class="text-fc-xs text-fc-fg-muted">
              {payment.client.contactEmail ||
                payment.client.user?.email ||
                'Aucun email de contact'}
            </span>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-fc-xs text-fc-fg-muted">Adresse</span>
            <span class="text-fc-xs text-fc-fg-muted">
              {payment.client.billingAddress}<br />
              {payment.client.billingCity}<br />
              {payment.client.billingCountry}
            </span>
          </div>

          {#if payment.client.siret}
            <div class="flex flex-col gap-1">
              <span class="text-fc-xs text-fc-fg-muted">SIRET</span>
              <span class="font-mono text-fc-xs text-fc-fg-muted">{payment.client.siret}</span>
            </div>
          {/if}

          <Button
            variant="ghost"
            class="w-full"
            icon={icons.eye}
            href={resolve(`/admin/clients/${payment.client.id}`)}
          >
            Voir le client
          </Button>
        </Section>

        {#if isManual}
          <Section title={$i18n.t('import.payment.manualTitle')} card>
            <Button variant="ghost" class="w-full" icon={icons.edit} onclick={openEdit}>
              {$i18n.t('import.payment.editTitle')}
            </Button>
            {#if payment.status === 'PAID'}
              <Button variant="ghost" class="w-full" onclick={() => (showUnpaid = true)}>
                {$i18n.t('import.payment.markUnpaid')}
              </Button>
            {:else if payment.status === 'PENDING' || payment.status === 'PAST_DUE'}
              <Button variant="ghost" class="w-full" icon={icons.check} onclick={() => (showPaid = true)}>
                {$i18n.t('import.payment.markPaid')}
              </Button>
            {/if}
            <Button
              variant="ghost-danger"
              class="w-full"
              icon={icons.remove}
              onclick={() => (showDelete = true)}
            >
              {$i18n.t('import.payment.delete')}
            </Button>
          </Section>
        {:else}
          <Alert tone="neutral">{$i18n.t('import.payment.manualOnly')}</Alert>
        {/if}

        {#if payment.needsAttention}
          <Alert tone="danger" title={$i18n.t('admin.payments.attention.title')}>
            {$i18n.t(`admin.payments.attention.${payment.needsAttention}`)}
            <Button variant="ghost" size="sm" class="mt-2" onclick={handleDismissAttention}>
              {$i18n.t('admin.payments.attention.dismiss')}
            </Button>
          </Alert>
        {/if}

        {#if payment.status === 'AWAITING_CONFIRMATION' && payment.declaredMethod}
          <Section title={$i18n.t('admin.payments.declared.title')} card>
            <p class="text-fc-sm text-fc-fg">
              {$i18n.t('admin.payments.declared.body', {
                method: $i18n.t(`admin.payments.declared.methods.${payment.declaredMethod}`),
              })}
            </p>
            {#if payment.declaredReference}
              <p class="text-fc-sm text-fc-fg-muted">
                {$i18n.t('admin.payments.declared.reference', { reference: payment.declaredReference })}
              </p>
            {/if}
            {#if payment.declaredPaidOn}
              <p class="text-fc-sm text-fc-fg-muted">
                {$i18n.t('admin.payments.declared.paidOn', {
                  date: formatDateShort(payment.declaredPaidOn),
                })}
              </p>
            {/if}
            {#if payment.declaredVia}
              <p class="text-fc-xs text-fc-fg-muted">
                {$i18n.t('admin.payments.declared.via', {
                  via: $i18n.t(`admin.payments.declared.vias.${payment.declaredVia}`),
                })}
              </p>
            {/if}
            <Button class="w-full" icon={icons.check} disabled={declaredBusy} onclick={handleConfirmDeclared}>
              {$i18n.t('admin.payments.declared.confirm')}
            </Button>
            {#if showReject}
              <Textarea bind:value={rejectReason} placeholder={$i18n.t('admin.payments.declared.rejectReason')} />
              <Button variant="ghost-danger" class="w-full" disabled={declaredBusy} onclick={handleRejectDeclared}>
                {$i18n.t('admin.payments.declared.rejectConfirm')}
              </Button>
            {:else}
              <Button variant="ghost-danger" class="w-full" onclick={() => (showReject = true)}>
                {$i18n.t('admin.payments.declared.reject')}
              </Button>
            {/if}
          </Section>
        {/if}

        {#if payment.collectionMethod === 'STRIPE' && !['PAID', 'CANCELLED'].includes(payment.status)}
          <Section title={$i18n.t('admin.payments.link.title')} description={$i18n.t('admin.payments.link.hint')} card>
            <Button variant="ghost" class="w-full" icon={icons.copy} onclick={handleCopyLink}>
              {$i18n.t('admin.payments.link.create')}
            </Button>
            <Button variant="ghost-danger" class="w-full" onclick={handleRevokeLinks}>
              {$i18n.t('admin.payments.link.revoke')}
            </Button>
          </Section>
        {/if}

        {#if payment.status === 'PENDING'}
          <Section title="Actions" card>
            {#if reminderSent}
              <Alert tone="success">Rappel envoyé avec succès.</Alert>
            {/if}
            {#if reminderError}
              <Alert tone="danger">{reminderError}</Alert>
            {/if}
            <Button
              variant="ghost"
              class="w-full"
              icon={icons.mail}
              onclick={handleSendReminder}
              disabled={reminderLoading}
            >
              Envoyer un rappel
            </Button>
            {#if payment.lastReminderSentAt}
              <p class="text-center text-fc-xs text-fc-fg-muted">
                Dernier rappel : {formatDateShort(payment.lastReminderSentAt)}
              </p>
            {/if}

            <Button
              variant="ghost-danger"
              class="w-full"
              icon={icons.revoke}
              onclick={() => (showCancelDialog = true)}
            >
              Annuler le paiement
            </Button>
          </Section>
        {/if}

        {#if payment.receiptUrl}
          {@const receiptUrl = payment.receiptUrl}
          <Section title="Reçu" card>
            <Button
              variant="ghost"
              class="w-full"
              icon={icons.download}
              onclick={() => void window.open(receiptUrl, '_blank')}
            >
              Télécharger le reçu
            </Button>
          </Section>
        {/if}

        {#if payment.stripePaymentIntentId || payment.stripeSubscriptionId}
          <Section title="Stripe" card>
            {#if payment.stripePaymentIntentId}
              <div class="flex flex-col gap-1">
                <span class="text-fc-xs text-fc-fg-muted">Payment Intent</span>
                <span
                  class="break-all rounded-fc-sm bg-fc-surface p-2 font-mono text-fc-xs text-fc-fg-muted"
                >
                  {payment.stripePaymentIntentId}
                </span>
              </div>
            {/if}

            {#if payment.stripeSubscriptionId}
              <div class="flex flex-col gap-1">
                <span class="text-fc-xs text-fc-fg-muted">Subscription</span>
                <span
                  class="break-all rounded-fc-sm bg-fc-surface p-2 font-mono text-fc-xs text-fc-fg-muted"
                >
                  {payment.stripeSubscriptionId}
                </span>
              </div>
            {/if}
          </Section>
        {/if}
      </div>
    </div>
  </Page>
{:else}
  <Page width="lg">
    <EmptyState
      icon={ardoise.payment}
      title="Paiement introuvable"
      description="Ce paiement n'existe pas ou a été supprimé."
    >
      <Button href={resolve('/admin/payments')}>Retour aux paiements</Button>
    </EmptyState>
  </Page>
{/if}

<ConfirmModal
  bind:open={showCancelDialog}
  title="Annuler le paiement"
  description={payment?.collectionMethod === 'MANUAL'
    ? 'Le paiement manuel est marqué comme annulé. Cette action est irréversible.'
    : "Le lien de paiement Stripe envoyé au client cesse de fonctionner et l'intention de paiement est annulée. Cette action est irréversible."}
  confirmLabel="Annuler le paiement"
  cancelLabel="Retour"
  tone="danger"
  onConfirm={handleCancelPayment}
  onCancel={() => (showCancelDialog = false)}
/>

<Modal bind:open={showEdit} title={$i18n.t('import.payment.editTitle')}>
  <div class="flex flex-col gap-4">
    <Field label={$i18n.t('import.payment.amount')} error={editAttempted ? editErrors.amount : ''}>
      <Input type="number" step="0.01" min="0" bind:value={editForm.amount} />
    </Field>
    <Field
      label={$i18n.t('import.payment.description')}
      error={editAttempted ? editErrors.description : ''}
    >
      <Input bind:value={editForm.description} />
    </Field>
    <Field label={$i18n.t('import.payment.reference')}>
      <Input bind:value={editForm.reference} />
    </Field>
    <Field label={$i18n.t('import.payment.dueDate')} error={editAttempted ? editErrors.dueDate : ''}>
      <Input type="date" bind:value={editForm.dueDate} />
    </Field>
    {#if payment?.status === 'PAID'}
      <Field label={$i18n.t('import.payment.paidAt')}>
        <Input type="date" bind:value={editForm.paidAt} />
      </Field>
    {/if}
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={() => (showEdit = false)}>{$i18n.t('import.cancel')}</Button>
      <Button onclick={saveEdit} disabled={manualBusy}>{$i18n.t('import.payment.editSave')}</Button>
    </div>
  </div>
</Modal>

<Modal bind:open={showPaid} title={$i18n.t('import.payment.markPaidTitle')}>
  <div class="flex flex-col gap-4">
    <p class="text-fc-sm text-fc-fg-muted">{$i18n.t('import.payment.markPaidDescription')}</p>
    <Field label={$i18n.t('import.payment.paidAt')}>
      <Input type="date" max={new Date().toISOString().slice(0, 10)} bind:value={paidDate} />
    </Field>
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={() => (showPaid = false)}>{$i18n.t('import.cancel')}</Button>
      <Button onclick={markPaid} disabled={manualBusy || !paidDate}>
        {$i18n.t('import.payment.markPaid')}
      </Button>
    </div>
  </div>
</Modal>

<ConfirmModal
  bind:open={showUnpaid}
  title={$i18n.t('import.payment.markUnpaidTitle')}
  description={$i18n.t('import.payment.markUnpaidDescription')}
  confirmLabel={$i18n.t('import.payment.markUnpaid')}
  cancelLabel={$i18n.t('import.cancel')}
  onConfirm={markUnpaid}
/>

<ConfirmModal
  bind:open={showDelete}
  tone="danger"
  title={$i18n.t('import.payment.deleteTitle')}
  description={$i18n.t('import.payment.deleteDescription')}
  confirmLabel={$i18n.t('import.payment.deleteConfirm')}
  cancelLabel={$i18n.t('import.payment.deleteCancel')}
  onConfirm={removePayment}
/>
