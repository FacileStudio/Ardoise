<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Spinner, Badge, Card, Button, Input } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let clientId = $derived($page.params.id);
	let pageLoading = $state(true);
	let submitting = $state(false);
	let client: any = $state(null);

	let formData = $state({
		firstName: '',
		lastName: '',
		email: '',
		companyName: '',
		billingAddress: '',
		billingCity: '',
		billingCountry: 'France',
		siret: '',
	});

	onMount(async () => {
		await fetchClient();
	});

	async function fetchClient() {
		pageLoading = true;
		try {
			client = await trpc.client.getById.query({ id: clientId });
			// Populate form data
			formData.firstName = client.user.firstName;
			formData.lastName = client.user.lastName;
			formData.email = client.user.email;
			formData.companyName = client.companyName;
			formData.billingAddress = client.billingAddress || '';
			formData.billingCity = client.billingCity || '';
			formData.billingCountry = client.billingCountry;
			formData.siret = client.siret || '';
		} catch (err) {
			logger.error({ err }, 'Failed to fetch client');
			toast.push('Erreur lors du chargement du client', 'error');
		} finally {
			pageLoading = false;
		}
	}

	function validateForm(): string | null {
		if (!formData.firstName.trim()) return 'Le prénom est requis';
		if (!formData.lastName.trim()) return 'Le nom est requis';
		if (!formData.email.trim()) return 'L\'email est requis';
		if (!formData.companyName.trim()) return 'Le nom de l\'entreprise est requis';
		return null;
	}

	async function handleUpdate() {
		const validationError = validateForm();
		if (validationError) {
			toast.push(validationError, 'error');
			return;
		}

		try {
			submitting = true;
			await trpc.client.update.mutate({
				id: clientId,
				...formData,
			});
			toast.push('Client modifié avec succès!', 'success');
			await fetchClient();
		} catch (err: any) {
			logger.error({ err }, 'Failed to update client');
			const message = err.message || 'Erreur lors de la modification';
			toast.push(message, 'error');
		} finally {
			submitting = false;
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

	function formatCurrency(amount: number | string) {
		const num = typeof amount === 'string' ? parseFloat(amount) : amount;
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(num);
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'ACTIVE': return 'emerald';
			case 'PENDING': return 'amber';
			case 'SUSPENDED': return 'rose';
			case 'BANNED': return 'rose';
			default: return 'slate';
		}
	}

	function getPaymentStatusColor(status: string) {
		switch (status) {
			case 'PAID': return 'emerald';
			case 'PENDING': return 'amber';
			case 'EXPIRED': return 'rose';
			case 'CANCELLED': return 'slate';
			default: return 'slate';
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
	{#if pageLoading}
		<div class="py-20 flex justify-center">
			<Spinner size="xl" />
		</div>
	{:else if client}
		<div class="max-w-[1400px] mx-auto">
			<!-- Header -->
			<div class="mb-8">
				<button
					onclick={() => goto('/admin/clients')}
					class="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
				>
					<iconify-icon icon="solar:arrow-left-bold" width="20"></iconify-icon>
					<span class="font-bold">Retour aux clients</span>
				</button>
				<h1 class="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
					<iconify-icon icon="solar:buildings-2-bold" width="40" class="text-[#291334]"
					></iconify-icon>
					Modifier le client
				</h1>
				<p class="text-slate-500 mt-2">Modifiez les informations du client</p>
			</div>

			<div class="grid grid-cols-3 gap-6">
				<!-- Main Content -->
				<div class="col-span-2 space-y-6">
					<!-- Company Information (Editable) -->
					<div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
						<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
							<iconify-icon icon="solar:buildings-2-bold" width="24" class="text-[#FEC129]"></iconify-icon>
							Informations entreprise
						</h2>
						<div class="bg-slate-50 rounded-xl p-6 space-y-4">
							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:buildings-2-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									Nom de l'entreprise *
								</div>
								<Input bind:value={formData.companyName} placeholder="Entreprise SAS" />
							</div>

							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:bill-list-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									SIRET
								</div>
								<Input bind:value={formData.siret} placeholder="12345678901234" />
							</div>
						</div>
					</div>

					<!-- Billing Address (Editable) -->
					<div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
						<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
							<iconify-icon icon="solar:map-point-bold" width="24" class="text-[#FEC129]"></iconify-icon>
							Adresse de facturation
						</h2>
						<div class="bg-slate-50 rounded-xl p-6 space-y-4">
							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:home-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									Adresse
								</div>
								<Input bind:value={formData.billingAddress} placeholder="123 rue de la Paix" />
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div>
									<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
										<iconify-icon icon="solar:city-bold" width="16" class="text-[#FEC129]"
										></iconify-icon>
										Ville
									</div>
									<Input bind:value={formData.billingCity} placeholder="Paris" />
								</div>

								<div>
									<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
										<iconify-icon icon="solar:global-bold" width="16" class="text-[#FEC129]"
										></iconify-icon>
										Pays
									</div>
									<Input bind:value={formData.billingCountry} placeholder="France" />
								</div>
							</div>
						</div>
					</div>

					<!-- User Information (Editable) -->
					<div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
						<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
							<iconify-icon icon="solar:user-bold" width="24" class="text-[#FEC129]"></iconify-icon>
							Informations utilisateur
						</h2>
						<div class="bg-slate-50 rounded-xl p-6 space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div>
									<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
										<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"
										></iconify-icon>
										Prénom *
									</div>
									<Input bind:value={formData.firstName} placeholder="Jean" />
								</div>

								<div>
									<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
										<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"
										></iconify-icon>
										Nom *
									</div>
									<Input bind:value={formData.lastName} placeholder="Dupont" />
								</div>
							</div>

							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:letter-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									Email *
								</div>
								<Input
									bind:value={formData.email}
									type="email"
									placeholder="jean.dupont@entreprise.fr"
								/>
							</div>
						</div>
					</div>

					<!-- Payments -->
					{#if client.payments && client.payments.length > 0}
						<Card padding="lg" rounded="lg" shadow="md">
							<div class="space-y-4">
								<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
									<div class="w-12 h-12 rounded-2xl bg-[#FEC129]/10 flex items-center justify-center text-[#FEC129]">
										<iconify-icon icon="solar:wallet-bold" width="24"></iconify-icon>
									</div>
									<div>
										<h2 class="text-xl font-black text-[#291334]">Paiements</h2>
										<p class="text-sm text-slate-500">{client.payments.length} {client.payments.length > 1 ? 'paiements' : 'paiement'}</p>
									</div>
								</div>

								<div class="space-y-3">
									{#each client.payments as payment (payment.id)}
										<button type="button" class="w-full text-left flex items-center gap-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:border-[#FEC129] transition-all cursor-pointer" onclick={() => goto(`/admin/payments/${payment.id}`)}>
											<div class="p-3 bg-white rounded-xl shadow-sm">
												<iconify-icon
													icon={payment.status === 'PAID' ? 'solar:check-circle-bold' : payment.status === 'PENDING' ? 'solar:clock-circle-bold' : 'solar:close-circle-bold'}
													width="24"
													class={payment.status === 'PAID' ? 'text-emerald-600' : payment.status === 'PENDING' ? 'text-amber-600' : 'text-rose-600'}
												></iconify-icon>
											</div>
											<div class="flex-1">
												<div class="flex items-center justify-between mb-1">
													<span class="text-lg font-black text-slate-900">{formatCurrency(payment.totalWithFees)}</span>
													<Badge variant={getPaymentStatusColor(payment.status)}>{payment.status}</Badge>
												</div>
												<div class="text-sm text-slate-600 mb-1">{payment.description}</div>
												<div class="text-xs text-slate-500">
													Due: {formatDateShort(payment.dueDate)}
													{#if payment.paidAt}
														• Paid: {formatDateShort(payment.paidAt)}
													{/if}
												</div>
											</div>
											<div class="p-2 text-[#291334]">
												<iconify-icon icon="solar:eye-bold" width="18"></iconify-icon>
											</div>
										</button>
									{/each}
								</div>
							</div>
						</Card>
					{/if}

					<!-- Actions -->
					<div class="flex gap-4 pt-4">
						<Button
							onclick={() => goto('/admin/clients')}
							intent="secondary"
							class="flex-1"
							disabled={submitting}
						>
							<iconify-icon icon="solar:close-circle-bold" width="20"></iconify-icon>
							<span>Annuler</span>
						</Button>
						<button
							onclick={handleUpdate}
							disabled={submitting}
							class="flex-1 px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if submitting}
								<iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
								<span>Modification en cours...</span>
							{:else}
								<iconify-icon icon="solar:check-circle-bold" width="20"></iconify-icon>
								<span>Modifier le client</span>
							{/if}
						</button>
					</div>
				</div>

				<!-- Sidebar -->
				<div class="space-y-6">
					<!-- Status -->
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-[#291334]/10 flex items-center justify-center text-[#291334]">
									<iconify-icon icon="solar:shield-user-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Statut</h2>
								</div>
							</div>

							<div class="space-y-3">
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Statut du compte</div>
									<Badge variant={getStatusColor(client.user.status)}>
										{client.user.status}
									</Badge>
								</div>

								{#if client.user.emailVerified}
									<div>
										<div class="text-xs font-black uppercase text-slate-400 mb-2">Email vérifié</div>
										<Badge variant="emerald">
											<iconify-icon icon="solar:check-circle-bold" width="14"></iconify-icon>
											Vérifié
										</Badge>
									</div>
								{/if}
							</div>
						</div>
					</Card>

					<!-- Dates -->
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-[#291334]/10 flex items-center justify-center text-[#291334]">
									<iconify-icon icon="solar:calendar-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Dates</h2>
								</div>
							</div>

							<div class="space-y-3">
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-1">Créé le</div>
									<div class="text-sm text-slate-700">{formatDate(client.createdAt)}</div>
								</div>

								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-1">Dernière modification</div>
									<div class="text-sm text-slate-700">{formatDate(client.updatedAt)}</div>
								</div>

								{#if client.user.lastLoginAt}
									<div>
										<div class="text-xs font-black uppercase text-slate-400 mb-1">Dernière connexion</div>
										<div class="text-sm text-slate-700">{formatDate(client.user.lastLoginAt)}</div>
									</div>
								{/if}
							</div>
						</div>
					</Card>

					<!-- Stripe -->
					{#if client.stripeCustomerId}
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

								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-1">Customer ID</div>
									<div class="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-lg break-all">
										{client.stripeCustomerId}
									</div>
								</div>
							</div>
						</Card>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="text-center py-20">
			<iconify-icon icon="solar:buildings-2-bold" width="64" class="text-slate-300"></iconify-icon>
			<h2 class="text-2xl font-black text-slate-900 mt-4">Client introuvable</h2>
			<p class="text-slate-500 mt-2">Ce client n'existe pas ou a été supprimé.</p>
			<button
				onclick={() => goto('/admin/clients')}
				class="mt-6 px-6 py-3 bg-[#291334] text-white rounded-xl font-bold hover:shadow-lg transition-all"
			>
				Retour aux clients
			</button>
		</div>
	{/if}
</div>
