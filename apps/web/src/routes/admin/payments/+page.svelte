<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Badge, Button } from '@facile/muse';
	import { Pagination, SearchInput } from '$lib/ui';
	import { downloadCSV } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import { spaceContext } from '$lib/space-context.svelte';
	import { PAYMENT_STATUS_LABELS } from '$lib/mission';
	import 'iconify-icon';

	type PaymentStatus = 'PENDING' | 'PAID' | 'PAST_DUE' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
	const STATUSES: PaymentStatus[] = ['PENDING', 'PAID', 'PAST_DUE', 'FAILED', 'EXPIRED', 'CANCELLED'];
	const PAGE_SIZE = 20;
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
	let page = $state(1);
	let searchQuery = $state('');
	let status = $state<PaymentStatus | undefined>(undefined);
	let actionLoading = $state('');
	let searchTimer: ReturnType<typeof setTimeout>;

	let stats = $state({
		totalPending: 0,
		totalPaidThisMonth: 0,
		countPending: 0,
		countExpired: 0,
	});

	let totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));

	onMount(() => {
		Promise.all([fetchPayments(true), fetchStats()]);
		return () => clearTimeout(searchTimer);
	});

	async function fetchPayments(isInitialLoad = false) {
		if (isInitialLoad) {
			pageLoading = true;
		} else {
			loading = true;
		}
		try {
			const result = await trpc.payment.list.query({
				page,
				limit: PAGE_SIZE,
				status,
				search: searchQuery.trim() || undefined,
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
			stats = await trpc.payment.stats.query({ spaceId: spaceContext.spaceId });
		} catch (err) {
			logger.error({ err }, 'Failed to fetch payment statistics');
		}
	}

	function setStatus(next: PaymentStatus | undefined) {
		status = next;
		page = 1;
		fetchPayments();
	}

	function handleSearch() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			page = 1;
			fetchPayments();
		}, 300);
	}

	function handlePageChange(next: number) {
		page = next;
		fetchPayments();
	}

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
			await trpc.payment.markExpired.mutate({ spaceId: spaceContext.spaceId });
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
				return 'success';
			case 'PENDING':
				return 'warning';
			case 'EXPIRED':
				return 'danger';
			case 'CANCELLED':
				return 'neutral';
			default:
				return 'neutral';
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
				<div class="text-xs font-medium text-fc-warning uppercase">
					{$i18n.t('admin.payments.pendingAmount')}
				</div>
				<iconify-icon
					icon="solar:clock-circle-bold"
					class="text-fc-warning"
					width="20"
				></iconify-icon>
			</div>
			<div class="text-2xl font-bold text-fc-warning">{formatCurrency(stats.totalPending)}</div>
			<div class="text-xs text-muted-foreground mt-1">{$i18n.t('admin.payments.pendingInvoices', { count: stats.countPending })}</div>
		</div>

		<div class="rounded-xl border border-border p-4">
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-medium text-fc-success uppercase">
					{$i18n.t('admin.payments.paidThisMonth')}
				</div>
				<iconify-icon
					icon="solar:check-circle-bold"
					class="text-fc-success"
					width="20"
				></iconify-icon>
			</div>
			<div class="text-2xl font-bold text-fc-success">
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
				<div class="text-xs font-medium text-fc-danger uppercase">{$i18n.t('admin.payments.expired')}</div>
				<iconify-icon
					icon="solar:hourglass-bold-duotone"
					class="text-fc-danger"
					width="20"
				></iconify-icon>
			</div>
			<div class="text-2xl font-bold text-fc-danger">{stats.countExpired}</div>
			<div class="text-xs text-muted-foreground mt-1">{$i18n.t('admin.payments.overdueInvoices')}</div>
		</div>
	</div>

	<div class="space-y-4">
		<SearchInput
			bind:value={searchQuery}
			oninput={handleSearch}
			placeholder={$i18n.t('admin.payments.searchPlaceholder')}
		/>

		<div class="flex gap-2 flex-wrap">
			{#each [undefined, ...STATUSES] as option (option ?? 'ALL')}
				<button
					onclick={() => setStatus(option)}
					class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {status === option
						? 'bg-foreground text-background'
						: 'border border-border text-muted-foreground hover:bg-muted'}"
				>
					{option ? PAYMENT_STATUS_LABELS[option] : $i18n.t('admin.payments.allStatus')}
				</button>
			{/each}
		</div>
	</div>

	{#if payments.length > 0}
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
						{#each payments as payment (payment.id)}
							<tr
								class="hover:bg-muted/50 transition-colors cursor-pointer"
								onclick={() => goto(resolve(`/admin/payments/${payment.id}`))}
							>
								<td class="px-4 py-3">
									<div class="space-y-1">
										<div class="flex items-center gap-2">
											<div class="font-medium text-foreground">{payment.description}</div>
											{#if payment.status === 'EXPIRED'}
												<Badge tone="danger">
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
												<span class="text-fc-warning font-medium">
													{formatCurrency(Number(payment.stripeFee))} {$i18n.t('admin.payments.table.fees')}
												</span>
											</div>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3">
									<Badge tone={getStatusColor(payment.status)}>
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
													class="text-fc-success"
												></iconify-icon>
												{$i18n.t('admin.payments.table.paid')}: {formatDate(payment.paidAt)}
											</div>
										{:else if payment.status === 'PENDING'}
											<div class="text-sm text-muted-foreground flex items-center gap-1">
												<iconify-icon
													icon="solar:calendar-bold"
													width="14"
													class="text-fc-warning"
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
												class="p-2 text-muted-foreground hover:text-fc-danger hover:bg-muted rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
				{$i18n.t('admin.payments.showing', { count: payments.length, total: total })}
			</div>

			{#if totalPages > 1}
				<Pagination currentPage={page} {totalPages} onPageChange={handlePageChange} />
			{/if}
		{:else}
			<div class="text-center py-16">
				<div class="flex flex-col items-center gap-4">
					<div class="w-16 h-16 rounded-xl border border-border flex items-center justify-center text-muted-foreground">
						<iconify-icon icon="solar:wallet-money-bold" width="32"></iconify-icon>
					</div>
					<h3 class="text-lg font-semibold text-foreground">{$i18n.t('admin.payments.noPaymentsFound')}</h3>
					<p class="text-sm text-muted-foreground max-w-md">{$i18n.t('admin.payments.tryAdjustingFilters')}</p>
					{#if !searchQuery && !status}
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
