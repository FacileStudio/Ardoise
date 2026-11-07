<script lang="ts">
  import { Select } from '@facile/muse';
  import { cn } from '@repo/utils';
  import { i18n } from '@repo/i18n/svelte';
  import { spaceFilter } from '$lib/space-filter.svelte';

  let { class: className = '', adminOnly = false }: { class?: string; adminOnly?: boolean } =
    $props();

  const options = $derived(adminOnly ? spaceFilter.adminSpaces : spaceFilter.spaces);
  const current = $derived(adminOnly ? spaceFilter.adminSpaceId : spaceFilter.spaceId);
</script>

{#if options.length > 1}
  <Select
    value={current ?? ''}
    onchange={(event) => spaceFilter.select(event.currentTarget.value || null)}
    aria-label={$i18n.t('nav.filterBySpace')}
    class={cn('sm:w-56', className)}
  >
    <option value="">{$i18n.t('nav.allSpaces')}</option>
    {#each options as space (space.id)}
      <option value={space.id}>{space.name}</option>
    {/each}
  </Select>
{/if}
