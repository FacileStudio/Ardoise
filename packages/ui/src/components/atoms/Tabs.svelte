<script lang="ts">
    import { cn } from '@repo/utils';

    export let tabs: Array<{ label: string; value: string; icon?: string }> = [];
    export let activeTab = '';
    let className = "";
    export { className as class };

    $: if (!activeTab && tabs.length > 0) {
        activeTab = tabs[0].value;
    }
</script>

<div class={cn("flex items-center gap-1 rounded-lg border border-border bg-muted p-1", className)}>
    {#each tabs as tab (tab.value)}
        <button
            on:click={() => activeTab = tab.value}
            class={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                activeTab === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
            )}
        >
            {#if tab.icon}
                <iconify-icon icon={tab.icon} width="16"></iconify-icon>
            {/if}
            {tab.label}
        </button>
    {/each}
</div>

<div class="mt-6">
    <slot {activeTab} />
</div>
