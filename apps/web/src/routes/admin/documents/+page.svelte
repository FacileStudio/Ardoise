<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Spinner, toast } from '@facile/muse';
	import { Pagination, SearchInput } from '$lib/ui';
	import { logger } from '@repo/logger';
	import { DOCUMENT_TYPE_LABELS } from '$lib/mission';
	import { SIGNABLE_TYPES, loadSignatureEnabled } from '$lib/signature';
	import SignatureStatus from '$lib/components/SignatureStatus.svelte';
	import SendForSignature from '$lib/components/SendForSignature.svelte';
	import { spaceContext } from '$lib/space-context.svelte';
	import 'iconify-icon';

	type Document = {
		id: string;
		createdAt: Date;
		type: string;
		name: string;
		invoiceNumber?: string | null;
		quoteNumber?: string | null;
		contractRef?: string | null;
		clientName: string;
		total: number;
		signatureStatus: 'none' | 'sent' | 'signed' | 'declined';
		plumeUrl?: string | null;
		signedAt?: Date | string | null;
		nuageArchivedAt?: Date | string | null;
		createdByUser: {
			firstName: string;
			lastName: string;
		};
	};

	let pageLoading = $state(true);
	let loading = $state(false);
	let documents: Document[] = $state([]);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let searchQuery = $state('');
	let selectedType = $state<string>('');

	let signatureEnabled = $state(false);
	let docTypes: Array<{ value: string; label: string }> = $state([]);
	let searchTimer: ReturnType<typeof setTimeout>;

	onMount(() => {
		loadSignatureEnabled().then((enabled) => (signatureEnabled = enabled));
		loadDocumentTypes().then(() => loadDocuments(true));
		return () => clearTimeout(searchTimer);
	});

	async function loadDocumentTypes() {
		try {
			docTypes = await trpc.document.types.query();
		} catch (err) {
			logger.error({ err }, 'Failed to fetch document types');
			toast.danger('Erreur lors du chargement des types de documents');
		}
	}

	async function loadDocuments(isInitialLoad = false) {
		if (isInitialLoad) {
			pageLoading = true;
		} else {
			loading = true;
		}
		try {
			const result = await trpc.document.list.query({
				page: currentPage,
				pageSize: 20,
				search: searchQuery || undefined,
				type: selectedType || undefined,
				spaceId: spaceContext.spaceId,
			});
			documents = result.items as unknown as Document[];
			totalPages = result.totalPages;
		} catch (err) {
			logger.error({ err }, 'Failed to load documents');
			toast.danger('Erreur lors du chargement des documents');
		} finally {
			if (isInitialLoad) {
				pageLoading = false;
			} else {
				loading = false;
			}
		}
	}

	function handleSearch() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			currentPage = 1;
			loadDocuments();
		}, 300);
	}

	function handlePageChange(page: number) {
		currentPage = page;
		loadDocuments();
	}

	function handleTypeFilter(type: string) {
		selectedType = type === selectedType ? '' : type;
		currentPage = 1;
		loadDocuments();
	}

	async function handleDownload(documentId: string) {
		try {
			const result = await trpc.document.download.mutate({ id: documentId });
			const pdfBlob = base64ToBlob(result.pdf, 'application/pdf');
			const url = URL.createObjectURL(pdfBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = result.fileName;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err: any) {
			logger.error({ err }, 'Failed to download document');
			toast.danger('Erreur lors du téléchargement');
		}
	}

	async function handleDelete(documentId: string) {
		if (!confirm('Voulez-vous vraiment supprimer ce document?')) return;

		try {
			await trpc.document.delete.mutate({ id: documentId });
			toast.success('Document supprimé avec succès');
			await loadDocuments();
		} catch (err: any) {
			logger.error({ err }, 'Failed to delete document');
			toast.danger('Erreur lors de la suppression');
		}
	}

	function base64ToBlob(base64: string, type: string): Blob {
		const binary = atob(base64);
		const array = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			array[i] = binary.charCodeAt(i);
		}
		return new Blob([array], { type });
	}

	function getDocumentRef(doc: Document): string {
		return doc.invoiceNumber || doc.quoteNumber || doc.contractRef || '-';
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('fr-FR');
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount);
	}
