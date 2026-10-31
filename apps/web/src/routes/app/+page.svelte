<script lang="ts">
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import {
    Alert,
    Badge,
    Button,
    Card,
    EmptyState,
    Page,
    PageHeader,
    Section,
    Spinner,
  } from '@facile/muse';
  import { resolve } from '$app/paths';
  import { ardoise, icons } from '$lib/icons';

  interface PaymentSummary {
    id: string;
    description: string;
    status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | string;
    dueDate: string | Date;
    paidAt: string | null;
    createdAt: string | Date;
    amount: number | string;
    receiptUrl: string | null;
  }

  let payments = $state<PaymentSummary[]>([]);
  let loading = $state(true);
  let error = $state('');

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

  const pendingPayments = $derived(payments.filter((p) => p.status === 'PENDING'));
  const paidPayments = $derived(payments.filter((p) => p.status === 'PAID'));
  const otherPayments = $derived(payments.filter((p) => !['PENDING', 'PAID'].includes(p.status)));
</script>

<svelte:head>
  <title>Mes factures - Ardoise</title>
</svelte:head>

<Page width="lg">
  <PageHeader
    title="Mes factures"
    description="Consultez et payez vos factures en toute simplicité"
  />

  {#if loading}
    <div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
  {:else if error}
    <Alert tone="danger">{error}</Alert>
  {:else if payments.length === 0}
    <EmptyState
      icon={ardoise.invoice}
      title="Aucune facture"
      description="Vous n'avez aucune facture pour le moment. Elles apparaîtront ici dès qu'elles seront créées."
    />
  {:else}
    {#if pendingPayments.length > 0}
      <Section title="Factures à payer">
        {#snippet actions()}
          <Badge tone="warning">{pendingPayments.length}</Badge>
        {/snippet}
        <div class="flex flex-col gap-3">
          {#each pendingPayments as payment (payment.id)}
            <Card class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div class="flex min-w-0 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-fc-md font-semibold text-fc-fg">{payment.description}</h3>
                  <Badge tone={getStatusBadge(payment.status).variant}>
                    {getStatusBadge(payment.status).label}
                  </Badge>
                </div>
                <p class="text-fc-sm text-fc-fg-muted">Échéance : {formatDate(payment.dueDate)}</p>
              </div>
              <div class="flex items-center justify-between gap-4 md:justify-end">
                <span class="text-fc-xl font-semibold text-fc-fg">{formatAmount(payment.amount)}</span>
                <Button href={resolve(`/app/payment/${payment.id}`)}>Payer maintenant</Button>
              </div>
            </Card>
          {/each}
        </div>
      </Section>
    {/if}

    {#if paidPayments.length > 0}
      <Section title="Factures payées">
        {#snippet actions()}
          <Badge tone="success">{paidPayments.length}</Badge>
        {/snippet}
        <div class="flex flex-col gap-3">
          {#each paidPayments as payment (payment.id)}
            <Card class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div class="flex min-w-0 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-fc-md font-semibold text-fc-fg">{payment.description}</h3>
                  <Badge tone="success">{getStatusBadge(payment.status).label}</Badge>
                </div>
                <p class="text-fc-sm text-fc-fg-muted">
                  Payée le {payment.paidAt ? formatDate(payment.paidAt) : '-'} · {formatAmount(payment.amount)}
                </p>
              </div>
              {#if payment.receiptUrl}
                {@const receiptUrl = payment.receiptUrl}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={icons.download}
                  onclick={() => void window.open(receiptUrl, '_blank')}
                >
                  Télécharger le reçu
                </Button>
              {/if}
            </Card>
          {/each}
        </div>
      </Section>
    {/if}

    {#if otherPayments.length > 0}
      <Section title="Autres factures">
        <div class="flex flex-col gap-3">
          {#each otherPayments as payment (payment.id)}
            <Card class="flex flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-fc-md font-semibold text-fc-fg">{payment.description}</h3>
                <Badge tone={getStatusBadge(payment.status).variant}>
                  {getStatusBadge(payment.status).label}
                </Badge>
              </div>
              <p class="text-fc-sm text-fc-fg-muted">
                Créée le {formatDate(payment.createdAt)} · {formatAmount(payment.amount)}
              </p>
            </Card>
          {/each}
        </div>
      </Section>
    {/if}
  {/if}
</Page>
