<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Spinner, Badge, Card } from '@repo/ui';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let clientId = $derived($page.params.id);
	let pageLoading = $state(true);
	let client: any = $state(null);

	onMount(async () => {
		await fetchClient();
	});

	async function fetchClient() {
		pageLoading = true;
		try {
			client = await trpc.client.getById.query({ id: clientId });
		} catch (err) {
			logger.error({ err }, 'Failed to fetch client');
		} finally {
			pageLoading = false;
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

<div class="p-8 max-w-[1400px] mx-auto space-y-6">
	{#if pageLoading}
		<div class="py-20 flex justify-center">
			<Spinner size="xl" />
		</div>
	{:else if client}
		<header class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<button
					onclick={() => goto('/admin/clients')}
					class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
					title="Back to clients"
				>
					<iconify-icon icon="solar:arrow-left-bold" width="24"></iconify-icon>
				</button>
				<div>
					<h1 class="text-3xl font-black text-slate-900 tracking-tighter">
						{client.companyName}
					</h1>
					<p class="text-slate-500 text-sm mt-1">{client.user.email}</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<Badge variant={getStatusColor(client.user.status)}>
					{client.user.status}
				</Badge>
				{#if client.user.emailVerified}
					<Badge variant="emerald">
						<iconify-icon icon="solar:check-circle-bold" width="14"></iconify-icon>
						Verified
					</Badge>
				{/if}
			</div>
		</header>

		<div class="grid grid-cols-3 gap-6">
			<div class="col-span-2 space-y-6">
				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-6">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-[#291334]/10 flex items-center justify-center text-[#291334]">
								<iconify-icon icon="solar:buildings-2-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">Company Information</h2>
								<p class="text-sm text-slate-500">Business details</p>
							</div>
						</div>

						<div class="space-y-4">
							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Company Name</div>
								<div class="text-lg font-bold text-slate-900">{client.companyName}</div>
							</div>

							{#if client.siret}
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">SIRET</div>
									<div class="font-mono text-sm text-slate-700">{client.siret}</div>
								</div>
							{/if}

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Billing Address</div>
								<div class="text-sm text-slate-600">
									<div>{client.billingAddress}</div>
									<div>{client.billingCity}</div>
									<div>{client.billingCountry}</div>
								</div>
							</div>
						</div>
					</div>
				</Card>

				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-6">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
								<iconify-icon icon="solar:user-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">Primary Contact</h2>
								<p class="text-sm text-slate-500">Contact information</p>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">First Name</div>
								<div class="font-bold text-slate-900">{client.user.firstName}</div>
							</div>

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Last Name</div>
								<div class="font-bold text-slate-900">{client.user.lastName}</div>
							</div>

							<div class="col-span-2">
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Email</div>
								<div class="font-bold text-slate-900">{client.user.email}</div>
							</div>
						</div>
					</div>
				</Card>

				{#if client.payments && client.payments.length > 0}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-[#FEC129]/10 flex items-center justify-center text-[#FEC129]">
									<iconify-icon icon="solar:wallet-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Payments</h2>
									<p class="text-sm text-slate-500">{client.payments.length} {client.payments.length > 1 ? 'payments' : 'payment'}</p>
								</div>
							</div>

							<div class="space-y-3">
								{#each client.payments as payment (payment.id)}
									<div class="flex items-center gap-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:border-[#FEC129] transition-all cursor-pointer" onclick={() => goto(`/admin/payments/${payment.id}`)}>
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
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}
			</div>

			<div class="space-y-6">
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
								<div class="text-xs font-black uppercase text-slate-400 mb-1">Created</div>
								<div class="text-sm text-slate-700">{formatDate(client.createdAt)}</div>
							</div>

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-1">Last Updated</div>
								<div class="text-sm text-slate-700">{formatDate(client.updatedAt)}</div>
							</div>

							{#if client.user.lastLoginAt}
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-1">Last Login</div>
									<div class="text-sm text-slate-700">{formatDate(client.user.lastLoginAt)}</div>
								</div>
							{/if}
						</div>
					</div>
				</Card>

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
	{:else}
		<div class="text-center py-20">
			<iconify-icon icon="solar:buildings-2-bold" width="64" class="text-slate-300"></iconify-icon>
			<h2 class="text-2xl font-black text-slate-900 mt-4">Client not found</h2>
			<p class="text-slate-500 mt-2">This client does not exist or has been deleted.</p>
			<button
				onclick={() => goto('/admin/clients')}
				class="mt-6 px-6 py-3 bg-[#291334] text-white rounded-xl font-bold hover:shadow-lg transition-all"
			>
				Back to clients
			</button>
		</div>
	{/if}
</div>
