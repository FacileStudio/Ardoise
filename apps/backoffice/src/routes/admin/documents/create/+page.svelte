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
	let formMessage = $state('');

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
	let newProvider = $state({ id: '', role: '', amount: 0 });
	let newFeature = $state({ title: '', desc: '' });
	let newPaymentProvider = $state({ id: '', amount_to_pay: 0 });

	const providerFieldLabels = {
		address: 'adresse',
		city: 'ville',
		siret: 'SIRET',
		email: 'email',
		phone: 'téléphone',
		bankName: 'nom de la banque',
		iban: 'IBAN',
		bic: 'BIC',
	} as const;

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

	function isBlank(value: string | null | undefined) {
		return !value || value.trim() === '';
	}

	function isValidEmail(value: string | null | undefined) {
		if (isBlank(value)) return false;
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value!.trim());
	}

	function getRequiredProviderFields(type: DocType) {
		const commonFields = ['address', 'city', 'siret', 'email', 'phone'] as const;
		if (type === 'prestation' || type === 'maintenance') {
			return [...commonFields, 'bankName', 'iban', 'bic'] as const;
		}
		return commonFields;
	}

	function getMissingProviderFields(provider: Provider | undefined, type: DocType) {
		if (!provider) return [];

		return getRequiredProviderFields(type).filter((field) => {
			if (field === 'email') {
				return !isValidEmail(provider.email);
			}
			return isBlank(provider[field]);
		});
	}

	function getProviderValidationMessage(provider: Provider | undefined, type: DocType) {
		const missingFields = getMissingProviderFields(provider, type);
		if (missingFields.length === 0) return null;

		const labels = missingFields.map((field) => providerFieldLabels[field]).join(', ');
		return `Prestataire incomplet: renseignez ${labels} dans la fiche prestataire avant de générer ce document`;
	}

	function validateForm(): string | null {
		formMessage = '';

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

		const providerValidationMessage = getProviderValidationMessage(selectedProvider, formData.type as DocType);
		if (providerValidationMessage) {
			return providerValidationMessage;
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
			formMessage = validationError;
			toast.push(validationError, 'error');
			return;
		}

		try {
			formMessage = '';
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
						});
					break;

				case 'contrat_maintenance':
					result = await trpc.document.previewContratMaintenance.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						maintenance_period: formData.maintenance_period,
						clientId: selectedClientId,
						providerId: selectedProviderId,
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
			formMessage = message;
			toast.push(message, 'error');
		} finally {
			generating = false;
		}
	}

	async function handleCreate() {
		const validationError = validateForm();
		if (validationError) {
			formMessage = validationError;
			toast.push(validationError, 'error');
			return;
		}

		try {
			formMessage = '';
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
						});
					break;

				case 'contrat_maintenance':
					result = await trpc.document.createContratMaintenance.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						maintenance_period: formData.maintenance_period,
						clientId: selectedClientId,
						providerId: selectedProviderId,
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
			formMessage = message;
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
		if (!newProvider.id || !newProvider.role || newProvider.amount <= 0) {
			toast.push('Veuillez sélectionner un prestataire, définir son rôle et son montant', 'error');
			return;
		}
		formData.providers = [...formData.providers, { ...newProvider }];
		newProvider = { id: '', role: '', amount: 0 };
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
		if (!newPaymentProvider.id || newPaymentProvider.amount_to_pay <= 0) {
			toast.push('Veuillez sélectionner un prestataire et définir le montant à verser', 'error');
			return;
		}
		formData.payment_providers = [...formData.payment_providers, { ...newPaymentProvider }];
		newPaymentProvider = { id: '', amount_to_pay: 0 };
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
	const selectedProvider = $derived(providers.find(p => p.id === selectedProviderId));
	const selectedProviderMissingFields = $derived(getMissingProviderFields(selectedProvider, formData.type as DocType));
	const tvaRate = $derived(selectedProvider?.tvaRate || 20);
	const tva = $derived(totalWithRailway * (tvaRate / 100));
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
			{#if formMessage}
				<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
					{formMessage}
				</div>
			{/if}

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
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								N° Facture
							</div>
							<Input bind:value={formData.invoice_number} />
						</div>
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date Facture
							</div>
							<Input type="date" bind:value={formData.invoice_date} />
						</div>
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:alarm-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Date Échéance
							</div>
							<Input type="date" bind:value={formData.due_date} />
						</div>
					{:else if formData.type === 'maintenance'}
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								N° Devis
							</div>
							<Input bind:value={formData.quote_number} />
						</div>
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date Devis
							</div>
							<Input type="date" bind:value={formData.quote_date} />
						</div>
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:alarm-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Validité
							</div>
							<Input type="date" bind:value={formData.validity_date} />
						</div>
					{:else if formData.type === 'back_contractuel'}
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Référence Contrat
							</div>
							<Input bind:value={formData.contract_reference} />
						</div>
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date Contrat
							</div>
							<Input type="date" bind:value={formData.contract_date} />
						</div>
					{:else if formData.type === 'appel_de_fonds'}
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date Facture
							</div>
							<Input type="date" bind:value={formData.invoice_date} />
						</div>
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:alarm-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Date Échéance
							</div>
							<Input type="date" bind:value={formData.due_date} />
						</div>
					{:else}
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Référence Contrat
							</div>
							<Input bind:value={formData.contract_reference} />
						</div>
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date Contrat
							</div>
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
							class="p-4 rounded-xl border-2 flex items-start gap-3 {selectedProviderMissingFields.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-purple-50 border-purple-200'}"
						>
							<iconify-icon
								icon={selectedProviderMissingFields.length > 0 ? 'solar:danger-triangle-bold' : 'solar:check-circle-bold'}
								width="24"
								class={selectedProviderMissingFields.length > 0 ? 'text-amber-600' : 'text-purple-600'}
							></iconify-icon>
							<div class="min-w-0">
								<div class={selectedProviderMissingFields.length > 0 ? 'font-black text-amber-900' : 'font-black text-purple-900'}>
									{formData.provider_name}
								</div>
								<div class={selectedProviderMissingFields.length > 0 ? 'text-sm text-amber-700' : 'text-sm text-purple-700'}>
									TVA: {tvaRate}% • {formData.provider_email || 'email manquant'}
								</div>
								{#if selectedProviderMissingFields.length > 0}
									<p class="mt-2 text-sm font-bold text-amber-800">
										Champs manquants: {selectedProviderMissingFields.map((field) => providerFieldLabels[field]).join(', ')}
									</p>
								{/if}
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
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:document-text-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Nom du projet
							</div>
							<Input bind:value={formData.project_name} placeholder="Ex: Site web vitrine" />
						</div>
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Date de validité
							</div>
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
							<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Prestataire *
							</div>
							<select
								bind:value={newProvider.id}
								class="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-bold text-base"
							>
								<option value="">-- Choisir un prestataire --</option>
								{#each providers as provider (provider.id)}
									<option value={provider.id}>{provider.name}</option>
								{/each}
							</select>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Rôle *</div>
								<Input bind:value={newProvider.role} placeholder="Ex: Développeur Full-Stack" />
							</div>
							<div>
								<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Montant HT (€) *</div>
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
								{@const providerInfo = providers.find(p => p.id === provider.id)}
								<div class="group flex items-start gap-4 p-5 bg-white border-2 border-slate-100 rounded-xl hover:border-[#FEC129] hover:shadow-lg transition-all">
									<div class="flex-1 min-w-0">
										<div class="font-black text-base text-slate-900 mb-2">{providerInfo?.name || provider.id} - {provider.role}</div>
										<div class="text-sm text-slate-500 space-y-1">
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
								<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Titre</div>
								<Input bind:value={newFeature.title} placeholder="Ex: Design UI/UX" />
							</div>
							<div>
								<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Description</div>
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
								<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Description</div>
								<textarea
									placeholder="Ex: Développement d'un site web vitrine responsive..."
									bind:value={newItem.description}
									rows="3"
									class="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-medium resize-none"
								></textarea>
							</div>
							<div class="grid grid-cols-3 gap-4">
								<div>
									<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Quantité</div>
									<Input type="number" placeholder="1" bind:value={newItem.quantity} min="1" />
								</div>
								<div>
									<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Unité</div>
									<Input placeholder="jour" bind:value={newItem.unit} />
								</div>
								<div>
									<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Prix HT (€)</div>
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
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Référence globale
							</div>
							<Input bind:value={formData.global_invoice_ref} placeholder="Ex: ADF-001" />
						</div>
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:document-text-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Étape du projet
							</div>
							<Input bind:value={formData.project_step} placeholder="Ex: Acompte 30%" />
						</div>
						<div class="col-span-2">
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:document-text-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Nom du projet
							</div>
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
							<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Prestataire *
							</div>
							<select
								bind:value={newPaymentProvider.id}
								class="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-bold text-base"
							>
								<option value="">-- Choisir un prestataire --</option>
								{#each providers as provider (provider.id)}
									<option value={provider.id}>{provider.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<div class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">Montant à verser (€ HT) *</div>
							<Input type="number" bind:value={newPaymentProvider.amount_to_pay} placeholder="Ex: 1500" min="0" step="0.01" />
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
								{@const providerInfo = providers.find(p => p.id === provider.id)}
								<div class="group flex items-start gap-4 p-5 bg-white border-2 border-slate-100 rounded-xl hover:border-[#FEC129] hover:shadow-lg transition-all">
									<div class="flex-1 min-w-0">
										<div class="font-black text-base text-slate-900 mb-2">{providerInfo?.name || provider.id}</div>
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
								<div
									class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2"
								>
									<iconify-icon icon="solar:pen-bold" width="14" class="text-[#FEC129]"
									></iconify-icon>
									Que facturez-vous ?
								</div>
								<textarea
									placeholder="Ex: Développement d'un site web vitrine responsive avec système de gestion de contenu..."
									bind:value={newItem.description}
									rows="3"
									class="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-medium resize-none"
								></textarea>
							</div>
							<div class="grid grid-cols-3 gap-4">
								<div>
									<div
										class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2"
									>
										<iconify-icon icon="solar:calculator-bold" width="14" class="text-[#FEC129]"
										></iconify-icon>
										Quantité
									</div>
									<Input type="number" placeholder="1" bind:value={newItem.quantity} min="1" />
								</div>
								<div>
									<div
										class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2"
									>
										<iconify-icon icon="solar:tag-bold" width="14" class="text-[#FEC129]"
										></iconify-icon>
										Unité
									</div>
									<Input placeholder="jour" bind:value={newItem.unit} />
								</div>
								<div>
									<div
										class="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2"
									>
										<iconify-icon icon="solar:euro-bold" width="14" class="text-[#FEC129]"
										></iconify-icon>
										Prix HT (€)
									</div>
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
											Prix TTC ({tvaRate}%): {formatCurrency(
												newItem.quantity * newItem.price * (1 + tvaRate / 100)
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
									<div class="font-black mb-2">TVA ({tvaRate}%)</div>
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
