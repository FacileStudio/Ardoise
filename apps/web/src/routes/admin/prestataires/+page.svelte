<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import {
		Button,
		Card,
		ConfirmModal,
		EmptyState,
		Icon,
		Page,
		PageHeader,
		Spinner,
		Table,
		toast,
	} from '@facile/muse';
	import { icons, ardoise } from '$lib/icons';
	import { Pagination, SearchInput } from '$lib/ui';
	import { downloadCSV } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { spaceContext } from '$lib/space-context.svelte';

	type Provider = {
		id: string;
		name: string;
		legalName?: string | null;
		siret?: string | null;
		address?: string | null;
		city?: string | null;
		country: string;
		email?: string | null;
		phone?: string | null;
		bankName?: string | null;
		iban?: string | null;
		bic?: string | null;
		logoUrl?: string | null;
		tvaRate: number;
		createdAt: Date;
	};

	let pageLoading = $state(true);
	let loading = $state(false);
	let submitting = $state(false);
	let providers: Provider[] = $state([]);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let searchQuery = $state('');
	let searchInput = $state('');
	const logoUrls = new SvelteMap<string, string>();

	let failedLogos = new SvelteSet<string>();
	let pendingDelete: Provider | null = $state(null);
	let confirmDelete = $state(false);

	onMount(async () => {
		await loadProviders(true);
	});

	async function loadProviders(isInitialLoad = false) {
		if (isInitialLoad) {
			pageLoading = true;
		} else {
			loading = true;
		}
		try {
			const result = await trpc.provider.list.query({
				page: currentPage,
				limit: 20,
				search: searchQuery || undefined,
				spaceId: spaceContext.spaceId,
			});
			providers = result.providers as unknown as Provider[];
			totalPages = result.totalPages;

			await loadLogos();
		} catch (err) {
			logger.error({ err }, 'Failed to load providers');
			toast.danger('Erreur lors du chargement des prestataires');
		} finally {
			if (isInitialLoad) {
				pageLoading = false;
			} else {
				loading = false;
			}
		}
	}

	async function loadLogos() {
		const newLogoUrls = new SvelteMap<string, string>();

		for (const provider of providers) {
			if (
				provider.logoUrl &&
				(provider.logoUrl.includes('storageapi.dev') || provider.logoUrl.includes('/storage/'))
			) {
				try {
					const result = await trpc.media.getDownloadUrl.query({ url: provider.logoUrl });
					newLogoUrls.set(provider.id, result.url);
				} catch (err) {
					logger.error({ err, providerId: provider.id }, 'Failed to load logo');
				}
			} else if (provider.logoUrl) {
				newLogoUrls.set(provider.id, provider.logoUrl);
			}
		}

		logoUrls.clear();
		for (const [id, url] of newLogoUrls) logoUrls.set(id, url);
	}

	function handleSearch() {
		searchQuery = searchInput;
		currentPage = 1;
		loadProviders();
	}

	function askDelete(provider: Provider) {
		pendingDelete = provider;
		confirmDelete = true;
	}

	async function handleDelete() {
		if (!pendingDelete) return;
		const id = pendingDelete.id;

		try {
			await trpc.provider.delete.mutate({ id });
			toast.success('Prestataire supprimé avec succès');
			await loadProviders();
		} catch (err: any) {
			logger.error({ err }, 'Failed to delete provider');
			if (err.message.includes('associated documents')) {
				toast.danger('Impossible de supprimer: le prestataire a des documents associés');
			} else {
				toast.danger('Erreur lors de la suppression');
			}
		} finally {
			pendingDelete = null;
		}
	}

	function handleExportCSV() {
		const exportData = providers.map((p) => ({
			Nom: p.name,
			'Raison sociale': p.legalName || '',
			SIRET: p.siret || '',
			Adresse: p.address || '',
			Ville: p.city || '',
			Pays: p.country,
			Email: p.email || '',
			Téléphone: p.phone || '',
			Banque: p.bankName || '',
			IBAN: p.iban || '',
			BIC: p.bic || '',
			'Taux TVA': p.tvaRate,
		}));
		const date = new Date().toISOString().split('T')[0];
		downloadCSV(exportData, `prestataires-${date}`);
		toast.success('Export réussi!');
	}
</script>

<svelte:head><title>Prestataires - Ardoise</title></svelte:head>

