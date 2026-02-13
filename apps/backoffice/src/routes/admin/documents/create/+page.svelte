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
		clientId: '',
		providerId: '',
		client_name: '',
		client_address: '',
		client_city: '',
		client_country: '',
		client_siret: '',
		provider_name: '',
		provider_legal: '',
		provider_address: '',
		provider_city: '',
		provider_siret: '',
		provider_email: '',
		provider_phone: '',
		items: [],
		tva_rate: 20,
		railway_estimate: 0,
		project_name: '',
		valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		providers: [],
		features: [],
		global_invoice_ref: 'ADF-001',
		project_step: 'Acompte 30%',
		payment_providers: [],
	});

	let newItem = $state({ description: '', quantity: 1, unit: 'jour', price: 0 });
	let newProvider = $state({ name: '', role: '', address: '', city: '', siret: '', email: '', amount: 0 });
	let selectedProviderForCotraitance = $state('');
	let newFeature = $state({ title: '', desc: '' });
	let newPaymentProvider = $state({ name: '', iban: '', bic: '', amount_to_pay: 0 });
	let selectedProviderForPayment = $state('');

	onMount(async () => {
		await Promise.all([loadDocumentTypes(), loadClients(), loadProviders()]);
	});

	$effect(() => {
		if (selectedClientId) {
			formData.clientId = selectedClientId;
			const client = clients.find((c) => c.id === selectedClientId);
			if (client) {
				formData.client_name = client.companyName;
				formData.client_address = client.billingAddress || '';
				formData.client_city = client.billingCity || '';
				formData.client_country = client.billingCountry || '';
				formData.client_siret = client.siret || '';
			}
		}
	});

	$effect(() => {
		if (selectedProviderId) {
			formData.providerId = selectedProviderId;
			const provider = providers.find((p) => p.id === selectedProviderId);
			if (provider) {
				formData.tva_rate = provider.tvaRate;
				formData.provider_name = provider.name;
				formData.provider_legal = provider.legalName || '';
				formData.provider_address = provider.address || '';
				formData.provider_city = provider.city || '';
				formData.provider_siret = provider.siret || '';
				formData.provider_email = provider.email || '';
				formData.provider_phone = provider.phone || '';
			}
		}
	});

	$effect(() => {
		if (selectedProviderForCotraitance) {
			const provider = providers.find((p) => p.id === selectedProviderForCotraitance);
			if (provider) {
				newProvider.name = provider.name;
				newProvider.role = '';
				newProvider.address = provider.address || '';
				newProvider.city = provider.city || '';
				newProvider.siret = provider.siret || '';
				newProvider.email = provider.email || '';
				newProvider.amount = 0;
			}
		}
	});

	$effect(() => {
		if (selectedProviderForPayment) {
			const provider = providers.find((p) => p.id === selectedProviderForPayment);
			if (provider) {
				newPaymentProvider.name = provider.name;
				newPaymentProvider.iban = provider.iban || '';
				newPaymentProvider.bic = provider.bic || '';
				newPaymentProvider.amount_to_pay = 0;
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

		if (formData.type === 'back_contractuel') {
			if (!formData.project_name) {
				return 'Veuillez saisir un nom de projet';
			}
			if (!formData.contract_reference) {
				return 'Veuillez saisir une référence de contrat';
			}
			if (!formData.providers || formData.providers.length === 0) {
				return 'Veuillez ajouter au moins un prestataire pour la co-traitance';
			}
			if (!formData.features || formData.features.length === 0) {
				return 'Veuillez ajouter au moins une feature au périmètre de mission';
			}
			if (!formData.items || formData.items.length === 0) {
				return 'Veuillez ajouter au moins un item de facturation';
			}
			return null;
		}

		if (formData.type === 'appel_de_fonds') {
			if (!formData.global_invoice_ref) {
				return 'Veuillez saisir une référence globale';
			}
			if (!formData.project_step) {
				return 'Veuillez saisir l\'étape du projet (ex: Acompte 30%)';
			}
			if (!formData.project_name) {
				return 'Veuillez saisir un nom de projet';
			}
			if (!formData.payment_providers || formData.payment_providers.length === 0) {
				return 'Veuillez ajouter au moins un prestataire à payer';
			}
			return null;
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
			let result;

			switch (formData.type) {
				case 'prestation':
					result = await trpc.document.previewPrestation.mutate({
						invoice_number: formData.invoice_number,
						invoice_date: formData.invoice_date,
						due_date: formData.due_date,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						items: formData.items,
						tva_rate: Number(formData.tva_rate),
						railway_estimate: Number(formData.railway_estimate || 0),
					});
					break;

				case 'maintenance':
					result = await trpc.document.previewMaintenance.mutate({
						quote_number: formData.quote_number,
						quote_date: formData.quote_date,
						validity_date: formData.validity_date,
						maintenance_period: formData.maintenance_period,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						items: formData.items,
						tva_rate: Number(formData.tva_rate),
						railway_estimate: Number(formData.railway_estimate || 0),
					});
					break;

				case 'contrat_prestation':
					result = await trpc.document.previewContratPrestation.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						quote_number: formData.quote_number,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						tva_rate: Number(formData.tva_rate),
					});
					break;

				case 'contrat_maintenance':
					result = await trpc.document.previewContratMaintenance.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						maintenance_period: formData.maintenance_period,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						tva_rate: Number(formData.tva_rate),
					});
					break;

				case 'back_contractuel':
					result = await trpc.document.previewBackContractuel.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						project_name: formData.project_name,
						valid_until: formData.valid_until,
						clientId: selectedClientId,
						providerId: selectedProviderId || undefined,
						providers: formData.providers,
						features: formData.features,
						items: formData.items,
						tva_rate: Number(formData.tva_rate),
					});
					break;

				case 'appel_de_fonds':
					result = await trpc.document.previewAppelDeFonds.mutate({
						global_invoice_ref: formData.global_invoice_ref,
						invoice_date: formData.invoice_date,
						due_date: formData.due_date,
						project_step: formData.project_step,
						project_name: formData.project_name,
						clientId: selectedClientId,
						providerId: selectedProviderId || undefined,
						payment_providers: formData.payment_providers,
						tva_rate: Number(formData.tva_rate),
					});
					break;

				default:
					throw new Error(`Type de document non supporté: ${formData.type}`);
			}

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
			let result;

			switch (formData.type) {
				case 'prestation':
					result = await trpc.document.createPrestation.mutate({
						invoice_number: formData.invoice_number,
						invoice_date: formData.invoice_date,
						due_date: formData.due_date,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						items: formData.items,
						tva_rate: Number(formData.tva_rate),
						railway_estimate: Number(formData.railway_estimate || 0),
					});
					break;

				case 'maintenance':
					result = await trpc.document.createMaintenance.mutate({
						quote_number: formData.quote_number,
						quote_date: formData.quote_date,
						validity_date: formData.validity_date,
						maintenance_period: formData.maintenance_period,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						items: formData.items,
						tva_rate: Number(formData.tva_rate),
						railway_estimate: Number(formData.railway_estimate || 0),
					});
					break;

				case 'contrat_prestation':
					result = await trpc.document.createContratPrestation.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						quote_number: formData.quote_number,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						tva_rate: Number(formData.tva_rate),
					});
					break;

				case 'contrat_maintenance':
					result = await trpc.document.createContratMaintenance.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						maintenance_period: formData.maintenance_period,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						tva_rate: Number(formData.tva_rate),
					});
					break;

				case 'back_contractuel':
					result = await trpc.document.createBackContractuel.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						project_name: formData.project_name,
						valid_until: formData.valid_until,
						clientId: selectedClientId,
						providerId: selectedProviderId || undefined,
						providers: formData.providers,
						features: formData.features,
						items: formData.items,
						tva_rate: Number(formData.tva_rate),
					});
					break;

				case 'appel_de_fonds':
					result = await trpc.document.createAppelDeFonds.mutate({
						global_invoice_ref: formData.global_invoice_ref,
						invoice_date: formData.invoice_date,
						due_date: formData.due_date,
						project_step: formData.project_step,
						project_name: formData.project_name,
						clientId: selectedClientId,
						providerId: selectedProviderId || undefined,
						payment_providers: formData.payment_providers,
						tva_rate: Number(formData.tva_rate),
					});
					break;

				default:
					throw new Error(`Type de document non supporté: ${formData.type}`);
			}

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

	function addProvider() {
		if (!newProvider.name || !newProvider.role || !newProvider.siret || !newProvider.email || newProvider.amount <= 0) {
			toast.push('Veuillez remplir tous les champs du prestataire', 'error');
			return;
		}
		formData.providers = [...formData.providers, { ...newProvider }];
		newProvider = { name: '', role: '', address: '', city: '', siret: '', email: '', amount: 0 };
		selectedProviderForCotraitance = '';
	}

	function removeProvider(index: number) {
		formData.providers = formData.providers.filter((_: any, i: number) => i !== index);
	}

	function addFeature() {
		if (!newFeature.title || !newFeature.desc) {
			toast.push('Veuillez remplir tous les champs de la feature', 'error');
			return;
		}
		formData.features = [...formData.features, { ...newFeature }];
		newFeature = { title: '', desc: '' };
	}

	function removeFeature(index: number) {
		formData.features = formData.features.filter((_: any, i: number) => i !== index);
	}

	function addPaymentProvider() {
		if (!newPaymentProvider.name || !newPaymentProvider.iban || !newPaymentProvider.bic || newPaymentProvider.amount_to_pay <= 0) {
			toast.push('Veuillez remplir tous les champs du prestataire de paiement', 'error');
			return;
		}
		formData.payment_providers = [...formData.payment_providers, { ...newPaymentProvider }];
		newPaymentProvider = { name: '', iban: '', bic: '', amount_to_pay: 0 };
		selectedProviderForPayment = '';
	}

	function removePaymentProvider(index: number) {
		formData.payment_providers = formData.payment_providers.filter((_: any, i: number) => i !== index);
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
					{:else if formData.type === 'back_contractuel'}
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
					{:else if formData.type === 'appel_de_fonds'}
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

			{#if formData.type !== 'back_contractuel' && formData.type !== 'appel_de_fonds'}
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
			{/if}

			{#if formData.type === 'back_contractuel'}
				<div class="border-t border-slate-200"></div>

				<!-- Back Contractuel Specific Fields -->
				<div class="space-y-6">
					<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
						<iconify-icon icon="solar:case-round-bold" width="24" class="text-[#291334]"></iconify-icon>
						Informations du projet
					</h2>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:document-text-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Nom du projet
							</label>
							<Input bind:value={formData.project_name} placeholder="Ex: Site web vitrine" />
						</div>
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Date de validité
							</label>
							<Input type="date" bind:value={formData.valid_until} />
						</div>
					</div>
				</div>

				<div class="border-t border-slate-200"></div>

				<!-- Prestataires Co-traitance -->
				<div class="space-y-6">
					<div class="flex justify-between items-center">
						<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
							<iconify-icon icon="solar:users-group-two-rounded-bold" width="24" class="text-[#291334]"></iconify-icon>
							Prestataires (Co-traitance)
						</h2>
					</div>

					<!-- Add Provider Form -->
					<div class="space-y-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl">
						<h3 class="text-sm font-black text-slate-700 flex items-center gap-2">
							<iconify-icon icon="mdi:plus-circle" width="20" class="text-[#FEC129]"></iconify-icon>
							Ajouter un prestataire
						</h3>

						<!-- Select Provider -->
						<div>
							<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Sélectionner un prestataire
							</label>
							<select
								bind:value={selectedProviderForCotraitance}
								class="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-bold text-base"
							>
								<option value="">-- Choisir depuis la liste --</option>
								{#each providers as provider (provider.id)}
									<option value={provider.id}>{provider.name}</option>
								{/each}
							</select>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Nom</label>
								<Input bind:value={newProvider.name} placeholder="Ex: Saravenpi SASU" readonly={!!selectedProviderForCotraitance} />
							</div>
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Rôle *</label>
								<Input bind:value={newProvider.role} placeholder="Ex: Développeur Full-Stack" />
							</div>
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Adresse</label>
								<Input bind:value={newProvider.address} placeholder="Ex: 123 rue de la Paix" readonly={!!selectedProviderForCotraitance} />
							</div>
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Ville</label>
								<Input bind:value={newProvider.city} placeholder="Ex: Paris" readonly={!!selectedProviderForCotraitance} />
							</div>
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">SIRET</label>
								<Input bind:value={newProvider.siret} placeholder="Ex: 123 456 789 00001" readonly={!!selectedProviderForCotraitance} />
							</div>
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Email</label>
								<Input type="email" bind:value={newProvider.email} placeholder="Ex: contact@example.com" readonly={!!selectedProviderForCotraitance} />
							</div>
							<div class="col-span-2">
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Montant HT (€) *</label>
								<Input type="number" bind:value={newProvider.amount} placeholder="Ex: 5000" min="0" step="0.01" />
							</div>
						</div>
						<Button intent="primary" onclick={addProvider} class="w-full">
							<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
							Ajouter ce prestataire
						</Button>
					</div>

					<!-- Providers List -->
					{#if formData.providers.length === 0}
						<div class="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
							<iconify-icon icon="solar:users-group-two-rounded-bold" width="64" class="text-slate-300 mx-auto mb-4"></iconify-icon>
							<p class="text-sm text-slate-500 font-bold">Aucun prestataire ajouté</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each formData.providers as provider, i}
								<div class="group flex items-start gap-4 p-5 bg-white border-2 border-slate-100 rounded-xl hover:border-[#FEC129] hover:shadow-lg transition-all">
									<div class="flex-1 min-w-0">
										<div class="font-black text-base text-slate-900 mb-2">{provider.name} - {provider.role}</div>
										<div class="text-sm text-slate-500 space-y-1">
											<div>{provider.address}, {provider.city}</div>
											<div>SIRET: {provider.siret} • {provider.email}</div>
											<div class="font-black text-[#291334]">Montant: {formatCurrency(provider.amount)} HT</div>
										</div>
									</div>
									<button
										onclick={() => removeProvider(i)}
										class="p-2 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
										aria-label="Supprimer le prestataire"
									>
										<iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="border-t border-slate-200"></div>

				<!-- Features (Périmètre de mission) -->
				<div class="space-y-6">
					<div class="flex justify-between items-center">
						<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
							<iconify-icon icon="solar:checklist-bold" width="24" class="text-[#291334]"></iconify-icon>
							Périmètre de la mission (Features)
						</h2>
					</div>

					<!-- Add Feature Form -->
					<div class="space-y-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl">
						<h3 class="text-sm font-black text-slate-700 flex items-center gap-2">
							<iconify-icon icon="mdi:plus-circle" width="20" class="text-[#FEC129]"></iconify-icon>
							Ajouter une feature
						</h3>
						<div class="space-y-4">
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Titre</label>
								<Input bind:value={newFeature.title} placeholder="Ex: Design UI/UX" />
							</div>
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Description</label>
								<textarea
									bind:value={newFeature.desc}
									rows="3"
									placeholder="Ex: Création d'une identité visuelle moderne et responsive..."
									class="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-medium resize-none"
								></textarea>
							</div>
						</div>
						<Button intent="primary" onclick={addFeature} class="w-full">
							<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
							Ajouter cette feature
						</Button>
					</div>

					<!-- Features List -->
					{#if formData.features.length === 0}
						<div class="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
							<iconify-icon icon="solar:checklist-bold" width="64" class="text-slate-300 mx-auto mb-4"></iconify-icon>
							<p class="text-sm text-slate-500 font-bold">Aucune feature ajoutée</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each formData.features as feature, i}
								<div class="group flex items-start gap-4 p-5 bg-white border-2 border-slate-100 rounded-xl hover:border-[#FEC129] hover:shadow-lg transition-all">
									<div class="flex-1 min-w-0">
										<div class="font-black text-base text-slate-900 mb-2">{feature.title}</div>
										<div class="text-sm text-slate-600">{feature.desc}</div>
									</div>
									<button
										onclick={() => removeFeature(i)}
										class="p-2 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
										aria-label="Supprimer la feature"
									>
										<iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="border-t border-slate-200"></div>

				<!-- Items Section for back_contractuel -->
				<div class="space-y-6">
					<div class="flex justify-between items-center">
						<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
							<iconify-icon icon="solar:list-bold" width="24" class="text-[#291334]"></iconify-icon>
							Items de facturation (Prestations)
						</h2>
					</div>

					<!-- Add Item Form -->
					<div class="space-y-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl">
						<h3 class="text-sm font-black text-slate-700 flex items-center gap-2">
							<iconify-icon icon="mdi:plus-circle" width="20" class="text-[#FEC129]"></iconify-icon>
							Ajouter un item
						</h3>
						<div class="space-y-4">
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Description</label>
								<textarea
									placeholder="Ex: Développement d'un site web vitrine responsive..."
									bind:value={newItem.description}
									rows="3"
									class="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-medium resize-none"
								></textarea>
							</div>
							<div class="grid grid-cols-3 gap-4">
								<div>
									<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Quantité</label>
									<Input type="number" placeholder="1" bind:value={newItem.quantity} min="1" />
								</div>
								<div>
									<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Unité</label>
									<Input placeholder="jour" bind:value={newItem.unit} />
								</div>
								<div>
									<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Prix HT (€)</label>
									<Input type="number" placeholder="500" bind:value={newItem.price} min="0" step="0.01" />
								</div>
							</div>
						</div>
						<Button intent="primary" onclick={addItem} class="w-full">
							<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
							Ajouter cet item
						</Button>
					</div>

					<!-- Items List -->
					{#if formData.items.length === 0}
						<div class="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
							<iconify-icon icon="solar:document-add-bold" width="64" class="text-slate-300 mx-auto mb-4"></iconify-icon>
							<p class="text-sm text-slate-500 font-bold">Aucun item ajouté</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each formData.items as item, i}
								<div class="group flex items-start gap-4 p-5 bg-white border-2 border-slate-100 rounded-xl hover:border-[#FEC129] hover:shadow-lg transition-all">
									<div class="flex-1 min-w-0">
										<div class="font-black text-base text-slate-900 mb-2">{item.description}</div>
										<div class="flex items-center gap-4 text-sm text-slate-500">
											<span>{item.quantity} {item.unit}</span>
											<span>{formatCurrency(item.price)} / {item.unit}</span>
											<span class="font-black text-[#291334]">{formatCurrency(item.quantity * item.price)} HT</span>
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
					{/if}
				</div>
			{:else if formData.type === 'appel_de_fonds'}
				<div class="border-t border-slate-200"></div>

				<!-- Appel de Fonds Specific Fields -->
				<div class="space-y-6">
					<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
						<iconify-icon icon="solar:bill-list-bold" width="24" class="text-[#291334]"></iconify-icon>
						Informations de l'appel de fonds
					</h2>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Référence globale
							</label>
							<Input bind:value={formData.global_invoice_ref} placeholder="Ex: ADF-001" />
						</div>
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:document-text-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Étape du projet
							</label>
							<Input bind:value={formData.project_step} placeholder="Ex: Acompte 30%" />
						</div>
						<div class="col-span-2">
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:document-text-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Nom du projet
							</label>
							<Input bind:value={formData.project_name} placeholder="Ex: Site web vitrine" />
						</div>
					</div>
				</div>

				<div class="border-t border-slate-200"></div>

				<!-- Payment Providers (Appel de Fonds) -->
				<div class="space-y-6">
					<div class="flex justify-between items-center">
						<h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
							<iconify-icon icon="solar:card-bold" width="24" class="text-[#291334]"></iconify-icon>
							Prestataires à payer (IBAN/BIC)
						</h2>
					</div>

					<!-- Add Payment Provider Form -->
					<div class="space-y-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl">
						<h3 class="text-sm font-black text-slate-700 flex items-center gap-2">
							<iconify-icon icon="mdi:plus-circle" width="20" class="text-[#FEC129]"></iconify-icon>
							Ajouter un prestataire
						</h3>

						<!-- Select Provider -->
						<div>
							<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Sélectionner un prestataire
							</label>
							<select
								bind:value={selectedProviderForPayment}
								class="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-bold text-base"
							>
								<option value="">-- Choisir depuis la liste --</option>
								{#each providers as provider (provider.id)}
									<option value={provider.id}>{provider.name}</option>
								{/each}
							</select>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="col-span-2">
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Nom du bénéficiaire</label>
								<Input bind:value={newPaymentProvider.name} placeholder="Ex: Saravenpi SASU" readonly={!!selectedProviderForPayment} />
							</div>
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">IBAN</label>
								<Input bind:value={newPaymentProvider.iban} placeholder="Ex: FR76 1234 5678 9012 3456 7890 123" readonly={!!selectedProviderForPayment} />
							</div>
							<div>
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">BIC</label>
								<Input bind:value={newPaymentProvider.bic} placeholder="Ex: BNPAFRPP" readonly={!!selectedProviderForPayment} />
							</div>
							<div class="col-span-2">
								<label class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Montant à verser (€ HT) *</label>
								<Input type="number" bind:value={newPaymentProvider.amount_to_pay} placeholder="Ex: 1500" min="0" step="0.01" />
							</div>
						</div>
						<Button intent="primary" onclick={addPaymentProvider} class="w-full">
							<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
							Ajouter ce prestataire
						</Button>
					</div>

					<!-- Payment Providers List -->
					{#if formData.payment_providers.length === 0}
						<div class="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
							<iconify-icon icon="solar:card-bold" width="64" class="text-slate-300 mx-auto mb-4"></iconify-icon>
							<p class="text-sm text-slate-500 font-bold">Aucun prestataire ajouté</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each formData.payment_providers as provider, i}
								<div class="group flex items-start gap-4 p-5 bg-white border-2 border-slate-100 rounded-xl hover:border-[#FEC129] hover:shadow-lg transition-all">
									<div class="flex-1 min-w-0">
										<div class="font-black text-base text-slate-900 mb-2">{provider.name}</div>
										<div class="text-sm text-slate-500 space-y-1 font-mono text-xs">
											<div>IBAN: {provider.iban}</div>
											<div>BIC: {provider.bic}</div>
										</div>
										<div class="font-black text-[#291334] mt-2">Montant: {formatCurrency(provider.amount_to_pay)} HT</div>
									</div>
									<button
										onclick={() => removePaymentProvider(i)}
										class="p-2 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
										aria-label="Supprimer le prestataire"
									>
										<iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
									</button>
								</div>
							{/each}
						</div>

						<!-- Total Section -->
						<div class="p-6 bg-slate-50 rounded-xl">
							<div class="flex justify-between items-center">
								<div class="text-sm font-black text-slate-700">TOTAL DE L'APPEL DE FONDS HT</div>
								<div class="text-2xl font-black text-[#291334]">
									{formatCurrency(formData.payment_providers.reduce((sum: number, p: any) => sum + p.amount_to_pay, 0))}
								</div>
							</div>
						</div>
					{/if}
				</div>
			{:else if formData.type === 'prestation' || formData.type === 'maintenance'}
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
