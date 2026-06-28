<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import { Card, Button, Badge, Spinner } from '@repo/ui';
  import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
  import 'iconify-icon';

  interface Document {
    id: string;
    name: string;
    type: string;
    invoiceNumber?: string;
    quoteNumber?: string;
    contractRef?: string;
    pdfUrl?: string;
    total: number;
  }

  interface Payment {
    id: string;
    amount: number | string;
    stripeFee?: number | string;
    totalWithFees?: number | string;
    description: string;
    status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED' | 'PAST_DUE';
    frequency?: 'ONE_TIME' | 'MONTHLY' | 'YEARLY' | null;
    stripeSubscriptionId?: string | null;
    collectionMethod?: 'STRIPE' | 'MANUAL';
    reference?: string | null;
    dueDate: Date | string;
    paidAt?: Date | string;
    receiptUrl?: string;
    attachedDocuments?: Array<{
      id: string;
      document: Document;
    }>;
    client: {
      companyName: string;
      billingAddress: string;
      billingCity: string;
      billingCountry: string;
    };
  }

  interface Settings {
    companyName?: string;
    companyLegal?: string;
    companyAddress?: string;
    companyCity?: string;
    companyCountry?: string;
    companySiret?: string;
    companyEmail?: string;
    companyPhone?: string;
    bankName?: string;
    iban?: string;
    bic?: string;
    logoUrl?: string;
    stripePublishableKey?: string;
  }

  let paymentId = '';
  let payment: Payment | null = null;
  let settings: Settings | null = null;
  let loading = true;
  let error = '';
  let paymentSuccess = false;
  let processingPayment = false;
  let billingPortalLoading = false;
  let subscriptionError = '';

  $: isSubscription =
    !!payment &&
    (payment.frequency === 'MONTHLY' || payment.frequency === 'YEARLY') &&
    !!payment.stripeSubscriptionId;
  $: canManageSubscription = isSubscription && !!$authStore.user;

  let stripe: Stripe | null = null;
  let elements: StripeElements | null = null;
  let clientSecret = '';

  $: paymentId = $page.params.id;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      const [paymentData, settingsData] = await Promise.all([
        trpc.payment.getByIdPublic.query({ id: paymentId }),
        trpc.settings.get.query(),
      ]);

      payment = paymentData as unknown as Payment;
      settings = settingsData;

      if (payment.status === 'PENDING' && payment.collectionMethod !== 'MANUAL') {
        if (!settings?.stripePublishableKey) {
          error = 'Configuration Stripe manquante. Veuillez contacter le support.';
          console.error('Stripe publishable key not configured');
        } else {
          await initializeStripe();
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erreur lors du chargement du paiement';
    } finally {
      loading = false;
    }
  }

  async function initializeStripe() {
    try {
      const secretData = await trpc.payment.getClientSecret.query({ id: paymentId });
      clientSecret = secretData.clientSecret;
      stripe = await loadStripe(settings?.stripePublishableKey || '');

      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const appearance = {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: 'oklch(0.145 0 0)',
          colorBackground: 'oklch(1 0 0)',
          colorText: 'oklch(0.145 0 0)',
          colorDanger: '#dc2626',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: '8px',
        },
      };

      elements = stripe.elements({ clientSecret, appearance });
      const paymentElement = elements.create('payment');
      paymentElement.mount('#payment-element');
    } catch (err) {
      error = err instanceof Error ? err.message : "Erreur lors de l'initialisation du paiement";
      console.error('Stripe initialization error:', err);
    }
  }

  async function handleSubmitPayment() {
    if (!stripe || !elements) {
      console.error('Stripe or elements not initialized');
      return;
    }

    processingPayment = true;
    error = '';

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        error = submitError.message || 'Erreur lors du paiement';
        console.error('Payment error:', error);
      } else {
        paymentSuccess = true;
        setTimeout(() => {
          goto(resolve('/app'));
        }, 3000);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erreur lors du paiement';
      console.error('Payment exception:', err);
    } finally {
      processingPayment = false;
    }
  }

  async function handleManageSubscription() {
    if (!payment) return;

    billingPortalLoading = true;
    subscriptionError = '';

    try {
      const result = await trpc.payment.billingPortal.mutate({ id: payment.id });
      window.location.href = result.url;
    } catch (err) {
      subscriptionError =
        err instanceof Error ? err.message : "Impossible d'ouvrir la gestion de l'abonnement.";
      console.error('Billing portal error:', err);
      billingPortalLoading = false;
    }
  }

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatAmount(amount: number | string) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(num);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PENDING':
        return { label: 'En attente', variant: 'amber' as const };
      case 'PAID':
        return { label: 'Payée', variant: 'emerald' as const };
      case 'EXPIRED':
        return { label: 'Expirée', variant: 'rose' as const };
      case 'FAILED':
        return { label: 'Échec', variant: 'rose' as const };
      case 'PAST_DUE':
        return { label: 'En retard', variant: 'amber' as const };
      case 'CANCELLED':
        return { label: 'Annulée', variant: 'slate' as const };
      default:
        return { label: status, variant: 'slate' as const };
    }
  }

  function handleDownloadReceipt() {
    if (payment?.receiptUrl) {
      window.open(payment.receiptUrl, '_blank');
    }
  }

  async function handleDownloadDocument(doc: Document) {
    if (!doc.pdfUrl) return;

    try {
      if (doc.pdfUrl.includes('storageapi.dev')) {
        const result = await trpc.media.getDownloadUrl.query({ url: doc.pdfUrl });
        window.open(result.url, '_blank');
      } else {
        window.open(doc.pdfUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to download document:', err);
    }
  }
</script>

<svelte:head>
  <title>Paiement - {payment?.description || 'Chargement...'}</title>
</svelte:head>

<div class="flex flex-col gap-6 p-6">
  <div class="max-w-5xl mx-auto w-full">
    {#if loading}
      <div class="flex items-center justify-center py-32">
        <iconify-icon icon="svg-spinners:ring-resize" width="24" class="text-muted-foreground"
        ></iconify-icon>
      </div>
    {:else if error && !payment}
      <div class="rounded-xl border border-border p-6 text-center">
        <div class="flex flex-col items-center gap-4">
          <div class="size-12 rounded-lg border border-border flex items-center justify-center">
            <iconify-icon icon="solar:danger-circle-linear" width="24" class="text-destructive"
            ></iconify-icon>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-foreground mb-1">Erreur</h2>
            <p class="text-sm text-muted-foreground max-w-md">{error}</p>
          </div>
          <Button intent="secondary" onclick={() => goto(resolve('/app'))}>
            <iconify-icon icon="solar:arrow-left-linear" width="16"></iconify-icon>
            Retour aux factures
          </Button>
        </div>
      </div>
    {:else if payment}
      <div class="mb-4">
        <Button intent="ghost" size="sm" onclick={() => goto(resolve('/app'))}>
          <iconify-icon icon="solar:arrow-left-linear" width="16"></iconify-icon>
          Retour
        </Button>
      </div>

      {#if settings?.logoUrl || settings?.companyName}
        <div class="rounded-xl border border-border p-6 mb-6">
          <div class="flex flex-col md:flex-row items-center gap-4">
            {#if settings.logoUrl}
              <img
                src={settings.logoUrl}
                alt={settings.companyName || 'Logo entreprise'}
                class="h-12 w-auto object-contain"
              />
            {/if}
            <div class="flex-1 text-center md:text-left">
              {#if settings.companyName}
                <h1 class="text-xl font-bold text-foreground mb-1">
                  {settings.companyName}
                </h1>
              {/if}
              {#if settings.companyLegal}
                <p class="text-sm text-muted-foreground">{settings.companyLegal}</p>
              {/if}
              <div class="mt-2 text-sm text-muted-foreground space-y-0.5">
                {#if settings.companyAddress}
                  <p>{settings.companyAddress}</p>
                {/if}
                {#if settings.companyCity}
                  <p>{settings.companyCity}, {settings.companyCountry || 'France'}</p>
                {/if}
                {#if settings.companySiret}
                  <p>SIRET: {settings.companySiret}</p>
                {/if}
                <div class="flex flex-col md:flex-row gap-2 md:gap-4 mt-2">
                  {#if settings.companyEmail}
                    <span class="flex items-center gap-1.5">
                      <iconify-icon icon="solar:letter-linear" width="14"></iconify-icon>
                      {settings.companyEmail}
                    </span>
                  {/if}
                  {#if settings.companyPhone}
                    <span class="flex items-center gap-1.5">
                      <iconify-icon icon="solar:phone-linear" width="14"></iconify-icon>
                      {settings.companyPhone}
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="rounded-xl border border-border p-6">
            <div class="flex items-start justify-between mb-6">
              <div class="flex-1">
                <h2 class="text-lg font-semibold text-foreground mb-1">Détails du paiement</h2>
                <p class="text-sm text-muted-foreground">
                  Facture #{payment.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <Badge variant={getStatusBadge(payment.status).variant}>
                {getStatusBadge(payment.status).label}
              </Badge>
            </div>

            <div class="space-y-4">
              <div class="rounded-lg bg-muted p-4">
                <p class="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p class="text-base font-semibold text-foreground">{payment.description}</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-lg bg-muted p-4">
                  <p class="text-xs font-medium text-muted-foreground mb-1">Montant</p>
                  <p class="text-2xl font-bold text-foreground">
                    {formatAmount(payment.totalWithFees || payment.amount)}
                  </p>
                  {#if payment.stripeFee && Number(payment.stripeFee) > 0}
                    <div class="mt-3 pt-3 border-t border-border">
                      <div
                        class="flex justify-between items-center text-sm text-muted-foreground mb-1"
                      >
                        <span>Montant de base</span>
                        <span class="font-medium">{formatAmount(payment.amount)}</span>
                      </div>
                      <div class="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Frais de traitement</span>
                        <span class="font-medium">{formatAmount(payment.stripeFee)}</span>
                      </div>
                    </div>
                  {/if}
                </div>

                <div class="rounded-lg bg-muted p-4">
                  <p class="text-xs font-medium text-muted-foreground mb-1">Date d'échéance</p>
                  <p class="text-lg font-semibold text-foreground">{formatDate(payment.dueDate)}</p>
                </div>
              </div>

              {#if payment.paidAt}
                <div class="rounded-lg bg-success/10 p-4">
                  <div class="flex items-center gap-2 mb-1">
                    <iconify-icon icon="solar:check-circle-linear" width="18" class="text-success"
                    ></iconify-icon>
                    <p class="text-xs font-medium text-success">Payée le</p>
                  </div>
                  <p class="text-lg font-semibold text-success">{formatDate(payment.paidAt)}</p>
                </div>
              {/if}
            </div>
          </div>

          {#if canManageSubscription}
            <div class="rounded-xl border border-border p-6">
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-foreground mb-1">Abonnement</h3>
                  <p class="text-sm text-muted-foreground">
                    Gérez votre abonnement, votre moyen de paiement et vos factures.
                  </p>
                </div>
                <Button
                  intent="secondary"
                  class="flex-shrink-0"
                  disabled={billingPortalLoading}
                  onclick={() => handleManageSubscription()}
                >
                  {#if billingPortalLoading}
                    <iconify-icon icon="svg-spinners:ring-resize" width="16"></iconify-icon>
                    Ouverture...
                  {:else}
                    <iconify-icon icon="solar:settings-linear" width="16"></iconify-icon>
                    Gérer l'abonnement
                  {/if}
                </Button>
              </div>

              {#if subscriptionError}
                <div
                  class="mt-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center gap-3"
                >
                  <iconify-icon
                    icon="solar:danger-circle-linear"
                    width="18"
                    class="text-destructive"
                  ></iconify-icon>
                  <p class="text-destructive text-sm font-medium">{subscriptionError}</p>
                </div>
              {/if}
            </div>
          {/if}

          {#if payment.attachedDocuments && payment.attachedDocuments.length > 0}
            <div class="rounded-xl border border-border p-6">
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-foreground mb-1">Documents joints</h3>
                <p class="text-sm text-muted-foreground">Documents associés à ce paiement</p>
              </div>

              <div class="space-y-3">
                {#each payment.attachedDocuments as { document: doc } (doc.id)}
                  <div class="rounded-lg bg-muted p-4">
                    <div class="flex items-start gap-3">
                      <div
                        class="flex-shrink-0 size-10 bg-background border border-border rounded-lg flex items-center justify-center"
                      >
                        <iconify-icon
                          icon="solar:document-linear"
                          width="20"
                          class="text-muted-foreground"
                        ></iconify-icon>
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-foreground mb-0.5 truncate">{doc.name}</h4>
                        <div
                          class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
                        >
                          <span
                            class="px-1.5 py-0.5 bg-background border border-border rounded text-xs font-medium"
                          >
                            {doc.type}
                          </span>
                          {#if doc.invoiceNumber}
                            <span>N° {doc.invoiceNumber}</span>
                          {/if}
                          {#if doc.quoteNumber}
                            <span>Devis N° {doc.quoteNumber}</span>
                          {/if}
                          {#if doc.contractRef}
                            <span>Réf: {doc.contractRef}</span>
                          {/if}
                        </div>
                        <div class="mt-1.5 text-base font-semibold text-foreground">
                          {formatAmount(doc.total)}
                        </div>
                      </div>
                      {#if doc.pdfUrl}
                        <Button
                          intent="secondary"
                          size="sm"
                          class="flex-shrink-0"
                          onclick={() => handleDownloadDocument(doc)}
                        >
                          <iconify-icon icon="solar:download-linear" width="16"></iconify-icon>
                          Télécharger
                        </Button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if payment.status === 'PENDING' && payment.collectionMethod === 'MANUAL'}
            <div class="rounded-xl border border-border p-6">
              <div class="py-6 text-center">
                <div
                  class="size-12 rounded-lg border border-border flex items-center justify-center mx-auto mb-3"
                >
                  <iconify-icon
                    icon="solar:document-text-linear"
                    width="24"
                    class="text-muted-foreground"
                  ></iconify-icon>
                </div>
                <h3 class="text-lg font-semibold text-foreground mb-1">
                  Paiement suivi hors ligne
                </h3>
                <p class="text-sm text-muted-foreground mb-3">
                  Ce paiement n'est pas réglable sur cette page.
                </p>
                {#if payment.reference}
                  <p class="text-sm font-medium text-foreground">Référence: {payment.reference}</p>
                {/if}
              </div>
            </div>
          {:else if payment.status === 'PENDING'}
            <div class="rounded-xl border border-border p-6">
              <div class="mb-6">
                <h3 class="text-lg font-semibold text-foreground mb-1">Payer cette facture</h3>
                <p class="text-sm text-muted-foreground">
                  Utilisez votre carte bancaire pour effectuer le paiement de manière sécurisée
                </p>
              </div>

              {#if paymentSuccess}
                <div class="py-8 text-center">
                  <div
                    class="size-12 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <iconify-icon icon="solar:check-circle-linear" width="28" class="text-success"
                    ></iconify-icon>
                  </div>
                  <h3 class="text-lg font-semibold text-foreground mb-1">Paiement réussi!</h3>
                  <p class="text-sm text-muted-foreground mb-4">
                    Votre paiement a été effectué avec succès. Vous allez recevoir un reçu par
                    email.
                  </p>
                  <p class="text-xs text-muted-foreground">Redirection en cours...</p>
                </div>
              {:else}
                <div id="payment-element" class="mb-6"></div>

                {#if error}
                  <div
                    class="mb-6 p-4 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center gap-3"
                  >
                    <iconify-icon
                      icon="solar:danger-circle-linear"
                      width="18"
                      class="text-destructive"
                    ></iconify-icon>
                    <p class="text-destructive text-sm font-medium">{error}</p>
                  </div>
                {/if}

                <button
                  class="w-full bg-primary text-primary-foreground rounded-md px-4 py-3 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onclick={() => handleSubmitPayment()}
                  disabled={processingPayment || !stripe || !elements}
                >
                  {#if processingPayment}
                    <span class="flex items-center justify-center gap-2">
                      <iconify-icon icon="svg-spinners:ring-resize" width="16"></iconify-icon>
                      Traitement en cours...
                    </span>
                  {:else}
                    <span class="flex items-center justify-center gap-2">
                      <iconify-icon icon="solar:lock-password-linear" width="16"></iconify-icon>
                      Payer {formatAmount(payment.totalWithFees || payment.amount)}
                    </span>
                  {/if}
                </button>

                <p class="text-xs text-muted-foreground text-center mt-3">
                  Paiement sécurisé par Stripe
                </p>
              {/if}
            </div>
          {:else if payment.status === 'PAID' && payment.receiptUrl}
            <div class="rounded-xl border border-border bg-success/5 p-6">
              <div class="text-center py-6">
                <div
                  class="size-12 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-3"
                >
                  <iconify-icon icon="solar:check-circle-linear" width="28" class="text-success"
                  ></iconify-icon>
                </div>
                <h3 class="text-lg font-semibold text-foreground mb-1">Paiement effectué</h3>
                <p class="text-sm text-muted-foreground mb-4">Cette facture a déjà été payée</p>
                <Button intent="primary" onclick={handleDownloadReceipt}>
                  <iconify-icon icon="solar:download-linear" width="16"></iconify-icon>
                  Télécharger le reçu
                </Button>
              </div>
            </div>
          {/if}
        </div>

        <div class="space-y-6">
          <div class="rounded-xl border border-border p-6">
            <h3 class="text-base font-semibold text-foreground mb-4">Informations client</h3>
            <div class="space-y-3">
              <div>
                <p class="text-xs font-medium text-muted-foreground mb-0.5">Entreprise</p>
                <p class="text-sm font-medium text-foreground">{payment.client.companyName}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-muted-foreground mb-0.5">
                  Adresse de facturation
                </p>
                <p class="text-sm text-foreground">{payment.client.billingAddress}</p>
                <p class="text-sm text-foreground">
                  {payment.client.billingCity}, {payment.client.billingCountry}
                </p>
              </div>
            </div>
          </div>

          {#if settings && (settings.bankName || settings.iban)}
            <div class="rounded-xl border border-border p-6">
              <h3 class="text-base font-semibold text-foreground mb-4">Informations bancaires</h3>
              <div class="space-y-3">
                {#if settings.bankName}
                  <div>
                    <p class="text-xs font-medium text-muted-foreground mb-0.5">Banque</p>
                    <p class="text-sm font-medium text-foreground">{settings.bankName}</p>
                  </div>
                {/if}
                {#if settings.iban}
                  <div>
                    <p class="text-xs font-medium text-muted-foreground mb-0.5">IBAN</p>
                    <p class="text-sm font-mono text-foreground">{settings.iban}</p>
                  </div>
                {/if}
                {#if settings.bic}
                  <div>
                    <p class="text-xs font-medium text-muted-foreground mb-0.5">BIC</p>
                    <p class="text-sm font-mono text-foreground">{settings.bic}</p>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <div class="rounded-xl border border-border p-4">
            <div class="flex items-start gap-3">
              <iconify-icon
                icon="solar:info-circle-linear"
                width="18"
                class="text-muted-foreground mt-0.5"
              ></iconify-icon>
              <div>
                <h4 class="text-sm font-medium text-foreground mb-1">Besoin d'aide?</h4>
                <p class="text-sm text-muted-foreground mb-2">
                  Si vous rencontrez un problème avec votre paiement, n'hésitez pas à nous
                  contacter.
                </p>
                {#if settings?.companyEmail}
                  <a
                    href="mailto:{settings.companyEmail}"
                    class="text-sm font-medium text-foreground hover:underline flex items-center gap-1.5"
                  >
                    <iconify-icon icon="solar:letter-linear" width="14"></iconify-icon>
                    {settings.companyEmail}
                  </a>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
