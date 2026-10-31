<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import {
    Alert,
    Badge,
    Button,
    Card,
    Divider,
    EmptyState,
    Icon,
    Page,
    PageHeader,
    Section,
    Spinner,
  } from '@facile/muse';
  import { ardoise, icons } from '$lib/icons';
  import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';

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
    companyName?: string | null;
    companyLegal?: string | null;
    companyAddress?: string | null;
    companyCity?: string | null;
    companyCountry?: string | null;
    companySiret?: string | null;
    companyEmail?: string | null;
    companyPhone?: string | null;
    bankName?: string | null;
    iban?: string | null;
    bic?: string | null;
    logoUrl?: string | null;
    stripePublishableKey?: string | null;
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

  $: paymentId = $page.params.id as string;

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
        return { label: 'En attente', variant: 'warning' as const };
      case 'PAID':
        return { label: 'Payée', variant: 'success' as const };
      case 'EXPIRED':
        return { label: 'Expirée', variant: 'danger' as const };
      case 'FAILED':
        return { label: 'Échec', variant: 'danger' as const };
      case 'PAST_DUE':
        return { label: 'En retard', variant: 'warning' as const };
      case 'CANCELLED':
        return { label: 'Annulée', variant: 'neutral' as const };
      default:
        return { label: status, variant: 'neutral' as const };
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
  <title>Paiement - {payment?.description || 'Chargement...'} - Ardoise</title>
</svelte:head>

