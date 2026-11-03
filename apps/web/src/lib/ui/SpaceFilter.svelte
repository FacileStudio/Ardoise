<script lang="ts">
  import { Select } from '@facile/muse';
  import { cn } from '@repo/utils';
  import { i18n } from '@repo/i18n/svelte';
  import { spaceFilter } from '$lib/space-filter.svelte';

  let { class: className = '' }: { class?: string } = $props();
</script>

{#if spaceFilter.spaces.length > 1}
  <Select
    value={spaceFilter.spaceId ?? ''}
    onchange={(event) => spaceFilter.select(event.currentTarget.value || null)}
    aria-label={$i18n.t('nav.filterBySpace')}
    class={cn('sm:w-56', className)}
  >
    <option value="">{$i18n.t('nav.allSpaces')}</option>
    {#each spaceFilter.spaces as space (space.id)}
      <option value={space.id}>{space.name}</option>
    {/each}
  </Select>
{/if}
