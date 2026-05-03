<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { logger } from '@repo/logger';
  import { i18n } from '@repo/i18n/svelte';

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
    goto(resolve(`/admin/${entity}`));
  }
</script>

{#if loading}
  <div class="flex flex-col items-center justify-center h-screen space-y-6">
    <iconify-icon icon="svg-spinners:blocks-shuffle-3" width="48" class="text-[#291334]"></iconify-icon>
    <p class="text-xs font-black uppercase tracking-[0.3em] text-[#291334]/40">
      Chargement...
    </p>
  </div>
{:else}
  <div class="admin-home">
    <div class="page-header">
      <h1>{$i18n.t('backoffice.dashboard.title')}</h1>
      <p>{$i18n.t('backoffice.dashboard.subtitle')}</p>
    </div>
    <div class="entity-grid">
      {#each entities as entity (entity)}
        <button class="entity-card" on:click={() => navigateToEntity(entity)}>
          <div class="entity-icon">
            <iconify-icon icon="mdi:database" width="32"></iconify-icon>
          </div>
          <h3>{entity.charAt(0).toUpperCase() + entity.slice(1)}</h3>
          <p>Gérer les enregistrements {entity}</p>
        </button>
      {/each}
    </div>
  </div>
{/if}

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
