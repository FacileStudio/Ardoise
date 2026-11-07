<script lang="ts">
  import { resolve } from '$app/paths';
  import { Badge, EmptyState } from '@facile/muse';
  import { i18n } from '@repo/i18n/svelte';
  import type { OpenPaymentItem } from '@repo/trpc';

  let {
    items,
    truncated,
    euro,
    day,
  }: {
    items: OpenPaymentItem[];
    truncated: boolean;
    euro: (amount: string | number) => string;
    day: (date: Date | string) => string;
  } = $props();

  const statusTone = (status: string, overdue: boolean) =>
    overdue ? 'danger' : status === 'PENDING' ? 'warning' : 'info';
</script>

{#if items.length === 0}
  <EmptyState
    title={$i18n.t('revenue.toCollect.emptyTitle')}
    description={$i18n.t('revenue.toCollect.emptyDescription')}
  />
{:else}
  <ul class="flex flex-col gap-2">
    {#each items as item (item.id)}
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
              {item.frequency !== 'ONE_TIME' ? ` ${$i18n.t('revenue.toCollect.recurring')}` : ''}
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
  {#if truncated}
    <p class="text-fc-xs text-fc-fg-muted">
      {$i18n.t('revenue.toCollect.truncated', { count: items.length })}
    </p>
  {/if}
{/if}
