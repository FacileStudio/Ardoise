<script lang="ts">
  import { Alert, Badge, Button, Card, Field, Input, Select } from '@facile/muse';
  import { i18n, locale } from '@repo/i18n/svelte';
  import { icons } from '$lib/icons';
  import type { Declaration, PayerView } from '$lib/payments';

  interface Props {
    view: PayerView;
    onpay: () => Promise<void>;
    ondeclare: (declaration: Declaration) => Promise<void>;
    onmanage?: () => Promise<void>;
  }

  let { view, onpay, ondeclare, onmanage }: Props = $props();

  let busy = $state('');
  let error = $state('');
  let showDeclare = $state(false);
  let method = $state<Declaration['method']>('TRANSFER');
  let reference = $state('');
  let paidOn = $state('');

  const money = $derived(
    new Intl.NumberFormat($locale, { style: 'currency', currency: view.currency }).format(view.amount)
  );
  const date = (value: string) =>
    new Date(value).toLocaleDateString($locale, { year: 'numeric', month: 'long', day: 'numeric' });
  const tone = $derived(
    view.status === 'PAID'
      ? 'success'
      : ['PAST_DUE', 'FAILED', 'EXPIRED'].includes(view.status)
        ? 'danger'
        : view.status === 'CANCELLED'
          ? 'neutral'
          : 'warning'
  );
  const statusLabel = $derived($i18n.t(`pay.status.${view.status}`));

  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    busy = key;
    error = '';
    try {
      await action();
    } catch (err) {
      error = err instanceof Error ? err.message : $i18n.t('pay.error');
    } finally {
      busy = '';
    }
  }

  const submitDeclaration = () =>
    run('declare', async () => {
      await ondeclare({
        method,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(paidOn ? { paidOn } : {}),
      });
      showDeclare = false;
    });
</script>

<Card class="flex flex-col gap-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div class="flex min-w-0 flex-col gap-1">
      <h3 class="text-fc-md font-semibold text-fc-fg">{view.description}</h3>
      <p class="text-fc-sm text-fc-fg-muted">
        {$i18n.t('pay.reference')} <span class="font-fc-mono">{view.reference}</span>
        {#if view.issuer}
          · {$i18n.t('pay.issuedBy', { name: view.issuer })}
        {/if}
      </p>
      <p class="text-fc-sm text-fc-fg-muted">
        {#if view.frequency !== 'ONE_TIME'}
          {$i18n.t(`pay.frequency.${view.frequency}`)}
        {:else}
          {$i18n.t('portal.dueOn', { date: date(view.dueDate) })}
        {/if}
      </p>
    </div>
    <div class="flex flex-col items-end gap-2">
      <span class="text-fc-xl font-semibold text-fc-fg">{money}</span>
      <Badge {tone}>{statusLabel}</Badge>
    </div>
  </div>

  {#if view.status === 'PROCESSING'}
    <Alert tone="info">{$i18n.t('pay.processing')}</Alert>
  {:else if view.status === 'AWAITING_CONFIRMATION'}
    <Alert tone="info" title={$i18n.t('pay.awaitingTitle')}>
      {$i18n.t('pay.awaiting')}
      {#if view.declared?.reference}
        ({view.declared.reference})
      {/if}
    </Alert>
  {/if}

  {#if error}
    <Alert tone="danger">{error}</Alert>
  {/if}

  <div class="flex flex-wrap items-center gap-2">
    {#if view.canPayOnline}
      <Button icon={icons.shield} disabled={!!busy} onclick={() => run('pay', onpay)}>
        {busy === 'pay' ? $i18n.t('pay.opening') : $i18n.t('pay.payOnline', { amount: money })}
      </Button>
    {/if}
    {#if view.canManage && onmanage}
      <Button variant="ghost" icon={icons.settings} disabled={!!busy} onclick={() => run('manage', onmanage)}>
        {busy === 'manage' ? $i18n.t('pay.opening') : $i18n.t('pay.manage')}
      </Button>
    {/if}
    {#if view.canDeclare}
      <Button variant="ghost" disabled={!!busy} onclick={() => (showDeclare = !showDeclare)}>
        {$i18n.t('pay.otherWay')}
      </Button>
    {/if}
  </div>

  {#if view.canPayOnline}
    <p class="text-fc-xs text-fc-fg-muted">{$i18n.t('pay.secure')}</p>
  {/if}

  {#if showDeclare && view.canDeclare}
    <div class="flex flex-col gap-4 rounded-fc-md bg-fc-surface p-4">
      {#if view.bank}
        <div class="flex flex-col gap-1 text-fc-sm">
          <p class="font-medium text-fc-fg">{$i18n.t('pay.bankTitle')}</p>
          {#if view.bank.bankName}
            <p class="text-fc-fg-muted">{view.bank.bankName}</p>
          {/if}
          <p class="font-fc-mono text-fc-fg">IBAN {view.bank.iban}</p>
          {#if view.bank.bic}
            <p class="font-fc-mono text-fc-fg">BIC {view.bank.bic}</p>
          {/if}
          <p class="text-fc-fg-muted">
            {$i18n.t('pay.useReference')} <span class="font-fc-mono text-fc-fg">{view.reference}</span>
          </p>
        </div>
      {/if}
      <Field label={$i18n.t('pay.declare.method')}>
        <Select bind:value={method}>
          <option value="TRANSFER">{$i18n.t('pay.declare.TRANSFER')}</option>
          <option value="CHEQUE">{$i18n.t('pay.declare.CHEQUE')}</option>
          <option value="OTHER">{$i18n.t('pay.declare.OTHER')}</option>
        </Select>
      </Field>
      <Field label={$i18n.t('pay.declare.reference')}>
        <Input bind:value={reference} maxlength={120} />
      </Field>
      <Field label={$i18n.t('pay.declare.paidOn')}>
        <Input type="date" bind:value={paidOn} max={new Date().toISOString().slice(0, 10)} />
      </Field>
      <div>
        <Button disabled={!!busy} onclick={submitDeclaration}>
          {$i18n.t('pay.declare.submit')}
        </Button>
      </div>
    </div>
  {/if}
</Card>
