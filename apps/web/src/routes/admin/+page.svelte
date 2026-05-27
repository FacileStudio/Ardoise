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
  <div class="flex flex-col items-center justify-center h-screen space-y-4">
    <iconify-icon icon="svg-spinners:blocks-shuffle-3" width="40" class="text-foreground"></iconify-icon>
    <p class="text-sm text-muted-foreground">Chargement...</p>
  </div>
{:else}
  <div class="p-8 max-w-[1400px] mx-auto space-y-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">{$i18n.t('admin.dashboard.title')}</h1>
      <p class="text-sm text-muted-foreground mt-1">{$i18n.t('admin.dashboard.subtitle')}</p>
    </div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
      {#each entities as entity (entity)}
        <button
          class="rounded-xl border border-border p-6 hover:bg-muted/50 transition-colors cursor-pointer text-left"
          on:click={() => navigateToEntity(entity)}
        >
          <div class="text-muted-foreground mb-3">
            <iconify-icon icon="mdi:database" width="28"></iconify-icon>
          </div>
          <h3 class="text-base font-semibold text-foreground">{entity.charAt(0).toUpperCase() + entity.slice(1)}</h3>
          <p class="text-sm text-muted-foreground mt-1">Gérer les enregistrements {entity}</p>
        </button>
      {/each}
    </div>
  </div>
{/if}
