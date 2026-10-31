<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		Badge,
		Button,
		Card,
		ConfirmModal,
		EmptyState,
		Page,
		PageHeader,
		Spinner,
		StatCard,
		Table,
		Tabs,
		toast,
	} from '@facile/muse';
	import { icons, ardoise } from '$lib/icons';
	import { Pagination, SearchInput } from '$lib/ui';
	import { downloadCSV } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import { spaceContext } from '$lib/space-context.svelte';
	import { PAYMENT_STATUS_LABELS } from '$lib/mission';

	type PaymentStatus = 'PENDING' | 'PAID' | 'PAST_DUE' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
	const STATUSES: PaymentStatus[] = [
		'PENDING',
		'PAID',
		'PAST_DUE',
		'FAILED',
		'EXPIRED',
		'CANCELLED',
	];
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
	let cancelTarget: Payment | null = $state(null);
	let confirmCancel = $state(false);

	const statusTabs = [
		{ id: 'ALL', label: $i18n.t('admin.payments.allStatus') },
		...STATUSES.map((value) => ({ id: value, label: PAYMENT_STATUS_LABELS[value] })),
	];
	let statusTab = $state('ALL');
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

	function askCancel(payment: Payment) {
		cancelTarget = payment;
		confirmCancel = true;
	}

	async function handleCancelPayment() {
		if (!cancelTarget) return;
		const id = cancelTarget.id;

		try {
			actionLoading = id;
			await trpc.payment.cancel.mutate({ id });
			await Promise.all([fetchPayments(), fetchStats()]);
		} catch (err) {
			logger.error({ err }, 'Failed to cancel payment');
			toast.danger("Impossible d'annuler le paiement");
		} finally {
			actionLoading = '';
			cancelTarget = null;
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
		const csvData = payments.map((payment) => ({
			ID: payment.id,
			Description: payment.description,
			Client: payment.client.companyName,
			Montant: formatCurrency(Number(payment.totalWithFees || payment.amount)),
			'Frais Stripe': payment.stripeFee ? formatCurrency(Number(payment.stripeFee)) : '0,00 €',
			Statut: payment.status,
			Fréquence: getFrequencyLabel(payment.frequency),
			'Date création': formatDate(payment.createdAt),
			'Date échéance': formatDate(payment.dueDate),
			'Date paiement': payment.paidAt ? formatDate(payment.paidAt) : '-',
		}));
		downloadCSV(csvData, 'paiements');
	}
</script>

<svelte:head><title>Paiements - Ardoise</title></svelte:head>

{#if pageLoading}
	<div class="flex min-h-[40dvh] items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else}
	<Page width="xl">
		<PageHeader
			title={$i18n.t('admin.payments.title')}
			description={$i18n.t('admin.payments.subtitle')}
		>
			{#snippet actions()}
				{#if payments.length > 0}
					<Button variant="ghost" icon={icons.download} onclick={handleExportCSV}
						>Exporter CSV</Button
					>
				{/if}
				<Button href={resolve('/admin/payments/create')} icon={icons.plus}>
					{$i18n.t('admin.payments.createPayment')}
				</Button>
			{/snippet}
		</PageHeader>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard
				label={$i18n.t('admin.payments.pendingAmount')}
				value={formatCurrency(stats.totalPending)}
				delta={$i18n.t('admin.payments.pendingInvoices', { count: stats.countPending })}
			/>
			<StatCard
				label={$i18n.t('admin.payments.paidThisMonth')}
				value={formatCurrency(stats.totalPaidThisMonth)}
				delta={$i18n.t('admin.payments.currentMonthRevenue')}
			/>
			<StatCard
				label={$i18n.t('admin.payments.pendingCount')}
				value={stats.countPending}
				delta={$i18n.t('admin.payments.awaitingPayment')}
			/>
			<StatCard
				label={$i18n.t('admin.payments.expired')}
				value={stats.countExpired}
				delta={$i18n.t('admin.payments.overdueInvoices')}
			/>
		</div>

		<SearchInput
			bind:value={searchQuery}
			oninput={handleSearch}
			placeholder={$i18n.t('admin.payments.searchPlaceholder')}
		/>

		<Tabs
			label="Filtrer par statut"
			items={statusTabs}
			bind:value={statusTab}
			onChange={(id) => setStatus(id === 'ALL' ? undefined : (id as PaymentStatus))}
		/>

		{#if payments.length > 0}
			<div class="hidden md:block">
				<Table>
					<thead>
						<tr>
							<th scope="col">{$i18n.t('admin.payments.table.payment')}</th>
							<th scope="col">{$i18n.t('admin.payments.table.client')}</th>
							<th scope="col">{$i18n.t('admin.payments.table.amount')}</th>
							<th scope="col">{$i18n.t('admin.payments.table.status')}</th>
							<th scope="col">{$i18n.t('admin.payments.table.frequency')}</th>
							<th scope="col">{$i18n.t('admin.payments.table.date')}</th>
							<th scope="col" aria-label={$i18n.t('admin.payments.table.actions')}></th>
						</tr>
					</thead>
					<tbody>
						{#each payments as payment (payment.id)}
							<tr>
								<td>
									<div class="flex flex-col gap-1">
										<a
											href={resolve(`/admin/payments/${payment.id}`)}
											class="rounded-fc-xs font-medium text-fc-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
										>
											{payment.description}
										</a>
										<span class="font-mono text-fc-xs text-fc-fg-muted"
											>#{payment.id.slice(0, 8)}</span
										>
										{#if payment.attachedFiles.length > 0}
											<span class="text-fc-xs text-fc-fg-muted">
												{payment.attachedFiles.length}
												{payment.attachedFiles.length > 1
													? $i18n.t('admin.payments.files')
													: $i18n.t('admin.payments.file')}
											</span>
										{/if}
									</div>
								</td>
								<td>
									<div class="flex flex-col">
										<span class="font-medium text-fc-fg">{payment.client.companyName}</span>
										<span class="text-fc-sm text-fc-fg-muted">
											{payment.client.contactFirstName}
											{payment.client.contactLastName}
										</span>
									</div>
								</td>
								<td>
									<div class="flex flex-col">
										<span class="font-semibold text-fc-fg">
											{formatCurrency(Number(payment.totalWithFees || payment.amount))}
										</span>
										{#if payment.stripeFee && Number(payment.stripeFee) > 0}
											<span class="text-fc-xs text-fc-fg-muted">
												{formatCurrency(Number(payment.amount))} +
												<span class="font-medium text-fc-warning">
													{formatCurrency(Number(payment.stripeFee))}
													{$i18n.t('admin.payments.table.fees')}
												</span>
											</span>
										{/if}
									</div>
								</td>
								<td>
									<Badge tone={getStatusColor(payment.status)}
										>{PAYMENT_STATUS_LABELS[payment.status]}</Badge
									>
								</td>
								<td>
									<div class="flex flex-col">
										<span class="text-fc-fg">{getFrequencyLabel(payment.frequency)}</span>
										<span class="text-fc-xs text-fc-fg-muted">
											{payment.collectionMethod === 'MANUAL' ? 'Manuel' : 'Stripe'}
										</span>
									</div>
								</td>
								<td class="text-fc-sm text-fc-fg-muted">
									{#if payment.status === 'PAID' && payment.paidAt}
										{$i18n.t('admin.payments.table.paid')}: {formatDate(payment.paidAt)}
									{:else if payment.status === 'PENDING'}
										{$i18n.t('admin.payments.table.due')}: {formatDate(payment.dueDate)}
									{:else}
										{formatDate(payment.createdAt)}
									{/if}
								</td>
								<td>
									<div class="flex items-center justify-end gap-1">
										{#if payment.status === 'PENDING'}
											<Button
												variant="ghost-danger"
												size="sm"
												icon={icons.revoke}
												aria-label={$i18n.t('admin.payments.cancelPayment')}
												disabled={actionLoading === payment.id}
												onclick={() => askCancel(payment)}
											/>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</Table>
			</div>

			<div class="flex flex-col gap-2 md:hidden">
				{#each payments as payment (payment.id)}
					<Card class="flex flex-col gap-3">
						<a
							href={resolve(`/admin/payments/${payment.id}`)}
							class="flex min-w-0 flex-col gap-1 rounded-fc-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
						>
							<span class="truncate text-fc-sm font-medium text-fc-fg">{payment.description}</span>
							<span class="truncate text-fc-xs text-fc-fg-muted">{payment.client.companyName}</span>
						</a>
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<span class="text-fc-sm font-semibold text-fc-fg">
									{formatCurrency(Number(payment.totalWithFees || payment.amount))}
								</span>
								<Badge tone={getStatusColor(payment.status)}
									>{PAYMENT_STATUS_LABELS[payment.status]}</Badge
								>
							</div>
							{#if payment.status === 'PENDING'}
								<Button
									variant="ghost-danger"
									size="lg"
									icon={icons.revoke}
									aria-label={$i18n.t('admin.payments.cancelPayment')}
									disabled={actionLoading === payment.id}
									onclick={() => askCancel(payment)}
								/>
							{/if}
						</div>
					</Card>
				{/each}
			</div>

			<p class="text-center text-fc-sm text-fc-fg-muted">
				{$i18n.t('admin.payments.showing', { count: payments.length, total: total })}
			</p>

			{#if totalPages > 1}
				<Pagination currentPage={page} {totalPages} onPageChange={handlePageChange} />
			{/if}
		{:else}
			<EmptyState
				icon={ardoise.payment}
				title={$i18n.t('admin.payments.noPaymentsFound')}
				description={$i18n.t('admin.payments.tryAdjustingFilters')}
			>
				{#if !searchQuery && !status}
					<Button href={resolve('/admin/payments/create')} icon={icons.plus}>
						{$i18n.t('admin.payments.createPayment')}
					</Button>
				{/if}
			</EmptyState>
		{/if}
	</Page>
{/if}

<ConfirmModal
	bind:open={confirmCancel}
	tone="danger"
	title={$i18n.t('admin.payments.cancelPayment')}
	description={$i18n.t('admin.payments.cancelConfirm', {
		description: cancelTarget?.description ?? '',
	})}
	confirmLabel={$i18n.t('admin.payments.cancelPayment')}
	cancelLabel="Garder le paiement"
	onConfirm={handleCancelPayment}
	onCancel={() => (cancelTarget = null)}
/>
