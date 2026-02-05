<script lang="ts">
  import type { EntityConfig, ListResult } from '@repo/admin';
  import { downloadCSV, toast } from '@repo/utils';
  import 'iconify-icon';

  export let config: EntityConfig;
  export let data: ListResult<any>;
  export let onEdit: (id: string) => void;
  export let onDelete: (id: string) => void;
  export let onView: (id: string) => void;
  export let onPageChange: (page: number) => void;
  export let onSort: (field: string) => void;
  export let currentSort: { field: string; order: 'asc' | 'desc' } | undefined;
  export let permissions: {
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };

  function formatValue(value: any, fieldName: string): string {
    if (value === null || value === undefined) return '-';

    const field = config.fields.find(f => f.name === fieldName);

    if (field?.type === 'date') {
      return new Date(value).toLocaleDateString();
    }

    if (field?.type === 'boolean') {
      return value ? '✓' : '✗';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  function getSortIcon(fieldName: string): string {
    if (!currentSort || currentSort.field !== fieldName) return 'heroicons:arrows-up-down';
    return currentSort.order === 'asc' ? 'heroicons:arrow-up' : 'heroicons:arrow-down';
  }

  function handleExport() {
    try {
      if (data.data.length === 0) {
        toast.push("No data to export", "warning");
        return;
      }

      const exportData = data.data.map(row => {
        const exportRow: any = {};
        config.listFields.forEach(field => {
          exportRow[field] = formatValue(row[field], field);
        });
        return exportRow;
      });

      downloadCSV(exportData, `export-${config.name}-${new Date().toISOString().split('T')[0]}`);
      toast.push("Export successful!", "success");
    } catch (e) {
      toast.push("Error during export", "error");
    }
  }
</script>

<div class="auto-table">
  <div class="table-header">
    <div class="header-left">
      <iconify-icon icon="heroicons:table-cells" width="24" class="text-indigo-600"></iconify-icon>
      <h2>{config.displayName} List</h2>
    </div>
    <div class="header-right">
      <div class="table-info">
        <iconify-icon icon="heroicons:document-text" width="18"></iconify-icon>
        <span>{data.total} {data.total === 1 ? 'item' : 'items'}</span>
        <span class="divider">•</span>
        <span>Page {data.page} of {data.totalPages}</span>
      </div>
      <button
        on:click={handleExport}
        class="export-btn"
        disabled={data.data.length === 0}
        title="Export to CSV"
      >
        <iconify-icon icon="heroicons:arrow-down-tray" width="18"></iconify-icon>
        <span>Export CSV</span>
      </button>
    </div>
  </div>

  {#if data.data.length === 0}
    <div class="empty-state">
      <iconify-icon icon="heroicons:inbox" width="64" class="text-slate-300"></iconify-icon>
      <p class="text-slate-600 text-lg font-medium mt-4">No {config.displayName.toLowerCase()} found</p>
      <p class="text-slate-400 text-sm mt-2">Try adjusting your search or filters</p>
    </div>
  {:else}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            {#each config.listFields as field}
              <th>
                <button
                  class="sort-button"
                  on:click={() => onSort(field)}
                >
                  {config.fields.find(f => f.name === field)?.label || field}
                  <iconify-icon icon={getSortIcon(field)} width="16" class="sort-icon"></iconify-icon>
                </button>
              </th>
            {/each}
            <th class="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.data as row}
            <tr>
              {#each config.listFields as field}
                <td>{formatValue(row[field], field)}</td>
              {/each}
              <td class="actions">
                <div class="action-buttons">
                  {#if permissions.canRead}
                    <button class="btn-view" on:click={() => onView(row.id)} title="View details">
                      <iconify-icon icon="heroicons:eye" width="18"></iconify-icon>
                    </button>
                  {/if}
                  {#if permissions.canUpdate}
                    <button class="btn-edit" on:click={() => onEdit(row.id)} title="Edit">
                      <iconify-icon icon="heroicons:pencil-square" width="18"></iconify-icon>
                    </button>
                  {/if}
                  {#if permissions.canDelete}
                    <button class="btn-delete" on:click={() => onDelete(row.id)} title="Delete">
                      <iconify-icon icon="heroicons:trash" width="18"></iconify-icon>
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button
        class="pagination-btn"
        disabled={data.page === 1}
        on:click={() => onPageChange(data.page - 1)}
      >
        <iconify-icon icon="heroicons:chevron-left" width="20"></iconify-icon>
        <span>Previous</span>
      </button>

      <div class="page-info">
        <iconify-icon icon="heroicons:document-duplicate" width="18"></iconify-icon>
        <span>Page <strong>{data.page}</strong> of <strong>{data.totalPages}</strong></span>
      </div>

      <button
        class="pagination-btn"
        disabled={data.page === data.totalPages}
        on:click={() => onPageChange(data.page + 1)}
      >
        <span>Next</span>
        <iconify-icon icon="heroicons:chevron-right" width="20"></iconify-icon>
      </button>
    </div>
  {/if}
</div>

<style>
  .auto-table {
    width: 100%;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 2px solid #f3f4f6;
    background: linear-gradient(to bottom, #fafafa, #ffffff);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .table-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .table-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .divider {
    color: #d1d5db;
    margin: 0 0.25rem;
  }

  .export-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: white;
    color: #6366f1;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .export-btn:hover:not(:disabled) {
    background: #6366f1;
    color: white;
    border-color: #6366f1;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
  }

  .export-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .table-container {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    background: #f9fafb;
    padding: 0;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
  }

  .actions-header {
    text-align: center;
  }

  .sort-button {
    width: 100%;
    padding: 1rem 1.25rem;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #374151;
    transition: background-color 0.2s;
  }

  .sort-button:hover {
    background: #f3f4f6;
  }

  .sort-icon {
    color: #9ca3af;
    transition: color 0.2s;
  }

  .sort-button:hover .sort-icon {
    color: #6366f1;
  }

  td {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #f3f4f6;
    color: #4b5563;
    font-size: 0.9375rem;
  }

  tbody tr {
    transition: background-color 0.15s;
  }

  tbody tr:hover {
    background: #fafafa;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .actions {
    text-align: center;
  }

  .action-buttons {
    display: inline-flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .action-buttons button {
    padding: 0.5rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn-view {
    background: #dbeafe;
    color: #1e40af;
  }

  .btn-view:hover {
    background: #3b82f6;
    color: white;
    transform: scale(1.1);
  }

  .btn-edit {
    background: #d1fae5;
    color: #065f46;
  }

  .btn-edit:hover {
    background: #10b981;
    color: white;
    transform: scale(1.1);
  }

  .btn-delete {
    background: #fee2e2;
    color: #991b1b;
  }

  .btn-delete:hover {
    background: #ef4444;
    color: white;
    transform: scale(1.1);
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-top: 2px solid #f3f4f6;
    background: #fafafa;
  }

  .pagination-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: white;
    color: #374151;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pagination-btn:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #6366f1;
    color: #6366f1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .page-info strong {
    color: #1f2937;
    font-weight: 600;
  }
</style>
