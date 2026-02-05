<script lang="ts">
    import { cn } from '@repo/utils';
    import Chart from './Chart.svelte';
    import { scaleLinear, scaleBand, extent, ticks, formatNumber } from './utils';

    let {
        data = [],
        x = 'x',
        y = 'y',
        height = 300,
        color = '#4f46e5',
        class: className = '',
    }: {
        data?: any[];
        x?: string;
        y?: string;
        height?: number;
        color?: string;
        class?: string;
    } = $props();

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };

    let width = $state(0);
    let hoveredIndex = $state<number | null>(null);
    let tooltipX = $state(0);
    let tooltipY = $state(0);

    const xDomain = $derived(data.map(d => String(d[x])));
    const yExtent = $derived(extent(data.map(d => Number(d[y]) || 0)));
    const yDomain = $derived<[number, number]>([0, yExtent[1] * 1.1]);

    const chartWidth = $derived(width - padding.left - padding.right);
    const chartHeight = $derived(height - padding.top - padding.bottom);

    const xScale = $derived(scaleBand(xDomain, [0, chartWidth], 0.2));
    const yScale = $derived(scaleLinear(yDomain, [chartHeight, 0]));

    const yTicks = $derived(ticks(yDomain, 5));

    function handleMouseMove(event: MouseEvent, index: number) {
        hoveredIndex = index;
        tooltipX = event.clientX;
        tooltipY = event.clientY;
    }

    function handleMouseLeave() {
        hoveredIndex = null;
    }
</script>

<Chart {data} {height} class={className} bind:width>
    <svg viewBox="0 0 {width} {height}" class="w-full h-full">
        <g transform="translate({padding.left}, {padding.top})">
            {#each yTicks as tick}
                <line
                    x1={0}
                    y1={yScale(tick)}
                    x2={chartWidth}
                    y2={yScale(tick)}
                    stroke="#e2e8f0"
                    stroke-dasharray="3 3"
                />
                <text
                    x={-10}
                    y={yScale(tick)}
                    text-anchor="end"
                    dominant-baseline="middle"
                    class="text-[10px] fill-slate-500"
                >
                    {formatNumber(tick)}
                </text>
            {/each}

            {#each data as item, i}
                {@const barX = xScale.scale(String(item[x]))}
                {@const barHeight = chartHeight - yScale(Number(item[y]) || 0)}
                {@const barY = yScale(Number(item[y]) || 0)}

                <rect
                    x={barX}
                    y={barY}
                    width={xScale.bandwidth}
                    height={barHeight}
                    fill={color}
                    rx={4}
                    class="transition-opacity cursor-pointer hover:opacity-80"
                    role="img"
                    aria-label="{String(item[x])}: {item[y]}"
                    onmousemove={(e) => handleMouseMove(e, i)}
                    onmouseleave={handleMouseLeave}
                />

                <text
                    x={barX + xScale.bandwidth / 2}
                    y={chartHeight + 20}
                    text-anchor="middle"
                    class="text-[10px] fill-slate-600"
                >
                    {String(item[x])}
                </text>
            {/each}
        </g>
    </svg>

    {#if hoveredIndex !== null}
        {@const item = data[hoveredIndex]}
        <div
            class="fixed z-50 px-3 py-2 text-xs bg-slate-900 text-white rounded-lg shadow-xl pointer-events-none"
            style="left: {tooltipX + 10}px; top: {tooltipY - 10}px;"
        >
            <div class="font-medium">{String(item[x])}</div>
            <div class="text-slate-300">{y}: {item[y]}</div>
        </div>
    {/if}
</Chart>
