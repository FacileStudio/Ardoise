<script module lang="ts">
  import { formatEuro } from '$lib/mission';

  export type Phase = 'quoted' | 'accepted' | 'invoiced' | 'paid';

  export const AMOUNT = formatEuro(2400);
</script>

<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Badge, Button } from '@facile/muse';
  import { Roll, grow } from '@facile/mise-en-scene';
  import { i18n } from '@repo/i18n/svelte';

  interface Props {
    phase: Phase;
    compact: boolean;
    acceptButton?: HTMLElement;
    invoiceButton?: HTMLElement;
  }

  const QUOTE_NUMBER = ' · DEVIS-2026-014';
  const INVOICE_NUMBER = ' · FAC-2026-031';
  const ORDER: Phase[] = ['quoted', 'accepted', 'invoiced', 'paid'];
  const TONES = { quoted: 'info', accepted: 'info', invoiced: 'warning', paid: 'success' } as const;

  let { phase, compact, acceptButton = $bindable(), invoiceButton = $bindable() }: Props = $props();

  const t = $derived($i18n.t);
  const reached = (step: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(step);
</script>

<div class="qd-body" class:qd-compact={compact}>
  <div class="qd-head">
    <div class="min-w-0">
      <div class="qd-title">{t('landing.demo.mission')}</div>
      <div class="qd-sub">{t('landing.demo.client')}</div>
    </div>
    <Badge tone={TONES[phase]}><Roll value={t(`landing.demo.status.${phase}`)} /></Badge>
  </div>

  <section class="qd-section">
    <div class="qd-section-head">
      <span class="qd-section-title">{t('landing.demo.quotes')}</span>
      {#if !compact && !reached('accepted')}
        <span bind:this={acceptButton} out:fade={{ duration: 150 }}>
          <Button variant="ghost" size="sm">{t('landing.demo.accept')}</Button>
        </span>
      {/if}
    </div>
    <div class="qd-card">
      <div class="qd-row">
        <div class="min-w-0">
          <div class="qd-row-title">
            {t('landing.demo.quote')}<span class="qd-muted">{QUOTE_NUMBER}</span>
          </div>
          <div class="qd-row-meta">{AMOUNT}</div>
        </div>
        <Badge tone={reached('accepted') ? 'success' : 'info'}>
          <Roll
            value={t(`landing.demo.quoteState.${reached('accepted') ? 'accepted' : 'pending'}`)}
          />
        </Badge>
      </div>
      {#if compact && !reached('accepted')}
        <span class="self-start" bind:this={acceptButton} out:fade={{ duration: 150 }}>
          <Button variant="ghost" size="sm">{t('landing.demo.accept')}</Button>
        </span>
      {/if}
    </div>
  </section>

  <section class="qd-section">
    <div class="qd-section-head">
      <span class="qd-section-title">{t('landing.demo.invoices')}</span>
      <span bind:this={invoiceButton}>
        <Button size="sm" disabled={!reached('accepted') || reached('invoiced')}>
          {t('landing.demo.invoiceTotal')}
        </Button>
      </span>
    </div>
    <div class="qd-card">
      {#if reached('invoiced')}
        <div class="qd-grow" in:grow out:fade={{ duration: 200 }}>
          <div class="qd-row qd-row-stack">
            <div class="qd-row-title">
              {t('landing.demo.invoice')}<span class="qd-muted">{INVOICE_NUMBER}</span>
            </div>
            <div class="qd-row-meta">{AMOUNT} · {t('landing.demo.due')}</div>
            <div class="qd-pay">
              <span>{AMOUNT}</span>
              <Badge tone={reached('paid') ? 'success' : 'warning'}>
                <Roll value={t(`landing.demo.payment.${reached('paid') ? 'paid' : 'pending'}`)} />
              </Badge>
            </div>
            <div class="qd-vat">{t('landing.demo.vat')}</div>
          </div>
        </div>
      {:else}
        <p class="qd-empty">{t('landing.demo.noInvoice')}</p>
      {/if}
    </div>
  </section>
</div>

<style>
  .qd-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 22px;
    min-height: 0;
    padding: 14px 32px 24px;
    font-family: var(--font-fc-body);
    color: var(--color-fc-fg);
  }
  .qd-compact {
    gap: 18px;
    padding: 10px 16px 16px;
  }
  .qd-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .qd-title {
    font-family: var(--font-fc-title);
    font-size: var(--text-fc-xl);
    font-weight: 700;
    line-height: 1.2;
  }
  .qd-compact .qd-title {
    font-size: var(--text-fc-lg);
  }
  .qd-sub,
  .qd-muted,
  .qd-row-meta,
  .qd-vat {
    color: var(--color-fc-fg-muted);
    font-weight: 400;
  }
  .qd-sub {
    margin-top: 2px;
    font-size: var(--text-fc-sm);
  }
  .qd-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .qd-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 32px;
  }
  .qd-section-title {
    font-size: var(--text-fc-md);
    font-weight: 700;
    white-space: nowrap;
  }
  .qd-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: var(--radius-fc-md);
    background: color-mix(in oklab, var(--color-fc-fg) 3%, transparent);
  }
  .qd-grow {
    padding-bottom: 0;
  }
  .qd-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border-radius: var(--radius-fc-md);
    background: color-mix(in oklab, var(--color-fc-fg) 5%, transparent);
  }
  .qd-row-stack {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
  .qd-row-title {
    font-size: var(--text-fc-sm);
    font-weight: 700;
    white-space: nowrap;
  }
  .qd-row-meta,
  .qd-vat {
    font-size: var(--text-fc-xs);
    white-space: nowrap;
  }
  .qd-pay {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: var(--text-fc-xs);
    font-variant-numeric: tabular-nums;
  }
  .qd-empty {
    margin: 0;
    padding: 4px;
    font-size: var(--text-fc-sm);
    color: var(--color-fc-fg-muted);
  }
</style>
