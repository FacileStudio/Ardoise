<script lang="ts">
    import { cn } from '@repo/utils';

    export let label = '';
    export let value = '';
    export let icon = '';
    export let trend: 'up' | 'down' | 'neutral' = 'neutral';
    export let trendValue = '';
    let className = "";
    export { className as class };

    const trendColors = {
        up: 'text-green-700 bg-green-50',
        down: 'text-red-700 bg-red-50',
        neutral: 'text-muted-foreground bg-muted',
    };

    const trendIcons = {
        up: 'solar:arrow-up-bold',
        down: 'solar:arrow-down-bold',
        neutral: 'solar:minus-circle-bold',
    };
</script>

<div class={cn("rounded-xl border border-border p-4", className)}>
    <div class="flex items-start justify-between mb-3">
        <div class="text-xs font-medium text-muted-foreground">
            {label}
        </div>
        {#if icon}
            <div class="p-2 bg-muted rounded-lg">
                <iconify-icon {icon} width="18" class="text-muted-foreground"></iconify-icon>
            </div>
        {/if}
    </div>

    <div class="text-2xl font-bold text-foreground mb-1">
        {value}
    </div>

    {#if trendValue}
        <div class={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", trendColors[trend])}>
            <iconify-icon icon={trendIcons[trend]} width="14"></iconify-icon>
            {trendValue}
        </div>
    {/if}
</div>
