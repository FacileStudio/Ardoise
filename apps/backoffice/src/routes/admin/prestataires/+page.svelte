<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Spinner, Button, Input, Drawer } from '@repo/ui';
	import { toast, downloadCSV } from '@repo/utils';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

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
	let logoUrls: Map<string, string> = $state(new Map());

	let showCreateDrawer = $state(false);
	let showEditDrawer = $state(false);
	let editingProvider: Provider | null = $state(null);

	let formData = $state({
		name: '',
		legalName: '',
		siret: '',
		address: '',
		city: '',
		country: 'France',
		email: '',
		phone: '',
		bankName: '',
		iban: '',
		bic: '',
		logoUrl: '',
		tvaRate: 20,
	});

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
			});
			providers = result.providers as Provider[];
			totalPages = result.totalPages;

			await loadLogos();
		} catch (err) {
			logger.error({ err }, 'Failed to load providers');
			toast.push('Erreur lors du chargement des prestataires', 'error');
		} finally {
			if (isInitialLoad) {
				pageLoading = false;
			} else {
				loading = false;
			}
		}
	}

	async function loadLogos() {
		const newLogoUrls = new Map();

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

		logoUrls = newLogoUrls;
	}

	function handleSearch(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;
		currentPage = 1;
		loadProviders();
	}

	function resetForm() {
		formData = {
			name: '',
			legalName: '',
			siret: '',
			address: '',
			city: '',
			country: 'France',
			email: '',
			phone: '',
			bankName: '',
			iban: '',
			bic: '',
			logoUrl: '',
			tvaRate: 20,
		};
	}

	function openCreateDrawer() {
		goto('/admin/prestataires/create');
	}

	function openEditDrawer(provider: Provider) {
		goto(`/admin/prestataires/${provider.id}`);
	}

	async function handleCreate() {
		if (!formData.name) {
			toast.push('Le nom est requis', 'error');
			return;
		}

		try {
			submitting = true;
			await trpc.provider.create.mutate(formData);
			toast.push('Prestataire créé avec succès!', 'success');
			showCreateDrawer = false;
			resetForm();
			await loadProviders();
		} catch (err: any) {
			logger.error({ err }, 'Failed to create provider');
			toast.push('Erreur lors de la création', 'error');
		} finally {
			submitting = false;
		}
	}

	async function handleUpdate() {
		if (!editingProvider || !formData.name) {
			toast.push('Le nom est requis', 'error');
			return;
		}

		try {
			submitting = true;
			await trpc.provider.update.mutate({
				id: editingProvider.id,
				data: formData,
			});
			toast.push('Prestataire modifié avec succès!', 'success');
			showEditDrawer = false;
			editingProvider = null;
			resetForm();
			await loadProviders();
		} catch (err: any) {
			logger.error({ err }, 'Failed to update provider');
			toast.push('Erreur lors de la modification', 'error');
		} finally {
			submitting = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Voulez-vous vraiment supprimer ce prestataire?')) return;

		try {
			await trpc.provider.delete.mutate({ id });
			toast.push('Prestataire supprimé avec succès', 'success');
			await loadProviders();
		} catch (err: any) {
			logger.error({ err }, 'Failed to delete provider');
			if (err.message.includes('associated documents')) {
				toast.push('Impossible de supprimer: le prestataire a des documents associés', 'error');
			} else {
				toast.push('Erreur lors de la suppression', 'error');
			}
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
		toast.push('Export réussi!', 'success');
	}
</script>

{#if pageLoading}
	<div class="flex flex-col items-center justify-center h-screen space-y-4">
		<Spinner size="xl" />
		<p class="text-xs text-muted-foreground">Chargement...</p>
	</div>
{:else}
	<div class="p-6 max-w-5xl mx-auto space-y-6">
		<header class="flex justify-between items-center">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground">Prestataires</h1>
				<p class="text-sm text-muted-foreground mt-1">Gérez les informations de vos différents prestataires</p>
			</div>
			<div class="flex gap-2">
				{#if providers.length > 0}
					<Button onclick={handleExportCSV}>
						<iconify-icon icon="solar:file-download-bold" width="16"></iconify-icon>
						Exporter CSV
					</Button>
				{/if}
				<button
					onclick={openCreateDrawer}
					class="bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium flex items-center gap-2"
				>
					<iconify-icon icon="mdi:plus" width="16"></iconify-icon>
					Nouveau prestataire
				</button>
			</div>
		</header>

		<div class="relative">
			<iconify-icon
				icon="solar:magnifer-linear"
				width="16"
				class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
			></iconify-icon>
			<input
				type="text"
				placeholder="Rechercher un prestataire..."
				class="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
				oninput={handleSearch}
			/>
		</div>

		{#if providers.length > 0}
			<div class="rounded-xl border border-border overflow-hidden">
				<table class="w-full">
					<thead class="bg-muted border-b border-border">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Logo</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">SIRET</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Téléphone</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Ville</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">TVA</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each providers as provider (provider.id)}
							<tr
								class="hover:bg-muted transition-colors cursor-pointer"
								onclick={(e) => {
									if (!(e.target as HTMLElement).closest('button')) {
										goto(`/admin/prestataires/${provider.id}`);
									}
								}}
							>
								<td class="px-4 py-3">
									{#if logoUrls.get(provider.id)}
										<div class="w-10 h-10 rounded-lg bg-background border border-border overflow-hidden flex items-center justify-center p-0.5">
											<img
												src={logoUrls.get(provider.id)}
												alt={provider.name}
												class="w-full h-full object-contain rounded"
												onerror={(e) => {
													const img = e.target as HTMLImageElement;
													img.style.display = 'none';
													const parent = img.parentElement;
													if (parent) {
														parent.innerHTML = '<iconify-icon icon="solar:buildings-2-bold" width="20" class="text-muted-foreground"></iconify-icon>';
													}
												}}
											/>
										</div>
									{:else}
										<div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
											<iconify-icon icon="solar:buildings-2-bold" width="20" class="text-muted-foreground"></iconify-icon>
										</div>
									{/if}
								</td>
								<td class="px-4 py-3">
									<div>
										<span class="text-sm font-medium text-foreground">{provider.name}</span>
										{#if provider.legalName}
											<p class="text-xs text-muted-foreground">{provider.legalName}</p>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm text-muted-foreground">{provider.siret || '-'}</span>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm text-muted-foreground">{provider.email || '-'}</span>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm text-muted-foreground">{provider.phone || '-'}</span>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm text-muted-foreground">{provider.city || '-'}</span>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm font-medium text-foreground">{provider.tvaRate}%</span>
								</td>
								<td class="px-4 py-3">
									<div class="flex justify-end gap-1">
										<button
											onclick={() => openEditDrawer(provider)}
											class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
											title="Modifier"
										>
											<iconify-icon icon="solar:pen-bold" width="16"></iconify-icon>
										</button>
										<button
											onclick={() => handleDelete(provider.id)}
											class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
											title="Supprimer"
										>
											<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if totalPages > 1}
				<div class="flex justify-center gap-1">
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pg}
						<button
							onclick={() => {
								currentPage = pg;
								loadProviders();
							}}
							class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {currentPage === pg
								? 'bg-primary text-primary-foreground'
								: 'bg-background text-foreground border border-border hover:bg-muted'}"
						>
							{pg}
						</button>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="text-center py-16">
				<div class="flex flex-col items-center gap-3">
					<iconify-icon icon="solar:buildings-2-bold" width="40" class="text-muted-foreground"></iconify-icon>
					<h3 class="text-lg font-semibold text-foreground">Aucun prestataire</h3>
					<p class="text-sm text-muted-foreground max-w-md">{searchQuery ? 'Aucun résultat trouvé pour votre recherche' : 'Créez votre premier prestataire pour commencer'}</p>
					{#if !searchQuery}
						<button
							onclick={openCreateDrawer}
							class="bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium flex items-center gap-2 mt-2"
						>
							<iconify-icon icon="mdi:plus" width="16"></iconify-icon>
							Nouveau prestataire
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

<Drawer bind:open={showCreateDrawer} title="Nouveau prestataire" onClose={() => (showCreateDrawer = false)}>
	<div class="space-y-4 pb-6">
		<div class="grid grid-cols-2 gap-4">
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">Nom du prestataire *</div>
				<Input bind:value={formData.name} placeholder="Nom du prestataire" required />
			</div>
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">Raison sociale</div>
				<Input bind:value={formData.legalName} placeholder="SARL Nom du prestataire" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">SIRET</div>
				<Input bind:value={formData.siret} placeholder="12345678900001" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Taux TVA (%)</div>
				<Input type="number" bind:value={formData.tvaRate} placeholder="20" />
			</div>
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">Adresse</div>
				<Input bind:value={formData.address} placeholder="123 Rue du Développeur" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Ville</div>
				<Input bind:value={formData.city} placeholder="75001 Paris" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Pays</div>
				<Input bind:value={formData.country} placeholder="France" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Email</div>
				<Input type="email" bind:value={formData.email} placeholder="contact@example.com" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Téléphone</div>
				<Input bind:value={formData.phone} placeholder="+33 1 23 45 67 89" />
			</div>
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">Banque</div>
				<Input bind:value={formData.bankName} placeholder="Banque Postale" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">IBAN</div>
				<Input bind:value={formData.iban} placeholder="FR76 1234 5678 9012 3456 7890 123" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">BIC</div>
				<Input bind:value={formData.bic} placeholder="PSSTFRPP" />
			</div>
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">URL du logo</div>
				<Input bind:value={formData.logoUrl} placeholder="https://example.com/logo.png" />
			</div>
		</div>

		<div class="flex gap-3 pt-4">
			<Button onclick={() => (showCreateDrawer = false)}>Annuler</Button>
			<Button intent="primary" onclick={handleCreate} disabled={submitting}>
				{#if submitting}
					<Spinner size="sm" />
				{/if}
				Créer
			</Button>
		</div>
	</div>
</Drawer>

<Drawer bind:open={showEditDrawer} title="Modifier le prestataire" onClose={() => (showEditDrawer = false)}>
	<div class="space-y-4 pb-6">
		<div class="grid grid-cols-2 gap-4">
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">Nom du prestataire *</div>
				<Input bind:value={formData.name} placeholder="Nom du prestataire" required />
			</div>
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">Raison sociale</div>
				<Input bind:value={formData.legalName} placeholder="SARL Nom du prestataire" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">SIRET</div>
				<Input bind:value={formData.siret} placeholder="12345678900001" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Taux TVA (%)</div>
				<Input type="number" bind:value={formData.tvaRate} placeholder="20" />
			</div>
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">Adresse</div>
				<Input bind:value={formData.address} placeholder="123 Rue du Développeur" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Ville</div>
				<Input bind:value={formData.city} placeholder="75001 Paris" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Pays</div>
				<Input bind:value={formData.country} placeholder="France" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Email</div>
				<Input type="email" bind:value={formData.email} placeholder="contact@example.com" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Téléphone</div>
				<Input bind:value={formData.phone} placeholder="+33 1 23 45 67 89" />
			</div>
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">Banque</div>
				<Input bind:value={formData.bankName} placeholder="Banque Postale" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">IBAN</div>
				<Input bind:value={formData.iban} placeholder="FR76 1234 5678 9012 3456 7890 123" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">BIC</div>
				<Input bind:value={formData.bic} placeholder="PSSTFRPP" />
			</div>
			<div class="col-span-2">
				<div class="text-sm font-medium mb-2">URL du logo</div>
				<Input bind:value={formData.logoUrl} placeholder="https://example.com/logo.png" />
			</div>
		</div>

		<div class="flex gap-3 pt-4">
			<Button onclick={() => (showEditDrawer = false)}>Annuler</Button>
			<Button intent="primary" onclick={handleUpdate} disabled={submitting}>
				{#if submitting}
					<Spinner size="sm" />
				{/if}
				Enregistrer
			</Button>
		</div>
	</div>
</Drawer>
