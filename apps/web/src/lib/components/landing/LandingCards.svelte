<script lang="ts">
  import { Badge, Button, Icon, LANDING_HEADING } from '@facile/muse';
  import { i18n } from '@repo/i18n/svelte';
  import { ardoise } from '$lib/icons';

  const t = $derived($i18n.t);
</script>

<section class="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6" aria-labelledby="cards-title">
  <h2 id="cards-title" class={LANDING_HEADING}>{t('landing.cards.title')}</h2>
  <ul class="mt-8 grid gap-4 md:grid-cols-3">
    <li class="flex flex-col rounded-fc-lg bg-fc-component p-5">
      <div class="lc-visual" aria-hidden="true">
        <div class="text-fc-sm font-bold">
          {t('landing.demo.invoice')}
          <span class="font-normal text-fc-fg-muted">· FAC-2026-031</span>
        </div>
        <div class="text-fc-xs text-fc-fg-muted">{t('landing.cards.vat.seller')}</div>
        <div class="lc-mention">{t('landing.demo.vat')}</div>
      </div>
      <h3 class="mt-5 text-fc-lg font-bold">{t('landing.cards.vat.title')}</h3>
      <p class="mt-1.5 text-fc-sm text-fc-fg-muted">{t('landing.cards.vat.body')}</p>
    </li>
    <li class="flex flex-col rounded-fc-lg bg-fc-component p-5">
      <div class="lc-visual" aria-hidden="true">
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-fc-sm font-bold">{t('landing.demo.quote')}</span>
          <Badge tone="success">{t('landing.demo.quoteState.accepted')}</Badge>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" tabindex={-1}
            >{t('landing.cards.deposit.deposit')}</Button
          >
          <Button size="sm" tabindex={-1}>{t('landing.cards.deposit.total')}</Button>
        </div>
        <div class="text-fc-xs text-fc-fg-muted">{t('landing.cards.deposit.share')}</div>
      </div>
      <h3 class="mt-5 text-fc-lg font-bold">{t('landing.cards.deposit.title')}</h3>
      <p class="mt-1.5 text-fc-sm text-fc-fg-muted">{t('landing.cards.deposit.body')}</p>
    </li>
    <li class="flex flex-col rounded-fc-lg bg-fc-component p-5">
      <div class="lc-visual" aria-hidden="true">
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-fc-sm font-bold">{t('landing.cards.sign.doc')}</span>
          <Badge tone="success">{t('landing.cards.sign.signed')}</Badge>
        </div>
        <div class="flex items-center gap-2 text-fc-xs text-fc-fg-muted">
          <Icon icon={ardoise.plume} size={18} />
          <span>Plume</span>
          <Icon icon="solar:arrow-right-linear" size={14} />
          <Icon icon={ardoise.nuage} size={18} />
          <span>Nuage</span>
        </div>
      </div>
      <h3 class="mt-5 text-fc-lg font-bold">{t('landing.cards.sign.title')}</h3>
      <p class="mt-1.5 text-fc-sm text-fc-fg-muted">{t('landing.cards.sign.body')}</p>
    </li>
  </ul>
</section>

<style>
  .lc-visual {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    height: 132px;
    padding: 16px;
    border-radius: var(--radius-fc-md);
    background: var(--color-fc-surface);
    color: var(--color-fc-fg);
    font-family: var(--font-fc-body);
  }
  .lc-mention {
    align-self: flex-start;
    padding: 4px 10px;
    border-radius: var(--radius-fc-pill);
    background: color-mix(in oklab, var(--color-fc-success) 14%, transparent);
    font-size: var(--text-fc-xs);
    font-weight: 700;
  }
</style>
