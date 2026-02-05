<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import confetti from 'canvas-confetti';

  let pageLoading = true;
  let actionLoading = false;
  let subscriptionStatus  = null;
  let error = '';

  onMount(async () => {
    if (!browser) return;

    try {
      subscriptionStatus = await trpc.stripe.getSubscription.query();

      if (subscriptionStatus?.isPremium) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#10b981', '#fbbf24']
        });
      }
    } catch (err: any) {
      error = 'Impossible de vérifier votre nouvel abonnement.';
    } finally {
      pageLoading = false;
    }
  });

  async function handleManageSubscription() {
    if (!browser) return;
    actionLoading = true;
    error = '';
    try {
      const result = await trpc.stripe.createPortalSession.mutate();
      if (result.url) {
        window.location.href = result.url;
      } else {
        error = 'Error accessing customer portal.';
        actionLoading = false;
      }
    } catch (err: any) {
      error = err.message || 'Unable to manage subscription.';
      actionLoading = false;
    }
  }
</script>

<main class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900">Félicitations !</h1>
      <p class="mt-2 text-gray-600">Votre accès Premium est maintenant activé.</p>
    </div>

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <iconify-icon icon="solar:shield-warning-bold" class="text-red-600" width="24"></iconify-icon>
        <p class="text-red-600 text-sm font-medium">{error}</p>
      </div>
    {/if}

    {#if pageLoading}
      <div class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p class="mt-2 text-gray-500 text-sm">Mise à jour de votre compte...</p>
      </div>
    {:else if subscriptionStatus}
      <div class="bg-white rounded-xl shadow-lg p-8 space-y-6 border border-gray-100">

        <div class="text-center space-y-2">
          <span class="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-2">
             <iconify-icon icon="solar:verified-check-bold" class="text-green-600" width="32"></iconify-icon>
          </span>
          <h2 class="text-2xl font-bold text-gray-900">Abonnement Confirmé</h2>
        </div>

        <div class="bg-gray-50 rounded-lg p-4 text-sm space-y-2 text-gray-700">
          <div class="flex justify-between border-b border-gray-200 pb-2">
            <span>Statut</span>
            <span class="font-bold text-green-600 capitalize">Actif</span>
          </div>

          {#if subscriptionStatus.subscription?.currentPeriodEnd}
            <div class="flex justify-between pt-1">
              <span>Prochaine facturation</span>
              <span class="font-medium">
                {new Date(subscriptionStatus.subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          {/if}
        </div>

        <div class="space-y-3">
          <a
            href="/"
            class="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition flex items-center justify-center gap-2 font-medium"
          >
            Accéder au Dashboard
          </a>

          <button
            on:click={handleManageSubscription}
            disabled={actionLoading}
            class="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {#if actionLoading}
              <iconify-icon icon="line-md:loading-loop" width="20"></iconify-icon>
            {:else}
              <iconify-icon icon="solar:settings-bold" width="20"></iconify-icon>
            {/if}
            Gérer mon abonnement
          </button>
        </div>
      </div>
    {/if}
  </div>
</main>
