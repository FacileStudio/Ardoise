<script lang="ts">
  import { i18n } from '@repo/i18n/svelte';
  import type { RevenueOverview, ForecastSource } from '@repo/trpc';
  import { isZero } from '$lib/revenue';

  let {
    source,
    totals,
    euro,
    month,
  }: {
    source: ForecastSource;
    totals: RevenueOverview['forecast']['sources'][ForecastSource];
    euro: (amount: string | number) => string;
    month: (month: string) => string;
  } = $props();

  const rows = $derived([
    ...totals.months
      .filter((row) => !isZero(row.amount))
      .map((row) => ({ key: row.month, label: month(row.month), amount: row.amount })),
    ...(isZero(totals.undated)
      ? []
      : [{ key: 'undated', label: $i18n.t('revenue.forecast.undated'), amount: totals.undated }]),
    ...(isZero(totals.later)
      ? []
      : [{ key: 'later', label: $i18n.t('revenue.forecast.later'), amount: totals.later }]),
  ]);
</script>

<div class="flex flex-col gap-3 rounded-fc-md bg-fc-component p-4">
  <div class="flex flex-col gap-1">
    <span class="text-fc-sm font-medium text-fc-fg">
      {$i18n.t(`revenue.forecast.sources.${source}.label`)}
    </span>
    <span class="text-fc-xs text-fc-fg-muted">
      {$i18n.t(`revenue.forecast.sources.${source}.description`)}
    </span>
  </div>
  <dl class="flex flex-col gap-1 text-fc-xs">
    {#each rows as row (row.key)}
      <div class="flex justify-between gap-4">
        <dt class="text-fc-fg-muted">{row.label}</dt>
        <dd class="text-fc-fg">{euro(row.amount)}</dd>
      </div>
    {/each}
    <div
      class="flex justify-between gap-4 rounded-fc-md bg-fc-surface px-3 py-2 text-fc-sm font-semibold"
    >
      <dt class="text-fc-fg">{$i18n.t('revenue.forecast.sourceTotal')}</dt>
      <dd class="text-fc-fg">{euro(totals.total)}</dd>
    </div>
  </dl>
</div>
