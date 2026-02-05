<script lang="ts">
  import BarChart from '../../components/charts/BarChart.svelte';
  import LineChart from '../../components/charts/LineChart.svelte';
  import PieChart from '../../components/charts/PieChart.svelte';
  import AreaChart from '../../components/charts/AreaChart.svelte';
  import 'iconify-icon';

  export let title: string = 'Statistics';
  export let description: string = '';
  export let stats: Array<{
    title: string;
    value: number | string;
    icon?: string;
    color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'slate';
    trend?: {
      value: number;
      direction: 'up' | 'down';
    };
  }> = [];
  export let charts: Array<{
    title: string;
    description?: string;
    type: 'bar' | 'line' | 'pie' | 'area';
    data: unknown[];
    x?: string;
    y?: string;
    value?: string;
    label?: string;
    color?: string;
    colors?: string[];
    height?: number;
  }> = [];

  function getColorClasses(color: string = 'indigo') {
    const colors = {
      indigo: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        icon: 'text-indigo-600',
        border: 'border-indigo-100',
      },
      emerald: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        icon: 'text-emerald-600',
        border: 'border-emerald-100',
      },
      amber: {
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        icon: 'text-amber-600',
        border: 'border-amber-100',
      },
      rose: {
        bg: 'bg-rose-50',
        text: 'text-rose-600',
        icon: 'text-rose-600',
        border: 'border-rose-100',
      },
      violet: {
        bg: 'bg-violet-50',
        text: 'text-violet-600',
        icon: 'text-violet-600',
        border: 'border-violet-100',
      },
      cyan: {
        bg: 'bg-cyan-50',
        text: 'text-cyan-600',
        icon: 'text-cyan-600',
        border: 'border-cyan-100',
      },
      slate: {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        icon: 'text-slate-600',
        border: 'border-slate-100',
      },
    };
    return colors[color as keyof typeof colors] || colors.indigo;
  }

  function formatValue(value: number | string): string {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    }
    return String(value);
  }
</script>

<div class="auto-stats">
  <div class="stats-header">
    <div class="header-left">
      <iconify-icon icon="heroicons:chart-bar" width="28" class="text-indigo-600"></iconify-icon>
      <div>
        <h2>{title}</h2>
        {#if description}
          <p class="description">{description}</p>
        {/if}
      </div>
    </div>
  </div>

  {#if stats.length > 0}
    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
      {#each stats as stat (stat.title)}
        {@const colorClasses = getColorClasses(stat.color)}
        <div class="stat-card {colorClasses.border}">
          <div class="stat-header">
            <div class="stat-title">{stat.title}</div>
            {#if stat.icon}
              <iconify-icon icon={stat.icon} width="24" class={colorClasses.icon}></iconify-icon>
            {/if}
          </div>
          <div class="stat-value {colorClasses.text}">
            {formatValue(stat.value)}
          </div>
          {#if stat.trend}
            <div class="stat-trend" class:trend-up={stat.trend.direction === 'up'} class:trend-down={stat.trend.direction === 'down'}>
              <iconify-icon
                icon={stat.trend.direction === 'up' ? 'heroicons:arrow-trending-up' : 'heroicons:arrow-trending-down'}
                width="16"
              ></iconify-icon>
              <span>{Math.abs(stat.trend.value)}%</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if charts.length > 0}
    <div class="charts-grid">
      {#each charts as chart (chart.title)}
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">{chart.title}</h3>
              {#if chart.description}
                <p class="chart-description">{chart.description}</p>
              {/if}
            </div>
            <iconify-icon
              icon={chart.type === 'bar' ? 'heroicons:chart-bar' : chart.type === 'line' ? 'heroicons:chart-bar' : chart.type === 'pie' ? 'heroicons:chart-pie' : 'heroicons:presentation-chart-line'}
              width="20"
              class="text-slate-400"
            ></iconify-icon>
          </div>
          <div class="chart-content">
            {#if chart.type === 'bar'}
              <BarChart
                data={chart.data}
                x={chart.x || 'x'}
                y={chart.y || 'y'}
                height={chart.height || 300}
                color={chart.color || '#4f46e5'}
              />
            {:else if chart.type === 'line'}
              <LineChart
                data={chart.data}
                x={chart.x || 'x'}
                y={chart.y || 'y'}
                height={chart.height || 300}
                color={chart.color || '#4f46e5'}
              />
            {:else if chart.type === 'pie'}
              <PieChart
                data={chart.data}
                value={chart.value || 'value'}
                label={chart.label || 'label'}
                height={chart.height || 300}
                colors={chart.colors}
              />
            {:else if chart.type === 'area'}
              <AreaChart
                data={chart.data}
                x={chart.x || 'x'}
                y={chart.y || 'y'}
                height={chart.height || 300}
                color={chart.color || '#4f46e5'}
              />
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if stats.length === 0 && charts.length === 0}
    <div class="empty-state">
      <iconify-icon icon="heroicons:chart-pie" width="80" class="text-slate-200"></iconify-icon>
      <p class="empty-title">No statistics available</p>
      <p class="empty-description">Statistics will appear here once data is available</p>
    </div>
  {/if}
</div>

<style>
  .auto-stats {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .stats-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0 0 1rem 0;
    border-bottom: 2px solid #f3f4f6;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stats-header h2 {
    margin: 0;
    font-size: 1.875rem;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.025em;
  }

  .description {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    color: #64748b;
  }

  .stats-grid {
    display: grid;
    gap: 1rem;
  }

  .stat-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    border: 2px solid;
    transition: all 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.1);
  }

  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .stat-title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.025em;
    line-height: 1;
  }

  .stat-trend {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .trend-up {
    background: #d1fae5;
    color: #065f46;
  }

  .trend-down {
    background: #fee2e2;
    color: #991b1b;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .chart-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    border: 2px solid #e5e7eb;
    transition: all 0.2s;
  }

  .chart-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.08);
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #f1f5f9;
  }

  .chart-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: #0f172a;
  }

  .chart-description {
    margin: 0.375rem 0 0 0;
    font-size: 0.875rem;
    color: #64748b;
  }

  .chart-content {
    min-height: 300px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .empty-title {
    margin: 1rem 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #475569;
  }

  .empty-description {
    margin: 0;
    font-size: 0.875rem;
    color: #94a3b8;
  }

  @media (max-width: 768px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr !important;
    }
  }
</style>
