<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Spinner, Badge, Card, Button, ConfirmDialog, Alert } from '@repo/ui';
  import { logger } from '@repo/logger';
  import { i18n } from '@repo/i18n/svelte';
  import 'iconify-icon';

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

  let paymentId = $derived($page.params.id);
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
      reminderError = err?.message || "Echec de l'envoi du rappel";
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
        return 'emerald';
      case 'PENDING':
        return 'amber';
      case 'PAST_DUE':
        return 'amber';
      case 'EXPIRED':
        return 'rose';
      case 'FAILED':
        return 'rose';
      case 'CANCELLED':
        return 'slate';
      default:
        return 'slate';
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

<div class="p-6 max-w-5xl mx-auto space-y-6">
  {#if pageLoading}
    <div class="py-20 flex justify-center">
      <Spinner size="xl" />
    </div>
  {:else if payment}
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button
          onclick={() => goto(resolve('/admin/payments'))}
          class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Retour aux paiements"
        >
          <iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
        </button>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">Détails du paiement</h1>
          <p class="text-xs text-muted-foreground mt-1">#{payment.id.slice(0, 8)}</p>
        </div>
      </div>

      <Badge variant={getStatusColor(payment.status)}>
        {getStatusLabel(payment.status)}
      </Badge>
    </header>

    {#if cancelError}
      <Alert variant="danger" dismissible>{cancelError}</Alert>
    {/if}

    <div class="grid grid-cols-3 gap-6">
      <div class="col-span-2 space-y-6">
        <div class="rounded-xl border border-border p-6 space-y-4">
          <h2 class="text-base font-semibold text-foreground">Informations du paiement</h2>

          <div>
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Description
            </div>
            <div class="text-sm font-medium text-foreground">{payment.description}</div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Montant
              </div>
              <div class="text-xl font-bold text-foreground">
                {formatCurrency(Number(payment.amount))}
              </div>
            </div>

            {#if payment.stripeFee && Number(payment.stripeFee) > 0}
              <div>
                <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Frais Stripe
                </div>
                <div class="text-xl font-bold text-warning">
                  {formatCurrency(Number(payment.stripeFee))}
                </div>
              </div>
            {/if}
          </div>

          {#if payment.totalWithFees && Number(payment.totalWithFees) > Number(payment.amount)}
            <div class="bg-muted p-4 rounded-lg">
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Montant total (avec frais)
              </div>
              <div class="text-2xl font-bold text-foreground">
                {formatCurrency(Number(payment.totalWithFees))}
              </div>
            </div>
          {/if}

          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Fréquence
              </div>
              <div class="text-sm font-medium text-foreground">
                {getFrequencyLabel(payment.frequency)}
              </div>
            </div>

            <div>
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Mode
              </div>
              <div class="text-sm font-medium text-foreground">
                {payment.collectionMethod === 'MANUAL' ? 'Manuel' : 'Stripe'}
              </div>
            </div>

            <div>
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Date d'échéance
              </div>
              <div class="text-sm font-medium text-foreground">
                {formatDateShort(payment.dueDate)}
              </div>
            </div>
          </div>

          {#if payment.reference}
            <div>
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Référence
              </div>
              <div class="text-sm font-medium text-foreground">{payment.reference}</div>
            </div>
          {/if}

          {#if payment.paidAt}
            <div class="bg-success/10 p-4 rounded-lg border border-success/30">
              <div class="text-xs font-medium text-success uppercase tracking-wide mb-1">
                Payé le
              </div>
              <div class="text-sm font-medium text-success">
                {formatDate(payment.paidAt)}
              </div>
            </div>
          {/if}
        </div>

        {#if payment.attachedFiles && payment.attachedFiles.length > 0}
          <div class="rounded-xl border border-border p-6 space-y-4">
            <h2 class="text-base font-semibold text-foreground">Fichiers joints</h2>
            <div class="space-y-1">
              {#each payment.attachedFiles as file (file)}
                <div class="flex items-center gap-3 p-2 bg-muted rounded-lg">
                  <iconify-icon icon="solar:file-bold" width="16" class="text-muted-foreground"
                  ></iconify-icon>
                  <span class="flex-1 text-sm font-medium text-foreground">{file}</span>
                  <button
                    class="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground"
                    aria-label="Télécharger le fichier"
                  >
                    <iconify-icon icon="solar:download-bold" width="16"></iconify-icon>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div class="rounded-xl border border-border p-6 space-y-4">
          <h2 class="text-base font-semibold text-foreground">Chronologie</h2>
          <div class="space-y-3">
            {#if payment.paidAt}
              <div class="flex items-start gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0"
                >
                  <iconify-icon icon="solar:check-circle-bold" width="16" class="text-success"
                  ></iconify-icon>
                </div>
                <div class="flex-1">
                  <div class="text-sm font-medium text-foreground">Paiement reçu</div>
                  <div class="text-xs text-muted-foreground">{formatDate(payment.paidAt)}</div>
                </div>
              </div>
            {/if}

            <div class="flex items-start gap-3">
              <div
                class="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0"
              >
                <iconify-icon icon="solar:calendar-bold" width="16" class="text-warning"
                ></iconify-icon>
              </div>
              <div class="flex-1">
                <div class="text-sm font-medium text-foreground">Échéance</div>
                <div class="text-xs text-muted-foreground">{formatDate(payment.dueDate)}</div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <iconify-icon icon="solar:add-circle-bold" width="16" class="text-muted-foreground"
                ></iconify-icon>
              </div>
              <div class="flex-1">
                <div class="text-sm font-medium text-foreground">Paiement créé</div>
                <div class="text-xs text-muted-foreground">{formatDate(payment.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>

        {#if payment.frequency !== 'ONE_TIME' && payment.invoices && payment.invoices.length > 0}
          <div class="rounded-xl border border-border p-6 space-y-4">
            <h2 class="text-base font-semibold text-foreground">Historique des prélèvements</h2>
            <div class="space-y-2">
              {#each payment.invoices as invoice (invoice.id)}
                <div class="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-foreground">
                      {formatCurrency(Number(invoice.amount))}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {formatDate(invoice.paidAt ?? invoice.createdAt)}
                    </div>
                  </div>
                  <Badge variant={invoice.status === 'PAID' ? 'emerald' : 'rose'}>
                    {invoice.status === 'PAID' ? 'Payé' : 'Échec'}
                  </Badge>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="space-y-6">
        <div class="rounded-xl border border-border p-6 space-y-4">
          <h2 class="text-base font-semibold text-foreground">Client</h2>
          <div class="space-y-3">
            <div>
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Entreprise
              </div>
              <div class="text-sm font-medium text-foreground">{payment.client.companyName}</div>
            </div>

            <div>
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Contact
              </div>
              <div class="text-sm font-medium text-foreground">
                {payment.client.contactFirstName}
                {payment.client.contactLastName}
              </div>
              <div class="text-xs text-muted-foreground">
                {payment.client.contactEmail ||
                  payment.client.user?.email ||
                  'Aucun email de contact'}
              </div>
            </div>

            <div>
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Adresse
              </div>
              <div class="text-xs text-muted-foreground">
                <div>{payment.client.billingAddress}</div>
                <div>{payment.client.billingCity}</div>
                <div>{payment.client.billingCountry}</div>
              </div>
            </div>

            {#if payment.client.siret}
              <div>
                <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  SIRET
                </div>
                <div class="font-mono text-xs text-muted-foreground">{payment.client.siret}</div>
              </div>
            {/if}

            <Button
              intent="secondary"
              class="w-full"
              onclick={() => goto(resolve('/admin/clients'))}
            >
              <iconify-icon icon="solar:eye-bold" width="14"></iconify-icon>
              Voir le client
            </Button>
          </div>
        </div>

        {#if payment.status === 'PENDING'}
          <div class="rounded-xl border border-border p-6 space-y-4">
            <h2 class="text-base font-semibold text-foreground">Actions</h2>
            <div class="space-y-2">
              {#if reminderSent}
                <Alert variant="success">Rappel envoye avec succes.</Alert>
              {/if}
              {#if reminderError}
                <Alert variant="danger">{reminderError}</Alert>
              {/if}
              <Button
                intent="secondary"
                class="w-full"
                onclick={handleSendReminder}
                disabled={reminderLoading}
              >
                {#if reminderLoading}
                  <iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
                {:else}
                  <iconify-icon icon="solar:letter-bold" width="16"></iconify-icon>
                {/if}
                Envoyer un rappel
              </Button>
              {#if payment.lastReminderSentAt}
                <p class="text-xs text-muted-foreground text-center">
                  Dernier rappel : {formatDateShort(payment.lastReminderSentAt)}
                </p>
              {/if}

              <Button intent="danger" class="w-full" onclick={() => (showCancelDialog = true)}>
                <iconify-icon icon="solar:close-circle-bold" width="16"></iconify-icon>
                Annuler le paiement
              </Button>
            </div>
          </div>
        {/if}

        {#if payment.receiptUrl}
          <div class="rounded-xl border border-border p-6 space-y-4">
            <h2 class="text-base font-semibold text-foreground">Reçu</h2>
            <Button
              intent="secondary"
              class="w-full"
              onclick={() => void window.open(payment.receiptUrl, '_blank')}
            >
              <iconify-icon icon="solar:download-bold" width="16"></iconify-icon>
              Télécharger le reçu
            </Button>
          </div>
        {/if}

        {#if payment.stripePaymentIntentId || payment.stripeSubscriptionId}
          <div class="rounded-xl border border-border p-6 space-y-4">
            <h2 class="text-base font-semibold text-foreground">Stripe</h2>
            <div class="space-y-3">
              {#if payment.stripePaymentIntentId}
                <div>
                  <div
                    class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1"
                  >
                    Payment Intent
                  </div>
                  <div
                    class="text-xs font-mono text-muted-foreground bg-muted p-2 rounded-lg break-all"
                  >
                    {payment.stripePaymentIntentId}
                  </div>
                </div>
              {/if}

              {#if payment.stripeSubscriptionId}
                <div>
                  <div
                    class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1"
                  >
                    Subscription
                  </div>
                  <div
                    class="text-xs font-mono text-muted-foreground bg-muted p-2 rounded-lg break-all"
                  >
                    {payment.stripeSubscriptionId}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="text-center py-20">
      <iconify-icon icon="solar:document-bold" width="48" class="text-muted-foreground"
      ></iconify-icon>
      <h2 class="text-xl font-bold text-foreground mt-4">Paiement introuvable</h2>
      <p class="text-sm text-muted-foreground mt-2">Ce paiement n'existe pas ou a été supprimé.</p>
      <Button intent="primary" class="mt-6" onclick={() => goto(resolve('/admin/payments'))}>
        Retour aux paiements
      </Button>
    </div>
  {/if}
</div>

<ConfirmDialog
  bind:isOpen={showCancelDialog}
  title="Annuler le paiement"
  description="Êtes-vous sûr de vouloir annuler ce paiement ? Cette action est irréversible."
  confirmText="Annuler le paiement"
  cancelText="Retour"
  variant="danger"
  onConfirm={handleCancelPayment}
  onCancel={() => (showCancelDialog = false)}
/>
