<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
			clients = result.clients as unknown as Client[];
		} catch (err) {
			logger.error({ err }, 'Failed to fetch clients');
		}
	}

	async function loadProviders() {
		try {
			const result = await trpc.provider.list.query({ page: 1, limit: 100 });
			providers = result.providers as unknown as Provider[];
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
			goto(resolve('/admin/documents'));
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

<div class="max-w-3xl mx-auto p-6 space-y-6">
	<div>
		<button
			onclick={() => goto(resolve('/admin/documents'))}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
			Retour aux documents
		</button>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Créer un document</h1>
		<p class="text-sm text-muted-foreground mt-1">Générez une facture, un devis ou un contrat</p>
	</div>

	<div class="space-y-6">
		{#if formMessage}
			<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
				{formMessage}
			</div>
		{/if}

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Type de document</h2>
			<select
				bind:value={formData.type}
				class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
			>
				{#each docTypes as type (type.value)}
					<option value={type.value}>{type.label}</option>
				{/each}
			</select>

			<div class="grid grid-cols-3 gap-4">
				{#if formData.type === 'prestation'}
					<div>
						<div class="text-sm font-medium mb-2">N° Facture</div>
						<Input bind:value={formData.invoice_number} />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Date Facture</div>
						<Input type="date" bind:value={formData.invoice_date} />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Date Échéance</div>
						<Input type="date" bind:value={formData.due_date} />
					</div>
				{:else if formData.type === 'maintenance'}
					<div>
						<div class="text-sm font-medium mb-2">N° Devis</div>
						<Input bind:value={formData.quote_number} />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Date Devis</div>
						<Input type="date" bind:value={formData.quote_date} />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Validité</div>
						<Input type="date" bind:value={formData.validity_date} />
					</div>
				{:else if formData.type === 'back_contractuel'}
					<div>
						<div class="text-sm font-medium mb-2">Référence Contrat</div>
						<Input bind:value={formData.contract_reference} />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Date Contrat</div>
						<Input type="date" bind:value={formData.contract_date} />
					</div>
				{:else if formData.type === 'appel_de_fonds'}
					<div>
						<div class="text-sm font-medium mb-2">Date Facture</div>
						<Input type="date" bind:value={formData.invoice_date} />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Date Échéance</div>
						<Input type="date" bind:value={formData.due_date} />
					</div>
				{:else}
					<div>
						<div class="text-sm font-medium mb-2">Référence Contrat</div>
						<Input bind:value={formData.contract_reference} />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Date Contrat</div>
						<Input type="date" bind:value={formData.contract_date} />
					</div>
				{/if}
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Client</h2>
			<select
				bind:value={selectedClientId}
				class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
			>
				<option value="">-- Sélectionner un client --</option>
				{#each clients as client (client.id)}
					<option value={client.id}>{client.companyName}</option>
				{/each}
			</select>
			{#if selectedClientId}
				<div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
					<iconify-icon icon="solar:check-circle-bold" width="16" class="text-emerald-600"></iconify-icon>
					<div>
						<div class="text-sm font-medium text-emerald-900">{formData.client_name}</div>
						<div class="text-xs text-emerald-700">
							{formData.client_address}, {formData.client_city}
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if formData.type !== 'back_contractuel' && formData.type !== 'appel_de_fonds'}
			<div class="rounded-xl border border-border p-6 space-y-4">
				<h2 class="text-base font-semibold text-foreground">Prestataire</h2>
				<select
					bind:value={selectedProviderId}
					class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
				>
					<option value="">-- Sélectionner un prestataire --</option>
					{#each providers as provider (provider.id)}
						<option value={provider.id}>{provider.name}</option>
					{/each}
				</select>
				{#if selectedProviderId}
					<div
						class="p-3 rounded-lg border flex items-start gap-2 {selectedProviderMissingFields.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-muted border-border'}"
					>
						<iconify-icon
							icon={selectedProviderMissingFields.length > 0 ? 'solar:danger-triangle-bold' : 'solar:check-circle-bold'}
							width="16"
							class={selectedProviderMissingFields.length > 0 ? 'text-amber-600' : 'text-emerald-600'}
						></iconify-icon>
						<div class="min-w-0">
							<div class="text-sm font-medium {selectedProviderMissingFields.length > 0 ? 'text-amber-900' : 'text-foreground'}">
								{formData.provider_name}
							</div>
							<div class="text-xs {selectedProviderMissingFields.length > 0 ? 'text-amber-700' : 'text-muted-foreground'}">
								TVA: {tvaRate}% - {formData.provider_email || 'email manquant'}
							</div>
							{#if selectedProviderMissingFields.length > 0}
								<p class="mt-1 text-xs font-medium text-amber-800">
									Champs manquants: {selectedProviderMissingFields.map((field) => providerFieldLabels[field]).join(', ')}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if formData.type === 'back_contractuel'}
			<div class="rounded-xl border border-border p-6 space-y-4">
				<h2 class="text-base font-semibold text-foreground">Informations du projet</h2>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<div class="text-sm font-medium mb-2">Nom du projet</div>
						<Input bind:value={formData.project_name} placeholder="Ex: Site web vitrine" />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Date de validité</div>
						<Input type="date" bind:value={formData.valid_until} />
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-border p-6 space-y-4">
				<h2 class="text-base font-semibold text-foreground">Prestataires (Co-traitance)</h2>
				<div class="space-y-3 p-4 bg-muted rounded-lg">
					<div class="text-sm font-medium">Ajouter un prestataire</div>
					<div>
						<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Prestataire *</div>
						<select
							bind:value={newProvider.id}
							class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						>
							<option value="">-- Choisir un prestataire --</option>
							{#each providers as provider (provider.id)}
								<option value={provider.id}>{provider.name}</option>
							{/each}
						</select>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Rôle *</div>
							<Input bind:value={newProvider.role} placeholder="Ex: Développeur Full-Stack" />
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Montant HT (EUR) *</div>
							<Input type="number" bind:value={newProvider.amount} placeholder="Ex: 5000" min="0" step="0.01" />
						</div>
					</div>
					<Button intent="primary" onclick={addProvider} class="w-full">Ajouter ce prestataire</Button>
				</div>

				{#if formData.providers.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<p class="text-xs">Aucun prestataire ajouté</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each formData.providers as provider, i (i)}
							{@const providerInfo = providers.find(p => p.id === provider.id)}
							<div class="flex items-start gap-3 p-3 border border-border rounded-lg">
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium text-foreground">{providerInfo?.name || provider.id} - {provider.role}</div>
									<div class="text-xs text-muted-foreground">{formatCurrency(provider.amount)} HT</div>
								</div>
								<button onclick={() => removeProvider(i)} class="p-1 text-red-500 hover:bg-red-50 rounded" aria-label="Supprimer">
									<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="rounded-xl border border-border p-6 space-y-4">
				<h2 class="text-base font-semibold text-foreground">Périmètre de la mission (Features)</h2>
				<div class="space-y-3 p-4 bg-muted rounded-lg">
					<div class="text-sm font-medium">Ajouter une feature</div>
					<div>
						<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Titre</div>
						<Input bind:value={newFeature.title} placeholder="Ex: Design UI/UX" />
					</div>
					<div>
						<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</div>
						<textarea
							bind:value={newFeature.desc}
							rows="2"
							placeholder="Ex: Création d'une identité visuelle moderne et responsive..."
							class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
						></textarea>
					</div>
					<Button intent="primary" onclick={addFeature} class="w-full">Ajouter cette feature</Button>
				</div>

				{#if formData.features.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<p class="text-xs">Aucune feature ajoutée</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each formData.features as feature, i (i)}
							<div class="flex items-start gap-3 p-3 border border-border rounded-lg">
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium text-foreground">{feature.title}</div>
									<div class="text-xs text-muted-foreground">{feature.desc}</div>
								</div>
								<button onclick={() => removeFeature(i)} class="p-1 text-red-500 hover:bg-red-50 rounded" aria-label="Supprimer">
									<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="rounded-xl border border-border p-6 space-y-4">
				<h2 class="text-base font-semibold text-foreground">Items de facturation (Prestations)</h2>
				<div class="space-y-3 p-4 bg-muted rounded-lg">
					<div class="text-sm font-medium">Ajouter un item</div>
					<div>
						<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</div>
						<textarea
							placeholder="Ex: Développement d'un site web vitrine responsive..."
							bind:value={newItem.description}
							rows="2"
							class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
						></textarea>
					</div>
					<div class="grid grid-cols-3 gap-3">
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Quantité</div>
							<Input type="number" placeholder="1" bind:value={newItem.quantity} min="1" />
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Unité</div>
							<Input placeholder="jour" bind:value={newItem.unit} />
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Prix HT (EUR)</div>
							<Input type="number" placeholder="500" bind:value={newItem.price} min="0" step="0.01" />
						</div>
					</div>
					<Button intent="primary" onclick={addItem} class="w-full">Ajouter cet item</Button>
				</div>

				{#if formData.items.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<p class="text-xs">Aucun item ajouté</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each formData.items as item, i (i)}
							<div class="flex items-start gap-3 p-3 border border-border rounded-lg">
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium text-foreground">{item.description}</div>
									<div class="text-xs text-muted-foreground">
										{item.quantity} {item.unit} x {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)} HT
									</div>
								</div>
								<button onclick={() => removeItem(i)} class="p-1 text-red-500 hover:bg-red-50 rounded" aria-label="Supprimer">
									<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else if formData.type === 'appel_de_fonds'}
			<div class="rounded-xl border border-border p-6 space-y-4">
				<h2 class="text-base font-semibold text-foreground">Informations de l'appel de fonds</h2>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<div class="text-sm font-medium mb-2">Référence globale</div>
						<Input bind:value={formData.global_invoice_ref} placeholder="Ex: ADF-001" />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Étape du projet</div>
						<Input bind:value={formData.project_step} placeholder="Ex: Acompte 30%" />
					</div>
					<div class="col-span-2">
						<div class="text-sm font-medium mb-2">Nom du projet</div>
						<Input bind:value={formData.project_name} placeholder="Ex: Site web vitrine" />
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-border p-6 space-y-4">
				<h2 class="text-base font-semibold text-foreground">Prestataires à payer (IBAN/BIC)</h2>
				<div class="space-y-3 p-4 bg-muted rounded-lg">
					<div class="text-sm font-medium">Ajouter un prestataire</div>
					<div>
						<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Prestataire *</div>
						<select
							bind:value={newPaymentProvider.id}
							class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						>
							<option value="">-- Choisir un prestataire --</option>
							{#each providers as provider (provider.id)}
								<option value={provider.id}>{provider.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Montant à verser (EUR HT) *</div>
						<Input type="number" bind:value={newPaymentProvider.amount_to_pay} placeholder="Ex: 1500" min="0" step="0.01" />
					</div>
					<Button intent="primary" onclick={addPaymentProvider} class="w-full">Ajouter ce prestataire</Button>
				</div>

				{#if formData.payment_providers.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<p class="text-xs">Aucun prestataire ajouté</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each formData.payment_providers as provider, i (i)}
							{@const providerInfo = providers.find(p => p.id === provider.id)}
							<div class="flex items-start gap-3 p-3 border border-border rounded-lg">
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium text-foreground">{providerInfo?.name || provider.id}</div>
									<div class="text-xs text-muted-foreground">Montant: {formatCurrency(provider.amount_to_pay)} HT</div>
								</div>
								<button onclick={() => removePaymentProvider(i)} class="p-1 text-red-500 hover:bg-red-50 rounded" aria-label="Supprimer">
									<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
								</button>
							</div>
						{/each}
					</div>

					<div class="p-4 bg-muted rounded-lg flex justify-between items-center">
						<div class="text-sm font-medium text-muted-foreground">TOTAL HT</div>
						<div class="text-lg font-bold text-foreground">
							{formatCurrency(formData.payment_providers.reduce((sum: number, p: any) => sum + p.amount_to_pay, 0))}
						</div>
					</div>
				{/if}
			</div>
		{:else if formData.type === 'prestation' || formData.type === 'maintenance'}
			<div class="rounded-xl border border-border p-6 space-y-4">
				<div class="flex justify-between items-center">
					<h2 class="text-base font-semibold text-foreground">Items de facturation</h2>
					{#if formData.items.length > 0}
						<span class="text-sm font-medium text-foreground">
							Total: {formatCurrency(total)} TTC
						</span>
					{/if}
				</div>

				<div class="space-y-3 p-4 bg-muted rounded-lg">
					<div class="text-sm font-medium">Ajouter un item</div>
					<div>
						<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</div>
						<textarea
							placeholder="Ex: Développement d'un site web vitrine responsive..."
							bind:value={newItem.description}
							rows="2"
							class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
						></textarea>
					</div>
					<div class="grid grid-cols-3 gap-3">
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Quantité</div>
							<Input type="number" placeholder="1" bind:value={newItem.quantity} min="1" />
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Unité</div>
							<Input placeholder="jour" bind:value={newItem.unit} />
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Prix HT (EUR)</div>
							<Input type="number" placeholder="500" bind:value={newItem.price} min="0" step="0.01" />
						</div>
					</div>
					{#if newItem.description && newItem.quantity > 0 && newItem.price > 0}
						<div class="p-2 bg-background rounded border border-border text-xs text-muted-foreground">
							{newItem.quantity} {newItem.unit} x {formatCurrency(newItem.price)} = {formatCurrency(newItem.quantity * newItem.price)} HT
							(TTC: {formatCurrency(newItem.quantity * newItem.price * (1 + tvaRate / 100))})
						</div>
					{/if}
					<Button intent="primary" onclick={addItem} class="w-full">Ajouter cet item</Button>
				</div>

				{#if formData.items.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<p class="text-xs">Aucun item ajouté</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each formData.items as item, i (i)}
							<div class="flex items-start gap-3 p-3 border border-border rounded-lg">
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium text-foreground">{item.description}</div>
									<div class="text-xs text-muted-foreground">
										{item.quantity} {item.unit} x {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)} HT
									</div>
								</div>
								<button onclick={() => removeItem(i)} class="p-1 text-red-500 hover:bg-red-50 rounded" aria-label="Supprimer">
									<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
								</button>
							</div>
						{/each}
					</div>

					<div class="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg text-sm">
						<div>
							<div class="text-xs font-medium text-muted-foreground mb-1">Sous-total HT</div>
							<div class="font-bold text-foreground">{formatCurrency(subtotal)}</div>
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground mb-1">TVA ({tvaRate}%)</div>
							<div class="font-bold text-foreground">{formatCurrency(tva)}</div>
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground mb-1">Total TTC</div>
							<div class="font-bold text-foreground">{formatCurrency(total)}</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="flex gap-3 pt-2">
		<Button
			intent="secondary"
			onclick={() => goto(resolve('/admin/documents'))}
			class="flex-1"
			disabled={generating}
		>
			Annuler
		</Button>
		<Button intent="secondary" onclick={handlePreview} disabled={generating} class="flex-1">
			{#if generating && !showPreview}
				<Spinner size="sm" />
			{:else}
				<iconify-icon icon="solar:eye-bold" width="16"></iconify-icon>
			{/if}
			Prévisualiser
		</Button>
		<Button intent="primary" onclick={handleCreate} disabled={generating} class="flex-1">
			{#if generating}
				<Spinner size="sm" />
			{:else}
				<iconify-icon icon="solar:download-bold" width="16"></iconify-icon>
			{/if}
			Créer et télécharger
		</Button>
	</div>
</div>

{#if showPreview}
	<div
		class="fixed inset-0 bg-black/50 z-50"
		onclick={() => (showPreview = false)}
		role="presentation"
	></div>
	<div
		class="fixed top-0 right-0 h-full w-[800px] bg-background shadow-2xl z-50 flex flex-col"
	>
		<div class="flex items-center justify-between p-4 border-b border-border">
			<div>
				<h3 class="text-base font-semibold text-foreground">Aperçu du document</h3>
				<p class="text-xs text-muted-foreground">Vérifiez les détails avant de créer</p>
			</div>
			<button
				onclick={() => (showPreview = false)}
				class="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
				aria-label="Fermer l'aperçu"
			>
				<iconify-icon icon="solar:close-circle-bold" width="20"></iconify-icon>
			</button>
		</div>
		<div class="flex-1 overflow-hidden p-4 bg-muted">
			<iframe
				src="data:application/pdf;base64,{previewPdf}"
				class="w-full h-full rounded-lg border border-border"
				title="Aperçu du document PDF"
			></iframe>
		</div>
	</div>
{/if}
