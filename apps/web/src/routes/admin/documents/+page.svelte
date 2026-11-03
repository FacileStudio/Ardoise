<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		Button,
		Badge,
		Card,
		ConfirmModal,
		EmptyState,
		Page,
		PageHeader,
		Spinner,
		Table,
		Tabs,
		toast,
	} from '@facile/muse';
	import { icons, ardoise } from '$lib/icons';
	import { Pagination, SearchInput, SpaceFilter } from '$lib/ui';
	import { logger } from '@repo/logger';
	import { DOCUMENT_TYPE_LABELS } from '$lib/mission';
	import { SIGNABLE_TYPES, loadSignatureEnabled } from '$lib/signature';
	import SignatureStatus from '$lib/components/SignatureStatus.svelte';
	import SendForSignature from '$lib/components/SendForSignature.svelte';
	import { spaceFilter } from '$lib/space-filter.svelte';
	import { i18n } from '@repo/i18n/svelte';

	type Document = {
		id: string;
		space?: { id: string; name: string } | null;
		createdAt: Date;
		type: string;
		name: string;
		invoiceNumber?: string | null;
		quoteNumber?: string | null;
		contractRef?: string | null;
		clientName: string;
		total: number;
		source?: 'generated' | 'imported';
		issuedAt?: Date | string | null;
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
	let typeTab = $state('ALL');
	let deleteTarget: Document | null = $state(null);
	let confirmDelete = $state(false);

	let signatureEnabled = $state(false);
	let docTypes: Array<{ value: string; label: string }> = $state([]);
	let searchTimer: ReturnType<typeof setTimeout>;

	const typeTabs = $derived([
		{ id: 'ALL', label: 'Tous' },
		...docTypes.map((type) => ({ id: type.value, label: type.label })),
	]);

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
				spaceId: spaceFilter.spaceId,
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
		selectedType = type === 'ALL' ? '' : type;
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

	function askDelete(doc: Document) {
		deleteTarget = doc;
		confirmDelete = true;
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		const documentId = deleteTarget.id;

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

	function typeLabel(type: string): string {
		return docTypes.find((t) => t.value === type)?.label || DOCUMENT_TYPE_LABELS[type] || type;
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

<svelte:head><title>Documents - Ardoise</title></svelte:head>

{#if pageLoading}
	<div class="flex min-h-[40dvh] items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else}
	<Page width="xl">
		<PageHeader title="Documents" description="Gérez vos factures, devis et contrats">
			{#snippet actions()}
				<Button variant="outline" href={resolve('/admin/documents/import')} icon={ardoise.pdf}>
					{$i18n.t('import.action')}
				</Button>
				<Button href={resolve('/admin/documents/create')} icon={icons.plus}
					>Créer un document</Button
				>
			{/snippet}
		</PageHeader>

		<div class="flex flex-col gap-2 sm:flex-row">
			<SearchInput
				class="flex-1"
				bind:value={searchQuery}
				oninput={handleSearch}
				placeholder="Rechercher par référence, client..."
			/>
			<SpaceFilter />
		</div>

		<Tabs
			label="Filtrer par type"
			items={typeTabs}
			bind:value={typeTab}
			onChange={handleTypeFilter}
		/>

		{#if documents.length > 0}
			<div class="hidden md:block">
				<Table>
					<thead>
						<tr>
							<th scope="col">Référence</th>
							<th scope="col">Type</th>
							<th scope="col">Client</th>
							<th scope="col">{$i18n.t('nav.space')}</th>
							<th scope="col">Montant</th>
							<th scope="col">Date</th>
							<th scope="col">Créé par</th>
							<th scope="col" aria-label="Actions"></th>
						</tr>
					</thead>
					<tbody>
						{#each documents as doc (doc.id)}
							<tr>
								<td>
									<a
										href={resolve(`/admin/documents/${doc.id}`)}
										class="font-medium text-fc-fg hover:underline"
									>
										{getDocumentRef(doc)}
									</a>
									{#if doc.source === 'imported'}
										<Badge tone="neutral">{$i18n.t('import.badge.imported')}</Badge>
									{/if}
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
								<td class="text-fc-fg-muted">{typeLabel(doc.type)}</td>
								<td class="font-medium text-fc-fg">{doc.clientName}</td>
								<td class="text-fc-fg-muted">{doc.space?.name ?? '-'}</td>
								<td class="font-medium text-fc-fg">{formatCurrency(doc.total)}</td>
								<td class="text-fc-fg-muted">{formatDate(doc.issuedAt ?? doc.createdAt)}</td>
								<td class="text-fc-fg-muted">
									{doc.createdByUser.firstName}
									{doc.createdByUser.lastName}
								</td>
								<td>
									<div class="flex items-center justify-end gap-1">
										{#if SIGNABLE_TYPES.includes(doc.type) && doc.signatureStatus === 'none'}
											<SendForSignature
												documentId={doc.id}
												enabled={signatureEnabled}
												onsent={() => loadDocuments()}
											/>
										{/if}
										<Button
											variant="ghost"
											size="sm"
											icon={icons.download}
											aria-label="Télécharger"
											onclick={() => handleDownload(doc.id)}
										/>
										<Button
											variant="ghost"
											size="sm"
											icon={icons.edit}
											aria-label={$i18n.t('import.detail.title')}
											href={resolve(`/admin/documents/${doc.id}`)}
										/>
										<Button
											variant="ghost-danger"
											size="sm"
											icon={icons.remove}
											aria-label="Supprimer"
											onclick={() => askDelete(doc)}
										/>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</Table>
			</div>

			<div class="flex flex-col gap-2 md:hidden">
				{#each documents as doc (doc.id)}
					<Card class="flex flex-col gap-3">
						<div class="flex items-start justify-between gap-2">
							<div class="flex min-w-0 flex-col">
								<span class="truncate text-fc-sm font-medium text-fc-fg">{getDocumentRef(doc)}</span
								>
								<span class="truncate text-fc-xs text-fc-fg-muted">
									{typeLabel(doc.type)} - {doc.clientName}{#if doc.space}
										· {doc.space.name}{/if}
								</span>
							</div>
							<span class="text-fc-sm font-medium text-fc-fg">{formatCurrency(doc.total)}</span>
						</div>
						{#if SIGNABLE_TYPES.includes(doc.type)}
							<SignatureStatus
								status={doc.signatureStatus}
								plumeUrl={doc.plumeUrl}
								signedAt={doc.signedAt}
								archived={!!doc.nuageArchivedAt}
							/>
						{/if}
						<div class="flex items-center justify-between gap-2">
							<span class="text-fc-xs text-fc-fg-muted">{formatDate(doc.issuedAt ?? doc.createdAt)}</span>
							<div class="flex items-center gap-1">
								{#if SIGNABLE_TYPES.includes(doc.type) && doc.signatureStatus === 'none'}
									<SendForSignature
										documentId={doc.id}
										enabled={signatureEnabled}
										onsent={() => loadDocuments()}
									/>
								{/if}
								<Button
									variant="ghost"
									size="lg"
									icon={icons.download}
									aria-label="Télécharger"
									onclick={() => handleDownload(doc.id)}
								/>
								<Button
									variant="ghost"
									size="lg"
									icon={icons.edit}
									aria-label={$i18n.t('import.detail.title')}
									href={resolve(`/admin/documents/${doc.id}`)}
								/>
								<Button
									variant="ghost-danger"
									size="lg"
									icon={icons.remove}
									aria-label="Supprimer"
									onclick={() => askDelete(doc)}
								/>
							</div>
						</div>
					</Card>
				{/each}
			</div>

			{#if totalPages > 1}
				<Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
			{/if}
		{:else}
			<EmptyState
				icon={ardoise.document}
				title="Aucun document"
				description={searchQuery || selectedType
					? 'Aucun résultat trouvé pour votre recherche'
					: `Créez votre premier document pour commencer. ${$i18n.t('import.emptyTitle')} : ${$i18n.t('import.emptyDescription')}`}
			>
				{#if !searchQuery && !selectedType}
					<Button href={resolve('/admin/documents/create')} icon={icons.plus}>
						Créer un document
					</Button>
					<Button variant="outline" href={resolve('/admin/documents/import')} icon={ardoise.pdf}>
						{$i18n.t('import.action')}
					</Button>
				{/if}
			</EmptyState>
		{/if}
	</Page>
{/if}

<ConfirmModal
	bind:open={confirmDelete}
	tone="danger"
	title="Supprimer ce document ?"
	description="Le PDF et sa référence sont supprimés définitivement. Une demande de signature déjà envoyée n'est pas retirée côté signataire."
	confirmLabel="Supprimer le document"
	cancelLabel="Garder le document"
	onConfirm={handleDelete}
	onCancel={() => (deleteTarget = null)}
/>
