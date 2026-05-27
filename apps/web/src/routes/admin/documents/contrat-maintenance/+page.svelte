<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
			toast.push('Veuillez sélectionner un client et un prestataire', 'error');
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
			toast.push('Aperçu généré avec succès', 'success');
		} catch (error: any) {
			logger.error('Failed to preview document', error);
			toast.push('Échec de la génération de l\'aperçu', 'error');
		} finally {
			generating = false;
		}
	}

	async function handleCreate() {
		if (!formData.clientId || !formData.providerId) {
			toast.push('Veuillez sélectionner un client et un prestataire', 'error');
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

			toast.push('Contrat créé avec succès', 'success');
			goto(resolve(`/admin/documents/${result.id}`));
		} catch (error: any) {
			logger.error('Failed to create document', error);
			toast.push('Échec de la création du contrat', 'error');
		} finally {
			generating = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6">
	<div>
		<button
			onclick={() => goto(resolve('/admin/documents'))}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
			Retour aux documents
		</button>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Nouveau Contrat de Maintenance</h1>
		<p class="text-sm text-muted-foreground mt-1">Créer un contrat de maintenance (sans lignes de facturation)</p>
	</div>

	<div class="rounded-xl border border-border p-6 space-y-4">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<div class="text-sm font-medium mb-2">Référence du contrat *</div>
				<Input bind:value={formData.contract_reference} placeholder="CTR-001" />
			</div>

			<div>
				<div class="text-sm font-medium mb-2">Date du contrat *</div>
				<Input type="date" bind:value={formData.contract_date} />
			</div>

			<div>
				<div class="text-sm font-medium mb-2">Période de maintenance *</div>
				<Input bind:value={formData.maintenance_period} placeholder="12 mois" />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<ClientSelect bind:value={formData.clientId} />
			<ProviderSelect bind:value={formData.providerId} />
		</div>

		<div class="flex gap-3 pt-4">
			<Button onclick={handlePreview} disabled={generating}>
				{generating ? 'Génération...' : 'Aperçu'}
			</Button>
			<button
				onclick={handleCreate}
				disabled={generating}
				class="bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium disabled:opacity-50"
			>
				{generating ? 'Création...' : 'Créer le contrat'}
			</button>
			<Button onclick={() => goto(resolve('/admin/documents'))} intent="secondary">
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
