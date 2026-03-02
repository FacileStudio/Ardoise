<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
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
			if (provider.logoUrl && provider.logoUrl.includes('storageapi.dev')) {
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
	<div class="flex flex-col items-center justify-center h-screen space-y-6">
		<iconify-icon icon="svg-spinners:blocks-shuffle-3" width="48" class="text-[#291334]"></iconify-icon>
		<p class="text-xs font-black uppercase tracking-[0.3em] text-[#291334]/40">
			Chargement...
		</p>
	</div>
{:else}
	<div class="p-8 max-w-[1400px] mx-auto space-y-6">
		<header class="flex justify-between items-center" in:fade>
			<div>
				<h1 class="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
					<iconify-icon icon="solar:buildings-2-bold" width="32" class="text-[#291334]"
					></iconify-icon>
					Prestataires
				</h1>
				<p class="text-slate-500 text-sm mt-1">Gérez les informations de vos différents prestataires</p>
			</div>
			<div class="flex gap-3">
				{#if providers.length > 0}
					<Button onclick={handleExportCSV} class="rounded-full">
						<iconify-icon icon="solar:file-download-bold" width="18"></iconify-icon>
						<span>Exporter CSV</span>
					</Button>
				{/if}
				<button
					onclick={openCreateDrawer}
					class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
				>
					<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
					<span>Nouveau prestataire</span>
				</button>
			</div>
		</header>

		<div class="relative" in:fly={{ y: 20, delay: 100 }}>
			<iconify-icon
				icon="solar:magnifer-linear"
				width="20"
				class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
			></iconify-icon>
			<input
				type="text"
				placeholder="Rechercher un prestataire..."
				class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-all"
				oninput={handleSearch}
			/>
		</div>

		{#if providers.length > 0}
			<div class="bg-white rounded-2xl border border-slate-100 overflow-hidden" in:fade>
				<table class="w-full">
					<thead class="bg-slate-50 border-b border-slate-100">
						<tr>
							<th
								class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>Logo</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>Nom</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>SIRET</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>Email</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>Téléphone</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>Ville</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>TVA</th
							>
							<th
								class="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase tracking-wider"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each providers as provider (provider.id)}
							<tr
								class="hover:bg-[#FAF7F5] transition-colors cursor-pointer"
								onclick={(e) => {
									if (!(e.target as HTMLElement).closest('button')) {
										goto(`/admin/prestataires/${provider.id}`);
									}
								}}
							>
								<td class="px-6 py-4">
									{#if logoUrls.get(provider.id)}
										<div class="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1">
											<img
												src={logoUrls.get(provider.id)}
												alt={provider.name}
												class="w-full h-full object-contain rounded-lg"
												onerror={(e) => {
													const img = e.target as HTMLImageElement;
													img.style.display = 'none';
													const parent = img.parentElement;
													if (parent) {
														parent.innerHTML = '<iconify-icon icon="solar:buildings-2-bold" width="24" class="text-slate-300"></iconify-icon>';
													}
												}}
											/>
										</div>
									{:else}
										<div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
											<iconify-icon icon="solar:buildings-2-bold" width="24" class="text-slate-300"></iconify-icon>
										</div>
									{/if}
								</td>
								<td class="px-6 py-4">
									<div>
										<span class="font-bold text-slate-900">{provider.name}</span>
										{#if provider.legalName}
											<p class="text-xs text-slate-500">{provider.legalName}</p>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-slate-600">{provider.siret || '-'}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-slate-600">{provider.email || '-'}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-slate-600">{provider.phone || '-'}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-slate-600">{provider.city || '-'}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm font-bold text-[#291334]">{provider.tvaRate}%</span>
								</td>
								<td class="px-6 py-4">
									<div class="flex justify-end gap-2">
										<button
											onclick={() => openEditDrawer(provider)}
											class="p-2 text-[#291334] hover:bg-[#291334]/10 rounded-lg transition-colors"
											title="Modifier"
										>
											<iconify-icon icon="solar:pen-bold" width="18"></iconify-icon>
										</button>
										<button
											onclick={() => handleDelete(provider.id)}
											class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
											title="Supprimer"
										>
											<iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if totalPages > 1}
				<div class="flex justify-center gap-2">
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
						<button
							onclick={() => {
								currentPage = page;
								loadProviders();
							}}
							class="px-4 py-2 rounded-xl font-bold text-sm transition-all {currentPage === page
								? 'bg-[#291334] text-white'
								: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
						>
							{page}
						</button>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="text-center py-16" in:fly={{ y: 20, delay: 200 }}>
				<div class="flex flex-col items-center gap-4">
					<div class="w-20 h-20 bg-[#FEC129]/20 text-[#291334] rounded-2xl flex items-center justify-center">
						<iconify-icon icon="solar:buildings-2-bold" width="40"></iconify-icon>
					</div>
					<h3 class="text-2xl font-black text-[#291334]">Aucun prestataire</h3>
					<p class="text-[#291334]/60 max-w-md">{searchQuery ? 'Aucun résultat trouvé pour votre recherche' : 'Créez votre premier prestataire pour commencer'}</p>
					{#if !searchQuery}
						<button
							onclick={openCreateDrawer}
							class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer mt-2"
						>
							<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
							<span>Nouveau prestataire</span>
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
				<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
					<iconify-icon icon="solar:buildings-2-bold" width="16" class="text-[#FEC129]"
					></iconify-icon>
					Nom du prestataire *
				</label>
				<Input bind:value={formData.name} placeholder="Nom du prestataire" required />
			</div>

			<div class="col-span-2">
				<label class="block text-sm font-black text-slate-700 mb-2">Raison sociale</label>
				<Input bind:value={formData.legalName} placeholder="SARL Nom du prestataire" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">SIRET</label>
				<Input bind:value={formData.siret} placeholder="12345678900001" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Taux TVA (%)</label>
				<Input type="number" bind:value={formData.tvaRate} placeholder="20" />
			</div>

			<div class="col-span-2">
				<label class="block text-sm font-black text-slate-700 mb-2">Adresse</label>
				<Input bind:value={formData.address} placeholder="123 Rue du Développeur" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Ville</label>
				<Input bind:value={formData.city} placeholder="75001 Paris" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Pays</label>
				<Input bind:value={formData.country} placeholder="France" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Email</label>
				<Input type="email" bind:value={formData.email} placeholder="contact@example.com" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Téléphone</label>
				<Input bind:value={formData.phone} placeholder="+33 1 23 45 67 89" />
			</div>

			<div class="col-span-2">
				<label class="block text-sm font-black text-slate-700 mb-2">Banque</label>
				<Input bind:value={formData.bankName} placeholder="Banque Postale" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">IBAN</label>
				<Input bind:value={formData.iban} placeholder="FR76 1234 5678 9012 3456 7890 123" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">BIC</label>
				<Input bind:value={formData.bic} placeholder="PSSTFRPP" />
			</div>

			<div class="col-span-2">
				<label class="block text-sm font-black text-slate-700 mb-2">URL du logo</label>
				<Input bind:value={formData.logoUrl} placeholder="https://example.com/logo.png" />
			</div>
		</div>

		<div class="flex gap-3 pt-4">
			<Button onclick={() => (showCreateDrawer = false)}>Annuler</Button>
			<Button intent="primary" onclick={handleCreate} disabled={submitting}>
				{#if submitting}
					<Spinner size="sm" />
				{:else}
					<iconify-icon icon="solar:check-circle-bold" width="18"></iconify-icon>
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
				<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
					<iconify-icon icon="solar:buildings-2-bold" width="16" class="text-[#FEC129]"
					></iconify-icon>
					Nom du prestataire *
				</label>
				<Input bind:value={formData.name} placeholder="Nom du prestataire" required />
			</div>

			<div class="col-span-2">
				<label class="block text-sm font-black text-slate-700 mb-2">Raison sociale</label>
				<Input bind:value={formData.legalName} placeholder="SARL Nom du prestataire" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">SIRET</label>
				<Input bind:value={formData.siret} placeholder="12345678900001" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Taux TVA (%)</label>
				<Input type="number" bind:value={formData.tvaRate} placeholder="20" />
			</div>

			<div class="col-span-2">
				<label class="block text-sm font-black text-slate-700 mb-2">Adresse</label>
				<Input bind:value={formData.address} placeholder="123 Rue du Développeur" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Ville</label>
				<Input bind:value={formData.city} placeholder="75001 Paris" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Pays</label>
				<Input bind:value={formData.country} placeholder="France" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Email</label>
				<Input type="email" bind:value={formData.email} placeholder="contact@example.com" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">Téléphone</label>
				<Input bind:value={formData.phone} placeholder="+33 1 23 45 67 89" />
			</div>

			<div class="col-span-2">
				<label class="block text-sm font-black text-slate-700 mb-2">Banque</label>
				<Input bind:value={formData.bankName} placeholder="Banque Postale" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">IBAN</label>
				<Input bind:value={formData.iban} placeholder="FR76 1234 5678 9012 3456 7890 123" />
			</div>

			<div>
				<label class="block text-sm font-black text-slate-700 mb-2">BIC</label>
				<Input bind:value={formData.bic} placeholder="PSSTFRPP" />
			</div>

			<div class="col-span-2">
				<label class="block text-sm font-black text-slate-700 mb-2">URL du logo</label>
				<Input bind:value={formData.logoUrl} placeholder="https://example.com/logo.png" />
			</div>
		</div>

		<div class="flex gap-3 pt-4">
			<Button onclick={() => (showEditDrawer = false)}>Annuler</Button>
			<Button intent="primary" onclick={handleUpdate} disabled={submitting}>
				{#if submitting}
					<Spinner size="sm" />
				{:else}
					<iconify-icon icon="solar:check-circle-bold" width="18"></iconify-icon>
				{/if}
				Enregistrer
			</Button>
		</div>
	</div>
</Drawer>
