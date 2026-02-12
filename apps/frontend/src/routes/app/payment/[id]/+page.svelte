<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc';
  import env from '$lib/env';
  import { Card, Button, Badge, Spinner } from '@repo/ui';
  import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
  import 'iconify-icon';

  interface Payment {
    id: string;
    amount: number | string;
    stripeFee?: number | string;
    totalWithFees?: number | string;
    description: string;
    status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
    dueDate: Date | string;
    paidAt?: Date | string;
    receiptUrl?: string;
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
  }

  let paymentId = '';
  let payment: Payment | null = null;
  let settings: Settings | null = null;
  let loading = true;
  let error = '';
  let paymentSuccess = false;
  let processingPayment = false;

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

      payment = paymentData as Payment;
      settings = settingsData;

      if (payment.status === 'PENDING' && env.STRIPE_PUBLISHABLE_KEY) {
        await initializeStripe();
      }
    } catch (err: any) {
      error = err.message || 'Erreur lors du chargement du paiement';
    } finally {
      loading = false;
    }
  }

  async function initializeStripe() {
    try {
      const secretData = await trpc.payment.getClientSecret.query({ id: paymentId });
      clientSecret = secretData.clientSecret;

      stripe = await loadStripe(env.STRIPE_PUBLISHABLE_KEY || '');

      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const appearance = {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#291334',
          colorBackground: '#FAF7F5',
          colorText: '#291334',
          colorDanger: '#dc2626',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: '16px',
        },
      };

      elements = stripe.elements({ clientSecret, appearance });

      const paymentElement = elements.create('payment');
      paymentElement.mount('#payment-element');
    } catch (err: any) {
      error = err.message || 'Erreur lors de l\'initialisation du paiement';
    }
  }

  async function handleSubmitPayment() {
    if (!stripe || !elements) return;

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
      } else {
        paymentSuccess = true;
        setTimeout(() => {
          goto('/app');
        }, 3000);
      }
    } catch (err: any) {
      error = err.message || 'Erreur lors du paiement';
    } finally {
      processingPayment = false;
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
</script>

<svelte:head>
  <title>Paiement - {payment?.description || 'Chargement...'}</title>
</svelte:head>

<div class="min-h-screen bg-[#FAF7F5] p-4 md:p-8">
  <div class="max-w-5xl mx-auto">
    {#if loading}
      <div class="flex items-center justify-center py-32">
        <div class="text-center">
          <Spinner size="xl" class="mx-auto mb-6" />
          <p class="text-[#291334]/60 font-bold">Chargement du paiement...</p>
        </div>
      </div>
    {:else if error && !payment}
      <Card class="text-center py-16">
        <div class="flex flex-col items-center gap-6">
          <div
            class="w-20 h-20 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center"
          >
            <iconify-icon icon="solar:danger-circle-bold" width="40"></iconify-icon>
          </div>
          <div>
            <h2 class="text-2xl font-black text-[#291334] mb-2">Erreur</h2>
            <p class="text-[#291334]/60 max-w-md">{error}</p>
          </div>
          <Button intent="secondary" onclick={() => goto('/app')}>
            <iconify-icon icon="solar:arrow-left-bold"></iconify-icon>
            Retour aux factures
          </Button>
        </div>
      </Card>
    {:else if payment}
      <div class="mb-8">
        <Button
          intent="ghost"
          size="sm"
          class="mb-4"
          onclick={() => goto('/app')}
        >
          <iconify-icon icon="solar:arrow-left-bold" width="20"></iconify-icon>
          Retour
        </Button>
      </div>

      {#if settings?.logoUrl || settings?.companyName}
        <Card class="mb-8 text-center md:text-left">
          <div class="flex flex-col md:flex-row items-center gap-6">
            {#if settings.logoUrl}
              <img
                src={settings.logoUrl}
                alt={settings.companyName || 'Logo entreprise'}
                class="h-16 w-auto object-contain"
              />
            {/if}
            <div class="flex-1">
              {#if settings.companyName}
                <h1 class="text-2xl md:text-3xl font-black text-[#291334] mb-2">
                  {settings.companyName}
                </h1>
              {/if}
              {#if settings.companyLegal}
                <p class="text-sm text-[#291334]/60">{settings.companyLegal}</p>
              {/if}
              <div class="mt-3 text-sm text-[#291334]/60 space-y-1">
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
                    <span class="flex items-center gap-2">
                      <iconify-icon icon="solar:letter-bold" width="16"></iconify-icon>
                      {settings.companyEmail}
                    </span>
                  {/if}
                  {#if settings.companyPhone}
                    <span class="flex items-center gap-2">
                      <iconify-icon icon="solar:phone-bold" width="16"></iconify-icon>
                      {settings.companyPhone}
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </Card>
      {/if}

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          <Card>
            <div class="flex items-start justify-between mb-6">
              <div class="flex-1">
                <h2 class="text-3xl font-black text-[#291334] mb-2">Détails du paiement</h2>
                <p class="text-[#291334]/60">Facture #{payment.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <Badge variant={getStatusBadge(payment.status).variant}>
                {getStatusBadge(payment.status).label}
              </Badge>
            </div>

            <div class="space-y-6">
              <div class="p-6 bg-[#FAF7F5] rounded-2xl">
                <p class="text-sm text-[#291334]/60 mb-2 font-bold uppercase tracking-wide">
                  Description
                </p>
                <p class="text-lg font-black text-[#291334]">{payment.description}</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-6 bg-[#FAF7F5] rounded-2xl">
                  <p class="text-sm text-[#291334]/60 mb-2 font-bold uppercase tracking-wide">
                    Montant
                  </p>
                  <p class="text-3xl font-black text-[#291334]">{formatAmount(payment.totalWithFees || payment.amount)}</p>
                  {#if payment.stripeFee && Number(payment.stripeFee) > 0}
                    <div class="mt-3 pt-3 border-t border-[#291334]/10">
                      <div class="flex justify-between items-center text-sm text-[#291334]/60 mb-1">
                        <span>Montant de base</span>
                        <span class="font-bold">{formatAmount(payment.amount)}</span>
                      </div>
                      <div class="flex justify-between items-center text-sm text-[#FEC129]">
                        <span>Frais de traitement</span>
                        <span class="font-bold">{formatAmount(payment.stripeFee)}</span>
                      </div>
                    </div>
                  {/if}
                </div>

                <div class="p-6 bg-[#FAF7F5] rounded-2xl">
                  <p class="text-sm text-[#291334]/60 mb-2 font-bold uppercase tracking-wide">
                    Date d'échéance
                  </p>
                  <p class="text-xl font-black text-[#291334]">{formatDate(payment.dueDate)}</p>
                </div>
              </div>

              {#if payment.paidAt}
                <div class="p-6 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                  <div class="flex items-center gap-3 mb-2">
                    <iconify-icon
                      icon="solar:check-circle-bold"
                      width="24"
                      class="text-emerald-600"
                    ></iconify-icon>
                    <p class="text-sm text-emerald-800 font-bold uppercase tracking-wide">
                      Payée le
                    </p>
                  </div>
                  <p class="text-xl font-black text-emerald-900">{formatDate(payment.paidAt)}</p>
                </div>
              {/if}
            </div>
          </Card>

          {#if payment.status === 'PENDING'}
            <Card>
              <div class="mb-6">
                <h3 class="text-2xl font-black text-[#291334] mb-2">Payer cette facture</h3>
                <p class="text-[#291334]/60">
                  Utilisez votre carte bancaire pour effectuer le paiement de manière sécurisée
                </p>
              </div>

              {#if paymentSuccess}
                <div class="py-12 text-center">
                  <div
                    class="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  >
                    <iconify-icon icon="solar:check-circle-bold" width="48"></iconify-icon>
                  </div>
                  <h3 class="text-2xl font-black text-[#291334] mb-2">Paiement réussi!</h3>
                  <p class="text-[#291334]/60 mb-6">
                    Votre paiement a été effectué avec succès. Vous allez recevoir un reçu par
                    email.
                  </p>
                  <p class="text-sm text-[#291334]/40">Redirection en cours...</p>
                </div>
              {:else}
                <div id="payment-element" class="mb-6"></div>

                {#if error}
                  <div
                    class="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3"
                  >
                    <iconify-icon
                      icon="solar:danger-circle-bold"
                      width="20"
                      class="text-rose-600"
                    ></iconify-icon>
                    <p class="text-rose-800 text-sm font-bold">{error}</p>
                  </div>
                {/if}

                <Button
                  intent="primary"
                  size="lg"
                  class="w-full bg-[#291334] hover:bg-[#291334]/90"
                  onclick={handleSubmitPayment}
                  disabled={processingPayment || !stripe || !elements}
                >
                  {#if processingPayment}
                    <Spinner size="sm" color="white" />
                    Traitement en cours...
                  {:else}
                    <iconify-icon icon="solar:lock-password-bold" width="20"></iconify-icon>
                    Payer {formatAmount(payment.totalWithFees || payment.amount)}
                  {/if}
                </Button>

                <p class="text-xs text-[#291334]/40 text-center mt-4">
                  Paiement sécurisé par Stripe
                </p>
              {/if}
            </Card>
          {:else if payment.status === 'PAID' && payment.receiptUrl}
            <Card class="bg-emerald-50 border-2 border-emerald-200">
              <div class="text-center py-8">
                <div
                  class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
                >
                  <iconify-icon icon="solar:check-circle-bold" width="32"></iconify-icon>
                </div>
                <h3 class="text-2xl font-black text-emerald-900 mb-2">Paiement effectué</h3>
                <p class="text-emerald-800 mb-6">Cette facture a déjà été payée</p>
                <Button
                  intent="primary"
                  class="bg-emerald-600 hover:bg-emerald-700"
                  onclick={handleDownloadReceipt}
                >
                  <iconify-icon icon="solar:download-bold" width="20"></iconify-icon>
                  Télécharger le reçu
                </Button>
              </div>
            </Card>
          {/if}
        </div>

        <div class="space-y-6">
          <Card>
            <h3 class="text-xl font-black text-[#291334] mb-4">Informations client</h3>
            <div class="space-y-4">
              <div>
                <p class="text-xs text-[#291334]/60 mb-1 font-bold uppercase tracking-wide">
                  Entreprise
                </p>
                <p class="text-[#291334] font-black">{payment.client.companyName}</p>
              </div>
              <div>
                <p class="text-xs text-[#291334]/60 mb-1 font-bold uppercase tracking-wide">
                  Adresse de facturation
                </p>
                <p class="text-[#291334]">{payment.client.billingAddress}</p>
                <p class="text-[#291334]">
                  {payment.client.billingCity}, {payment.client.billingCountry}
                </p>
              </div>
            </div>
          </Card>

          {#if settings && (settings.bankName || settings.iban)}
            <Card>
              <h3 class="text-xl font-black text-[#291334] mb-4">Informations bancaires</h3>
              <div class="space-y-4">
                {#if settings.bankName}
                  <div>
                    <p class="text-xs text-[#291334]/60 mb-1 font-bold uppercase tracking-wide">
                      Banque
                    </p>
                    <p class="text-[#291334] font-black">{settings.bankName}</p>
                  </div>
                {/if}
                {#if settings.iban}
                  <div>
                    <p class="text-xs text-[#291334]/60 mb-1 font-bold uppercase tracking-wide">
                      IBAN
                    </p>
                    <p class="text-[#291334] font-mono text-sm">{settings.iban}</p>
                  </div>
                {/if}
                {#if settings.bic}
                  <div>
                    <p class="text-xs text-[#291334]/60 mb-1 font-bold uppercase tracking-wide">
                      BIC
                    </p>
                    <p class="text-[#291334] font-mono text-sm">{settings.bic}</p>
                  </div>
                {/if}
              </div>
            </Card>
          {/if}

          <Card class="bg-[#FEC129]/10 border-2 border-[#FEC129]/30">
            <div class="flex items-start gap-3">
              <iconify-icon
                icon="solar:info-circle-bold"
                width="24"
                class="text-[#291334] mt-1"
              ></iconify-icon>
              <div>
                <h4 class="font-black text-[#291334] mb-2">Besoin d'aide?</h4>
                <p class="text-sm text-[#291334]/80 mb-3">
                  Si vous rencontrez un problème avec votre paiement, n'hésitez pas à nous
                  contacter.
                </p>
                {#if settings?.companyEmail}
                  <a
                    href="mailto:{settings.companyEmail}"
                    class="text-sm font-black text-[#291334] hover:text-[#FEC129] transition-colors flex items-center gap-2"
                  >
                    <iconify-icon icon="solar:letter-bold" width="16"></iconify-icon>
                    {settings.companyEmail}
                  </a>
                {/if}
              </div>
            </div>
          </Card>
        </div>
      </div>
    {/if}
  </div>
</div>
