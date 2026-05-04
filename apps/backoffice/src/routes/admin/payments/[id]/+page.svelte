<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Spinner, Badge, Card, Button, ConfirmDialog } from '@repo/ui';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
	type PaymentFrequency = 'ONE_TIME' | 'MONTHLY' | 'YEARLY';

	interface Client {
		id: string;
		companyName: string;
		billingAddress: string;
		billingCity: string;
		billingCountry: string;
		siret: string | null;
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

	interface Payment {
		id: string;
		amount: number;
		stripeFee: number | null;
		totalWithFees: number | null;
		description: string;
		status: PaymentStatus;
		frequency: PaymentFrequency;
		collectionMethod?: 'STRIPE' | 'MANUAL';
		reference?: string | null;
		dueDate: Date;
		paidAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
		client: Client;
		attachedFiles: string[];
		stripePaymentIntentId: string | null;
		stripeSubscriptionId: string | null;
		receiptUrl: string | null;
	}

	let paymentId = $derived($page.params.id);
	let pageLoading = $state(true);
	let actionLoading = $state(false);
	let payment: Payment | null = $state(null);
	let showCancelDialog = $state(false);

	onMount(async () => {
		await fetchPayment();
	});

	async function fetchPayment() {
		pageLoading = true;
		try {
			payment = (await trpc.payment.getById.query({ id: paymentId })) as Payment;
		} catch (err) {
			logger.error({ err }, 'Failed to fetch payment');
		} finally {
			pageLoading = false;
		}
	}

	async function handleCancelPayment() {
		if (!payment) return;

		actionLoading = true;
		try {
			await trpc.payment.cancel.mutate({ id: payment.id });
			await fetchPayment();
			showCancelDialog = false;
		} catch (err) {
			logger.error({ err }, 'Failed to cancel payment');
			alert('Failed to cancel payment');
		} finally {
			actionLoading = false;
		}
	}

	function getStatusColor(status: PaymentStatus) {
		switch (status) {
			case 'PAID':
				return 'emerald';
			case 'PENDING':
				return 'amber';
			case 'EXPIRED':
				return 'rose';
			case 'CANCELLED':
				return 'slate';
			default:
				return 'slate';
		}
	}

	function getFrequencyLabel(frequency: PaymentFrequency) {
		switch (frequency) {
			case 'ONE_TIME':
				return $i18n.t('backoffice.payments.oneTime');
			case 'MONTHLY':
				return $i18n.t('backoffice.payments.monthly');
			case 'YEARLY':
				return $i18n.t('backoffice.payments.yearly');
			default:
				return frequency;
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(date));
	}

	function formatDateShort(date: Date | string | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(new Date(date));
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount);
	}
</script>

