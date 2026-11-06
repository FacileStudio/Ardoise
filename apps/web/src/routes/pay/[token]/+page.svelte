<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { Alert, EmptyState, Page, PageHeader, Spinner } from '@facile/muse';
  import { i18n } from '@repo/i18n/svelte';
  import { trpc } from '$lib/trpc';
  import { icons } from '$lib/icons';
  import { redirectToHosted, type Declaration, type PayerView } from '$lib/payments';
  import PaymentCard from '$lib/components/PaymentCard.svelte';

  const token = $derived(page.params.token ?? '');

  let view = $state<PayerView | null>(null);
  let loading = $state(true);
  let invalid = $state(false);
  let sent = $state(false);
  const returned = $derived(page.url.searchParams.get('paid') === '1');

  async function load() {
    try {
      view = (await trpc.payLink.get.mutate({ token })) as PayerView;
    } catch {
      invalid = true;
    } finally {
      loading = false;
    }
  }

  onMount(load);

  const pay = () => redirectToHosted(() => trpc.payLink.checkout.mutate({ token }));

  async function declare(declaration: Declaration) {
    await trpc.payLink.declare.mutate({ token, declaration });
    sent = true;
    await load();
  }
</script>

<svelte:head>
  <title>{$i18n.t('pay.title')}</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="referrer" content="no-referrer" />
</svelte:head>

<Page width="md">
  {#if loading}
    <div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
  {:else if invalid || !view}
    <EmptyState icon={icons.warning} title={$i18n.t('pay.invalidTitle')} description={$i18n.t('pay.invalid')} />
  {:else}
    <PageHeader title={$i18n.t('pay.title')} description={view.issuer ?? ''} />
    {#if returned}
      <Alert tone="info" title={$i18n.t('pay.returnedTitle')}>{$i18n.t('pay.returned')}</Alert>
    {/if}
    {#if sent}
      <Alert tone="success">{$i18n.t('pay.declare.sent')}</Alert>
    {/if}
    {#if view.status === 'PAID'}
      <Alert tone="success" title={$i18n.t('pay.paidTitle')}>{$i18n.t('pay.paid')}</Alert>
    {/if}
    <PaymentCard {view} onpay={pay} ondeclare={declare} />
  {/if}
</Page>
