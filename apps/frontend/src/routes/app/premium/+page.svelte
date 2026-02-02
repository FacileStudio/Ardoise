<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import env  from '$lib/env'

  let pageLoading = true;
  let actionLoading = false;
  let subscriptionStatus = null;
  let error = '';

  $: canceled = $page.url.searchParams.get('canceled') === 'true';

  const PREMIUM_PRICE_ID = env.STRIPE_PRICE_ID;

  onMount(async () => {
    if (!browser) return;

    try {
      subscriptionStatus = await trpc.stripe.getSubscription.query();
    } catch (err: any) {
      error = 'Impossible de charger le statut de l\'abonnement.';
    } finally {
      pageLoading = false;
    }
  });

  async function handleBecomePremium() {
    if (!browser) return;
    actionLoading = true;
    error = '';
    try {
      const result = await trpc.stripe.createCheckoutSession.mutate({ priceId: PREMIUM_PRICE_ID });
      if (result.url) {
        window.location.href = result.url;
      } else {
        error = 'Erreur lors de la création de la session de paiement.';
        actionLoading = false;
      }
    } catch (err: any) {
      error = err.message || 'Échec de l\'initialisation Premium.';
      actionLoading = false;
    }
  }

  async function handleManageSubscription() {
    if (!browser) return;
    actionLoading = true;
    error = '';
    try {
      const result = await trpc.stripe.createPortalSession.mutate();
      if (result.url) {
        window.location.href = result.url;
      } else {
        error = 'Erreur lors de l\'accès au portail client.';
        actionLoading = false;
      }
    } catch (err: any) {
      error = err.message || 'Impossible de gérer l\'abonnement.';
      actionLoading = false;
    }
  }
</script>

<main class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900">Premium Membership</h1>
      <p class="mt-2 text-gray-600">Débloquez les fonctionnalités exclusives !</p>
    </div>

    {#if canceled}
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
        <iconify-icon icon="solar:danger-triangle-bold" class="text-amber-600" width="24"></iconify-icon>
        <p class="text-amber-700 text-sm font-medium">Le paiement n'a pas été finalisé.</p>
      </div>
    {/if}

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <iconify-icon icon="solar:shield-warning-bold" class="text-red-600" width="24"></iconify-icon>
        <p class="text-red-600 text-sm font-medium">{error}</p>
      </div>
    {/if}

    {#if pageLoading}
      <div class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p class="mt-2 text-gray-500 text-sm">Vérification de votre statut...</p>
      </div>
    {:else if subscriptionStatus}
      <div class="bg-white rounded-xl shadow-lg p-8 space-y-6 border border-gray-100">

        {#if subscriptionStatus.isPremium}
          <div class="text-center space-y-2">
            <span class="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-2">
               <iconify-icon icon="solar:verified-check-bold" class="text-green-600" width="32"></iconify-icon>
            </span>
            <h2 class="text-2xl font-bold text-gray-900">Vous êtes Premium !</h2>
          </div>

          <div class="bg-gray-50 rounded-lg p-4 text-sm space-y-2 text-gray-700">
            {#if subscriptionStatus.subscription?.status}
              <div class="flex justify-between border-b border-gray-200 pb-2">
                <span>Statut</span>
                <span class="font-bold capitalize">{subscriptionStatus.subscription.status}</span>
              </div>
            {/if}

            {#if subscriptionStatus.subscription?.currentPeriodEnd}
              <div class="flex justify-between pt-1">
                <span>Renouvellement</span>
                <span class="font-medium">
                  {new Date(subscriptionStatus.subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            {/if}
          </div>

          <button
            on:click={handleManageSubscription}
            disabled={actionLoading}
            class="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {#if actionLoading}
              <iconify-icon icon="line-md:loading-loop" width="20"></iconify-icon>
            {:else}
              <iconify-icon icon="solar:settings-bold" width="20"></iconify-icon>
            {/if}
            Gérer mon abonnement
          </button>

        {:else}
          <div class="p-4 bg-indigo-50 rounded-lg">
            <ul class="space-y-2 text-gray-700 text-sm">
              <li class="flex gap-2 items-center"><iconify-icon icon="solar:check-circle-bold" class="text-green-500"></iconify-icon> Accès illimité</li>
              <li class="flex gap-2 items-center"><iconify-icon icon="solar:check-circle-bold" class="text-green-500"></iconify-icon> Support prioritaire</li>
            </ul>
          </div>

          <button
            on:click={handleBecomePremium}
            disabled={actionLoading}
            class="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {#if actionLoading}
              <iconify-icon icon="line-md:loading-loop" width="24"></iconify-icon>
            {:else}
              <iconify-icon icon="solar:star-bold" width="20" class="text-yellow-400"></iconify-icon>
              Devenir Premium
            {/if}
          </button>
        {/if}

        <a href="/" class="block text-center text-gray-500 text-sm hover:text-gray-900 mt-4 flex items-center justify-center gap-1">
          <iconify-icon icon="solar:arrow-left-linear"></iconify-icon> Retour
        </a>
      </div>
    {/if}
  </div>
</main>