<div class="p-8 max-w-[1400px] mx-auto space-y-6">
	{#if pageLoading}
		<div class="py-20 flex justify-center">
			<Spinner size="xl" />
		</div>
	{:else if payment}
		<header class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<button
					onclick={() => goto('/admin/payments')}
					class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
					title="Retour aux paiements"
				>
					<iconify-icon icon="solar:arrow-left-bold" width="24"></iconify-icon>
				</button>
				<div>
					<h1 class="text-3xl font-black text-slate-900 tracking-tighter">
						Détails du paiement
					</h1>
					<p class="text-slate-500 text-sm mt-1">#{payment.id.slice(0, 8)}</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<Badge variant={getStatusColor(payment.status)}>
					{payment.status}
				</Badge>
			</div>
		</header>

		<div class="grid grid-cols-3 gap-6">
			<div class="col-span-2 space-y-6">
				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-6">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-[#291334]/10 flex items-center justify-center text-[#291334]">
								<iconify-icon icon="solar:document-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">Informations du paiement</h2>
								<p class="text-sm text-slate-500">Description et montant</p>
							</div>
						</div>

						<div class="space-y-4">
							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Description</div>
								<div class="text-lg font-bold text-slate-900">{payment.description}</div>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Montant</div>
									<div class="text-2xl font-black text-[#291334]">
										{formatCurrency(Number(payment.amount))}
									</div>
								</div>

								{#if payment.stripeFee && Number(payment.stripeFee) > 0}
									<div>
										<div class="text-xs font-black uppercase text-slate-400 mb-2">Frais Stripe</div>
										<div class="text-2xl font-black text-amber-600">
											{formatCurrency(Number(payment.stripeFee))}
										</div>
									</div>
								{/if}
							</div>

							{#if payment.totalWithFees && Number(payment.totalWithFees) > Number(payment.amount)}
								<div class="bg-[#FAF7F5] p-4 rounded-xl">
									<div class="text-xs font-black uppercase text-slate-400 mb-2">
										Montant total (avec frais)
									</div>
									<div class="text-3xl font-black text-[#291334]">
										{formatCurrency(Number(payment.totalWithFees))}
									</div>
								</div>
							{/if}

							<div class="grid grid-cols-2 gap-4">
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Fréquence</div>
									<div class="font-bold text-slate-900">{getFrequencyLabel(payment.frequency)}</div>
								</div>

								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Mode</div>
									<div class="font-bold text-slate-900">{payment.collectionMethod === 'MANUAL' ? 'Manuel' : 'Stripe'}</div>
								</div>

								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Date d'échéance</div>
									<div class="font-bold text-slate-900 flex items-center gap-2">
										<iconify-icon icon="solar:calendar-bold" width="16" class="text-amber-500"></iconify-icon>
										{formatDateShort(payment.dueDate)}
									</div>
								</div>
							</div>

							{#if payment.reference}
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Référence</div>
									<div class="font-bold text-slate-900">{payment.reference}</div>
								</div>
							{/if}

							{#if payment.paidAt}
								<div class="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
									<div class="text-xs font-black uppercase text-emerald-600 mb-2">Payé le</div>
									<div class="font-bold text-emerald-900 flex items-center gap-2">
										<iconify-icon icon="solar:check-circle-bold" width="16" class="text-emerald-500"></iconify-icon>
										{formatDate(payment.paidAt)}
									</div>
								</div>
							{/if}
						</div>
					</div>
				</Card>

				{#if payment.attachedFiles && payment.attachedFiles.length > 0}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
									<iconify-icon icon="solar:paperclip-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Fichiers joints</h2>
									<p class="text-sm text-slate-500">{payment.attachedFiles.length} {payment.attachedFiles.length > 1 ? 'fichiers' : 'fichier'}</p>
								</div>
							</div>

							<div class="space-y-2">
								{#each payment.attachedFiles as file}
									<div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
										<iconify-icon icon="solar:file-bold" width="20" class="text-slate-400"></iconify-icon>
										<span class="flex-1 text-sm font-medium text-slate-700">{file}</span>
										<button class="p-2 hover:bg-white rounded-lg transition-colors text-indigo-600" aria-label="Télécharger le fichier">
											<iconify-icon icon="solar:download-bold" width="18"></iconify-icon>
										</button>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}

				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-4">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-[#FEC129]/10 flex items-center justify-center text-[#FEC129]">
								<iconify-icon icon="solar:history-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">Chronologie</h2>
								<p class="text-sm text-slate-500">Historique du paiement</p>
							</div>
						</div>

						<div class="space-y-4">
							{#if payment.paidAt}
								<div class="flex items-start gap-3">
									<div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
										<iconify-icon icon="solar:check-circle-bold" width="20" class="text-emerald-600"></iconify-icon>
									</div>
									<div class="flex-1">
										<div class="font-bold text-slate-900">Paiement reçu</div>
										<div class="text-sm text-slate-500">{formatDate(payment.paidAt)}</div>
									</div>
								</div>
							{/if}

							<div class="flex items-start gap-3">
								<div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
									<iconify-icon icon="solar:calendar-bold" width="20" class="text-amber-600"></iconify-icon>
								</div>
								<div class="flex-1">
									<div class="font-bold text-slate-900">Échéance</div>
									<div class="text-sm text-slate-500">{formatDate(payment.dueDate)}</div>
								</div>
							</div>

							<div class="flex items-start gap-3">
								<div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
									<iconify-icon icon="solar:add-circle-bold" width="20" class="text-indigo-600"></iconify-icon>
								</div>
								<div class="flex-1">
									<div class="font-bold text-slate-900">Paiement créé</div>
									<div class="text-sm text-slate-500">{formatDate(payment.createdAt)}</div>
								</div>
							</div>
						</div>
					</div>
				</Card>
			</div>

			<div class="space-y-6">
				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-4">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-[#291334]/10 flex items-center justify-center text-[#291334]">
								<iconify-icon icon="solar:buildings-2-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">Client</h2>
							</div>
						</div>

						<div class="space-y-4">
							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Entreprise</div>
								<div class="font-bold text-slate-900">{payment.client.companyName}</div>
							</div>

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Contact</div>
								<div class="space-y-1">
									<div class="font-bold text-slate-900">
										{payment.client.contactFirstName} {payment.client.contactLastName}
									</div>
									<div class="text-sm text-slate-500">{payment.client.contactEmail || payment.client.user?.email || 'Aucun email de contact'}</div>
								</div>
							</div>

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Adresse</div>
								<div class="text-sm text-slate-600">
									<div>{payment.client.billingAddress}</div>
									<div>{payment.client.billingCity}</div>
									<div>{payment.client.billingCountry}</div>
								</div>
							</div>

							{#if payment.client.siret}
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">SIRET</div>
									<div class="font-mono text-sm text-slate-700">{payment.client.siret}</div>
								</div>
							{/if}

							<button
								onclick={() => goto(`/admin/clients`)}
								class="w-full px-4 py-2 bg-[#FAF7F5] hover:bg-[#FEC129]/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
							>
								<iconify-icon icon="solar:eye-bold" width="16"></iconify-icon>
								Voir le client
							</button>
						</div>
					</div>
				</Card>

				{#if payment.status === 'PENDING'}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
									<iconify-icon icon="solar:settings-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Actions</h2>
								</div>
							</div>

							<div class="space-y-3">
								<button
									onclick={() => alert('Send reminder feature coming soon')}
									class="w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
								>
									<iconify-icon icon="solar:letter-bold" width="18"></iconify-icon>
									Envoyer un rappel
								</button>

								<button
									onclick={() => showCancelDialog = true}
									class="w-full px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
								>
									<iconify-icon icon="solar:close-circle-bold" width="18"></iconify-icon>
									Annuler le paiement
								</button>
							</div>
						</div>
					</Card>
				{/if}

				{#if payment.receiptUrl}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
									<iconify-icon icon="solar:document-text-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Reçu</h2>
								</div>
							</div>

							<button
								onclick={() => window.open(payment.receiptUrl, '_blank')}
								class="w-full px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
							>
								<iconify-icon icon="solar:download-bold" width="18"></iconify-icon>
								Télécharger le reçu
							</button>
						</div>
					</Card>
				{/if}

				{#if payment.stripePaymentIntentId || payment.stripeSubscriptionId}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
									<iconify-icon icon="solar:card-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Stripe</h2>
								</div>
							</div>

							<div class="space-y-3">
								{#if payment.stripePaymentIntentId}
									<div>
										<div class="text-xs font-black uppercase text-slate-400 mb-1">Payment Intent</div>
										<div class="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-lg break-all">
											{payment.stripePaymentIntentId}
										</div>
									</div>
								{/if}

								{#if payment.stripeSubscriptionId}
									<div>
										<div class="text-xs font-black uppercase text-slate-400 mb-1">Subscription</div>
										<div class="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-lg break-all">
											{payment.stripeSubscriptionId}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</Card>
				{/if}
			</div>
		</div>
	{:else}
		<div class="text-center py-20">
			<iconify-icon icon="solar:document-bold" width="64" class="text-slate-300"></iconify-icon>
			<h2 class="text-2xl font-black text-slate-900 mt-4">Paiement introuvable</h2>
			<p class="text-slate-500 mt-2">Ce paiement n'existe pas ou a été supprimé.</p>
			<button
				onclick={() => goto('/admin/payments')}
				class="mt-6 px-6 py-3 bg-[#291334] text-white rounded-xl font-bold hover:shadow-lg transition-all"
			>
				Retour aux paiements
			</button>
		</div>
	{/if}
</div>

<ConfirmDialog
	bind:isOpen={showCancelDialog}
	title="Annuler le paiement"
	description="Êtes-vous sûr de vouloir annuler ce paiement ? Cette action est irréversible."
	confirmText="Annuler le paiement"
	cancelText="Retour"
	variant="danger"
	onConfirm={handleCancelPayment}
	onCancel={() => showCancelDialog = false}
/>
