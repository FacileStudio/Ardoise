<script lang="ts">
  import { onMount } from 'svelte';
  import {
    BarChart,
    Button,
    EmptyState,
    Page,
    PageHeader,
    Section,
    Spinner,
    StatCard,
  } from '@facile/muse';
  import { i18n, locale } from '@repo/i18n/svelte';
  import { logger } from '@repo/logger';
  import type { RevenueOverview } from '@repo/trpc';
  import { trpc } from '$lib/trpc';
  import { spaceFilter } from '$lib/space-filter.svelte';
  import { SpaceFilter } from '$lib/ui';
  import OpenPayments from '$lib/components/revenue/OpenPayments.svelte';
  import ForecastSource from '$lib/components/revenue/ForecastSource.svelte';
  import {
    FORECAST_ORDER,
    dayFormatter,
    euroFormatter,
    isZero,
    monthFormatter,
  } from '$lib/revenue';

  let overview = $state<RevenueOverview | null>(null);
  let failed = $state(false);
  let loading = $state(true);

  const euro = $derived(euroFormatter($locale));
  const month = $derived(monthFormatter($locale));
  const day = $derived(dayFormatter($locale));

  async function load() {
    loading = true;
    failed = false;
    try {
      overview = await trpc.revenue.overview.query({ spaceId: spaceFilter.spaceId });
    } catch (err) {
      logger.error({ err }, 'Failed to load revenue');
      failed = true;
    } finally {
      loading = false;
    }
  }

  onMount(load);

  const collectedTotal = $derived(
    overview ? overview.collected.months.reduce((sum, row) => sum + Number(row.amount), 0) : 0
  );

  const collectedChart = $derived(
    overview
      ? {
          labels: overview.collected.months.map((row) => month(row.month)),
          series: [
            {
              name: $i18n.t('revenue.collected.series'),
              data: overview.collected.months.map((row) => Number(row.amount)),
            },
          ],
        }
      : null
  );

  const forecastChart = $derived(
    overview
      ? {
          labels: overview.forecast.months.map(month),
          series: FORECAST_ORDER.map((source) => ({
            name: $i18n.t(`revenue.forecast.sources.${source}.label`),
            data: overview!.forecast.sources[source].months.map((row) => Number(row.amount)),
          })),
        }
      : null
  );

  const overdueDelta = $derived.by(() => {
    if (!overview) return '';
    const { overdue, overdueInvoices } = overview.toCollect;
    const count = $i18n.t('revenue.toCollect.count', { count: overdue.count });
    if (overdueInvoices.count === 0) return count;
    const invoices = $i18n.t('revenue.toCollect.ofInvoices', {
      amount: euro(overdueInvoices.amount),
    });
    return `${count}, ${invoices}`;
  });

  const hasForecast = $derived(overview ? !isZero(overview.forecast.total) : false);
</script>

<svelte:head><title>{$i18n.t('revenue.title')} - Ardoise</title></svelte:head>

<Page width="xl">
  <PageHeader title={$i18n.t('revenue.title')} description={$i18n.t('revenue.subtitle')}>
    {#snippet actions()}
      <SpaceFilter />
    {/snippet}
  </PageHeader>

  {#if loading && !overview}
    <div class="flex min-h-[40dvh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  {:else if failed || !overview}
    <EmptyState title={$i18n.t('revenue.loadFailed')}>
      <Button onclick={load}>{$i18n.t('revenue.retry')}</Button>
    </EmptyState>
  {:else}
    <Section
      title={$i18n.t('revenue.collected.title')}
      description={$i18n.t('revenue.collected.subtitle')}
    >
      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={$i18n.t('revenue.collected.thisMonth')}
          value={euro(overview.collected.thisMonth)}
        />
        <StatCard
          label={$i18n.t('revenue.collected.thisYear')}
          value={euro(overview.collected.thisYear)}
        />
        <StatCard label={$i18n.t('revenue.collected.last12Months')} value={euro(collectedTotal)} />
      </div>
      {#if collectedChart}
        <div class="rounded-fc-md bg-fc-component p-4">
          <BarChart
            labels={collectedChart.labels}
            series={collectedChart.series}
            height={260}
            showLegend={false}
            yFormat={euro}
            emptyLabel={$i18n.t('revenue.empty')}
          />
        </div>
      {/if}
    </Section>

    <Section
      title={$i18n.t('revenue.toCollect.title')}
      description={$i18n.t('revenue.toCollect.subtitle')}
    >
      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={$i18n.t('revenue.toCollect.total')}
          value={euro(overview.toCollect.total)}
        />
        <StatCard
          label={$i18n.t('revenue.toCollect.overdue')}
          value={euro(overview.toCollect.overdue.amount)}
          delta={overdueDelta}
        />
        <StatCard
          label={$i18n.t('revenue.toCollect.upcoming')}
          value={euro(overview.toCollect.upcoming.amount)}
          delta={$i18n.t('revenue.toCollect.count', { count: overview.toCollect.upcoming.count })}
        />
      </div>

      <OpenPayments
        items={overview.toCollect.items}
        truncated={overview.toCollect.truncated}
        {euro}
        {day}
      />

      {#if overview.toCollect.veryLate.count > 0}
        <p class="rounded-fc-md bg-fc-warning/10 p-3 text-fc-xs text-fc-warning">
          {$i18n.t('revenue.toCollect.veryLate', {
            amount: euro(overview.toCollect.veryLate.amount),
            count: overview.toCollect.veryLate.count,
          })}
        </p>
      {/if}
    </Section>

    <Section
      title={$i18n.t('revenue.forecast.title')}
      description={$i18n.t('revenue.forecast.subtitle')}
    >
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label={$i18n.t('revenue.forecast.total')}
          value={euro(overview.forecast.total)}
          class="lg:col-span-1"
        />
        {#each FORECAST_ORDER as source (source)}
          <StatCard
            label={$i18n.t(`revenue.forecast.sources.${source}.label`)}
            value={euro(overview.forecast.sources[source].total)}
          />
        {/each}
      </div>

      {#if forecastChart && hasForecast}
        <div class="rounded-fc-md bg-fc-component p-4">
          <BarChart
            stacked
            labels={forecastChart.labels}
            series={forecastChart.series}
            height={280}
            yFormat={euro}
            emptyLabel={$i18n.t('revenue.empty')}
          />
        </div>
      {/if}

      <div class="grid gap-4 md:grid-cols-2">
        {#each FORECAST_ORDER as source (source)}
          <ForecastSource {source} totals={overview.forecast.sources[source]} {euro} {month} />
        {/each}
      </div>

      <p class="text-fc-xs text-fc-fg-muted">{$i18n.t('revenue.overdueRule')}</p>
    </Section>
  {/if}
</Page>
