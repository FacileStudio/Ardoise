<script lang="ts">
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
        data?: unknown[];
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

    const xDomain = $derived(data.map(d => String((d as Record<string, unknown>)[x])));
    const yExtent = $derived(extent(data.map(d => Number((d as Record<string, unknown>)[y]) || 0)));
    const yDomain = $derived<[number, number]>([0, yExtent[1] * 1.1]);

    const chartWidth = $derived(width - padding.left - padding.right);
    const chartHeight = $derived(height - padding.top - padding.bottom);

    const xScale = $derived(scaleBand(xDomain, [0, chartWidth], 0));
    const yScale = $derived(scaleLinear(yDomain, [chartHeight, 0]));

    const yTicks = $derived(ticks(yDomain, 5));

    const areaPath = $derived(() => {
        if (data.length === 0) return '';
        const topLine = data.map((item, i) => {
            const px = xScale.scale(String((item as Record<string, unknown>)[x])) + xScale.bandwidth / 2;
            const py = yScale(Number((item as Record<string, unknown>)[y]) || 0);
            return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
        }).join(' ');

        const lastX = xScale.scale(String((data[data.length - 1] as Record<string, unknown>)[x])) + xScale.bandwidth / 2;
        const firstX = xScale.scale(String((data[0] as Record<string, unknown>)[x])) + xScale.bandwidth / 2;
        const bottom = chartHeight;

        return `${topLine} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
    });

    const linePath = $derived(() => {
        if (data.length === 0) return '';
        const points = data.map((item, i) => {
            const px = xScale.scale(String((item as Record<string, unknown>)[x])) + xScale.bandwidth / 2;
            const py = yScale(Number((item as Record<string, unknown>)[y]) || 0);
            return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
        });
        return points.join(' ');
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
        <g transform="translate({padding.left}, {padding.top})">
            {#each yTicks as tick (tick)}
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

            <path
                d={areaPath()}
                fill={color}
                fill-opacity="0.3"
            />

            <path
                d={linePath()}
                fill="none"
                stroke={color}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />

            {#each data as item, i (i)}
                {@const pointX = xScale.scale(String((item as Record<string, unknown>)[x])) + xScale.bandwidth / 2}
                {@const pointY = yScale(Number((item as Record<string, unknown>)[y]) || 0)}

                <circle
                    cx={pointX}
                    cy={pointY}
                    r={hoveredIndex === i ? 5 : 3}
                    fill={color}
                    class="cursor-pointer transition-all"
                    role="img"
                    aria-label="{String((item as Record<string, unknown>)[x])}: {(item as Record<string, unknown>)[y]}"
                    onmousemove={(e) => handleMouseMove(e, i)}
                    onmouseleave={handleMouseLeave}
                />

                <text
                    x={pointX}
                    y={chartHeight + 20}
                    text-anchor="middle"
                    class="text-[10px] fill-slate-600"
                >
                    {String((item as Record<string, unknown>)[x])}
                </text>
            {/each}
        </g>
    </svg>

    {#if hoveredIndex !== null}
        {@const item = data[hoveredIndex] as Record<string, unknown>}
        <div
            class="fixed z-50 px-3 py-2 text-xs bg-slate-900 text-white rounded-lg shadow-xl pointer-events-none"
            style="left: {tooltipX + 10}px; top: {tooltipY - 10}px;"
        >
            <div class="font-medium">{String(item[x])}</div>
            <div class="text-slate-300">{y}: {item[y]}</div>
        </div>
    {/if}
</Chart>
