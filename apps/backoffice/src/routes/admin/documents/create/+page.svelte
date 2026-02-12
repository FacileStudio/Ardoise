<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { Spinner, Button, Input } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

	type DocType = 'prestation' | 'maintenance' | 'contrat_prestation' | 'contrat_maintenance' | 'back_contractuel' | 'appel_de_fonds';

	interface Client {
		id: string;
		companyName: string;
		siret?: string | null;
		billingAddress?: string | null;
		billingCity?: string | null;
		billingCountry?: string | null;
	}

	interface Provider {
		id: string;
		name: string;
		legalName?: string | null;
		siret?: string | null;
		address?: string | null;
		city?: string | null;
		email?: string | null;
		phone?: string | null;
		bankName?: string | null;
		iban?: string | null;
		bic?: string | null;
		tvaRate: number;
	}

	let generating = $state(false);
	let showPreview = $state(false);
	let previewPdf = $state('');

	let docTypes: Array<{ value: string; label: string }> = $state([]);
	let clients: Client[] = $state([]);
	let providers: Provider[] = $state([]);
	let selectedClientId = $state('');
	let selectedProviderId = $state('');

	let formData = $state<any>({
		type: 'prestation',
		invoice_number: 'FAC-001',
		invoice_date: new Date().toISOString().split('T')[0],
		due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		quote_number: 'DEV-001',
		quote_date: new Date().toISOString().split('T')[0],
		validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		contract_reference: 'CTR-001',
		contract_date: new Date().toISOString().split('T')[0],
		maintenance_period: '1 mois',
		client_name: '',
		client_address: '',
		client_city: '',
		client_country: 'France',
		client_siret: '',
		provider_name: '',
		provider_legal: '',
		provider_address: '',
		provider_city: '',
		provider_siret: '',
		provider_email: '',
		provider_phone: '',
		bank_name: '',
		iban: '',
		bic: '',
		items: [],
		tva_rate: 20,
		railway_estimate: 0,
		providerId: '',
		// For back_contractuel
		project_name: '',
		valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		providers: [],
		features: [],
		// For appel_de_fonds
		global_invoice_ref: 'ADF-001',
		project_step: 'Acompte 30%',
		payment_providers: [],
	});

	let newItem = $state({ description: '', quantity: 1, unit: 'jour', price: 0 });

	onMount(async () => {
		await Promise.all([loadDocumentTypes(), loadClients(), loadProviders()]);
	});

	$effect(() => {
		if (selectedClientId) {
			const client = clients.find((c) => c.id === selectedClientId);
			if (client) {
				formData.client_name = client.companyName;
				formData.client_siret = client.siret || '';
				formData.client_address = client.billingAddress || '';
				formData.client_city = client.billingCity || '';
				formData.client_country = client.billingCountry || 'France';
			}
		}
	});

	$effect(() => {
		if (selectedProviderId) {
			const provider = providers.find((p) => p.id === selectedProviderId);
			if (provider) {
				formData.providerId = provider.id;
				formData.provider_name = provider.name;
				formData.provider_legal = provider.legalName || '';
				formData.provider_siret = provider.siret || '';
				formData.provider_address = provider.address || '';
				formData.provider_city = provider.city || '';
				formData.provider_email = provider.email || '';
				formData.provider_phone = provider.phone || '';
				formData.bank_name = provider.bankName || '';
				formData.iban = provider.iban || '';
				formData.bic = provider.bic || '';
				formData.tva_rate = provider.tvaRate;
			}
		}
	});

	async function loadDocumentTypes() {
		try {
			docTypes = await trpc.document.types.query();
			if (docTypes.length > 0 && !formData.type) {
				formData.type = docTypes[0].value;
			}
		} catch (err) {
			logger.error({ err }, 'Failed to fetch document types');
			toast.push('Erreur lors du chargement des types de documents', 'error');
		}
	}

	async function loadClients() {
		try {
			const result = await trpc.client.list.query({ page: 1, limit: 100 });
			clients = result.clients as Client[];
		} catch (err) {
			logger.error({ err }, 'Failed to fetch clients');
		}
	}

	async function loadProviders() {
		try {
			const result = await trpc.provider.list.query({ page: 1, limit: 100 });
			providers = result.providers as Provider[];
		} catch (err) {
			logger.error({ err}, 'Failed to fetch providers');
		}
	}

	function validateForm(): string | null {
		if (!selectedClientId) {
			return 'Veuillez sélectionner un client';
		}

		if (!selectedProviderId) {
			return 'Veuillez sélectionner un prestataire';
		}

		if (formData.type === 'prestation' || formData.type === 'maintenance') {
			if (!formData.items || formData.items.length === 0) {
				return 'Veuillez ajouter au moins un item à la facture';
			}
		}

		if (formData.type === 'prestation' && !formData.invoice_number) {
			return 'Veuillez saisir un numéro de facture';
		}

		if (formData.type === 'maintenance' && !formData.quote_number) {
			return 'Veuillez saisir un numéro de devis';
		}

		if (
			(formData.type === 'contrat_prestation' || formData.type === 'contrat_maintenance') &&
			!formData.contract_reference
		) {
			return 'Veuillez saisir une référence de contrat';
		}

		return null;
	}

	async function handlePreview() {
		const validationError = validateForm();
		if (validationError) {
			toast.push(validationError, 'error');
			return;
		}

		try {
			generating = true;
			const result = await trpc.document.preview.mutate({
				...formData,
				tva_rate: Number(formData.tva_rate),
				railway_estimate: Number(formData.railway_estimate || 0),
			});
			previewPdf = result.pdf;
			showPreview = true;
		} catch (err: any) {
			logger.error({ err }, 'Failed to preview document');
			const message = err.message || 'Erreur lors de la prévisualisation';
			toast.push(message, 'error');
		} finally {
			generating = false;
		}
	}

	async function handleCreate() {
		const validationError = validateForm();
		if (validationError) {
			toast.push(validationError, 'error');
			return;
		}

		try {
			generating = true;
			const result = await trpc.document.create.mutate({
				...formData,
				tva_rate: Number(formData.tva_rate),
				railway_estimate: Number(formData.railway_estimate || 0),
			});

			const pdfBlob = base64ToBlob(result.pdf, 'application/pdf');
			const url = URL.createObjectURL(pdfBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = result.fileName;
			a.click();
			URL.revokeObjectURL(url);

			toast.push('Document créé avec succès!', 'success');
			goto('/admin/documents');
		} catch (err: any) {
			logger.error({ err }, 'Failed to create document');
			const message = err.message || 'Erreur lors de la création';
			toast.push(message, 'error');
		} finally {
			generating = false;
		}
	}

	function addItem() {
		if (!newItem.description || newItem.price <= 0) {
			toast.push("Veuillez remplir tous les champs de l'item", 'error');
			return;
		}
		formData.items = [...formData.items, { ...newItem }];
		newItem = { description: '', quantity: 1, unit: 'jour', price: 0 };
	}

	function removeItem(index: number) {
		formData.items = formData.items.filter((_: any, i: number) => i !== index);
	}

	function base64ToBlob(base64: string, contentType: string): Blob {
		const byteCharacters = atob(base64);
		const byteArrays = [];

		for (let offset = 0; offset < byteCharacters.length; offset += 512) {
			const slice = byteCharacters.slice(offset, offset + 512);
			const byteNumbers = new Array(slice.length);

			for (let i = 0; i < slice.length; i++) {
				byteNumbers[i] = slice.charCodeAt(i);
			}

			const byteArray = new Uint8Array(byteNumbers);
			byteArrays.push(byteArray);
		}

		return new Blob(byteArrays, { type: contentType });
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount);
	}

	const subtotal = $derived(
		formData.items.reduce((sum: number, item: any) => sum + item.quantity * item.price, 0)
	);
	const totalWithRailway = $derived(subtotal + (formData.railway_estimate || 0));
	const tva = $derived(totalWithRailway * (formData.tva_rate / 100));
	const total = $derived(totalWithRailway + tva);
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
	<div class="max-w-[1200px] mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<button
				onclick={() => goto('/admin/documents')}
				class="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="20"></iconify-icon>
				<span class="font-bold">Retour aux documents</span>
			</button>
			<h1 class="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
				<iconify-icon icon="solar:document-add-bold" width="40" class="text-[#291334]"
				></iconify-icon>
				Créer un document
			</h1>
			<p class="text-slate-500 mt-2">Générez une facture, un devis ou un contrat</p>
		</div>

		<!-- Main Form -->
		<div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
			<!-- Type de document -->
			<div class="space-y-4">
				<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
					<iconify-icon icon="solar:document-text-bold" width="24" class="text-[#291334]"
					></iconify-icon>
					Type de document
				</h2>
				<select
					bind:value={formData.type}
					class="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] font-bold transition-all text-lg"
				>
					{#each docTypes as type (type.value)}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>

				<div class="grid grid-cols-3 gap-4">
					{#if formData.type === 'prestation'}
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								N° Facture
							</label>
							<Input bind:value={formData.invoice_number} />
						</div>
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date Facture
							</label>
							<Input type="date" bind:value={formData.invoice_date} />
						</div>
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:alarm-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Date Échéance
							</label>
							<Input type="date" bind:value={formData.due_date} />
						</div>
					{:else if formData.type === 'maintenance'}
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								N° Devis
							</label>
							<Input bind:value={formData.quote_number} />
						</div>
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date Devis
							</label>
							<Input type="date" bind:value={formData.quote_date} />
						</div>
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:alarm-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Validité
							</label>
							<Input type="date" bind:value={formData.validity_date} />
						</div>
					{:else}
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Référence Contrat
							</label>
							<Input bind:value={formData.contract_reference} />
						</div>
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date Contrat
							</label>
							<Input type="date" bind:value={formData.contract_date} />
						</div>
					{/if}
				</div>
			</div>

			<div class="border-t border-slate-200"></div>

			<!-- Client Section -->
			<div class="space-y-4">
				<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
					<iconify-icon icon="solar:user-bold" width="24" class="text-[#291334]"></iconify-icon>
					Client
				</h2>
				<select
					bind:value={selectedClientId}
					class="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] font-bold transition-all text-lg"
				>
					<option value="">-- Sélectionner un client --</option>
					{#each clients as client (client.id)}
						<option value={client.id}>{client.companyName}</option>
					{/each}
				</select>
				{#if selectedClientId}
					<div
						transition:fly={{ y: -10, duration: 200 }}
						class="p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3"
					>
						<iconify-icon icon="solar:check-circle-bold" width="24" class="text-green-600"
						></iconify-icon>
						<div>
							<div class="font-black text-green-900">{formData.client_name}</div>
							<div class="text-sm text-green-700">
								{formData.client_address}, {formData.client_city}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="border-t border-slate-200"></div>

			<!-- Provider Section -->
			<div class="space-y-4">
				<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
					<iconify-icon icon="solar:buildings-2-bold" width="24" class="text-[#291334]"
					></iconify-icon>
					Prestataire
				</h2>
				<select
					bind:value={selectedProviderId}
					class="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] font-bold transition-all text-lg"
				>
					<option value="">-- Sélectionner un prestataire --</option>
					{#each providers as provider (provider.id)}
						<option value={provider.id}>{provider.name}</option>
					{/each}
				</select>
				{#if selectedProviderId}
					<div
						transition:fly={{ y: -10, duration: 200 }}
						class="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl flex items-center gap-3"
					>
						<iconify-icon icon="solar:check-circle-bold" width="24" class="text-purple-600"
						></iconify-icon>
						<div>
							<div class="font-black text-purple-900">{formData.provider_name}</div>
							<div class="text-sm text-purple-700">
								TVA: {formData.tva_rate}% • {formData.provider_email}
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if formData.type === 'prestation' || formData.type === 'maintenance'}
				<div class="border-t border-slate-200"></div>

				<!-- Items Section -->
				<div class="space-y-6">
					<div class="flex justify-between items-center">
						<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
							<iconify-icon icon="solar:list-bold" width="24" class="text-[#291334]"></iconify-icon>
							Items de facturation
						</h2>
						{#if formData.items.length > 0}
							<div
								transition:fly={{ x: 10, duration: 200 }}
								class="px-4 py-2 bg-[#291334] text-white rounded-lg text-sm font-black"
							>
								Total: {formatCurrency(total)} TTC
							</div>
						{/if}
					</div>

					<!-- Add Item Form -->
					<div
						class="space-y-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl"
					>
						<h3 class="text-sm font-black text-slate-700 flex items-center gap-2">
							<iconify-icon icon="mdi:plus-circle" width="20" class="text-[#FEC129]"></iconify-icon>
							Ajouter un item
						</h3>
						<div class="space-y-4">
							<div>
								<label
									class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2"
								>
									<iconify-icon icon="solar:pen-bold" width="14" class="text-[#FEC129]"
									></iconify-icon>
									Que facturez-vous ?
								</label>
								<textarea
									placeholder="Ex: Développement d'un site web vitrine responsive avec système de gestion de contenu..."
									bind:value={newItem.description}
									rows="3"
									class="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-medium resize-none"
								></textarea>
							</div>
							<div class="grid grid-cols-3 gap-4">
								<div>
									<label
										class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2"
									>
										<iconify-icon icon="solar:calculator-bold" width="14" class="text-[#FEC129]"
										></iconify-icon>
										Quantité
									</label>
									<Input type="number" placeholder="1" bind:value={newItem.quantity} min="1" />
								</div>
								<div>
									<label
										class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2"
									>
										<iconify-icon icon="solar:tag-bold" width="14" class="text-[#FEC129]"
										></iconify-icon>
										Unité
									</label>
									<Input placeholder="jour" bind:value={newItem.unit} />
								</div>
								<div>
									<label
										class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2"
									>
										<iconify-icon icon="solar:euro-bold" width="14" class="text-[#FEC129]"
										></iconify-icon>
										Prix HT (€)
									</label>
									<Input
										type="number"
										placeholder="500"
										bind:value={newItem.price}
										min="0"
										step="0.01"
									/>
								</div>
							</div>
							{#if newItem.description && newItem.quantity > 0 && newItem.price > 0}
								<div transition:fly={{ y: -10, duration: 200 }} class="p-3 bg-white rounded-lg border border-slate-200">
									<div class="text-xs text-slate-500 mb-1 flex items-center gap-1">
										<iconify-icon icon="solar:eye-bold" width="14"></iconify-icon>
										Aperçu de l'item
									</div>
									<div class="space-y-1">
										<div class="font-black text-sm text-slate-900">
											{newItem.quantity}
											{newItem.unit} × {formatCurrency(newItem.price)} = {formatCurrency(
												newItem.quantity * newItem.price
											)} HT
										</div>
										<div class="text-xs text-slate-600">
											Prix TTC ({formData.tva_rate}%): {formatCurrency(
												newItem.quantity * newItem.price * (1 + formData.tva_rate / 100)
											)}
										</div>
									</div>
								</div>
							{/if}
						</div>
						<Button intent="primary" onclick={addItem} class="w-full">
							<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
							Ajouter cet item à la facture
						</Button>
					</div>

					<!-- Items List -->
					{#if formData.items.length === 0}
						<div
							class="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200"
						>
							<iconify-icon
								icon="solar:document-add-bold"
								width="64"
								class="text-slate-300 mx-auto mb-4"
							></iconify-icon>
							<p class="text-sm text-slate-500 font-bold">Aucun item ajouté</p>
							<p class="text-xs text-slate-400 mt-1">
								Utilisez le formulaire ci-dessus pour ajouter des items
							</p>
						</div>
					{:else}
						<div class="space-y-4">
							<h3 class="text-base font-black text-slate-700 uppercase tracking-wide">
								Items ajoutés ({formData.items.length})
							</h3>
							<div class="space-y-3">
								{#each formData.items as item, i}
									<div
										transition:fly={{ x: -20, duration: 200 }}
										class="group flex items-start gap-4 p-5 bg-white border-2 border-slate-100 rounded-xl hover:border-[#FEC129] hover:shadow-lg transition-all"
									>
										<div class="flex-1 min-w-0">
											<div class="font-black text-base text-slate-900 mb-2">
												{item.description}
											</div>
											<div class="flex items-center gap-4 text-sm text-slate-500">
												<span class="flex items-center gap-1">
													<iconify-icon icon="solar:calculator-bold" width="16"></iconify-icon>
													{item.quantity}
													{item.unit}
												</span>
												<span class="flex items-center gap-1">
													<iconify-icon icon="solar:tag-price-bold" width="16"></iconify-icon>
													{formatCurrency(item.price)} / {item.unit}
												</span>
												<span class="flex items-center gap-1 font-black text-[#291334]">
													<iconify-icon icon="solar:wallet-bold" width="16"></iconify-icon>
													{formatCurrency(item.quantity * item.price)} HT
												</span>
											</div>
										</div>
										<button
											onclick={() => removeItem(i)}
											class="p-2 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
											aria-label="Supprimer l'item"
										>
											<iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
										</button>
									</div>
								{/each}
							</div>

							<div class="grid grid-cols-3 gap-4 p-6 bg-slate-50 rounded-xl">
								<div class="text-xs text-slate-600">
									<div class="font-black mb-2">Sous-total HT</div>
									<div class="text-lg font-black text-slate-900">{formatCurrency(subtotal)}</div>
								</div>
								<div class="text-xs text-slate-600">
									<div class="font-black mb-2">TVA ({formData.tva_rate}%)</div>
									<div class="text-lg font-black text-slate-900">{formatCurrency(tva)}</div>
								</div>
								<div class="text-xs text-slate-600">
									<div class="font-black mb-2">Total TTC</div>
									<div class="text-lg font-black text-[#291334]">{formatCurrency(total)}</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="mt-8 flex gap-4">
			<Button
				intent="secondary"
				onclick={() => goto('/admin/documents')}
				class="flex-1"
				disabled={generating}
			>
				<iconify-icon icon="solar:close-circle-bold" width="20"></iconify-icon>
				Annuler
			</Button>
			<Button intent="secondary" onclick={handlePreview} disabled={generating} class="flex-1">
				{#if generating && !showPreview}
					<Spinner size="sm" />
				{:else}
					<iconify-icon icon="solar:eye-bold" width="20"></iconify-icon>
				{/if}
				Prévisualiser
			</Button>
			<Button intent="primary" onclick={handleCreate} disabled={generating} class="flex-1">
				{#if generating}
					<Spinner size="sm" />
				{:else}
					<iconify-icon icon="solar:download-bold" width="20"></iconify-icon>
				{/if}
				Créer et télécharger
			</Button>
		</div>
	</div>
</div>

<!-- Preview Sidebar -->
{#if showPreview}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 bg-black/50 z-50"
		onclick={() => (showPreview = false)}
		role="presentation"
	></div>
	<div
		transition:fly={{ x: 800, duration: 300, opacity: 1 }}
		class="fixed top-0 right-0 h-full w-[800px] bg-white shadow-2xl z-50 flex flex-col"
	>
		<div class="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-[#291334] rounded-lg">
					<iconify-icon icon="solar:document-bold" width="24" class="text-white"></iconify-icon>
				</div>
				<div>
					<h3 class="text-lg font-black text-slate-900">Aperçu du document</h3>
					<p class="text-xs text-slate-500">Vérifiez les détails avant de créer</p>
				</div>
			</div>
			<button
				onclick={() => (showPreview = false)}
				class="p-2 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
				aria-label="Fermer l'aperçu"
			>
				<iconify-icon icon="solar:close-circle-bold" width="28"></iconify-icon>
			</button>
		</div>
		<div class="flex-1 overflow-hidden p-6 bg-slate-100">
			<iframe
				src="data:application/pdf;base64,{previewPdf}"
				class="w-full h-full rounded-lg shadow-lg border-2 border-slate-300"
				title="Aperçu du document PDF"
			></iframe>
		</div>
	</div>
{/if}
