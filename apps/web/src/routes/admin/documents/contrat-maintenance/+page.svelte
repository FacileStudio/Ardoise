<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Field, Input, Page, PageHeader, Section, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { spaceFilter } from '$lib/space-filter.svelte';
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
			toast.danger('Veuillez sélectionner un client et un prestataire');
			return;
		}

		generating = true;
		try {
			const result = await trpc.document.previewContratMaintenance.mutate({
				spaceId: spaceFilter.spaceId,
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
			logger.error({ err: error }, 'Failed to preview document');
			toast.danger("Échec de la génération de l'aperçu");
		} finally {
			generating = false;
		}
	}

	async function handleCreate() {
		if (!formData.clientId || !formData.providerId) {
			toast.danger('Veuillez sélectionner un client et un prestataire');
			return;
		}

		generating = true;
		try {
			const result = await trpc.document.createContratMaintenance.mutate({
				spaceId: spaceFilter.spaceId,
				contract_reference: formData.contract_reference,
				contract_date: formData.contract_date,
				maintenance_period: formData.maintenance_period,
				clientId: formData.clientId,
				providerId: formData.providerId,
			});

			toast.success('Contrat créé avec succès');
			goto(resolve('/admin/documents'));
		} catch (error: any) {
			logger.error({ err: error }, 'Failed to create document');
			toast.danger('Échec de la création du contrat');
		} finally {
			generating = false;
		}
	}
</script>

<svelte:head><title>Nouveau contrat de maintenance - Ardoise</title></svelte:head>

<Page width="md">
	<PageHeader
		title="Nouveau contrat de maintenance"
		description="Créer un contrat de maintenance (sans lignes de facturation)"
		back={{ href: resolve('/admin/documents'), label: 'Retour aux documents' }}
	/>

	<Section card>
		<div class="grid gap-4 md:grid-cols-2">
			<Field label="Référence du contrat *">
				<Input bind:value={formData.contract_reference} placeholder="CTR-001" />
			</Field>
			<Field label="Date du contrat *">
				<Input type="date" bind:value={formData.contract_date} />
			</Field>
			<Field label="Période de maintenance *">
				<Input bind:value={formData.maintenance_period} placeholder="12 mois" />
			</Field>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<ClientSelect bind:value={formData.clientId} />
			<ProviderSelect bind:value={formData.providerId} />
		</div>
	</Section>

	<div class="flex justify-end gap-3">
		<Button href={resolve('/admin/documents')} variant="ghost">Annuler</Button>
		<Button variant="ghost" onclick={handlePreview} disabled={generating}>
			{generating ? 'Génération...' : 'Aperçu'}
		</Button>
		<Button onclick={handleCreate} disabled={generating}>
			{generating ? 'Création...' : 'Créer le contrat'}
		</Button>
	</div>

	<PdfPreviewModal
		bind:show={showPreview}
		pdfBase64={previewPdf}
		title="Aperçu du contrat de maintenance"
		onclose={() => (showPreview = false)}
	/>
</Page>
