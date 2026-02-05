<script lang="ts">
  import type { EntityConfig, ListResult } from '@repo/admin';
  import { downloadCSV, toast } from '@repo/utils';
  import Pagination from '../../components/molecules/Pagination.svelte';
  import { cn } from '@repo/utils';
  import 'iconify-icon';

  let {
    config,
    data,
    onEdit,
    onDelete,
    onView,
    onPageChange,
    onSort,
    currentSort,
    permissions,
    class: className = '',
  }: Props = $props();

  const getFieldLabel = (fieldName: string) =>
    config.fields.find((f) => f.name === fieldName)?.label || fieldName;

  function formatValue(value: unknown, fieldName: string): string {
    if (value == null) return '-';
    const field = config.fields.find((f) => f.name === fieldName);
    if (field?.type === 'date' && (typeof value === 'string' || typeof value === 'number'))
      return new Date(value).toLocaleDateString();
    if (field?.type === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return 'JSON';
    return String(value);
  }

  function handleExport() {
    const exportData = data.data.map((row) => {
      const exportRow: Record<string, string> = {};
      config.listFields.forEach((f) => {
        exportRow[f] = formatValue(row[f], f);
      });
      return exportRow;
    });
    downloadCSV(exportData, `export-${config.name}`);
    toast.push('Export successful!', 'success');
  }
</script>

<div class={cn('flex flex-col gap-4', className)}>
  <div class="flex items-center justify-between px-2">
    <div>
      <h2 class="text-xl font-black text-neutral-900 tracking-tight">{config.displayName}</h2>
      <p class="text-xs font-medium text-neutral-400">{data.total} total records found</p>
    </div>

    <button
      onclick={handleExport}
      disabled={data.data.length === 0}
      class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all disabled:opacity-30"
    >
      <iconify-icon icon="solar:download-square-linear" width="20"></iconify-icon>
      Export CSV
    </button>
  </div>

  <div class="overflow-hidden bg-white border border-neutral-100 rounded-3xl shadow-sm">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-neutral-50/50">
            {#each config.listFields as fieldName (fieldName)}
              <th class="p-4">
                <button
                  onclick={() => onSort(fieldName)}
                  class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                >
                  {getFieldLabel(fieldName)}
                  {#if currentSort?.field === fieldName}
                    <iconify-icon
                      icon={currentSort.order === 'asc'
                        ? 'solar:arrow-up-linear'
                        : 'solar:arrow-down-linear'}
                      class="text-black"
                    ></iconify-icon>
                  {:else}
                    <iconify-icon icon="solar:sort-vertical-linear" class="opacity-30"
                    ></iconify-icon>
                  {/if}
                </button>
              </th>
            {/each}
            <th
              class="p-4 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-50">
          {#if data.data.length === 0}
            <tr>
              <td colspan={config.listFields.length + 1} class="py-20 text-center">
                <div class="flex flex-col items-center gap-2 text-neutral-300">
                  <iconify-icon icon="solar:box-minimalistic-linear" width="48"></iconify-icon>
                  <p class="text-sm font-bold">No results found</p>
                </div>
              </td>
            </tr>
          {:else}
            {#each data.data as row (row.id)}
              <tr class="group hover:bg-neutral-50/30 transition-colors">
                {#each config.listFields as fName (fName)}
                  <td class="p-4 text-sm font-medium text-neutral-600">
                    {formatValue(row[fName], fName)}
                  </td>
                {/each}

                <td class="p-4 text-right">
                  <div
                    class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {#if permissions.canRead}
                      <button
                        onclick={() => onView(String(row.id))}
                        class="p-2 text-neutral-400 hover:text-black hover:bg-white rounded-lg shadow-sm transition-all"
                        title="View"
                      >
                        <iconify-icon icon="solar:eye-linear" width="18"></iconify-icon>
                      </button>
                    {/if}
                    {#if permissions.canUpdate}
                      <button
                        onclick={() => onEdit(String(row.id))}
                        class="p-2 text-neutral-400 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm transition-all"
                        title="Edit"
                      >
                        <iconify-icon icon="solar:pen-linear" width="18"></iconify-icon>
                      </button>
                    {/if}
                    {#if permissions.canDelete}
                      <button
                        onclick={() => onDelete(String(row.id))}
                        class="p-2 text-neutral-400 hover:text-red-600 hover:bg-white rounded-lg shadow-sm transition-all"
                        title="Delete"
                      >
                        <iconify-icon icon="solar:trash-bin-trash-linear" width="18"></iconify-icon>
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <div class="flex items-center justify-between px-2 py-2">
    <span class="text-[10px] font-black uppercase tracking-tighter text-neutral-400">
      Page {data.page} of {data.totalPages}
    </span>
    <Pagination currentPage={data.page} totalPages={data.totalPages} {onPageChange} />
  </div>
</div>
