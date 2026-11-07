<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import {
    Badge,
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

  const hasForecast = $derived(overview ? !isZero(overview.forecast.total) : false);

  const statusTone = (status: string, overdue: boolean) =>
    overdue ? 'danger' : status === 'PENDING' ? 'warning' : 'info';
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
          delta={$i18n.t('revenue.toCollect.count', { count: overview.toCollect.overdue.count })}
        />
        <StatCard
          label={$i18n.t('revenue.toCollect.upcoming')}
          value={euro(overview.toCollect.upcoming.amount)}
          delta={$i18n.t('revenue.toCollect.count', { count: overview.toCollect.upcoming.count })}
        />
      </div>

      {#if overview.toCollect.items.length === 0}
        <EmptyState
          title={$i18n.t('revenue.toCollect.emptyTitle')}
          description={$i18n.t('revenue.toCollect.emptyDescription')}
        />
      {:else}
        <ul class="flex flex-col gap-2">
          {#each overview.toCollect.items as item (item.id)}
            <li>
              <a
                href={resolve(`/admin/payments/${item.id}`)}
                aria-label={$i18n.t('revenue.toCollect.openPayment')}
                class="flex flex-col gap-2 rounded-fc-md bg-fc-component p-4 transition-colors
                  hover:bg-fc-surface sm:flex-row sm:items-center sm:justify-between"
              >
                <span class="flex min-w-0 flex-col gap-1">
                  <span class="truncate text-fc-sm font-medium text-fc-fg">{item.clientName}</span>
                  <span class="truncate text-fc-xs text-fc-fg-muted">
                    {item.missionName
                      ? $i18n.t('revenue.toCollect.mission', { name: item.missionName })
                      : ''}
                    {item.frequency !== 'ONE_TIME'
                      ? ` ${$i18n.t('revenue.toCollect.recurring')}`
                      : ''}
                  </span>
                </span>
                <span class="flex flex-wrap items-center gap-3 sm:justify-end">
                  <Badge tone={statusTone(item.status, item.overdue)}>
                    {$i18n.t(`revenue.status.${item.status}`)}
                  </Badge>
                  <span class="text-fc-xs text-fc-fg-muted">
                    {$i18n.t('revenue.toCollect.due', { date: day(item.dueDate) })}
                  </span>
                  <span class="text-fc-sm font-semibold text-fc-fg">{euro(item.amount)}</span>
                </span>
              </a>
            </li>
          {/each}
        </ul>
        {#if overview.toCollect.truncated}
          <p class="text-fc-xs text-fc-fg-muted">
            {$i18n.t('revenue.toCollect.truncated', { count: overview.toCollect.items.length })}
          </p>
        {/if}
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

      <p class="text-fc-xs text-fc-fg-muted">{$i18n.t('revenue.vatNote')}</p>
    </Section>
  {/if}
</Page>
