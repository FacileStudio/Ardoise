<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import { Spinner, Button } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
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
		createdByUser: {
			firstName: string;
			lastName: string;
		};
	};

	let loading = $state(false);
	let documents: Document[] = $state([]);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let searchQuery = $state('');
	let selectedType = $state<string>('');

	let docTypes: Array<{ value: string; label: string }> = $state([]);

	onMount(async () => {
		await loadDocumentTypes();
		await loadDocuments();
	});

	async function loadDocumentTypes() {
		try {
			docTypes = await trpc.document.types.query();
		} catch (err) {
			logger.error({ err }, 'Failed to fetch document types');
			toast.push('Erreur lors du chargement des types de documents', 'error');
		}
	}

	async function loadDocuments() {
		loading = true;
		try {
			const result = await trpc.document.list.query({
				page: currentPage,
				pageSize: 20,
				search: searchQuery || undefined,
				type: selectedType || undefined,
			});
			documents = result.items as any;
			totalPages = result.totalPages;
		} catch (err) {
			logger.error({ err }, 'Failed to load documents');
			toast.push('Erreur lors du chargement des documents', 'error');
		} finally {
			loading = false;
		}
	}

	function handleSearch(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;
		currentPage = 1;
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
			toast.push('Erreur lors du téléchargement', 'error');
		}
	}

	async function handleDelete(documentId: string) {
		if (!confirm('Voulez-vous vraiment supprimer ce document?')) return;

		try {
			await trpc.document.delete.mutate({ id: documentId });
			toast.push('Document supprimé avec succès', 'success');
			await loadDocuments();
		} catch (err: any) {
			logger.error({ err }, 'Failed to delete document');
			toast.push('Erreur lors de la suppression', 'error');
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

<div class="p-8 max-w-[1400px] mx-auto">
	<div class="flex justify-between items-center mb-6">
		<div>
			<h1 class="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
				<iconify-icon icon="solar:document-text-bold" width="32" class="text-[#291334]"
				></iconify-icon>
				Documents
			</h1>
			<p class="text-slate-500 text-sm mt-1">Gérez vos factures, devis et contrats</p>
		</div>
		<button
			onclick={() => goto('/admin/documents/create')}
			class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
		>
			<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
			<span>Créer un document</span>
		</button>
	</div>

	<div class="mb-6 space-y-4">
		<div class="relative">
			<iconify-icon
				icon="solar:magnifer-linear"
				width="20"
				class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
			></iconify-icon>
			<input
				type="text"
				placeholder="Rechercher par référence, client..."
				class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-all"
				oninput={handleSearch}
			/>
		</div>

		<div class="flex gap-2 flex-wrap">
			{#each docTypes as type (type.value)}
				<button
					onclick={() => handleTypeFilter(type.value)}
					class="px-4 py-2 rounded-xl font-bold text-sm transition-all {selectedType ===
					type.value
						? 'bg-[#291334] text-white'
						: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
				>
					{type.label}
				</button>
			{/each}
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center items-center py-20">
			<Spinner />
		</div>
	{:else if documents.length === 0}
		<div class="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
			<iconify-icon icon="solar:document-text-bold" width="64" class="text-slate-300 mx-auto mb-4"
			></iconify-icon>
			<h3 class="text-xl font-black text-slate-900 mb-2">Aucun document</h3>
			<p class="text-slate-500 mb-4">Créez votre premier document pour commencer</p>
			<button
				onclick={() => goto('/admin/documents/create')}
				class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
			>
				<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
				<span>Créer un document</span>
			</button>
		</div>
	{:else}
		<div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
			<table class="w-full">
				<thead class="bg-slate-50 border-b border-slate-100">
					<tr>
						<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
							>Référence</th
						>
						<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
							>Type</th
						>
						<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
							>Client</th
						>
						<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
							>Montant</th
						>
						<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
							>Date</th
						>
						<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
							>Créé par</th
						>
						<th class="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase tracking-wider"
							>Actions</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each documents as doc (doc.id)}
						<tr class="hover:bg-slate-50 transition-colors">
							<td class="px-6 py-4">
								<span class="font-bold text-slate-900">{getDocumentRef(doc)}</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm font-medium text-slate-600"
									>{docTypes.find((t) => t.value === doc.type)?.label || doc.type}</span
								>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm font-medium text-slate-900">{doc.clientName}</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm font-bold text-[#291334]">{formatCurrency(doc.total)}</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm text-slate-600">{formatDate(doc.createdAt)}</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm text-slate-600"
									>{doc.createdByUser.firstName}
									{doc.createdByUser.lastName}</span
								>
							</td>
							<td class="px-6 py-4">
								<div class="flex justify-end gap-2">
									<button
										onclick={() => handleDownload(doc.id)}
										class="p-2 text-[#291334] hover:bg-[#291334]/10 rounded-lg transition-colors"
										title="Télécharger"
									>
										<iconify-icon icon="solar:download-bold" width="18"></iconify-icon>
									</button>
									<button
										onclick={() => handleDelete(doc.id)}
										class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
										title="Supprimer"
									>
										<iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if totalPages > 1}
			<div class="flex justify-center mt-6 gap-2">
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
					<button
						onclick={() => {
							currentPage = page;
							loadDocuments();
						}}
						class="px-4 py-2 rounded-xl font-bold text-sm transition-all {currentPage === page
							? 'bg-[#291334] text-white'
							: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
					>
						{page}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>
