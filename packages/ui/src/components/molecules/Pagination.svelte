<script lang="ts">
    import { cn } from '@repo/utils';
    import Button from '../atoms/Button.svelte';

    export let currentPage = 1;
    export let totalPages = 1;
    export let onPageChange: (page: number) => void = () => {};
    let className = "";
    export { className as class };

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        onPageChange(page);
    };

    $: pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        if (totalPages <= 5) return i + 1;
        if (currentPage <= 3) return i + 1;
        if (currentPage >= totalPages - 2) return totalPages - 4 + i;
        return currentPage - 2 + i;
    });
</script>

<div class={cn("flex items-center justify-center gap-2", className)}>
    <Button
        intent="ghost"
        size="sm"
        disabled={currentPage === 1}
        on:click={() => goToPage(currentPage - 1)}
    >
        <iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
    </Button>

    {#each pages as page}
        <Button
            intent={page === currentPage ? 'primary' : 'secondary'}
            size="sm"
            on:click={() => goToPage(page)}
        >
            {page}
        </Button>
    {/each}

    <Button
        intent="ghost"
        size="sm"
        disabled={currentPage === totalPages}
        on:click={() => goToPage(currentPage + 1)}
    >
        <iconify-icon icon="solar:arrow-right-bold" width="16"></iconify-icon>
    </Button>
</div>
