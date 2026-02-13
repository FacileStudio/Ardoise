<script lang="ts">
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import { Badge, Card, Button, Spinner } from '@repo/ui';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { fade, fly } from 'svelte/transition';
  import 'iconify-icon';

  let payments: any[] = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const result = await trpc.payment.myPayments.query();
      payments = result.payments || [];
    } catch (err: any) {
      error = err.message || 'Erreur lors du chargement des factures';
    } finally {
      loading = false;
    }
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
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
  };

  const handlePayNow = (paymentId: string) => {
    goto(resolve(`/app/payment/${paymentId}`));
  };

  $: pendingPayments = Array.isArray(payments) ? payments.filter(p => p.status === 'PENDING') : [];
  $: paidPayments = Array.isArray(payments) ? payments.filter(p => p.status === 'PAID') : [];
  $: otherPayments = Array.isArray(payments) ? payments.filter(p => !['PENDING', 'PAID'].includes(p.status)) : [];
</script>

<div class="min-h-screen bg-[#FAF7F5] p-8">
  <div class="max-w-7xl mx-auto">
    <div class="mb-8" in:fade>
      <h1 class="text-4xl font-black tracking-tight text-[#291334] mb-2 flex items-center gap-3">
        <iconify-icon icon="solar:document-text-bold" width="40" class="text-[#291334]"></iconify-icon>
        Mes factures
      </h1>
      <p class="text-[#291334]/60 font-bold">
        Consultez et payez vos factures en toute simplicité
      </p>
    </div>

    {#if loading}
      <div class="flex flex-col items-center justify-center h-[80vh] space-y-6">
        <iconify-icon icon="svg-spinners:blocks-shuffle-3" width="48" class="text-[#291334]"></iconify-icon>
        <p class="text-xs font-black uppercase tracking-[0.3em] text-[#291334]/40">
          Chargement...
        </p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
        <div class="flex items-center gap-3">
          <iconify-icon icon="solar:danger-circle-bold" width="24"></iconify-icon>
          <span class="font-bold">{error}</span>
        </div>
      </div>
    {:else if payments.length === 0}
      <div class="text-center py-16" in:fade>
        <div class="flex flex-col items-center gap-4">
          <div class="w-20 h-20 bg-[#FEC129]/20 text-[#291334] rounded-2xl flex items-center justify-center">
            <iconify-icon icon="solar:document-text-bold" width="40"></iconify-icon>
          </div>
          <h3 class="text-2xl font-black text-[#291334]">Aucune facture</h3>
          <p class="text-[#291334]/60 max-w-md font-bold">
            Vous n'avez aucune facture pour le moment. Elles apparaîtront ici dès qu'elles seront créées.
          </p>
        </div>
      </div>
    {:else}
      {#if pendingPayments.length > 0}
        <div class="mb-12" in:fly={{ y: 20, delay: 100 }}>
          <div class="flex items-center gap-3 mb-6">
            <iconify-icon icon="solar:clock-circle-bold" width="28" class="text-[#FEC129]"></iconify-icon>
            <h2 class="text-2xl font-black tracking-tight text-[#291334]">
              Factures à payer
            </h2>
            <Badge variant="amber">{pendingPayments.length}</Badge>
          </div>
          <div class="grid grid-cols-1 gap-6">
            {#each pendingPayments as payment}
              <Card class="border-2 border-[#FEC129]/30 hover:border-[#FEC129] transition-all group" in:fly={{ y: 20, delay: 200 }}>
                <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="font-black text-lg text-[#291334]">
                        {payment.description}
                      </h3>
                      <Badge variant={getStatusBadge(payment.status).variant}>
                        {getStatusBadge(payment.status).label}
                      </Badge>
                    </div>
                    <p class="text-sm text-[#291334]/60">
                      Échéance : {formatDate(payment.dueDate)}
                    </p>
                  </div>

                  <div class="flex items-center gap-6">
                    <div class="text-3xl font-black text-[#291334]">
                      {formatAmount(payment.amount)}
                    </div>

                    <Button
                      variant="primary"
                      class="bg-[#291334] hover:bg-[#291334]/90 text-[#FAF7F5] whitespace-nowrap"
                      on:click={() => handlePayNow(payment.id)}
                    >
                      <iconify-icon icon="solar:card-bold" width="20"></iconify-icon>
                      Payer maintenant
                    </Button>
                  </div>
                </div>
              </Card>
            {/each}
          </div>
        </div>
      {/if}

      {#if paidPayments.length > 0}
        <div class="mb-12" in:fly={{ y: 20, delay: 300 }}>
          <div class="flex items-center gap-3 mb-6">
            <iconify-icon icon="solar:check-circle-bold" width="28" class="text-green-500"></iconify-icon>
            <h2 class="text-2xl font-black tracking-tight text-[#291334]">
              Factures payées
            </h2>
            <Badge variant="emerald">{paidPayments.length}</Badge>
          </div>
          <div class="grid grid-cols-1 gap-4">
            {#each paidPayments as payment}
              <Card class="border border-[#291334]/10 hover:border-[#291334]/30 transition-all" in:fly={{ y: 20, delay: 400 }}>
                <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="font-black text-lg text-[#291334]">
                        {payment.description}
                      </h3>
                      <Badge variant="success">
                        {getStatusBadge(payment.status).label}
                      </Badge>
                    </div>
                    <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-sm text-[#291334]/60">
                      <span>Payée le {formatDate(payment.paidAt)}</span>
                      <span class="hidden md:inline">•</span>
                      <span>Montant : {formatAmount(payment.amount)}</span>
                    </div>
                  </div>

                  {#if payment.receiptUrl}
                    <Button
                      variant="outline"
                      size="sm"
                      on:click={() => window.open(payment.receiptUrl, '_blank')}
                    >
                      <iconify-icon icon="solar:download-bold" width="18"></iconify-icon>
                      Télécharger le reçu
                    </Button>
                  {/if}
                </div>
              </Card>
            {/each}
          </div>
        </div>
      {/if}

      {#if otherPayments.length > 0}
        <div in:fly={{ y: 20, delay: 500 }}>
          <div class="flex items-center gap-3 mb-6">
            <iconify-icon icon="solar:archive-bold" width="28" class="text-[#291334]/40"></iconify-icon>
            <h2 class="text-2xl font-black tracking-tight text-[#291334]">
              Autres factures
            </h2>
          </div>
          <div class="grid grid-cols-1 gap-4">
            {#each otherPayments as payment}
              <Card class="border border-[#291334]/10" in:fly={{ y: 20, delay: 600 }}>
                <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="font-black text-lg text-[#291334]">
                        {payment.description}
                      </h3>
                      <Badge variant={getStatusBadge(payment.status).variant}>
                        {getStatusBadge(payment.status).label}
                      </Badge>
                    </div>
                    <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-sm text-[#291334]/60">
                      <span>Créée le {formatDate(payment.createdAt)}</span>
                      <span class="hidden md:inline">•</span>
                      <span>Montant : {formatAmount(payment.amount)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
