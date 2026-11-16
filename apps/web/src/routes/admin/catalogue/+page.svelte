<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { Button, ConfirmModal, EmptyState, Page, PageHeader, Spinner, Switch, toast } from '@facile/muse';
	import { icons, ardoise } from '$lib/icons';
	import { spaceFilter } from '$lib/space-filter.svelte';
	import { groupByCategory, type CatalogDraft, type CatalogItem } from '$lib/catalog';
	import CatalogTable from '$lib/components/catalog/CatalogTable.svelte';
	import CatalogItemForm from '$lib/components/catalog/CatalogItemForm.svelte';
	import { logger } from '@repo/logger';

	let loading = $state(true);
	let saving = $state(false);
	let items: CatalogItem[] = $state([]);
	let showArchived = $state(false);
	let editing: CatalogItem | null = $state(null);
	let formOpen = $state(false);
	let draft: CatalogDraft = $state(emptyDraft());
	let pendingDelete: CatalogItem | null = $state(null);
	let confirmDelete = $state(false);

	const groups = $derived(groupByCategory(items));
	const categories = $derived([...new Set(items.flatMap((i) => (i.category ? [i.category] : [])))]);
	const packs = $derived([...new Set(items.flatMap((i) => (i.pack ? [i.pack] : [])))]);

	$effect(() => {
		void load(spaceFilter.spaceId, showArchived);
	});

	function emptyDraft(): CatalogDraft {
		const spaces = spaceFilter.spaces;
		return {
			spaceId: spaceFilter.spaceId ?? (spaces.length === 1 ? spaces[0].id : ''),
			category: '',
			pack: '',
			name: '',
			description: '',
			quantity: 1,
			unit: 'jour',
			unitPrice: 0,
			billing: 'ONE_TIME',
		};
	}

	async function load(spaceId = spaceFilter.spaceId, includeArchived = showArchived) {
		try {
			items = (await trpc.catalog.list.query({ spaceId, includeArchived })) as unknown as CatalogItem[];
		} catch (err) {
			logger.error({ err }, 'Failed to load the catalog');
			toast.danger('Erreur lors du chargement du catalogue');
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		editing = null;
		draft = emptyDraft();
		formOpen = true;
	}

	function openEdit(item: CatalogItem) {
		editing = item;
		draft = {
			spaceId: item.spaceId,
			category: item.category ?? '',
			pack: item.pack ?? '',
			name: item.name,
			description: item.description ?? '',
			quantity: Number(item.quantity),
			unit: item.unit,
			unitPrice: Number(item.unitPrice),
			billing: item.billing,
		};
		formOpen = true;
	}

	async function save() {
		saving = true;
		const { spaceId, ...fields } = draft;
		const data = {
			...fields,
			quantity: fields.quantity as number,
			unitPrice: fields.unitPrice as number,
			unit: fields.unit.trim() || 'jour',
		};
		try {
			if (editing) {
				await trpc.catalog.update.mutate({ id: editing.id, data });
				toast.success('Élément mis à jour');
			} else {
				await trpc.catalog.create.mutate({ ...data, spaceId });
				toast.success('Élément ajouté au catalogue');
			}
			formOpen = false;
			await load();
		} catch (err) {
			logger.error({ err }, 'Failed to save a catalog item');
			toast.danger("Erreur lors de l'enregistrement");
		} finally {
			saving = false;
		}
	}

	async function toggle(item: CatalogItem) {
		try {
			await trpc.catalog.update.mutate({ id: item.id, data: { active: !item.active } });
			toast.success(item.active ? 'Élément archivé : il ne sera plus proposé' : 'Élément réactivé');
			await load();
		} catch (err) {
			logger.error({ err }, 'Failed to archive a catalog item');
			toast.danger('Erreur lors de la mise à jour');
		}
	}

	async function handleDelete() {
		if (!pendingDelete) return;
		try {
			await trpc.catalog.delete.mutate({ id: pendingDelete.id });
			toast.success('Élément supprimé');
			await load();
		} catch (err) {
			logger.error({ err }, 'Failed to delete a catalog item');
			toast.danger('Erreur lors de la suppression');
		} finally {
			pendingDelete = null;
		}
	}
</script>

{#if loading}
	<div class="flex h-64 items-center justify-center">
		<Spinner />
	</div>
{:else}
	<Page width="xl">
		<PageHeader
			title="Catalogue"
			description="Vos prestations et produits avec leur prix de base. Sur une mission, le prix reste négociable."
		>
			{#snippet actions()}
				<Switch label="Voir les archivés" bind:checked={showArchived} />
				<Button icon={icons.plus} onclick={openCreate}>Nouvel élément</Button>
			{/snippet}
		</PageHeader>

		{#if items.length === 0}
			<EmptyState
				icon={ardoise.catalog}
				title="Catalogue vide"
				description="Ajoutez ce que vous vendez une fois, puis reprenez-le en un clic dans vos missions."
			>
				<Button icon={icons.plus} onclick={openCreate}>Nouvel élément</Button>
			</EmptyState>
		{:else}
			{#each groups as [category, rows] (category)}
				<CatalogTable
					title={category}
					items={rows}
					onEdit={openEdit}
					onToggle={toggle}
					onDelete={(item) => {
						pendingDelete = item;
						confirmDelete = true;
					}}
				/>
			{/each}
		{/if}
	</Page>
{/if}

<CatalogItemForm
	bind:open={formOpen}
	bind:draft
	{editing}
	spaces={spaceFilter.spaces}
	{categories}
	{packs}
	{saving}
	onSave={save}
/>

<ConfirmModal
	bind:open={confirmDelete}
	tone="danger"
	title="Supprimer {pendingDelete?.name ?? 'cet élément'} ?"
	description="Les missions gardent leurs lignes et leurs prix. Pour le masquer sans le perdre, archivez-le."
	confirmLabel="Supprimer l'élément"
	cancelLabel="Garder l'élément"
	onConfirm={handleDelete}
	onCancel={() => (pendingDelete = null)}
/>
