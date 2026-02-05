<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import env  from '$lib/env';
  import { Button, Spinner, Card, Alert } from '@repo/ui';
  import { toast } from '@repo/utils';
  import 'iconify-icon';

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
      toast.push('Impossible de charger le statut de l\'abonnement.', 'error');
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
        error = 'Error creating payment session.';
        toast.push('Error creating payment session.', 'error');
        actionLoading = false;
      }
    } catch (err: any) {
      error = err.message || 'Failed to initialize Premium.';
      toast.push(err.message || 'Failed to initialize Premium.', 'error');
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
        error = 'Error accessing customer portal.';
        toast.push('Error accessing customer portal.', 'error');
        actionLoading = false;
      }
    } catch (err: any) {
      error = err.message || 'Unable to manage subscription.';
      toast.push(err.message || 'Unable to manage subscription.', 'error');
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
      <Alert variant="warning">
        Le paiement n'a pas été finalisé.
      </Alert>
    {/if}

    {#if pageLoading}
      <div class="text-center py-12">
        <Spinner size="lg" />
        <p class="mt-2 text-gray-500 text-sm">Vérification de votre statut...</p>
      </div>
    {:else if subscriptionStatus}
      <Card padding="lg" rounded="xl" shadow="lg" class="space-y-6">

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

          <Button
            onclick={handleManageSubscription}
            disabled={actionLoading}
            class="w-full"
          >
            {#if actionLoading}
              <iconify-icon icon="line-md:loading-loop" width="20"></iconify-icon>
            {:else}
              <iconify-icon icon="solar:settings-bold" width="20"></iconify-icon>
            {/if}
            Gérer mon abonnement
          </Button>

        {:else}
          <div class="p-4 bg-indigo-50 rounded-lg">
            <ul class="space-y-2 text-gray-700 text-sm">
              <li class="flex gap-2 items-center"><iconify-icon icon="solar:check-circle-bold" class="text-green-500"></iconify-icon> Accès illimité</li>
              <li class="flex gap-2 items-center"><iconify-icon icon="solar:check-circle-bold" class="text-green-500"></iconify-icon> Support prioritaire</li>
            </ul>
          </div>

          <Button
            onclick={handleBecomePremium}
            disabled={actionLoading}
            class="w-full"
          >
            {#if actionLoading}
              <iconify-icon icon="line-md:loading-loop" width="24"></iconify-icon>
            {:else}
              <iconify-icon icon="solar:star-bold" width="20" class="text-yellow-400"></iconify-icon>
              Devenir Premium
            {/if}
          </Button>
        {/if}

        <a href="/" class="block text-center text-gray-500 text-sm hover:text-gray-900 mt-4 flex items-center justify-center gap-1">
          <iconify-icon icon="solar:arrow-left-linear"></iconify-icon> Retour
        </a>
      </Card>
    {/if}
  </div>
</main>
