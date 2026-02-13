<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button, Input } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';

	interface Client {
		id: string;
		companyName: string;
	}

	interface Provider {
		id: string;
		name: string;
		tvaRate: number;
	}

	let generating = $state(false);
	let showPreview = $state(false);
	let previewPdf = $state('');
	let clients: Client[] = $state([]);
	let providers: Provider[] = $state([]);

	let formData = $state({
		contract_reference: 'CTR-001',
		contract_date: new Date().toISOString().split('T')[0],
		maintenance_period: '12 mois',
		clientId: '',
		providerId: '',
		tva_rate: 20,
	});

	onMount(async () => {
		await Promise.all([loadClients(), loadProviders()]);
	});

	async function loadClients() {
		try {
			const result = await trpc.client.list.query({ limit: 100, offset: 0 });
			clients = result.data;
		} catch (error: any) {
			logger.error('Failed to load clients', error);
			toast.error('Failed to load clients');
		}
	}

	async function loadProviders() {
		try {
			const result = await trpc.admin.providers.list.query({ limit: 100, offset: 0 });
			providers = result.data;
		} catch (error: any) {
			logger.error('Failed to load providers', error);
			toast.error('Failed to load providers');
		}
	}

	$effect(() => {
		if (formData.providerId) {
			const provider = providers.find((p) => p.id === formData.providerId);
			if (provider) {
				formData.tva_rate = provider.tvaRate;
			}
		}
	});

	async function handlePreview() {
		if (!formData.clientId || !formData.providerId) {
			toast.error('Veuillez sélectionner un client et un prestataire');
			return;
		}

		generating = true;
		try {
			const result = await trpc.document.previewContratMaintenance.mutate({
				contract_reference: formData.contract_reference,
				contract_date: formData.contract_date,
				maintenance_period: formData.maintenance_period,
				clientId: formData.clientId,
				providerId: formData.providerId,
				tva_rate: formData.tva_rate,
			});

			previewPdf = result.pdf;
			showPreview = true;
			toast.success('Aperçu généré avec succès');
		} catch (error: any) {
			logger.error('Failed to preview document', error);
			toast.error('Échec de la génération de l\'aperçu');
		} finally {
			generating = false;
		}
	}

	async function handleCreate() {
		if (!formData.clientId || !formData.providerId) {
			toast.error('Veuillez sélectionner un client et un prestataire');
			return;
		}

		generating = true;
		try {
			const result = await trpc.document.createContratMaintenance.mutate({
				contract_reference: formData.contract_reference,
				contract_date: formData.contract_date,
				maintenance_period: formData.maintenance_period,
				clientId: formData.clientId,
				providerId: formData.providerId,
				tva_rate: formData.tva_rate,
			});

			toast.success('Contrat créé avec succès');
			goto(`/admin/documents/${result.id}`);
		} catch (error: any) {
			logger.error('Failed to create document', error);
			toast.error('Échec de la création du contrat');
		} finally {
			generating = false;
		}
	}
</script>

<div class="max-w-4xl mx-auto p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Nouveau Contrat de Maintenance</h1>
		<p class="text-gray-600 mt-2">Créer un contrat de maintenance (sans lignes de facturation)</p>
	</div>

	<div class="bg-white rounded-lg shadow p-6 space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium mb-2">Référence du contrat *</label>
				<Input bind:value={formData.contract_reference} placeholder="CTR-001" />
			</div>

			<div>
				<label class="block text-sm font-medium mb-2">Date du contrat *</label>
				<Input type="date" bind:value={formData.contract_date} />
			</div>

			<div>
				<label class="block text-sm font-medium mb-2">Période de maintenance *</label>
				<Input bind:value={formData.maintenance_period} placeholder="12 mois" />
			</div>

			<div>
				<label class="block text-sm font-medium mb-2">Taux TVA (%)</label>
				<Input type="number" bind:value={formData.tva_rate} step="0.1" />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium mb-2">Client *</label>
				<select
					bind:value={formData.clientId}
					class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
				>
					<option value="">Sélectionner un client</option>
					{#each clients as client}
						<option value={client.id}>{client.companyName}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium mb-2">Prestataire *</label>
				<select
					bind:value={formData.providerId}
					class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
				>
					<option value="">Sélectionner un prestataire</option>
					{#each providers as provider}
						<option value={provider.id}>{provider.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="flex gap-4 pt-4">
			<Button onclick={handlePreview} disabled={generating}>
				{generating ? 'Génération...' : 'Aperçu'}
			</Button>
			<Button onclick={handleCreate} variant="primary" disabled={generating}>
				{generating ? 'Création...' : 'Créer le contrat'}
			</Button>
			<Button onclick={() => goto('/admin/documents')} variant="secondary">
				Annuler
			</Button>
		</div>
	</div>

	{#if showPreview && previewPdf}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
				<div class="flex justify-between items-center p-4 border-b">
					<h2 class="text-xl font-bold">Aperçu du contrat</h2>
					<button onclick={() => (showPreview = false)} class="text-gray-500 hover:text-gray-700">
						<iconify-icon icon="mdi:close" width="24"></iconify-icon>
					</button>
				</div>
				<div class="flex-1 overflow-auto p-4">
					<iframe
						src="data:application/pdf;base64,{previewPdf}"
						class="w-full h-full"
						title="PDF Preview"
					></iframe>
				</div>
			</div>
		</div>
	{/if}
</div>
