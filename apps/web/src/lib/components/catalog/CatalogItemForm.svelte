<script lang="ts">
	import { Button, Field, Input, Modal, Select, Textarea } from '@facile/muse';
	import { formatEuro } from '$lib/mission';
	import type { CatalogDraft, CatalogItem } from '$lib/catalog';
	import type { SpaceOption } from '$lib/space-filter.svelte';

	interface Props {
		open: boolean;
		editing: CatalogItem | null;
		draft: CatalogDraft;
		spaces: SpaceOption[];
		categories: string[];
		packs: string[];
		saving: boolean;
		onSave: () => void;
	}

	let {
		open = $bindable(),
		editing,
		draft = $bindable(),
		spaces,
		categories,
		packs,
		saving,
		onSave,
	}: Props = $props();

	const valid = $derived(
		Boolean(draft.spaceId && draft.name.trim() && (draft.quantity ?? 0) > 0 && (draft.unitPrice ?? -1) >= 0)
	);
	const total = $derived((draft.quantity ?? 0) * (draft.unitPrice ?? 0));

	const toNumber = (value: string) => (value === '' ? null : Number(value));
</script>

<Modal bind:open title={editing ? "Modifier l'élément" : 'Nouvel élément du catalogue'}>
	<form
		id="catalog-form"
		class="flex flex-col gap-3"
		onsubmit={(e) => {
			e.preventDefault();
			if (valid && !saving) onSave();
		}}
	>
		{#if !editing && spaces.length > 1}
			<Field label="Espace *">
				<Select bind:value={draft.spaceId}>
					<option value="">Choisir un espace</option>
					{#each spaces as space (space.id)}
						<option value={space.id}>{space.name}</option>
					{/each}
				</Select>
			</Field>
		{/if}
		<Field label="Nom *">
			<Input type="text" bind:value={draft.name} placeholder="Conception du site vitrine" />
		</Field>
		<Field label="Description">
			<Textarea bind:value={draft.description} rows={2} placeholder="Ce qui est inclus" />
		</Field>
		<div class="grid gap-3 sm:grid-cols-2">
			<Field label="Catégorie">
				<Input type="text" bind:value={draft.category} list="catalog-categories" placeholder="Web" />
			</Field>
			<Field label="Pack">
				<Input type="text" bind:value={draft.pack} list="catalog-packs" placeholder="Site vitrine" />
			</Field>
		</div>
		<div class="grid grid-cols-3 gap-3">
			<Field label="Quantité *">
				<Input
					type="number"
					min="0"
					step="0.01"
					value={draft.quantity ?? ''}
					oninput={(e) => (draft.quantity = toNumber(e.currentTarget.value))}
				/>
			</Field>
			<Field label="Unité">
				<Input type="text" bind:value={draft.unit} placeholder="jour" />
			</Field>
			<Field label="Prix unitaire HT *">
				<Input
					type="number"
					min="0"
					step="0.01"
					value={draft.unitPrice ?? ''}
					oninput={(e) => (draft.unitPrice = toNumber(e.currentTarget.value))}
				/>
			</Field>
		</div>
		<Field label="Facturation">
			<Select bind:value={draft.billing}>
				<option value="ONE_TIME">Ponctuel</option>
				<option value="MONTHLY">Mensuel (abonnement)</option>
			</Select>
		</Field>
		<p class="text-fc-sm text-fc-fg">
			Prix de base <span class="font-semibold">{formatEuro(total)}</span>{draft.billing === 'MONTHLY'
				? ' par mois'
				: ''}. Il reste modifiable sur chaque mission.
		</p>
		<datalist id="catalog-categories">
			{#each categories as category (category)}
				<option value={category}></option>
			{/each}
		</datalist>
		<datalist id="catalog-packs">
			{#each packs as pack (pack)}
				<option value={pack}></option>
			{/each}
		</datalist>
	</form>
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (open = false)}>Annuler</Button>
		<Button type="submit" form="catalog-form" disabled={!valid || saving}>
			{saving ? 'Enregistrement...' : 'Enregistrer'}
		</Button>
	{/snippet}
</Modal>
