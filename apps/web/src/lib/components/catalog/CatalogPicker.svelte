<script lang="ts">
	import { onMount } from 'svelte';
	import { Select } from '@facile/muse';
	import { trpc } from '$lib/trpc';
	import { formatEuro } from '$lib/mission';
	import { groupByCategory, itemTotal, type CatalogItem } from '$lib/catalog';

	interface Props {
		spaceId: string;
		onPick: (item: CatalogItem) => void;
	}

	let { spaceId, onPick }: Props = $props();

	let catalog: CatalogItem[] = $state([]);
	const groups = $derived(groupByCategory(catalog));

	onMount(async () => {
		try {
			catalog = (await trpc.catalog.list.query({ spaceId })) as unknown as CatalogItem[];
		} catch {
			catalog = [];
		}
	});

	function pick(select: HTMLSelectElement) {
		const item = catalog.find((entry) => entry.id === select.value);
		select.value = '';
		if (item) onPick(item);
	}
</script>

{#if catalog.length > 0}
	<Select
		value=""
		onchange={(e) => pick(e.currentTarget)}
		aria-label="Ajouter depuis le catalogue"
		class="h-9 max-w-72"
	>
		<option value="">Ajouter depuis le catalogue</option>
		{#each groups as [category, entries] (category)}
			<optgroup label={category}>
				{#each entries as entry (entry.id)}
					<option value={entry.id}>
						{entry.name} · {formatEuro(itemTotal(entry))}{entry.billing === 'MONTHLY' ? ' / mois' : ''}
					</option>
				{/each}
			</optgroup>
		{/each}
	</Select>
{/if}
