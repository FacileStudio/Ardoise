<script lang="ts">
  import { cn } from '@repo/utils';
  import 'iconify-icon';

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
  <button
    type="button"
    aria-label="Previous page"
    disabled={currentPage === 1}
    onclick={() => goToPage(currentPage - 1)}
    class="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
  >
    <iconify-icon icon="solar:alt-arrow-left-linear" width="20"></iconify-icon>
  </button>

  <div class="flex items-center gap-1">
    {#each pages as pageNum, idx (idx)}
      {#if pageNum === '...'}
        <span class="flex h-9 w-9 items-center justify-center text-muted-foreground">
          <iconify-icon icon="solar:menu-dots-bold" width="14"></iconify-icon>
        </span>
      {:else}
        <button
          type="button"
          onclick={() => goToPage(pageNum)}
          aria-current={currentPage === pageNum ? 'page' : undefined}
          class={cn(
            'h-9 min-w-[36px] px-2 rounded-md text-sm font-medium transition-all duration-200',
            currentPage === pageNum
              ? 'bg-foreground text-background'
              : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {pageNum}
        </button>
      {/if}
    {/each}
  </div>

  <button
    type="button"
    aria-label="Next page"
    disabled={currentPage === totalPages}
    onclick={() => goToPage(currentPage + 1)}
    class="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
  >
    <iconify-icon icon="solar:alt-arrow-right-linear" width="20"></iconify-icon>
  </button>
</nav>
