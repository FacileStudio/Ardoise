<script lang="ts">
  import { Button, Icon } from '@facile/muse';
  import { cn } from '@repo/utils';
  import { icons } from '$lib/icons';

  let {
    currentPage = $bindable(1),
    totalPages = 1,
    onPageChange,
    class: className = '',
  }: {
    currentPage?: number;
    totalPages: number;
    onPageChange?: (_page: number) => void;
    class?: string;
  } = $props();

  const getPageRange = () => {
    const delta = 1;
    const range: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  const pages = $derived(getPageRange());

  function goToPage(page: number | string) {
    if (typeof page !== 'number' || page === currentPage || page < 1 || page > totalPages) return;
    currentPage = page;
    onPageChange?.(page);
  }
</script>

<nav class={cn('flex items-center justify-center gap-1', className)} aria-label="Pagination">
  <Button
    variant="ghost"
    icon={icons.chevronLeft}
    aria-label="Page précédente"
    disabled={currentPage === 1}
    onclick={() => goToPage(currentPage - 1)}
    class="w-9 px-0"
  />

  {#each pages as pageNum, idx (idx)}
    {#if pageNum === '...'}
      <span class="flex h-9 w-9 items-center justify-center text-fc-fg-muted">
        <Icon icon={icons.minus} size={14} />
      </span>
    {:else}
      <Button
        variant={currentPage === pageNum ? 'primary' : 'ghost'}
        onclick={() => goToPage(pageNum)}
        aria-current={currentPage === pageNum ? 'page' : undefined}
        class="min-w-9 px-2"
      >
        {pageNum}
      </Button>
    {/if}
  {/each}

  <Button
    variant="ghost"
    icon={icons.arrow}
    aria-label="Page suivante"
    disabled={currentPage === totalPages}
    onclick={() => goToPage(currentPage + 1)}
    class="w-9 px-0"
  />
</nav>