</script>

{#if pageLoading}
	<div class="flex flex-col items-center justify-center h-screen space-y-4">
		<Spinner size="lg" />
		<p class="text-xs text-muted-foreground">Chargement...</p>
	</div>
{:else}
	<div class="p-6 max-w-5xl mx-auto space-y-6">
		<header class="flex justify-between items-center">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground">Documents</h1>
				<p class="text-sm text-muted-foreground mt-1">Gérez vos factures, devis et contrats</p>
			</div>
			<button
				onclick={() => goto(resolve('/admin/documents/create'))}
				class="bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium flex items-center gap-2"
			>
				<iconify-icon icon="mdi:plus" width="16"></iconify-icon>
				Créer un document
			</button>
		</header>

		<div class="space-y-3">
			<SearchInput
				bind:value={searchQuery}
				oninput={handleSearch}
				placeholder="Rechercher par référence, client..."
			/>

			<div class="flex gap-2 flex-wrap">
				{#each docTypes as type (type.value)}
					<button
						onclick={() => handleTypeFilter(type.value)}
						class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {selectedType === type.value
							? 'bg-primary text-primary-foreground'
							: 'bg-background text-foreground border border-border hover:bg-muted'}"
					>
						{type.label}
					</button>
				{/each}
			</div>
		</div>

		{#if documents.length > 0}
			<div class="rounded-xl border border-border overflow-hidden">
				<table class="w-full">
					<thead class="bg-muted border-b border-border">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Référence</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Montant</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Créé par</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each documents as doc (doc.id)}
							<tr class="hover:bg-muted transition-colors">
								<td class="px-4 py-3">
									<span class="text-sm font-medium text-foreground">{getDocumentRef(doc)}</span>
									{#if SIGNABLE_TYPES.includes(doc.type)}
										<div class="mt-1">
											<SignatureStatus
												status={doc.signatureStatus}
												plumeUrl={doc.plumeUrl}
												signedAt={doc.signedAt}
												archived={!!doc.nuageArchivedAt}
											/>
										</div>
									{/if}
								</td>
								<td class="px-4 py-3">
									<span class="text-sm text-muted-foreground">{docTypes.find((t) => t.value === doc.type)?.label || DOCUMENT_TYPE_LABELS[doc.type] || doc.type}</span>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm font-medium text-foreground">{doc.clientName}</span>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm font-medium text-foreground">{formatCurrency(doc.total)}</span>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm text-muted-foreground">{formatDate(doc.createdAt)}</span>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm text-muted-foreground">{doc.createdByUser.firstName} {doc.createdByUser.lastName}</span>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center justify-end gap-1">
										{#if SIGNABLE_TYPES.includes(doc.type) && doc.signatureStatus === 'none'}
											<SendForSignature
												documentId={doc.id}
												enabled={signatureEnabled}
												onsent={() => loadDocuments()}
											/>
										{/if}
										<button
											onclick={() => handleDownload(doc.id)}
											class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
											title="Télécharger"
										>
											<iconify-icon icon="solar:download-bold" width="16"></iconify-icon>
										</button>
										<button
											onclick={() => handleDelete(doc.id)}
											class="p-1.5 text-fc-danger hover:bg-fc-danger/10 rounded transition-colors"
											title="Supprimer"
										>
											<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if totalPages > 1}
				<Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
			{/if}
		{:else}
			<div class="text-center py-16">
				<div class="flex flex-col items-center gap-3">
					<iconify-icon icon="solar:document-text-bold" width="40" class="text-muted-foreground"></iconify-icon>
					<h3 class="text-lg font-semibold text-foreground">Aucun document</h3>
					<p class="text-sm text-muted-foreground max-w-md">{searchQuery || selectedType ? 'Aucun résultat trouvé pour votre recherche' : 'Créez votre premier document pour commencer'}</p>
					{#if !searchQuery && !selectedType}
						<button
							onclick={() => goto(resolve('/admin/documents/create'))}
							class="bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium flex items-center gap-2 mt-2"
						>
							<iconify-icon icon="mdi:plus" width="16"></iconify-icon>
							Créer un document
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
