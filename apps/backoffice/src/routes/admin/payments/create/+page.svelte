<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Spinner, Button, Input } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	type PaymentFrequency = 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
	type PaymentCollectionMethod = 'STRIPE' | 'MANUAL';

	interface Client {
		id: string;
		companyName: string;
		contactFirstName: string;
		contactLastName: string;
		contactEmail?: string | null;
		user?: {
			id: string;
			email: string;
			firstName: string;
			lastName: string;
		};
	}

	interface Document {
		id: string;
		name: string;
		type: string;
		invoiceNumber?: string;
		quoteNumber?: string;
		contractRef?: string;
		clientName: string;
		total: number;
		createdAt: Date;
	}

	let submitting = $state(false);
	let clients: Client[] = $state([]);
	let selectedClientId = $state('');
	let documents: Document[] = $state([]);
	let documentSearchQuery = $state('');
	let selectedDocumentIds = $state<string[]>([]);

	let formData = $state({
		clientId: '',
		amount: 0,
		description: '',
		frequency: 'ONE_TIME' as PaymentFrequency,
		collectionMethod: 'STRIPE' as PaymentCollectionMethod,
		reference: '',
		dueDate: new Date().toISOString().split('T')[0],
		attachedFiles: [] as string[],
		attachedDocumentIds: [] as string[],
	});

	onMount(async () => {
		await Promise.all([loadClients(), loadDocuments()]);
	});

	async function loadClients() {
		try {
			const result = await trpc.client.list.query({ page: 1, limit: 100 });
			clients = result.clients as Client[];
		} catch (err) {
			logger.error({ err }, 'Failed to fetch clients');
			toast.push('Erreur lors du chargement des clients', 'error');
		}
	}

	async function loadDocuments() {
		try {
			const result = await trpc.document.list.query({
				page: 1,
				pageSize: 100,
				search: documentSearchQuery || undefined,
			});
			documents = result.items as Document[];
		} catch (err) {
			logger.error({ err }, 'Failed to fetch documents');
			toast.push('Erreur lors du chargement des documents', 'error');
		}
	}

	$effect(() => {
		if (selectedClientId) {
			formData.clientId = selectedClientId;
		}
	});

	$effect(() => {
		formData.attachedDocumentIds = selectedDocumentIds;
	});

	function toggleDocument(documentId: string) {
		if (selectedDocumentIds.includes(documentId)) {
			selectedDocumentIds = selectedDocumentIds.filter(id => id !== documentId);
		} else {
			selectedDocumentIds = [...selectedDocumentIds, documentId];
		}
	}

	function removeDocument(documentId: string) {
		selectedDocumentIds = selectedDocumentIds.filter(id => id !== documentId);
	}

	let filteredDocuments = $derived(
		documents.filter((doc) => {
			const searchTerm = documentSearchQuery.toLowerCase().trim();
			if (!searchTerm) return true;
			const searchContent = `${doc.name} ${doc.clientName} ${doc.invoiceNumber || ''} ${doc.quoteNumber || ''} ${doc.contractRef || ''}`.toLowerCase();
			return searchContent.includes(searchTerm);
		})
	);

	function validateForm(): string | null {
		if (!formData.clientId) return 'Veuillez sélectionner un client';
		if (!formData.amount || formData.amount <= 0) return 'Le montant doit être supérieur à 0';
		if (!formData.description.trim()) return 'La description est requise';
		if (!formData.dueDate) return "La date d'échéance est requise";
		if (formData.collectionMethod === 'STRIPE') {
			const client = clients.find((item) => item.id === formData.clientId);
			const clientEmail = client?.contactEmail || client?.user?.email;
			if (!clientEmail) {
				return 'Un email de contact client est requis pour créer un paiement Stripe';
			}
		}
		if (formData.collectionMethod === 'MANUAL' && !formData.reference.trim()) {
			return 'La référence manuelle est requise';
		}
		return null;
	}

	async function handleCreate() {
		const validationError = validateForm();
		if (validationError) {
			toast.push(validationError, 'error');
			return;
		}

		try {
			submitting = true;
			await trpc.payment.create.mutate({
				...formData,
				reference: formData.reference.trim() || undefined,
				dueDate: new Date(formData.dueDate),
			});

			toast.push(
				formData.collectionMethod === 'STRIPE'
					? 'Paiement créé avec succès! Un email a été envoyé au client.'
					: 'Paiement manuel enregistré avec succès!',
				'success'
			);
			goto('/admin/payments');
		} catch (err: any) {
			logger.error({ err }, 'Failed to create payment');
			const message = err.message || 'Erreur lors de la création';
			toast.push(message, 'error');
		} finally {
			submitting = false;
		}
	}

	function getFrequencyLabel(frequency: PaymentFrequency) {
		switch (frequency) {
			case 'ONE_TIME':
				return 'Ponctuel';
			case 'MONTHLY':
				return 'Mensuel';
			case 'YEARLY':
				return 'Annuel';
			default:
				return frequency;
		}
	}

	function getCollectionMethodLabel(method: PaymentCollectionMethod) {
		return method === 'STRIPE' ? 'Paiement Stripe' : 'Suivi manuel';
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
	<div class="max-w-[1200px] mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<button
				onclick={() => goto('/admin/payments')}
				class="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="20"></iconify-icon>
				<span class="font-bold">Retour aux paiements</span>
			</button>
			<h1 class="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
				<iconify-icon icon="solar:wallet-bold" width="40" class="text-[#291334]"
				></iconify-icon>
				{$i18n.t('backoffice.payments.createPayment')}
			</h1>
			<p class="text-slate-500 mt-2">Créez une demande de paiement pour un client</p>
		</div>

		<!-- Main Form -->
		<div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
			<!-- Client Selection -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:user-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Client
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:buildings-2-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Sélectionner un client *
						</div>
						<select
							bind:value={selectedClientId}
							class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-medium"
						>
							<option value="">-- Choisir un client --</option>
							{#each clients as client (client.id)}
								<option value={client.id}>
									{client.companyName} - {client.contactFirstName}
									{client.contactLastName}
									({client.contactEmail || client.user?.email || 'aucun email'})
								</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<!-- Payment Details -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:document-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Détails du paiement
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:document-text-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Description *
						</div>
						<textarea
							bind:value={formData.description}
							rows="3"
							class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all resize-none"
							placeholder="Ex: Prestation de développement web - Janvier 2024"
						></textarea>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:wallet-money-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Montant (€) *
							</div>
							<input
								type="number"
								step="0.01"
								min="0"
								bind:value={formData.amount}
								class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all"
								placeholder="0.00"
							/>
						</div>

						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date d'échéance *
							</div>
							<input
								type="date"
								bind:value={formData.dueDate}
								class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all"
							/>
						</div>
					</div>

					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:card-bold" width="16" class="text-[#FEC129]"></iconify-icon>
							Mode de paiement *
						</div>
						<div class="grid grid-cols-2 gap-3">
							{#each ['STRIPE', 'MANUAL'] as method}
								<button
									type="button"
									onclick={() => (formData.collectionMethod = method as PaymentCollectionMethod)}
									class="px-4 py-3 rounded-xl font-bold text-sm transition-all {formData.collectionMethod ===
									method
										? 'bg-[#291334] text-white'
										: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
								>
									{getCollectionMethodLabel(method as PaymentCollectionMethod)}
								</button>
							{/each}
						</div>
					</div>

					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:refresh-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Fréquence *
						</div>
						<div class="grid grid-cols-3 gap-3">
							{#each ['ONE_TIME', 'MONTHLY', 'YEARLY'] as freq}
								<button
									type="button"
									onclick={() => (formData.frequency = freq as PaymentFrequency)}
									class="px-4 py-3 rounded-xl font-bold text-sm transition-all {formData.frequency ===
									freq
										? 'bg-[#291334] text-white'
										: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
								>
									{getFrequencyLabel(freq as PaymentFrequency)}
								</button>
							{/each}
						</div>
					</div>

					{#if formData.collectionMethod === 'MANUAL'}
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:hashtag-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Référence manuelle *
							</div>
							<Input bind:value={formData.reference} placeholder="Ex: VIR-2026-001" />
							<p class="mt-2 text-xs text-slate-500">Utilisée pour tracer un paiement hors ligne ou déjà demandé ailleurs.</p>
						</div>
					{:else}
						<p class="text-xs text-slate-500">
							Un lien de paiement Stripe sera créé. Le client doit avoir un email de contact.
						</p>
					{/if}
				</div>
			</div>

			<!-- Attached Documents -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:document-add-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Documents joints
				</h2>
				<p class="text-sm text-slate-600 mb-4">
					Les documents sélectionnés seront visibles et téléchargeables par le client sur la page de paiement.
				</p>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<!-- Selected Documents Display -->
					{#if selectedDocumentIds.length > 0}
						<div class="space-y-2">
							<div class="block text-sm font-black text-slate-700">Documents sélectionnés ({selectedDocumentIds.length})</div>
							<div class="space-y-2">
								{#each selectedDocumentIds as docId}
									{@const doc = documents.find(d => d.id === docId)}
									{#if doc}
										<div class="bg-white rounded-lg p-3 flex items-center justify-between border border-slate-200">
											<div class="flex items-center gap-3">
												<iconify-icon icon="solar:document-bold" width="20" class="text-[#291334]"></iconify-icon>
												<div>
													<div class="font-bold text-sm text-slate-900">{doc.name}</div>
													<div class="text-xs text-slate-500">
														{doc.type} • {doc.clientName}
														{#if doc.invoiceNumber} • N° {doc.invoiceNumber}{/if}
													</div>
												</div>
											</div>
											<button
												type="button"
												onclick={() => removeDocument(docId)}
												class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
												aria-label="Retirer le document"
											>
												<iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
											</button>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					<!-- Search Bar -->
					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:magnifer-bold" width="16" class="text-[#FEC129]"></iconify-icon>
							Rechercher un document
						</div>
						<div class="relative">
							<iconify-icon
								icon="solar:magnifer-linear"
								width="20"
								class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							></iconify-icon>
							<input
								type="text"
								bind:value={documentSearchQuery}
								placeholder="Rechercher par nom, client, numéro..."
								class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all text-sm"
							/>
						</div>
					</div>

					<!-- Document List -->
					<div class="max-h-64 overflow-y-auto space-y-2">
						{#if filteredDocuments.length === 0}
							<div class="text-center py-8 text-slate-500">
								<iconify-icon icon="solar:document-bold" width="32" class="mx-auto mb-2 opacity-30"></iconify-icon>
								<p class="text-sm">Aucun document trouvé</p>
							</div>
						{:else}
							{#each filteredDocuments as doc}
								<button
									type="button"
									onclick={() => toggleDocument(doc.id)}
									class="w-full bg-white rounded-lg p-3 flex items-center gap-3 border transition-all text-left {selectedDocumentIds.includes(doc.id)
										? 'border-[#291334] bg-[#291334]/5'
										: 'border-slate-200 hover:border-[#FEC129]'}"
								>
									<div class="flex-shrink-0">
										{#if selectedDocumentIds.includes(doc.id)}
											<div class="w-5 h-5 bg-[#291334] rounded flex items-center justify-center">
												<iconify-icon icon="solar:check-circle-bold" width="16" class="text-white"></iconify-icon>
											</div>
										{:else}
											<div class="w-5 h-5 border-2 border-slate-300 rounded"></div>
										{/if}
									</div>
									<iconify-icon icon="solar:document-bold" width="20" class="text-slate-400 flex-shrink-0"></iconify-icon>
									<div class="flex-1 min-w-0">
										<div class="font-bold text-sm text-slate-900 truncate">{doc.name}</div>
										<div class="text-xs text-slate-500 truncate">
											{doc.type} • {doc.clientName}
											{#if doc.invoiceNumber} • N° {doc.invoiceNumber}{/if}
											{#if doc.quoteNumber} • Devis N° {doc.quoteNumber}{/if}
										</div>
									</div>
									<div class="text-sm font-bold text-[#291334]">
										{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(doc.total))}
									</div>
								</button>
							{/each}
						{/if}
					</div>
				</div>
			</div>

			<!-- Notice -->
			<div
				class="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5"
			>
				<div class="flex items-start gap-3">
					<iconify-icon
						icon="solar:info-circle-bold"
						class="text-amber-600 mt-0.5"
						width="24"
					></iconify-icon>
					<div class="flex-1">
						<h3 class="text-sm font-black text-amber-900 mb-1">
							{$i18n.t('backoffice.payments.create.emailNotice')}
						</h3>
						<p class="text-sm text-amber-800">
							{$i18n.t('backoffice.payments.create.emailDescription')}
						</p>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-4 pt-4">
				<Button
					onclick={() => goto('/admin/payments')}
					intent="secondary"
					class="flex-1"
					disabled={submitting}
				>
					<iconify-icon icon="solar:close-circle-bold" width="20"></iconify-icon>
					<span>Annuler</span>
				</Button>
				<button
					onclick={handleCreate}
					disabled={submitting}
					class="flex-1 px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if submitting}
						<iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
						<span>Création en cours...</span>
					{:else}
						<iconify-icon icon="solar:check-circle-bold" width="20"></iconify-icon>
						<span>Créer le paiement</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>
