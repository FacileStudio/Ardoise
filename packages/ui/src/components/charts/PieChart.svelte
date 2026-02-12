<script lang="ts">
    import Chart from './Chart.svelte';

    let {
        data = [],
        value = 'value',
        label = 'label',
        height = 300,
        colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
        class: className = '',
    }: {
        data?: unknown[];
        value?: string;
        label?: string;
        height?: number;
        colors?: string[];
        class?: string;
    } = $props();

    let width = $state(0);
    let hoveredIndex = $state<number | null>(null);
    let tooltipX = $state(0);
    let tooltipY = $state(0);

    const total = $derived(data.reduce((sum: number, item) => sum + (Number((item as Record<string, unknown>)[value]) || 0), 0));

    const slices = $derived(() => {
        let currentAngle = -Math.PI / 2;
        return data.map((item, i) => {
            const itemValue = Number((item as Record<string, unknown>)[value]) || 0;
            const percentage = itemValue / total;
            const angle = percentage * 2 * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const radius = Math.min(width, height) / 2 - 40;
            const centerX = width / 2;
            const centerY = height / 2;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArc = angle > Math.PI ? 1 : 0;

            const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            const midAngle = startAngle + angle / 2;
            const labelRadius = radius * 0.7;
            const labelX = centerX + labelRadius * Math.cos(midAngle);
            const labelY = centerY + labelRadius * Math.sin(midAngle);

            return {
                path,
                labelX,
                labelY,
                color: colors[i % colors.length],
                percentage: (percentage * 100).toFixed(1),
            };
        });
    });

    function handleMouseMove(event: MouseEvent, index: number) {
        hoveredIndex = index;
        tooltipX = event.clientX;
        tooltipY = event.clientY;
    }

    function handleMouseLeave() {
        hoveredIndex = null;
    }
</script>

<Chart {height} class={className} bind:width>
    <svg viewBox="0 0 {width} {height}" class="w-full h-full">
        {#each slices() as slice, i (i)}
            <path
                d={slice.path}
                fill={slice.color}
                class="cursor-pointer transition-opacity hover:opacity-80"
                role="img"
                aria-label="{(data[i] as Record<string, unknown>)[label]}: {(data[i] as Record<string, unknown>)[value]} ({slice.percentage}%)"
                onmousemove={(e) => handleMouseMove(e, i)}
                onmouseleave={handleMouseLeave}
            />
            <text
                x={slice.labelX}
                y={slice.labelY}
                text-anchor="middle"
                dominant-baseline="middle"
                class="text-[11px] fill-white font-medium pointer-events-none"
            >
                {slice.percentage}%
            </text>
        {/each}
    </svg>

    <div class="flex flex-wrap justify-center gap-3 mt-4">
        {#each data as item, i (i)}
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-sm" style="background-color: {colors[i % colors.length]}"></div>
                <span class="text-xs text-slate-600">{(item as Record<string, unknown>)[label]}</span>
            </div>
        {/each}
    </div>

    {#if hoveredIndex !== null}
        {@const item = data[hoveredIndex] as Record<string, unknown>}
        <div
            class="fixed z-50 px-3 py-2 text-xs bg-slate-900 text-white rounded-lg shadow-xl pointer-events-none"
            style="left: {tooltipX + 10}px; top: {tooltipY - 10}px;"
        >
            <div class="font-medium">{item[label]}</div>
            <div class="text-slate-300">{value}: {item[value]}</div>
        </div>
    {/if}
</Chart>
