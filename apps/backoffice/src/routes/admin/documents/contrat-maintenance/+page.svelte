<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { Button, Input } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import ClientSelect from '$lib/components/ClientSelect.svelte';
	import ProviderSelect from '$lib/components/ProviderSelect.svelte';
	import PdfPreviewModal from '$lib/components/PdfPreviewModal.svelte';

	let generating = $state(false);
	let showPreview = $state(false);
	let previewPdf = $state('');

	let formData = $state({
		contract_reference: 'CTR-001',
		contract_date: new Date().toISOString().split('T')[0],
		maintenance_period: '12 mois',
		clientId: '',
		providerId: '',
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
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<ClientSelect bind:value={formData.clientId} />
			<ProviderSelect bind:value={formData.providerId} />
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

	<PdfPreviewModal
		bind:show={showPreview}
		pdfBase64={previewPdf}
		title="Aperçu du contrat de maintenance"
		onclose={() => (showPreview = false)}
	/>
</div>
