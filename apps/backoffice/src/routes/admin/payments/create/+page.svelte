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

	interface Client {
		id: string;
		companyName: string;
		user: {
			id: string;
			email: string;
			firstName: string;
			lastName: string;
		};
	}

	let submitting = $state(false);
	let clients: Client[] = $state([]);
	let selectedClientId = $state('');

	let formData = $state({
		clientId: '',
		amount: 0,
		description: '',
		frequency: 'ONE_TIME' as PaymentFrequency,
		dueDate: new Date().toISOString().split('T')[0],
		attachedFiles: [] as string[],
	});

	onMount(async () => {
		await loadClients();
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

	$effect(() => {
		if (selectedClientId) {
			formData.clientId = selectedClientId;
		}
	});

	function validateForm(): string | null {
		if (!formData.clientId) return 'Veuillez sélectionner un client';
		if (!formData.amount || formData.amount <= 0) return 'Le montant doit être supérieur à 0';
		if (!formData.description.trim()) return 'La description est requise';
		if (!formData.dueDate) return "La date d'échéance est requise";
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
				dueDate: new Date(formData.dueDate),
			});

			toast.push('Paiement créé avec succès! Un email a été envoyé au client.', 'success');
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
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:buildings-2-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Sélectionner un client *
						</label>
						<select
							bind:value={selectedClientId}
							class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all font-medium"
						>
							<option value="">-- Choisir un client --</option>
							{#each clients as client (client.id)}
								<option value={client.id}>
									{client.companyName} - {client.user.firstName}
									{client.user.lastName} ({client.user.email})
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
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:document-text-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Description *
						</label>
						<textarea
							bind:value={formData.description}
							rows="3"
							class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all resize-none"
							placeholder="Ex: Prestation de développement web - Janvier 2024"
						></textarea>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:wallet-money-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Montant (€) *
							</label>
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
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:calendar-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Date d'échéance *
							</label>
							<input
								type="date"
								bind:value={formData.dueDate}
								class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all"
							/>
						</div>
					</div>

					<div>
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:refresh-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Fréquence *
						</label>
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
