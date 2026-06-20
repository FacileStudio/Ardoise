<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Spinner, SearchInput, Badge, EmptyState, Button } from '@repo/ui';
	import { downloadCSV } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import { spaceContext } from '$lib/space-context.svelte';
	import 'iconify-icon';

	type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
	type PaymentFrequency = 'ONE_TIME' | 'MONTHLY' | 'YEARLY';

	interface Client {
		id: string;
		companyName: string;
		contactFirstName: string;
		contactLastName: string;
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
		stripeFee?: number | null;
		totalWithFees?: number | null;
		description: string;
		status: PaymentStatus;
		frequency: PaymentFrequency;
		collectionMethod?: 'STRIPE' | 'MANUAL';
		reference?: string | null;
		dueDate: Date;
		paidAt: Date | null;
		createdAt: Date;
		client: Client;
		attachedFiles: string[];
	}

	let pageLoading = $state(true);
	let loading = $state(false);
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

	let isInitialMount = true;

	onMount(async () => {
		await Promise.all([fetchPayments(true), fetchStats()]);
		isInitialMount = false;
	});

	async function fetchPayments(isInitialLoad = false) {
		if (isInitialLoad) {
			pageLoading = true;
		} else {
			loading = true;
		}
		try {
			const result = await trpc.payment.list.query({
				page: filters.page,
				limit: filters.limit,
				status: filters.status,
				spaceId: spaceContext.spaceId,
			});
			payments = result.payments as unknown as Payment[];
			total = result.total;
		} catch (err) {
			logger.error({ err }, 'Failed to fetch payments');
		} finally {
			if (isInitialLoad) {
				pageLoading = false;
			} else {
				loading = false;
			}
		}
	}


	async function fetchStats() {
		try {
			const allPayments = await trpc.payment.list.query({ page: 1, limit: 100, spaceId: spaceContext.spaceId });
			const paymentsData = allPayments.payments as unknown as Payment[];

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
		if (!isInitialMount) {
			fetchPayments();
		}
	});


	async function handleCancelPayment(id: string, description: string) {
		if (!confirm($i18n.t('admin.payments.cancelConfirm', { description })))
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
				return $i18n.t('admin.payments.oneTime');
			case 'MONTHLY':
				return $i18n.t('admin.payments.monthly');
			case 'YEARLY':
				return $i18n.t('admin.payments.yearly');
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
	<div class="flex flex-col items-center justify-center h-screen space-y-4">
		<iconify-icon icon="svg-spinners:blocks-shuffle-3" width="40" class="text-foreground"></iconify-icon>
		<p class="text-sm text-muted-foreground">Chargement...</p>
	</div>
{:else}
	<div class="p-8 max-w-[1600px] mx-auto space-y-6">
		<header class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground">{$i18n.t('admin.payments.title')}</h1>
				<p class="text-sm text-muted-foreground mt-1">{$i18n.t('admin.payments.subtitle')}</p>
			</div>
		<div class="flex gap-3">
			{#if payments.length > 0}
				<Button onclick={handleExportCSV}>
					<iconify-icon icon="solar:file-download-bold" width="18"></iconify-icon>
					<span>Exporter CSV</span>
				</Button>
			{/if}
			<button
				onclick={() => goto(resolve('/admin/payments/create'))}
				class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
			>
				<iconify-icon icon="mdi:plus" width="18"></iconify-icon>
				{$i18n.t('admin.payments.createPayment')}
			</button>
		</div>
	</header>

	<div class="grid grid-cols-4 gap-4">
		<div class="rounded-xl border border-border p-4">
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-medium text-amber-600 uppercase">
					{$i18n.t('admin.payments.pendingAmount')}
				</div>
				<iconify-icon
					icon="solar:clock-circle-bold"
					class="text-amber-600"
					width="20"
				></iconify-icon>
			</div>
			<div class="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalPending)}</div>
			<div class="text-xs text-muted-foreground mt-1">{$i18n.t('admin.payments.pendingInvoices', { count: stats.countPending })}</div>
		</div>

		<div class="rounded-xl border border-border p-4">
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-medium text-green-600 uppercase">
					{$i18n.t('admin.payments.paidThisMonth')}
				</div>
				<iconify-icon
					icon="solar:check-circle-bold"
					class="text-green-600"
					width="20"
				></iconify-icon>
			</div>
			<div class="text-2xl font-bold text-green-600">
				{formatCurrency(stats.totalPaidThisMonth)}
			</div>
			<div class="text-xs text-muted-foreground mt-1">{$i18n.t('admin.payments.currentMonthRevenue')}</div>
		</div>

		<div class="rounded-xl border border-border p-4">
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-medium text-muted-foreground uppercase">
					{$i18n.t('admin.payments.pendingCount')}
				</div>
				<iconify-icon
					icon="solar:document-bold"
					class="text-muted-foreground"
					width="20"
				></iconify-icon>
			</div>
			<div class="text-2xl font-bold text-foreground">{stats.countPending}</div>
			<div class="text-xs text-muted-foreground mt-1">{$i18n.t('admin.payments.awaitingPayment')}</div>
		</div>

		<div class="rounded-xl border border-border p-4">
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-medium text-red-600 uppercase">{$i18n.t('admin.payments.expired')}</div>
				<iconify-icon
					icon="solar:hourglass-bold-duotone"
					class="text-red-600"
					width="20"
				></iconify-icon>
			</div>
			<div class="text-2xl font-bold text-red-600">{stats.countExpired}</div>
			<div class="text-xs text-muted-foreground mt-1">{$i18n.t('admin.payments.overdueInvoices')}</div>
		</div>
	</div>

	<div class="space-y-4">
		<div class="relative">
			<iconify-icon
				icon="solar:magnifer-linear"
				width="18"
				class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
			></iconify-icon>
			<input
				type="text"
				placeholder={$i18n.t('admin.payments.searchPlaceholder')}
				class="h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus:border-foreground transition-colors"
				bind:value={searchQuery}
			/>
		</div>

		<div class="flex gap-2 flex-wrap">
			<button
				onclick={() => filters.status = undefined}
				class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {!filters.status
					? 'bg-foreground text-background'
					: 'border border-border text-muted-foreground hover:bg-muted'}"
			>
				{$i18n.t('admin.payments.allStatus')}
			</button>
			<button
				onclick={() => filters.status = 'PENDING'}
				class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {filters.status === 'PENDING'
					? 'bg-foreground text-background'
					: 'border border-border text-muted-foreground hover:bg-muted'}"
			>
				{$i18n.t('common.status.pending')}
			</button>
			<button
				onclick={() => filters.status = 'PAID'}
				class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {filters.status === 'PAID'
					? 'bg-foreground text-background'
					: 'border border-border text-muted-foreground hover:bg-muted'}"
			>
				{$i18n.t('common.status.paid')}
			</button>
			<button
				onclick={() => filters.status = 'EXPIRED'}
				class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {filters.status === 'EXPIRED'
					? 'bg-foreground text-background'
					: 'border border-border text-muted-foreground hover:bg-muted'}"
			>
				{$i18n.t('common.status.expired')}
			</button>
			<button
				onclick={() => filters.status = 'CANCELLED'}
				class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {filters.status === 'CANCELLED'
					? 'bg-foreground text-background'
					: 'border border-border text-muted-foreground hover:bg-muted'}"
			>
				{$i18n.t('common.status.cancelled')}
			</button>
		</div>
	</div>

	{#if filteredPayments.length > 0}
		<div class="rounded-xl border border-border overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b border-border">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
								>{$i18n.t('admin.payments.table.payment')}</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
								>{$i18n.t('admin.payments.table.client')}</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
								>{$i18n.t('admin.payments.table.amount')}</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
								>{$i18n.t('admin.payments.table.status')}</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
								>{$i18n.t('admin.payments.table.frequency')}</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{$i18n.t('admin.payments.table.date')}</th
							>
							<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase"
								>{$i18n.t('admin.payments.table.actions')}</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each filteredPayments as payment (payment.id)}
							<tr
								class="hover:bg-muted/50 transition-colors cursor-pointer"
								onclick={() => goto(resolve(`/admin/payments/${payment.id}`))}
							>
								<td class="px-4 py-3">
									<div class="space-y-1">
										<div class="flex items-center gap-2">
											<div class="font-medium text-foreground">{payment.description}</div>
											{#if payment.status === 'EXPIRED'}
												<Badge variant="error">
													{$i18n.t('common.status.expired')}
												</Badge>
											{/if}
										</div>
										<div class="text-xs text-muted-foreground font-mono">#{payment.id.slice(0, 8)}</div>
										{#if payment.attachedFiles.length > 0}
											<div class="flex items-center gap-1 text-xs text-muted-foreground">
												<iconify-icon icon="solar:paperclip-bold" width="14"></iconify-icon>
												{payment.attachedFiles.length} {payment.attachedFiles.length > 1
													? $i18n.t('admin.payments.files')
													: $i18n.t('admin.payments.file')}
											</div>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="space-y-0.5">
										<div class="font-medium text-foreground">{payment.client.companyName}</div>
										<div class="text-sm text-muted-foreground">
											{payment.client.contactFirstName}
											{payment.client.contactLastName}
										</div>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="space-y-0.5">
										<div class="font-semibold text-foreground">
											{formatCurrency(Number(payment.totalWithFees || payment.amount))}
										</div>
										{#if payment.stripeFee && Number(payment.stripeFee) > 0}
											<div class="text-xs text-muted-foreground flex items-center gap-1">
												<span>{formatCurrency(Number(payment.amount))}</span>
												<span>+</span>
												<span class="text-amber-600 font-medium">
													{formatCurrency(Number(payment.stripeFee))} {$i18n.t('admin.payments.table.fees')}
												</span>
											</div>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3">
									<Badge variant={getStatusColor(payment.status)}>
										{payment.status}
									</Badge>
								</td>
								<td class="px-4 py-3">
									<div class="space-y-0.5">
										<div class="text-sm text-foreground">{getFrequencyLabel(payment.frequency)}</div>
										<div class="text-xs text-muted-foreground">
											{payment.collectionMethod === 'MANUAL' ? 'Manuel' : 'Stripe'}
										</div>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="space-y-0.5">
										{#if payment.status === 'PAID' && payment.paidAt}
											<div class="text-sm text-muted-foreground flex items-center gap-1">
												<iconify-icon
													icon="solar:check-circle-bold"
													width="14"
													class="text-green-600"
												></iconify-icon>
												{$i18n.t('admin.payments.table.paid')}: {formatDate(payment.paidAt)}
											</div>
										{:else if payment.status === 'PENDING'}
											<div class="text-sm text-muted-foreground flex items-center gap-1">
												<iconify-icon
													icon="solar:calendar-bold"
													width="14"
													class="text-amber-600"
												></iconify-icon>
												{$i18n.t('admin.payments.table.due')}: {formatDate(payment.dueDate)}
											</div>
										{:else}
											<div class="text-sm text-muted-foreground">{formatDate(payment.createdAt)}</div>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center justify-end gap-1">
										{#if payment.status === 'PENDING'}
											<button
												onclick={(e) => {
													e.stopPropagation();
													handleCancelPayment(payment.id, payment.description);
												}}
												disabled={actionLoading === payment.id}
												class="p-2 text-muted-foreground hover:text-red-600 hover:bg-muted rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												title={$i18n.t('admin.payments.cancelPayment')}
											>
												{#if actionLoading === payment.id}
													<iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
												{:else}
													<iconify-icon icon="solar:close-circle-bold" width="16"></iconify-icon>
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

			<div class="text-sm text-muted-foreground text-center">
				{$i18n.t('admin.payments.showing', { count: filteredPayments.length, total: total })}
			</div>
		{:else}
			<div class="text-center py-16">
				<div class="flex flex-col items-center gap-4">
					<div class="w-16 h-16 rounded-xl border border-border flex items-center justify-center text-muted-foreground">
						<iconify-icon icon="solar:wallet-money-bold" width="32"></iconify-icon>
					</div>
					<h3 class="text-lg font-semibold text-foreground">{$i18n.t('admin.payments.noPaymentsFound')}</h3>
					<p class="text-sm text-muted-foreground max-w-md">{$i18n.t('admin.payments.tryAdjustingFilters')}</p>
					{#if !searchQuery && !filters.status}
						<button
							onclick={() => goto(resolve('/admin/payments/create'))}
							class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity mt-2"
						>
							<iconify-icon icon="mdi:plus" width="18"></iconify-icon>
							<span>{$i18n.t('admin.payments.createPayment')}</span>
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
