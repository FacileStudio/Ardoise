<script lang="ts">
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import { Badge, Button, Card } from '@facile/muse';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import 'iconify-icon';

  interface PaymentSummary {
    id: string;
    description: string;
    status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | string;
    dueDate: string | Date;
    paidAt?: string | Date;
    createdAt: string | Date;
    amount: number | string;
    receiptUrl?: string | null;
  }

  let payments: PaymentSummary[] = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const result = await trpc.payment.myPayments.query();
      payments = result.payments || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erreur lors du chargement des factures';
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
        return { label: 'En attente', variant: 'warning' as const };
      case 'PAID':
        return { label: 'Payée', variant: 'success' as const };
      case 'EXPIRED':
        return { label: 'Expirée', variant: 'danger' as const };
      case 'CANCELLED':
        return { label: 'Annulée', variant: 'neutral' as const };
      default:
        return { label: status, variant: 'neutral' as const };
    }
  };

  const handlePayNow = (paymentId: string) => {
    goto(resolve(`/app/payment/${paymentId}`));
  };

  $: pendingPayments = Array.isArray(payments) ? payments.filter(p => p.status === 'PENDING') : [];
  $: paidPayments = Array.isArray(payments) ? payments.filter(p => p.status === 'PAID') : [];
  $: otherPayments = Array.isArray(payments) ? payments.filter(p => !['PENDING', 'PAID'].includes(p.status)) : [];
</script>

<div class="flex flex-col gap-6 p-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-foreground">Mes factures</h1>
    <p class="text-sm text-muted-foreground">
      Consultez et payez vos factures en toute simplicité
    </p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-32">
      <iconify-icon icon="svg-spinners:ring-resize" width="24" class="text-muted-foreground"></iconify-icon>
    </div>
  {:else if error}
    <div class="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
      <div class="flex items-center gap-3">
        <iconify-icon icon="solar:danger-circle-linear" width="20"></iconify-icon>
        <span class="text-sm font-medium">{error}</span>
      </div>
    </div>
  {:else if payments.length === 0}
    <div class="flex flex-col items-center justify-center py-16">
      <div class="size-12 rounded-lg border border-border flex items-center justify-center mb-4">
        <iconify-icon icon="solar:document-text-linear" width="24" class="text-muted-foreground"></iconify-icon>
      </div>
      <h3 class="text-lg font-semibold text-foreground mb-1">Aucune facture</h3>
      <p class="text-sm text-muted-foreground max-w-md text-center">
        Vous n'avez aucune facture pour le moment. Elles apparaîtront ici dès qu'elles seront créées.
      </p>
    </div>
  {:else}
    {#if pendingPayments.length > 0}
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-semibold text-foreground">Factures à payer</h2>
          <Badge tone="warning">{pendingPayments.length}</Badge>
        </div>
        <div class="grid grid-cols-1 gap-4">
          {#each pendingPayments as payment (payment.id)}
            <div class="rounded-xl border border-border p-4">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-bold text-foreground">
                      {payment.description}
                    </h3>
                    <Badge tone={getStatusBadge(payment.status).variant}>
                      {getStatusBadge(payment.status).label}
                    </Badge>
                  </div>
                  <p class="text-sm text-muted-foreground">
                    Échéance : {formatDate(payment.dueDate)}
                  </p>
                </div>

                <div class="flex items-center gap-4">
                  <div class="text-xl font-bold text-foreground">
                    {formatAmount(payment.amount)}
                  </div>

                  <button
                    class="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                    onclick={() => handlePayNow(payment.id)}
                  >
                    Payer maintenant
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if paidPayments.length > 0}
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-semibold text-foreground">Factures payées</h2>
          <Badge tone="success">{paidPayments.length}</Badge>
        </div>
        <div class="grid grid-cols-1 gap-3">
          {#each paidPayments as payment (payment.id)}
            <div class="rounded-xl border border-border p-4">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-bold text-foreground">
                      {payment.description}
                    </h3>
                    <Badge tone="success">
                      {getStatusBadge(payment.status).label}
                    </Badge>
                  </div>
                  <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-sm text-muted-foreground">
                    <span>Payée le {formatDate(payment.paidAt)}</span>
                    <span class="hidden md:inline">·</span>
                    <span>Montant : {formatAmount(payment.amount)}</span>
                  </div>
                </div>

                {#if payment.receiptUrl}
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => void window.open(payment.receiptUrl, '_blank')}
                  >
                    <iconify-icon icon="solar:download-linear" width="16"></iconify-icon>
                    Télécharger le reçu
                  </Button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if otherPayments.length > 0}
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-foreground">Autres factures</h2>
        <div class="grid grid-cols-1 gap-3">
          {#each otherPayments as payment (payment.id)}
            <div class="rounded-xl border border-border p-4">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-bold text-foreground">
                      {payment.description}
                    </h3>
                    <Badge tone={getStatusBadge(payment.status).variant}>
                      {getStatusBadge(payment.status).label}
                    </Badge>
                  </div>
                  <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-sm text-muted-foreground">
                    <span>Créée le {formatDate(payment.createdAt)}</span>
                    <span class="hidden md:inline">·</span>
                    <span>Montant : {formatAmount(payment.amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>
