<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { resolve } from '$app/paths';
  import {
    Alert,
    Badge,
    Button,
    ConfirmModal,
    EmptyState,
    Icon,
    Page,
    PageHeader,
    Section,
    Spinner,
  } from '@facile/muse';
  import { icons, ardoise } from '$lib/icons';
  import { logger } from '@repo/logger';
  import { isSmtpNotConfigured } from '@repo/trpc-client';
  import { i18n } from '@repo/i18n/svelte';

  type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED' | 'PAST_DUE';
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
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={icons.download}
                    aria-label="Télécharger le fichier"
                  />
                </div>
              {/each}
            </div>
          </Section>
        {/if}

        <Section title="Chronologie" card>
          {#if payment.paidAt}
            {@render step(icons.check, 'bg-fc-success/10 text-fc-success', 'Paiement reçu', payment.paidAt)}
          {/if}
          {@render step(icons.calendar, 'bg-fc-warning/10 text-fc-warning', 'Échéance', payment.dueDate)}
          {@render step(icons.plus, 'bg-fc-surface text-fc-fg-muted', 'Paiement créé', payment.createdAt)}
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
              {payment.client.contactEmail || payment.client.user?.email || 'Aucun email de contact'}
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
              variant="danger"
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
                <span class="break-all rounded-fc-sm bg-fc-surface p-2 font-mono text-fc-xs text-fc-fg-muted">
                  {payment.stripePaymentIntentId}
                </span>
              </div>
            {/if}

            {#if payment.stripeSubscriptionId}
              <div class="flex flex-col gap-1">
                <span class="text-fc-xs text-fc-fg-muted">Subscription</span>
                <span class="break-all rounded-fc-sm bg-fc-surface p-2 font-mono text-fc-xs text-fc-fg-muted">
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
