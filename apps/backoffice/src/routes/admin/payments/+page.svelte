<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { Spinner, SearchInput, Badge, EmptyState, Button } from '@repo/ui';
	import { downloadCSV } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
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

	interface Payment {
		id: string;
		amount: number;
		description: string;
		status: PaymentStatus;
		frequency: PaymentFrequency;
		dueDate: Date;
		paidAt: Date | null;
		createdAt: Date;
		client: Client;
		attachedFiles: string[];
	}

	let pageLoading = $state(true);
	let payments: Payment[] = $state([]);
	let total = $state(0);
	let searchQuery = $state('');
	let actionLoading = $state('');

	let filters = $state({
		status: undefined as PaymentStatus | undefined,
		page: 1,
		limit: 20,
	});

	let stats = $state({
		totalPending: 0,
		totalPaidThisMonth: 0,
		countPending: 0,
		countExpired: 0,
	});

	onMount(async () => {
		await Promise.all([fetchPayments(), fetchStats()]);
	});

	async function fetchPayments() {
		pageLoading = true;
		try {
			const result = await trpc.payment.list.query({
				page: filters.page,
				limit: filters.limit,
				status: filters.status,
			});
			payments = result.payments as Payment[];
			total = result.total;
		} catch (err) {
			logger.error({ err }, 'Failed to fetch payments');
		} finally {
			pageLoading = false;
		}
	}


	async function fetchStats() {
		try {
			const allPayments = await trpc.payment.list.query({ page: 1, limit: 100 });
			const paymentsData = allPayments.payments as Payment[];

			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

			stats.totalPending = paymentsData
				.filter((p) => p.status === 'PENDING')
				.reduce((sum, p) => sum + Number(p.amount), 0);

			stats.totalPaidThisMonth = paymentsData
				.filter((p) => p.status === 'PAID' && p.paidAt && new Date(p.paidAt) >= startOfMonth)
				.reduce((sum, p) => sum + Number(p.amount), 0);

			stats.countPending = paymentsData.filter((p) => p.status === 'PENDING').length;
			stats.countExpired = paymentsData.filter((p) => p.status === 'EXPIRED').length;
		} catch (err) {
			logger.error({ err }, 'Failed to fetch payment statistics');
		}
	}

	$effect(() => {
		fetchPayments();
	});


	async function handleCancelPayment(id: string, description: string) {
		if (!confirm($i18n.t('backoffice.payments.cancelConfirm', { description })))
			return;

		try {
			actionLoading = id;
			await trpc.payment.cancel.mutate({ id });
			await Promise.all([fetchPayments(), fetchStats()]);
		} catch (err) {
			logger.error({ err }, 'Failed to cancel payment');
			alert('Failed to cancel payment');
		} finally {
			actionLoading = '';
		}
	}

	async function handleMarkExpired() {
		if (!confirm('Mark all overdue pending payments as expired?')) return;

		try {
			actionLoading = 'expire';
			await trpc.payment.markExpired.mutate();
			await Promise.all([fetchPayments(), fetchStats()]);
		} catch (err) {
			logger.error({ err }, 'Failed to mark expired payments');
			alert('Failed to mark expired payments');
		} finally {
			actionLoading = '';
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
		return new Intl.DateTimeFormat('en-GB', {
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

	let searchTerm = $derived(searchQuery.toLowerCase().trim());
	let filteredPayments = $derived(
		payments.filter((payment) => {
			if (!searchTerm) return true;
			const searchContent = `${payment.description} ${payment.client.companyName} ${payment.id}`.toLowerCase();
			return searchTerm.split(' ').every((word) => searchContent.includes(word));
		})
	);

	function handleExportCSV() {
		const csvData = payments.map(payment => ({
			'ID': payment.id,
			'Description': payment.description,
			'Client': payment.client.companyName,
			'Montant': formatCurrency(Number(payment.totalWithFees || payment.amount)),
			'Frais Stripe': payment.stripeFee ? formatCurrency(Number(payment.stripeFee)) : '0,00 €',
			'Statut': payment.status,
			'Fréquence': getFrequencyLabel(payment.frequency),
			'Date création': formatDate(payment.createdAt),
			'Date échéance': formatDate(payment.dueDate),
			'Date paiement': payment.paidAt ? formatDate(payment.paidAt) : '-'
		}));
		downloadCSV(csvData, 'paiements');
	}
</script>

{#if pageLoading}
	<div class="flex flex-col items-center justify-center h-screen space-y-6">
		<iconify-icon icon="svg-spinners:blocks-shuffle-3" width="48" class="text-[#291334]"></iconify-icon>
		<p class="text-xs font-black uppercase tracking-[0.3em] text-[#291334]/40">
			Chargement...
		</p>
	</div>
{:else}
	<div class="p-8 max-w-[1600px] mx-auto space-y-6">
		<header class="flex items-center justify-between" in:fade>
			<div>
				<h1 class="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
					<iconify-icon icon="solar:wallet-money-bold" width="32" class="text-[#291334]"></iconify-icon>
					{$i18n.t('backoffice.payments.title')}
				</h1>
				<p class="text-slate-500 text-sm mt-1">{$i18n.t('backoffice.payments.subtitle')}</p>
			</div>
		<div class="flex gap-3">
			{#if payments.length > 0}
				<Button onclick={handleExportCSV} class="rounded-full">
					<iconify-icon icon="solar:file-download-bold" width="18"></iconify-icon>
					<span>Exporter CSV</span>
				</Button>
			{/if}
			<button
				onclick={() => goto('/admin/payments/create')}
				class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
			>
				<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
				{$i18n.t('backoffice.payments.createPayment')}
			</button>
		</div>
	</header>

	<div class="grid grid-cols-4 gap-4">
		<div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm" in:fly={{ y: 20, delay: 100 }}>
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-bold text-amber-600 uppercase tracking-tight">
					{$i18n.t('backoffice.payments.pendingAmount')}
				</div>
				<iconify-icon
					icon="solar:clock-circle-bold"
					class="text-amber-400"
					width="24"
				></iconify-icon>
			</div>
			<div class="text-3xl font-black text-amber-600">{formatCurrency(stats.totalPending)}</div>
			<div class="text-xs text-slate-500 mt-1">{$i18n.t('backoffice.payments.pendingInvoices', { count: stats.countPending })}</div>
		</div>

		<div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm" in:fly={{ y: 20, delay: 200 }}>
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-bold text-emerald-600 uppercase tracking-tight">
					{$i18n.t('backoffice.payments.paidThisMonth')}
				</div>
				<iconify-icon
					icon="solar:check-circle-bold"
					class="text-emerald-400"
					width="24"
				></iconify-icon>
			</div>
			<div class="text-3xl font-black text-emerald-600">
				{formatCurrency(stats.totalPaidThisMonth)}
			</div>
			<div class="text-xs text-slate-500 mt-1">{$i18n.t('backoffice.payments.currentMonthRevenue')}</div>
		</div>

		<div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm" in:fly={{ y: 20, delay: 300 }}>
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-bold text-slate-600 uppercase tracking-tight">
					{$i18n.t('backoffice.payments.pendingCount')}
				</div>
				<iconify-icon
					icon="solar:document-bold"
					class="text-slate-400"
					width="24"
				></iconify-icon>
			</div>
			<div class="text-3xl font-black text-slate-900">{stats.countPending}</div>
			<div class="text-xs text-slate-500 mt-1">{$i18n.t('backoffice.payments.awaitingPayment')}</div>
		</div>

		<div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm" in:fly={{ y: 20, delay: 400 }}>
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-bold text-rose-600 uppercase tracking-tight">{$i18n.t('backoffice.payments.expired')}</div>
				<iconify-icon
					icon="solar:hourglass-bold-duotone"
					class="text-rose-400"
					width="24"
				></iconify-icon>
			</div>
			<div class="text-3xl font-black text-rose-600">{stats.countExpired}</div>
			<div class="text-xs text-slate-500 mt-1">{$i18n.t('backoffice.payments.overdueInvoices')}</div>
		</div>
	</div>

	<div class="space-y-4" in:fly={{ y: 20, delay: 500 }}>
		<div class="relative">
			<iconify-icon
				icon="solar:magnifer-linear"
				width="20"
				class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
			></iconify-icon>
			<input
				type="text"
				placeholder={$i18n.t('backoffice.payments.searchPlaceholder')}
				class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-all"
				bind:value={searchQuery}
			/>
		</div>

		<div class="flex gap-2 flex-wrap">
			<button
				onclick={() => filters.status = undefined}
				class="px-4 py-2 rounded-xl font-bold text-sm transition-all {!filters.status
					? 'bg-[#291334] text-white'
					: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
			>
				{$i18n.t('backoffice.payments.allStatus')}
			</button>
			<button
				onclick={() => filters.status = 'PENDING'}
				class="px-4 py-2 rounded-xl font-bold text-sm transition-all {filters.status === 'PENDING'
					? 'bg-[#291334] text-white'
					: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
			>
				{$i18n.t('common.status.pending')}
			</button>
			<button
				onclick={() => filters.status = 'PAID'}
				class="px-4 py-2 rounded-xl font-bold text-sm transition-all {filters.status === 'PAID'
					? 'bg-[#291334] text-white'
					: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
			>
				{$i18n.t('common.status.paid')}
			</button>
			<button
				onclick={() => filters.status = 'EXPIRED'}
				class="px-4 py-2 rounded-xl font-bold text-sm transition-all {filters.status === 'EXPIRED'
					? 'bg-[#291334] text-white'
					: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
			>
				{$i18n.t('common.status.expired')}
			</button>
			<button
				onclick={() => filters.status = 'CANCELLED'}
				class="px-4 py-2 rounded-xl font-bold text-sm transition-all {filters.status === 'CANCELLED'
					? 'bg-[#291334] text-white'
					: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
			>
				{$i18n.t('common.status.cancelled')}
			</button>
		</div>
	</div>

	{#if filteredPayments.length > 0}
		<div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm" in:fade>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-slate-50 border-b border-slate-100">
						<tr>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>{$i18n.t('backoffice.payments.table.payment')}</th
							>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>{$i18n.t('backoffice.payments.table.client')}</th
							>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>{$i18n.t('backoffice.payments.table.amount')}</th
							>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>{$i18n.t('backoffice.payments.table.status')}</th
							>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider"
								>{$i18n.t('backoffice.payments.table.frequency')}</th
							>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">{$i18n.t('backoffice.payments.table.date')}</th
							>
							<th class="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase tracking-wider"
								>{$i18n.t('backoffice.payments.table.actions')}</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each filteredPayments as payment (payment.id)}
							<tr
								class="hover:bg-slate-50 hover:shadow-sm transition-all duration-200 cursor-pointer {payment.status === 'EXPIRED' ? 'bg-rose-50/30' : ''}"
								onclick={() => goto(`/admin/payments/${payment.id}`)}
							>
								<td class="px-6 py-4">
									<div class="space-y-1">
										<div class="flex items-center gap-2">
											<div class="font-bold text-base text-slate-900">{payment.description}</div>
											{#if payment.status === 'EXPIRED'}
												<Badge variant="error">
													{$i18n.t('common.status.expired')}
												</Badge>
											{/if}
										</div>
										<div class="text-sm text-slate-500 font-mono">#{payment.id.slice(0, 8)}</div>
										{#if payment.attachedFiles.length > 0}
											<div class="flex items-center gap-1 text-sm text-indigo-600">
												<iconify-icon icon="solar:paperclip-bold" width="16"></iconify-icon>
												{payment.attachedFiles.length} {payment.attachedFiles.length > 1
													? $i18n.t('backoffice.payments.files')
													: $i18n.t('backoffice.payments.file')}
											</div>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="space-y-1">
										<div class="font-bold text-base text-slate-900">{payment.client.companyName}</div>
										<div class="text-sm text-slate-500">
											{payment.client.user.firstName}
											{payment.client.user.lastName}
										</div>
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="space-y-1">
										<div class="font-bold text-lg text-[#291334]">
											{formatCurrency(Number(payment.totalWithFees || payment.amount))}
										</div>
										{#if payment.stripeFee && Number(payment.stripeFee) > 0}
											<div class="text-[10px] text-slate-500 flex items-center gap-1">
												<span>{formatCurrency(Number(payment.amount))}</span>
												<span>+</span>
												<span class="text-amber-600 font-bold">
													{formatCurrency(Number(payment.stripeFee))} {$i18n.t('backoffice.payments.table.fees')}
												</span>
											</div>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4">
									<Badge variant={getStatusColor(payment.status)}>
										{payment.status}
									</Badge>
								</td>
								<td class="px-6 py-4">
									<div class="text-sm text-slate-600">{getFrequencyLabel(payment.frequency)}</div>
								</td>
								<td class="px-6 py-4">
									<div class="space-y-1">
										{#if payment.status === 'PAID' && payment.paidAt}
											<div class="text-sm text-slate-500 flex items-center gap-1">
												<iconify-icon
													icon="solar:check-circle-bold"
													width="16"
													class="text-emerald-500"
												></iconify-icon>
												{$i18n.t('backoffice.payments.table.paid')}: {formatDate(payment.paidAt)}
											</div>
										{:else if payment.status === 'PENDING'}
											<div class="text-sm text-slate-500 flex items-center gap-1">
												<iconify-icon
													icon="solar:calendar-bold"
													width="16"
													class="text-amber-500"
												></iconify-icon>
												{$i18n.t('backoffice.payments.table.due')}: {formatDate(payment.dueDate)}
											</div>
										{:else}
											<div class="text-sm text-slate-500">{formatDate(payment.createdAt)}</div>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="flex items-center justify-end gap-2">
										{#if payment.status === 'PENDING'}
											<button
												onclick={(e) => {
													e.stopPropagation();
													handleCancelPayment(payment.id, payment.description);
												}}
												disabled={actionLoading === payment.id}
												class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												title={$i18n.t('backoffice.payments.cancelPayment')}
											>
												{#if actionLoading === payment.id}
													<iconify-icon icon="line-md:loading-twotone-loop" width="18"></iconify-icon>
												{:else}
													<iconify-icon icon="solar:close-circle-bold" width="18"></iconify-icon>
												{/if}
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

			<div class="text-sm text-slate-500 text-center">
				{$i18n.t('backoffice.payments.showing', { count: filteredPayments.length, total: total })}
			</div>
		{:else}
			<div class="text-center py-16" in:fade>
				<div class="flex flex-col items-center gap-4">
					<div class="w-20 h-20 bg-[#FEC129]/20 text-[#291334] rounded-2xl flex items-center justify-center">
						<iconify-icon icon="solar:wallet-money-bold" width="40"></iconify-icon>
					</div>
					<h3 class="text-2xl font-black text-[#291334]">{$i18n.t('backoffice.payments.noPaymentsFound')}</h3>
					<p class="text-[#291334]/60 max-w-md">{$i18n.t('backoffice.payments.tryAdjustingFilters')}</p>
					{#if !searchQuery && !filters.status}
						<button
							onclick={() => goto('/admin/payments/create')}
							class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer mt-2"
						>
							<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
							<span>{$i18n.t('backoffice.payments.createPayment')}</span>
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

