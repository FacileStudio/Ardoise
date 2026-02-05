<script lang="ts">
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { logger } from '@repo/logger';

  let entities: string[] = [];
  let loading = true;

  onMount(async () => {
    try {
      entities = await trpc.admin.getEntities.query();
    } catch (e) {
      logger.error({ err: e }, 'Failed to load entities');
    } finally {
      loading = false;
    }
  });

  function navigateToEntity(entity: string) {
    goto(`/admin/${entity}`);
  }
</script>

<div class="admin-home">
  <div class="page-header">
    <h1>Admin Dashboard</h1>
    <p>Select an entity to manage</p>
  </div>

  {#if loading}
    <div class="loading">Loading entities...</div>
  {:else}
    <div class="entity-grid">
      {#each entities as entity}
        <button class="entity-card" on:click={() => navigateToEntity(entity)}>
          <div class="entity-icon">
            <iconify-icon icon="mdi:database" width="32"></iconify-icon>
          </div>
          <h3>{entity.charAt(0).toUpperCase() + entity.slice(1)}</h3>
          <p>Manage {entity} records</p>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .admin-home {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 3rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .page-header p {
    color: #6b7280;
    font-size: 1.125rem;
    margin: 0;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .entity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .entity-card {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .entity-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-2px);
  }

  .entity-icon {
    color: #3b82f6;
    margin-bottom: 1rem;
  }

  .entity-card h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .entity-card p {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }
</style>