{#snippet logo(provider: Provider)}
	<div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-fc-sm bg-fc-surface">
		{#if logoUrls.get(provider.id) && !failedLogos.has(provider.id)}
			<img
				src={logoUrls.get(provider.id)}
				alt={provider.name}
				class="size-full object-contain p-0.5"
				onerror={() => failedLogos.add(provider.id)}
			/>
		{:else}
			<Icon icon={ardoise.company} size={20} class="text-fc-fg-muted" />
		{/if}
	</div>
{/snippet}

{#if pageLoading}
	<div class="flex min-h-[40dvh] items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else}
	<Page width="xl">
		<PageHeader title="Prestataires" description="Gérez les informations de vos différents prestataires">
			{#snippet actions()}
				{#if providers.length > 0}
					<Button variant="ghost" icon={icons.download} onclick={handleExportCSV}>Exporter CSV</Button>
				{/if}
				<Button href={resolve('/admin/prestataires/create')} icon={icons.plus}>
					Nouveau prestataire
				</Button>
			{/snippet}
		</PageHeader>

		<SearchInput
			placeholder="Rechercher un prestataire..."
			bind:value={searchInput}
			oninput={handleSearch}
		/>

		{#if providers.length > 0}
			<div class="hidden md:block">
				<Table>
					<thead>
						<tr>
							<th scope="col" aria-label="Logo"></th>
							<th scope="col">Nom</th>
							<th scope="col">SIRET</th>
							<th scope="col">Email</th>
							<th scope="col">Téléphone</th>
							<th scope="col">Ville</th>
							<th scope="col">TVA</th>
							<th scope="col" aria-label="Actions"></th>
						</tr>
					</thead>
					<tbody>
						{#each providers as provider (provider.id)}
							<tr>
								<td>{@render logo(provider)}</td>
								<td>
									<a
										href={resolve(`/admin/prestataires/${provider.id}`)}
										class="flex flex-col rounded-fc-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
									>
										<span class="font-medium text-fc-fg">{provider.name}</span>
										{#if provider.legalName}
											<span class="text-fc-xs text-fc-fg-muted">{provider.legalName}</span>
										{/if}
									</a>
								</td>
								<td class="text-fc-fg-muted">{provider.siret || '-'}</td>
								<td class="text-fc-fg-muted">{provider.email || '-'}</td>
								<td class="text-fc-fg-muted">{provider.phone || '-'}</td>
								<td class="text-fc-fg-muted">{provider.city || '-'}</td>
								<td class="font-medium text-fc-fg">{provider.tvaRate}%</td>
								<td>
									<div class="flex justify-end gap-1">
										<Button
											variant="ghost"
											size="sm"
											icon={icons.edit}
											aria-label="Modifier"
											href={resolve(`/admin/prestataires/${provider.id}`)}
										/>
										<Button
											variant="ghost-danger"
											size="sm"
											icon={icons.remove}
											aria-label="Supprimer"
											onclick={() => askDelete(provider)}
										/>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</Table>
			</div>

			<div class="flex flex-col gap-2 md:hidden">
				{#each providers as provider (provider.id)}
					<Card class="flex flex-col gap-3">
						<a
							href={resolve(`/admin/prestataires/${provider.id}`)}
							class="flex min-w-0 items-center gap-3 rounded-fc-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
						>
							{@render logo(provider)}
							<span class="flex min-w-0 flex-col">
								<span class="truncate text-fc-sm font-medium text-fc-fg">{provider.name}</span>
								<span class="truncate text-fc-xs text-fc-fg-muted">
									{provider.email || provider.city || provider.siret || '-'}
								</span>
							</span>
						</a>
						<div class="flex items-center justify-end">
							<Button
								variant="ghost-danger"
								size="lg"
								icon={icons.remove}
								aria-label="Supprimer"
								onclick={() => askDelete(provider)}
							>
								Supprimer
							</Button>
						</div>
					</Card>
				{/each}
			</div>

			{#if totalPages > 1}
				<Pagination
					{currentPage}
					{totalPages}
					onPageChange={(page: number) => {
						currentPage = page;
						loadProviders();
					}}
				/>
			{/if}
		{:else}
			<EmptyState
				icon={ardoise.provider}
				title="Aucun prestataire"
				description={searchQuery
					? 'Aucun résultat trouvé pour votre recherche'
					: 'Créez votre premier prestataire pour commencer'}
			>
				{#if !searchQuery}
					<Button href={resolve('/admin/prestataires/create')} icon={icons.plus}>
						Nouveau prestataire
					</Button>
				{/if}
			</EmptyState>
		{/if}
	</Page>
{/if}

<ConfirmModal
	bind:open={confirmDelete}
	tone="danger"
	title="Supprimer {pendingDelete?.name ?? 'ce prestataire'} ?"
	description="Le prestataire est supprimé définitivement. Si des documents lui sont rattachés, la suppression est refusée."
	confirmLabel="Supprimer le prestataire"
	cancelLabel="Garder le prestataire"
	onConfirm={handleDelete}
	onCancel={() => (pendingDelete = null)}
/>
