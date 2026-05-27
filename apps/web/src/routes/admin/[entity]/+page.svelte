<script lang="ts">
  import { page } from '$app/stores';
  import { trpc } from '$lib/trpc';
  import { AdminAutoTable, AdminAutoForm, Drawer, Button, Spinner, Alert, Input } from '@repo/ui';
  import { toast } from '@repo/utils';
  import { logger } from '@repo/logger';
  import type { EntityConfig, ListResult } from '@repo/admin';
  import { onMount } from 'svelte';
  import 'iconify-icon';

  const entity = $page.params.entity;

  type EntityItem = Record<string, unknown> & { id: string };

  let config: EntityConfig | null = null;
  let data: ListResult<EntityItem> | null = null;
  let permissions = {
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  };

  let currentPage = 1;
  let currentSort: { field: string; order: 'asc' | 'desc' } | undefined;
  let searchQuery = '';

  let showCreateModal = false;
  let showEditModal = false;
  let showViewModal = false;
  let showDeleteConfirm = false;
  let selectedItem: EntityItem | null = null;
  let itemToDelete: string | null = null;

  let loading = true;

  async function loadConfig() {
    try {
      config = await trpc.admin.getEntityConfig.query({ entity });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load config';
      toast.push(errorMsg, 'error');
    }
  }

  async function loadPermissions() {
    try {
      permissions = await trpc.admin.getPermissions.query({ entity });
    } catch (e) {
      logger.error({ err: e }, 'Failed to load permissions');
    }
  }

  async function loadData() {
    if (!permissions.canRead) return;

    try {
      loading = true;
      data = await trpc.admin.list.query({
        entity,
        options: {
          page: currentPage,
          pageSize: 20,
          search: searchQuery || undefined,
          sortBy: currentSort?.field,
          sortOrder: currentSort?.order,
        },
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to load data');
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    await loadConfig();
    await loadPermissions();
    await loadData();
  });

  function handlePageChange(page: number) {
    currentPage = page;
    loadData();
  }

  function handleSort(field: string) {
    if (currentSort?.field === field) {
      currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort = { field, order: 'asc' };
    }
    loadData();
  }

  function handleSearch(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;
    currentPage = 1;
    loadData();
  }

  async function handleCreate(formData: Record<string, unknown>) {
    try {
      await trpc.admin.create.mutate({ entity, data: formData });
      showCreateModal = false;
      await loadData();
      toast.push(`${config?.displayName} created successfully!`, 'success');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to create';
      toast.push('Failed to create: ' + errorMsg, 'error');
    }
  }

  async function handleUpdate(formData: Record<string, unknown>) {
    if (!selectedItem) return;

    try {
      await trpc.admin.update.mutate({
        entity,
        id: selectedItem.id,
        data: formData,
      });
      showEditModal = false;
      selectedItem = null;
      await loadData();
      toast.push(`${config?.displayName} updated successfully!`, 'success');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to update';
      toast.push('Failed to update: ' + errorMsg, 'error');
    }
  }

  function handleDelete(id: string) {
    itemToDelete = id;
    showDeleteConfirm = true;
  }

  async function confirmDelete() {
    if (!itemToDelete) return;

    try {
      await trpc.admin.delete.mutate({ entity, id: itemToDelete });
      showDeleteConfirm = false;
      itemToDelete = null;
      await loadData();
      toast.push(`${config?.displayName} deleted successfully!`, 'success');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to delete';
      toast.push('Failed to delete: ' + errorMsg, 'error');
    }
  }

  function cancelDelete() {
    showDeleteConfirm = false;
    itemToDelete = null;
  }

  async function handleEdit(id: string) {
    try {
      selectedItem = await trpc.admin.get.query({ entity, id });
      showEditModal = true;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load item';
      toast.push('Failed to load item: ' + errorMsg, 'error');
    }
  }

  async function handleView(id: string) {
    try {
      selectedItem = await trpc.admin.get.query({ entity, id });
      showViewModal = true;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load item';
      toast.push('Failed to load item: ' + errorMsg, 'error');
    }
  }

  function handleCancel() {
    showCreateModal = false;
    showEditModal = false;
    showViewModal = false;
    selectedItem = null;
  }
</script>

<div class="p-6 max-w-5xl mx-auto space-y-6">
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">{config?.displayName || entity} Administration</h1>
      <p class="text-sm text-muted-foreground mt-1">Manage {config?.displayName || entity} entries</p>
    </div>
    {#if permissions.canCreate}
      <Button intent="primary" onclick={() => { showCreateModal = true; }}>
        <iconify-icon icon="mdi:plus" width="16" class="mr-1"></iconify-icon>
        Create {config?.displayName}
      </Button>
    {/if}
  </div>

  {#if !permissions.canRead}
    <Alert variant="danger">
      You do not have permission to view this entity.
    </Alert>
  {:else if loading}
    <div class="flex justify-center py-20">
      <Spinner size="xl" />
    </div>
  {:else if config && data}
    <div class="rounded-xl border border-border p-4">
      <Input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        on:input={handleSearch}
      />
    </div>

    <AdminAutoTable
      {config}
      {data}
      {permissions}
      {currentSort}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onView={handleView}
      onPageChange={handlePageChange}
      onSort={handleSort}
    />
  {/if}
</div>

<Drawer open={showCreateModal && !!config} title="Create {config?.displayName || ''}" onClose={handleCancel}>
  {#if config}
    <AdminAutoForm
      {config}
      mode="create"
      onSubmit={handleCreate}
      onCancel={handleCancel}
    />
  {/if}
</Drawer>

<Drawer open={showEditModal && !!config && !!selectedItem} title="Edit {config?.displayName || ''}" onClose={handleCancel}>
  {#if config && selectedItem}
    <AdminAutoForm
      {config}
      data={selectedItem}
      mode="edit"
      onSubmit={handleUpdate}
      onCancel={handleCancel}
    />
  {/if}
</Drawer>

<Drawer open={showViewModal && !!selectedItem && !!config} title="View {config?.displayName || ''}" onClose={handleCancel}>
  {#if selectedItem && config}
    <div class="grid gap-4 p-6">
      {#each config.fields as field (field.name)}
        <div class="grid grid-cols-[150px_1fr] gap-4">
          <strong class="text-sm font-medium text-muted-foreground">{field.label}:</strong>
          <span class="text-sm text-foreground">{selectedItem[field.name] ?? '-'}</span>
        </div>
      {/each}
    </div>
    <div class="flex justify-end p-6 border-t border-border">
      <Button intent="secondary" onclick={handleCancel}>Close</Button>
    </div>
  {/if}
</Drawer>

<Drawer open={showDeleteConfirm} title="Confirm Delete" onClose={cancelDelete}>
  <div class="text-center p-6">
    <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
      <iconify-icon icon="solar:danger-triangle-bold" width="24" class="text-red-600"></iconify-icon>
    </div>
    <h3 class="text-lg font-bold text-foreground mb-2">Delete {config?.displayName}?</h3>
    <p class="text-sm text-muted-foreground mb-6">
      This action cannot be undone. This will permanently delete the {config?.displayName.toLowerCase()} from the database.
    </p>
    <div class="flex gap-3 justify-center">
      <Button intent="secondary" onclick={cancelDelete}>
        Cancel
      </Button>
      <Button intent="danger" onclick={confirmDelete}>
        Delete
      </Button>
    </div>
  </div>
</Drawer>