<Page width="xl">
  {#if loading}
    <div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
  {:else if error && !payment}
    <EmptyState icon={icons.warning} title="Erreur" description={error}>
      <Button variant="ghost" icon={icons.chevronLeft} href={resolve('/app')}>
        Retour aux factures
      </Button>
    </EmptyState>
  {:else if payment}
    <PageHeader
      title={`Facture #${payment.id.slice(0, 8).toUpperCase()}`}
      description={payment.description}
      back={{ href: '/app', label: 'Retour aux factures' }}
    >
      {#snippet actions()}
        {#if payment}
          <Badge tone={getStatusBadge(payment.status).variant}>
            {getStatusBadge(payment.status).label}
          </Badge>
        {/if}
      {/snippet}
    </PageHeader>

    {#if settings?.logoUrl || settings?.companyName}
      <Card class="flex flex-col items-center gap-4 md:flex-row">
        {#if settings.logoUrl}
          <img
            src={settings.logoUrl}
            alt={settings.companyName || 'Logo entreprise'}
            class="h-12 w-auto object-contain"
          />
        {/if}
        <div class="flex flex-1 flex-col gap-1 text-center md:text-left">
          {#if settings.companyName}
            <h2 class="text-fc-lg font-semibold text-fc-fg">{settings.companyName}</h2>
          {/if}
          {#if settings.companyLegal}
            <p class="text-fc-sm text-fc-fg-muted">{settings.companyLegal}</p>
          {/if}
          <div class="flex flex-col gap-0.5 text-fc-sm text-fc-fg-muted">
            {#if settings.companyAddress}
              <p>{settings.companyAddress}</p>
            {/if}
            {#if settings.companyCity}
              <p>{settings.companyCity}, {settings.companyCountry || 'France'}</p>
            {/if}
            {#if settings.companySiret}
              <p>SIRET : {settings.companySiret}</p>
            {/if}
            <div class="mt-2 flex flex-col gap-2 md:flex-row md:gap-4">
              {#if settings.companyEmail}
                <span class="flex items-center justify-center gap-1.5 md:justify-start">
                  <Icon icon={icons.mail} />
                  {settings.companyEmail}
                </span>
              {/if}
              {#if settings.companyPhone}
                <span class="flex items-center justify-center gap-1.5 md:justify-start">
                  {settings.companyPhone}
                </span>
              {/if}
            </div>
          </div>
        </div>
      </Card>
    {/if}

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="flex flex-col gap-6 lg:col-span-2">
        <Section title="Détails du paiement" card>
          <div class="flex flex-col gap-4">
            <div class="rounded-fc-md bg-fc-surface p-4">
              <p class="mb-1 text-fc-xs text-fc-fg-muted">Description</p>
              <p class="text-fc-md font-semibold text-fc-fg">{payment.description}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="rounded-fc-md bg-fc-surface p-4">
                <p class="mb-1 text-fc-xs text-fc-fg-muted">Montant</p>
                <p class="text-fc-2xl font-semibold text-fc-fg">
                  {formatAmount(payment.totalWithFees || payment.amount)}
                </p>
                {#if payment.stripeFee && Number(payment.stripeFee) > 0}
                  <Divider class="my-3" />
                  <div class="flex items-center justify-between text-fc-sm text-fc-fg-muted">
                    <span>Montant de base</span>
                    <span class="font-medium">{formatAmount(payment.amount)}</span>
                  </div>
                  <div class="mt-1 flex items-center justify-between text-fc-sm text-fc-fg-muted">
                    <span>Frais de traitement</span>
                    <span class="font-medium">{formatAmount(payment.stripeFee)}</span>
                  </div>
                {/if}
              </div>

              <div class="rounded-fc-md bg-fc-surface p-4">
                <p class="mb-1 text-fc-xs text-fc-fg-muted">Date d'échéance</p>
                <p class="text-fc-lg font-semibold text-fc-fg">{formatDate(payment.dueDate)}</p>
              </div>
            </div>

            {#if payment.paidAt}
              <Alert tone="success" title="Payée le {formatDate(payment.paidAt)}" />
            {/if}
          </div>
        </Section>

        {#if canManageSubscription}
          <Section
            title="Abonnement"
            description="Gérez votre abonnement, votre moyen de paiement et vos factures."
            card
          >
            <div>
              <Button
                variant="ghost"
                icon={icons.settings}
                disabled={billingPortalLoading}
                onclick={() => handleManageSubscription()}
              >
                {billingPortalLoading ? 'Ouverture...' : "Gérer l'abonnement"}
              </Button>
            </div>
            {#if subscriptionError}
              <Alert tone="danger">{subscriptionError}</Alert>
            {/if}
          </Section>
        {/if}

        {#if payment.attachedDocuments && payment.attachedDocuments.length > 0}
          <Section title="Documents joints" description="Documents associés à ce paiement" card>
            <div class="flex flex-col gap-3">
              {#each payment.attachedDocuments as { document: doc } (doc.id)}
                <div class="flex items-start gap-3 rounded-fc-md bg-fc-surface p-4">
                  <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <h4 class="truncate text-fc-sm font-medium text-fc-fg">{doc.name}</h4>
                    <div class="flex flex-wrap items-center gap-2 text-fc-sm text-fc-fg-muted">
                      <Badge>{doc.type}</Badge>
                      {#if doc.invoiceNumber}
                        <span>N° {doc.invoiceNumber}</span>
                      {/if}
                      {#if doc.quoteNumber}
                        <span>Devis N° {doc.quoteNumber}</span>
                      {/if}
                      {#if doc.contractRef}
                        <span>Réf : {doc.contractRef}</span>
                      {/if}
                    </div>
                    <p class="text-fc-md font-semibold text-fc-fg">{formatAmount(doc.total)}</p>
                  </div>
                  {#if doc.pdfUrl}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={icons.download}
                      onclick={() => handleDownloadDocument(doc)}
                    >
                      Télécharger
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>
          </Section>
        {/if}

        {#if payment.status === 'PENDING' && payment.collectionMethod === 'MANUAL'}
          <EmptyState
            icon={ardoise.invoice}
            title="Paiement suivi hors ligne"
            description="Ce paiement n'est pas réglable sur cette page."
          >
            {#if payment.reference}
              <p class="text-fc-sm font-medium text-fc-fg">Référence : {payment.reference}</p>
            {/if}
          </EmptyState>
        {:else if payment.status === 'PENDING'}
          <Section
            title="Payer cette facture"
            description="Utilisez votre carte bancaire pour effectuer le paiement de manière sécurisée"
            card
          >
            {#if paymentSuccess}
              <Alert tone="success" title="Paiement réussi">
                Votre paiement a été effectué avec succès. Vous allez recevoir un reçu par email.
                Redirection en cours...
              </Alert>
            {:else}
              <div id="payment-element"></div>

              {#if error}
                <Alert tone="danger">{error}</Alert>
              {/if}

              <Button
                size="lg"
                class="w-full"
                icon={icons.shield}
                onclick={() => handleSubmitPayment()}
                disabled={processingPayment || !stripe || !elements}
              >
                {processingPayment
                  ? 'Traitement en cours...'
                  : `Payer ${formatAmount(payment.totalWithFees || payment.amount)}`}
              </Button>

              <p class="text-center text-fc-xs text-fc-fg-muted">Paiement sécurisé par Stripe</p>
            {/if}
          </Section>
        {:else if payment.status === 'PAID' && payment.receiptUrl}
          <EmptyState
            icon={icons.check}
            title="Paiement effectué"
            description="Cette facture a déjà été payée"
          >
            <Button icon={icons.download} onclick={handleDownloadReceipt}>Télécharger le reçu</Button>
          </EmptyState>
        {/if}
      </div>

      <div class="flex flex-col gap-6">
        <Section title="Informations client" card>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-0.5">
              <p class="text-fc-xs text-fc-fg-muted">Entreprise</p>
              <p class="text-fc-sm font-medium text-fc-fg">{payment.client.companyName}</p>
            </div>
            <div class="flex flex-col gap-0.5">
              <p class="text-fc-xs text-fc-fg-muted">Adresse de facturation</p>
              <p class="text-fc-sm text-fc-fg">{payment.client.billingAddress}</p>
              <p class="text-fc-sm text-fc-fg">
                {payment.client.billingCity}, {payment.client.billingCountry}
              </p>
            </div>
          </div>
        </Section>

        {#if settings && (settings.bankName || settings.iban)}
          <Section title="Informations bancaires" card>
            <div class="flex flex-col gap-3">
              {#if settings.bankName}
                <div class="flex flex-col gap-0.5">
                  <p class="text-fc-xs text-fc-fg-muted">Banque</p>
                  <p class="text-fc-sm font-medium text-fc-fg">{settings.bankName}</p>
                </div>
              {/if}
              {#if settings.iban}
                <div class="flex flex-col gap-0.5">
                  <p class="text-fc-xs text-fc-fg-muted">IBAN</p>
                  <p class="font-fc-mono text-fc-sm text-fc-fg">{settings.iban}</p>
                </div>
              {/if}
              {#if settings.bic}
                <div class="flex flex-col gap-0.5">
                  <p class="text-fc-xs text-fc-fg-muted">BIC</p>
                  <p class="font-fc-mono text-fc-sm text-fc-fg">{settings.bic}</p>
                </div>
              {/if}
            </div>
          </Section>
        {/if}

        <Alert tone="info" title="Besoin d'aide ?">
          Si vous rencontrez un problème avec votre paiement, n'hésitez pas à nous contacter.
          {#if settings?.companyEmail}
            <a href="mailto:{settings.companyEmail}" class="mt-2 block font-medium underline">
              {settings.companyEmail}
            </a>
          {/if}
        </Alert>
      </div>
    </div>
  {/if}
</Page>
