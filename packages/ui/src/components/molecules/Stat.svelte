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
        up: 'text-green-600 bg-green-50',
        down: 'text-rose-600 bg-rose-50',
        neutral: 'text-slate-600 bg-slate-50',
    };

    const trendIcons = {
        up: 'solar:arrow-up-bold',
        down: 'solar:arrow-down-bold',
        neutral: 'solar:minus-circle-bold',
    };
</script>

<div class={cn("bg-white p-6 rounded-2xl border border-slate-100 shadow-sm", className)}>
    <div class="flex items-start justify-between mb-4">
        <div class="text-sm font-black uppercase tracking-wider text-slate-400">
            {label}
        </div>
        {#if icon}
            <div class="p-2 bg-indigo-50 rounded-xl">
                <iconify-icon {icon} width="20" class="text-indigo-600"></iconify-icon>
            </div>
        {/if}
    </div>

    <div class="text-3xl font-black text-slate-900 mb-2">
        {value}
    </div>

    {#if trendValue}
        <div class={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold", trendColors[trend])}>
            <iconify-icon icon={trendIcons[trend]} width="14"></iconify-icon>
            {trendValue}
        </div>
    {/if}
</div>
