<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import {
		Alert,
		Button,
		Drawer,
		Field,
		Icon,
		Input,
		Page,
		PageHeader,
		Section,
		Select,
		Spinner,
		Textarea,
		toast,
	} from '@facile/muse';
	import { icons } from '$lib/icons';
	import { logger } from '@repo/logger';
	import { spaceFilter } from '$lib/space-filter.svelte';

	type DocType =
		| 'facture_prestation'
		| 'maintenance'
		| 'contrat_prestation'
		| 'contrat_maintenance'
		| 'back_contractuel'
		| 'appel_de_fonds';

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

	const missionId = $page.url.searchParams.get('missionId');
	const requestedType = $page.url.searchParams.get('type');
	let mission: any = $state(null);
	const backPath = missionId ? `/admin/prestations/${missionId}` : '/admin/documents';

	let formData = $state<any>({
		type: 'facture_prestation',
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
		await Promise.all([loadDocumentTypes(), loadClients(), loadProviders(), loadPrestation()]);

		if (requestedType && docTypes.some((t) => t.value === requestedType)) {
			formData.type = requestedType;
		}
	});

	async function loadPrestation() {
		if (!missionId) return;

		try {
			mission = await trpc.mission.getById.query({ id: missionId });
			selectedClientId = mission.clientId;

			if (mission.providers.length === 1) {
				selectedProviderId = mission.providers[0].providerId;
			}
		} catch (err) {
			logger.error({ err }, 'Failed to fetch mission');
			toast.danger('Mission introuvable');
		}
	}

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
			toast.danger('Erreur lors du chargement des types de documents');
		}
	}

	async function loadClients() {
		try {
			const result = await trpc.client.list.query({
				page: 1,
				limit: 100,
				spaceId: spaceFilter.spaceId,
			});
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
			logger.error({ err }, 'Failed to fetch providers');
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
		if (type === 'facture_prestation' || type === 'maintenance') {
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
				return "Veuillez saisir l'étape du projet (ex: Acompte 30%)";
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

		const providerValidationMessage = getProviderValidationMessage(
			selectedProvider,
			formData.type as DocType
		);
		if (providerValidationMessage) {
			return providerValidationMessage;
		}

		if (formData.type === 'facture_prestation' || formData.type === 'maintenance') {
			if (!formData.items || formData.items.length === 0) {
				return 'Veuillez ajouter au moins un item à la facture';
			}
		}

		if (formData.type === 'facture_prestation' && !formData.invoice_number) {
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
			toast.danger(validationError);
			return;
		}

		try {
			formMessage = '';
			generating = true;
			let result;

			switch (formData.type) {
				case 'facture_prestation':
					result = await trpc.document.previewFacturePrestation.mutate({
						invoice_date: formData.invoice_date,
						due_date: formData.due_date,
						spaceId: spaceFilter.spaceId,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						items: formData.items,
						railway_estimate: Number(formData.railway_estimate || 0),
					});
					break;

				case 'maintenance':
					result = await trpc.document.previewMaintenance.mutate({
						quote_date: formData.quote_date,
						validity_date: formData.validity_date,
						maintenance_period: formData.maintenance_period,
						spaceId: spaceFilter.spaceId,
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
						spaceId: spaceFilter.spaceId,
						clientId: selectedClientId,
						providerId: selectedProviderId,
					});
					break;

				case 'contrat_maintenance':
					result = await trpc.document.previewContratMaintenance.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						maintenance_period: formData.maintenance_period,
						spaceId: spaceFilter.spaceId,
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
						spaceId: spaceFilter.spaceId,
						clientId: selectedClientId,
						providerId: selectedProviderId,
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
						spaceId: spaceFilter.spaceId,
						clientId: selectedClientId,
						providerId: selectedProviderId,
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
			toast.danger(message);
		} finally {
			generating = false;
		}
	}

	async function handleCreate() {
		const validationError = validateForm();
		if (validationError) {
			formMessage = validationError;
			toast.danger(validationError);
			return;
		}

		try {
			formMessage = '';
			generating = true;
			let result;

			switch (formData.type) {
				case 'facture_prestation':
					result = await trpc.document.createFacturePrestation.mutate({
						invoice_date: formData.invoice_date,
						due_date: formData.due_date,
						spaceId: spaceFilter.spaceId,
						missionId: mission?.id,
						clientId: selectedClientId,
						providerId: selectedProviderId,
						items: formData.items,
						railway_estimate: Number(formData.railway_estimate || 0),
					});
					break;

				case 'maintenance':
					result = await trpc.document.createMaintenance.mutate({
						quote_date: formData.quote_date,
						validity_date: formData.validity_date,
						maintenance_period: formData.maintenance_period,
						spaceId: spaceFilter.spaceId,
						missionId: mission?.id,
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
						spaceId: spaceFilter.spaceId,
						missionId: mission?.id,
						clientId: selectedClientId,
						providerId: selectedProviderId,
					});
					break;

				case 'contrat_maintenance':
					result = await trpc.document.createContratMaintenance.mutate({
						contract_reference: formData.contract_reference,
						contract_date: formData.contract_date,
						maintenance_period: formData.maintenance_period,
						spaceId: spaceFilter.spaceId,
						missionId: mission?.id,
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
						spaceId: spaceFilter.spaceId,
						missionId: mission?.id,
						clientId: selectedClientId,
						providerId: selectedProviderId,
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
						spaceId: spaceFilter.spaceId,
						missionId: mission?.id,
						clientId: selectedClientId,
						providerId: selectedProviderId,
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

			toast.success('Document créé avec succès!');
			goto(resolve(backPath as any));
		} catch (err: any) {
			logger.error({ err }, 'Failed to create document');
			const message = err.message || 'Erreur lors de la création';
			formMessage = message;
			toast.danger(message);
		} finally {
			generating = false;
		}
	}

	function addItem() {
		if (!newItem.description || newItem.price <= 0) {
			toast.danger("Veuillez remplir tous les champs de l'item");
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
			toast.danger('Veuillez sélectionner un prestataire, définir son rôle et son montant');
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
			toast.danger('Veuillez remplir tous les champs de la feature');
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
			toast.danger('Veuillez sélectionner un prestataire et définir le montant à verser');
			return;
		}
		formData.payment_providers = [...formData.payment_providers, { ...newPaymentProvider }];
		newPaymentProvider = { id: '', amount_to_pay: 0 };
	}

	function removePaymentProvider(index: number) {
		formData.payment_providers = formData.payment_providers.filter(
			(_: any, i: number) => i !== index
		);
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
	const selectedProvider = $derived(providers.find((p) => p.id === selectedProviderId));
	const linkedProviderIds = $derived(
		new Set((mission?.providers ?? []).map((link: any) => link.providerId))
	);
	const availableProviders = $derived(
		linkedProviderIds.size > 0 ? providers.filter((p) => linkedProviderIds.has(p.id)) : providers
	);
	const selectedProviderMissingFields = $derived(
		getMissingProviderFields(selectedProvider, formData.type as DocType)
	);
	const tvaRate = $derived(selectedProvider?.tvaRate || 20);
	const tva = $derived(totalWithRailway * (tvaRate / 100));
	const total = $derived(totalWithRailway + tva);
</script>

<svelte:head><title>Créer un document - Ardoise</title></svelte:head>

{#snippet entryRow(title: string, subtitle: string, onremove: () => void)}
	<div class="flex items-start gap-3 rounded-fc-md bg-fc-surface p-3">
		<div class="min-w-0 flex-1">
			<div class="text-fc-sm font-medium text-fc-fg">{title}</div>
			<div class="text-fc-xs text-fc-fg-muted">{subtitle}</div>
		</div>
		<Button
			variant="ghost-danger"
			size="sm"
			icon={icons.remove}
			aria-label="Supprimer"
			onclick={onremove}
		/>
	</div>
{/snippet}

{#snippet emptyHint(text: string)}
	<p class="py-6 text-center text-fc-xs text-fc-fg-muted">{text}</p>
{/snippet}

{#snippet itemForm(showTtc: boolean)}
	<div class="flex flex-col gap-3 rounded-fc-md bg-fc-surface p-4">
		<span class="text-fc-sm font-medium text-fc-fg">Ajouter un item</span>
		<Field label="Description">
			<Textarea
				placeholder="Ex: Développement d'un site web vitrine responsive..."
				bind:value={newItem.description}
				rows={2}
			/>
		</Field>
		<div class="grid gap-3 sm:grid-cols-3">
			<Field label="Quantité">
				<Input type="number" placeholder="1" bind:value={newItem.quantity} min="1" />
			</Field>
			<Field label="Unité">
				<Input placeholder="jour" bind:value={newItem.unit} />
			</Field>
			<Field label="Prix HT (EUR)">
				<Input type="number" placeholder="500" bind:value={newItem.price} min="0" step="0.01" />
			</Field>
		</div>
		{#if showTtc && newItem.description && newItem.quantity > 0 && newItem.price > 0}
			<p class="text-fc-xs text-fc-fg-muted">
				{newItem.quantity}
				{newItem.unit} x {formatCurrency(newItem.price)} = {formatCurrency(
					newItem.quantity * newItem.price
				)} HT (TTC: {formatCurrency(newItem.quantity * newItem.price * (1 + tvaRate / 100))})
			</p>
		{/if}
		<Button onclick={addItem} variant="ghost" class="w-full">Ajouter cet item</Button>
	</div>
{/snippet}

{#snippet itemList()}
	{#if formData.items.length === 0}
		{@render emptyHint('Aucun item ajouté')}
	{:else}
		<div class="flex flex-col gap-2">
			{#each formData.items as item, i (i)}
				{@render entryRow(
					item.description,
					`${item.quantity} ${item.unit} x ${formatCurrency(item.price)} = ${formatCurrency(item.quantity * item.price)} HT`,
					() => removeItem(i)
				)}
			{/each}
		</div>
	{/if}
{/snippet}

<Page width="md">
	<PageHeader
		title="Créer un document"
		description={mission
			? `Le document sera rattaché à la mission « ${mission.name} »`
			: 'Générez une facture, un devis ou un contrat'}
		back={{
			href: resolve(backPath as any),
			label: missionId ? 'Retour à la mission' : 'Retour aux documents',
		}}
	/>

	{#if formMessage}
		<Alert tone="danger">{formMessage}</Alert>
	{/if}

	<Section title="Type de document" card>
		<Select bind:value={formData.type} aria-label="Type de document">
			{#each docTypes as type (type.value)}
				<option value={type.value}>{type.label}</option>
			{/each}
		</Select>

		<div class="grid gap-4 sm:grid-cols-3">
			{#if formData.type === 'facture_prestation'}
				<Field label="N° Facture">
					<Input bind:value={formData.invoice_number} />
				</Field>
				<Field label="Date Facture">
					<Input type="date" bind:value={formData.invoice_date} />
				</Field>
				<Field label="Date Échéance">
					<Input type="date" bind:value={formData.due_date} />
				</Field>
			{:else if formData.type === 'maintenance'}
				<Field label="N° Devis">
					<Input bind:value={formData.quote_number} />
				</Field>
				<Field label="Date Devis">
					<Input type="date" bind:value={formData.quote_date} />
				</Field>
				<Field label="Validité">
					<Input type="date" bind:value={formData.validity_date} />
				</Field>
			{:else if formData.type === 'back_contractuel'}
				<Field label="Référence Contrat">
					<Input bind:value={formData.contract_reference} />
				</Field>
				<Field label="Date Contrat">
					<Input type="date" bind:value={formData.contract_date} />
				</Field>
			{:else if formData.type === 'appel_de_fonds'}
				<Field label="Date Facture">
					<Input type="date" bind:value={formData.invoice_date} />
				</Field>
				<Field label="Date Échéance">
					<Input type="date" bind:value={formData.due_date} />
				</Field>
			{:else}
				<Field label="Référence Contrat">
					<Input bind:value={formData.contract_reference} />
				</Field>
				<Field label="Date Contrat">
					<Input type="date" bind:value={formData.contract_date} />
				</Field>
			{/if}
		</div>
	</Section>

	<Section title="Client" card>
		<Select bind:value={selectedClientId} disabled={!!mission} aria-label="Client">
			<option value="">-- Sélectionner un client --</option>
			{#each clients as client (client.id)}
				<option value={client.id}>{client.companyName}</option>
			{/each}
		</Select>
		{#if selectedClientId}
			<Alert tone="success">
				<div class="font-medium">{formData.client_name}</div>
				<div class="text-fc-xs">{formData.client_address}, {formData.client_city}</div>
			</Alert>
		{/if}
	</Section>

	{#if formData.type !== 'back_contractuel' && formData.type !== 'appel_de_fonds'}
		<Section title="Prestataire" card>
			<Select bind:value={selectedProviderId} aria-label="Prestataire">
				<option value="">-- Sélectionner un prestataire --</option>
				{#each availableProviders as provider (provider.id)}
					<option value={provider.id}>{provider.name}</option>
				{/each}
			</Select>
			{#if selectedProviderId}
				<Alert tone={selectedProviderMissingFields.length > 0 ? 'warning' : 'neutral'}>
					<div class="font-medium">{formData.provider_name}</div>
					<div class="text-fc-xs">
						TVA: {tvaRate}% - {formData.provider_email || 'email manquant'}
					</div>
					{#if selectedProviderMissingFields.length > 0}
						<p class="mt-1 text-fc-xs font-medium">
							Champs manquants: {selectedProviderMissingFields
								.map((field) => providerFieldLabels[field])
								.join(', ')}
						</p>
					{/if}
				</Alert>
			{/if}
		</Section>
	{/if}

	{#if formData.type === 'back_contractuel'}
		<Section title="Informations du projet" card>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field label="Nom du projet">
					<Input bind:value={formData.project_name} placeholder="Ex: Site web vitrine" />
				</Field>
				<Field label="Date de validité">
					<Input type="date" bind:value={formData.valid_until} />
				</Field>
			</div>
		</Section>

		<Section title="Prestataires (Co-traitance)" card>
			<div class="flex flex-col gap-3 rounded-fc-md bg-fc-surface p-4">
				<span class="text-fc-sm font-medium text-fc-fg">Ajouter un prestataire</span>
				<Field label="Prestataire *">
					<Select bind:value={newProvider.id}>
						<option value="">-- Choisir un prestataire --</option>
						{#each providers as provider (provider.id)}
							<option value={provider.id}>{provider.name}</option>
						{/each}
					</Select>
				</Field>
				<div class="grid gap-3 sm:grid-cols-2">
					<Field label="Rôle *">
						<Input bind:value={newProvider.role} placeholder="Ex: Développeur Full-Stack" />
					</Field>
					<Field label="Montant HT (EUR) *">
						<Input
							type="number"
							bind:value={newProvider.amount}
							placeholder="Ex: 5000"
							min="0"
							step="0.01"
						/>
					</Field>
				</div>
				<Button onclick={addProvider} variant="ghost" class="w-full">Ajouter ce prestataire</Button>
			</div>

			{#if formData.providers.length === 0}
				{@render emptyHint('Aucun prestataire ajouté')}
			{:else}
				<div class="flex flex-col gap-2">
					{#each formData.providers as provider, i (i)}
						{@const providerInfo = providers.find((p) => p.id === provider.id)}
						{@render entryRow(
							`${providerInfo?.name || provider.id} - ${provider.role}`,
							`${formatCurrency(provider.amount)} HT`,
							() => removeProvider(i)
						)}
					{/each}
				</div>
			{/if}
		</Section>

		<Section title="Périmètre de la mission (Features)" card>
			<div class="flex flex-col gap-3 rounded-fc-md bg-fc-surface p-4">
				<span class="text-fc-sm font-medium text-fc-fg">Ajouter une feature</span>
				<Field label="Titre">
					<Input bind:value={newFeature.title} placeholder="Ex: Design UI/UX" />
				</Field>
				<Field label="Description">
					<Textarea
						bind:value={newFeature.desc}
						rows={2}
						placeholder="Ex: Création d'une identité visuelle moderne et responsive..."
					/>
				</Field>
				<Button onclick={addFeature} variant="ghost" class="w-full">Ajouter cette feature</Button>
			</div>

			{#if formData.features.length === 0}
				{@render emptyHint('Aucune feature ajoutée')}
			{:else}
				<div class="flex flex-col gap-2">
					{#each formData.features as feature, i (i)}
						{@render entryRow(feature.title, feature.desc, () => removeFeature(i))}
					{/each}
				</div>
			{/if}
		</Section>

		<Section title="Items de facturation (Prestations)" card>
			{@render itemForm(false)}
			{@render itemList()}
		</Section>
	{:else if formData.type === 'appel_de_fonds'}
		<Section title="Informations de l'appel de fonds" card>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field label="Référence globale">
					<Input bind:value={formData.global_invoice_ref} placeholder="Ex: ADF-001" />
				</Field>
				<Field label="Étape du projet">
					<Input bind:value={formData.project_step} placeholder="Ex: Acompte 30%" />
				</Field>
				<Field label="Nom du projet" class="sm:col-span-2">
					<Input bind:value={formData.project_name} placeholder="Ex: Site web vitrine" />
				</Field>
			</div>
		</Section>

		<Section title="Prestataires à payer (IBAN/BIC)" card>
			<div class="flex flex-col gap-3 rounded-fc-md bg-fc-surface p-4">
				<span class="text-fc-sm font-medium text-fc-fg">Ajouter un prestataire</span>
				<Field label="Prestataire *">
					<Select bind:value={newPaymentProvider.id}>
						<option value="">-- Choisir un prestataire --</option>
						{#each providers as provider (provider.id)}
							<option value={provider.id}>{provider.name}</option>
						{/each}
					</Select>
				</Field>
				<Field label="Montant à verser (EUR HT) *">
					<Input
						type="number"
						bind:value={newPaymentProvider.amount_to_pay}
						placeholder="Ex: 1500"
						min="0"
						step="0.01"
					/>
				</Field>
				<Button onclick={addPaymentProvider} variant="ghost" class="w-full">
					Ajouter ce prestataire
				</Button>
			</div>

			{#if formData.payment_providers.length === 0}
				{@render emptyHint('Aucun prestataire ajouté')}
			{:else}
				<div class="flex flex-col gap-2">
					{#each formData.payment_providers as provider, i (i)}
						{@const providerInfo = providers.find((p) => p.id === provider.id)}
						{@render entryRow(
							providerInfo?.name || provider.id,
							`Montant: ${formatCurrency(provider.amount_to_pay)} HT`,
							() => removePaymentProvider(i)
						)}
					{/each}
				</div>

				<div class="flex items-center justify-between rounded-fc-md bg-fc-surface p-4">
					<span class="text-fc-sm font-medium text-fc-fg-muted">TOTAL HT</span>
					<span class="text-fc-lg font-semibold text-fc-fg">
						{formatCurrency(
							formData.payment_providers.reduce((sum: number, p: any) => sum + p.amount_to_pay, 0)
						)}
					</span>
				</div>
			{/if}
		</Section>
	{:else if formData.type === 'facture_prestation' || formData.type === 'maintenance'}
		<Section title="Items de facturation" card>
			{#snippet actions()}
				{#if formData.items.length > 0}
					<span class="text-fc-sm font-medium text-fc-fg">Total: {formatCurrency(total)} TTC</span>
				{/if}
			{/snippet}

			{@render itemForm(true)}
			{@render itemList()}

			{#if formData.items.length > 0}
				<div class="grid gap-4 rounded-fc-md bg-fc-surface p-4 text-fc-sm sm:grid-cols-3">
					<div class="flex flex-col gap-1">
						<span class="text-fc-xs text-fc-fg-muted">Sous-total HT</span>
						<span class="font-semibold text-fc-fg">{formatCurrency(subtotal)}</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-fc-xs text-fc-fg-muted">TVA ({tvaRate}%)</span>
						<span class="font-semibold text-fc-fg">{formatCurrency(tva)}</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-fc-xs text-fc-fg-muted">Total TTC</span>
						<span class="font-semibold text-fc-fg">{formatCurrency(total)}</span>
					</div>
				</div>
			{/if}
		</Section>
	{/if}

	<div class="flex flex-wrap justify-end gap-3">
		<Button href={resolve('/admin/documents')} variant="ghost" disabled={generating}>Annuler</Button
		>
		<Button variant="ghost" onclick={handlePreview} disabled={generating}>
			{#if generating && !showPreview}
				<Spinner size="sm" />
			{:else}
				<Icon icon={icons.eye} size={16} />
			{/if}
			Prévisualiser
		</Button>
		<Button onclick={handleCreate} disabled={generating}>
			{#if generating}
				<Spinner size="sm" />
			{:else}
				<Icon icon={icons.download} size={16} />
			{/if}
			Créer et télécharger
		</Button>
	</div>
</Page>

<Drawer
	bind:open={showPreview}
	title="Aperçu du document"
	description="Vérifiez les détails avant de créer"
	showClose
	onClose={() => (showPreview = false)}
>
	<iframe
		src="data:application/pdf;base64,{previewPdf}"
		class="h-[65dvh] w-full rounded-fc-md bg-fc-surface"
		title="Aperçu du document PDF"
	></iframe>
</Drawer>
