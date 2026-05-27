<script lang="ts">
	import { AreaChart, PieChart, BarChart, LineChart, Spinner, Button } from '@repo/ui';
	import { downloadCSV } from '@repo/utils';
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

	type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';

	interface Payment {
		id: string;
		amount: number;
		status: PaymentStatus;
		createdAt: Date;
		paidAt: Date | null;
		dueDate: Date;
	}

	let loading = $state(true);
	let payments: Payment[] = $state([]);

	onMount(async () => {
		await fetchPayments();
		loading = false;
	});

	async function fetchPayments() {
		try {
			const result = await trpc.payment.list.query({ page: 1, limit: 100 });
			payments = result.payments as unknown as Payment[];
		} catch (err) {
			logger.error({ err }, 'Failed to fetch payment statistics');
		}
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount);
	}

	const totalRevenue = $derived(
		payments
			.filter((p) => p.status === 'PAID')
			.reduce((sum, p) => sum + Number(p.amount), 0)
	);

	const pendingRevenue = $derived(
		payments
			.filter((p) => p.status === 'PENDING')
			.reduce((sum, p) => sum + Number(p.amount), 0)
	);

	const thisMonthRevenue = $derived(() => {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		return payments
			.filter((p) => p.status === 'PAID' && p.paidAt && new Date(p.paidAt) >= startOfMonth)
			.reduce((sum, p) => sum + Number(p.amount), 0);
	});

	const averagePayment = $derived(
		payments.filter((p) => p.status === 'PAID').length > 0
			? totalRevenue / payments.filter((p) => p.status === 'PAID').length
			: 0
	);

	const paymentStatusDistribution = $derived(() => {
		return [
			{ label: 'Payés', value: payments.filter((p) => p.status === 'PAID').length },
			{ label: 'En attente', value: payments.filter((p) => p.status === 'PENDING').length },
			{ label: 'Expirés', value: payments.filter((p) => p.status === 'EXPIRED').length },
			{ label: 'Annulés', value: payments.filter((p) => p.status === 'CANCELLED').length },
		];
	});

	const monthlyRevenue = $derived(() => {
		const revenueByMonth = new SvelteMap<string, number>();

		payments
			.filter((p) => p.status === 'PAID' && p.paidAt)
			.forEach((p) => {
				const date = new Date(p.paidAt!);
				const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
				const current = revenueByMonth.get(monthKey) || 0;
				revenueByMonth.set(monthKey, current + Number(p.amount));
			});

		return Array.from(revenueByMonth.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.slice(-6)
			.map(([month, revenue]) => ({
				month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
				revenue
			}));
	});

	const paymentTrend = $derived(() => {
		const paymentsByMonth = new SvelteMap<string, number>();

		payments.forEach((p) => {
			const date = new Date(p.createdAt);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			const current = paymentsByMonth.get(monthKey) || 0;
			paymentsByMonth.set(monthKey, current + 1);
		});

		return Array.from(paymentsByMonth.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.slice(-6)
			.map(([month, count]) => ({
				month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
				count
			}));
	});

	function handleExportCSV() {
		const csvData = payments.map(payment => ({
			'ID': payment.id,
			'Montant': formatCurrency(Number(payment.amount)),
			'Statut': payment.status,
			'Date création': new Date(payment.createdAt).toLocaleDateString('fr-FR'),
			'Date échéance': new Date(payment.dueDate).toLocaleDateString('fr-FR'),
			'Date paiement': payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('fr-FR') : '-'
		}));
		downloadCSV(csvData, 'statistiques-paiements');
	}
</script>

{#if loading}
	<div class="flex flex-col items-center justify-center h-screen space-y-4">
		<iconify-icon icon="svg-spinners:blocks-shuffle-3" width="40" class="text-foreground"></iconify-icon>
		<p class="text-sm text-muted-foreground">Chargement...</p>
	</div>
{:else}
	<div class="p-8 max-w-[1600px] mx-auto space-y-6">
		<header class="flex justify-between items-center">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground">Statistiques financières</h1>
				<p class="text-sm text-muted-foreground mt-1">
					Analyse détaillée des paiements et revenus
				</p>
			</div>
			{#if payments.length > 0}
				<Button onclick={handleExportCSV}>
					<iconify-icon icon="solar:file-download-bold" width="18"></iconify-icon>
					<span>Exporter CSV</span>
				</Button>
			{/if}
		</header>
		<div class="grid grid-cols-4 gap-4">
			<div class="rounded-xl border border-border p-4">
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-medium text-green-600 uppercase">
						Revenu total
					</div>
					<iconify-icon
						icon="solar:wallet-money-bold"
						class="text-green-600"
						width="20"
					></iconify-icon>
				</div>
				<div class="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
				<div class="text-xs text-muted-foreground mt-1">
					{payments.filter((p) => p.status === 'PAID').length} paiements
				</div>
			</div>

			<div class="rounded-xl border border-border p-4">
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-medium text-amber-600 uppercase">
						En attente
					</div>
					<iconify-icon
						icon="solar:clock-circle-bold"
						class="text-amber-600"
						width="20"
					></iconify-icon>
				</div>
				<div class="text-2xl font-bold text-amber-600">{formatCurrency(pendingRevenue)}</div>
				<div class="text-xs text-muted-foreground mt-1">
					{payments.filter((p) => p.status === 'PENDING').length} factures
				</div>
			</div>

			<div class="rounded-xl border border-border p-4">
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-medium text-muted-foreground uppercase">
						Ce mois
					</div>
					<iconify-icon
						icon="solar:calendar-mark-bold"
						class="text-muted-foreground"
						width="20"
					></iconify-icon>
				</div>
				<div class="text-2xl font-bold text-foreground">{formatCurrency(thisMonthRevenue())}</div>
				<div class="text-xs text-muted-foreground mt-1">Revenus du mois actuel</div>
			</div>

			<div class="rounded-xl border border-border p-4">
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-medium text-muted-foreground uppercase">
						Paiement moyen
					</div>
					<iconify-icon
						icon="solar:chart-bold"
						class="text-muted-foreground"
						width="20"
					></iconify-icon>
				</div>
				<div class="text-2xl font-bold text-foreground">{formatCurrency(averagePayment)}</div>
				<div class="text-xs text-muted-foreground mt-1">Montant moyen</div>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-6">
			<div class="rounded-xl border border-border p-6">
				<div class="mb-4">
					<h2 class="text-base font-semibold text-foreground">Revenus mensuels</h2>
					<p class="text-xs text-muted-foreground">6 derniers mois</p>
				</div>
				{#if monthlyRevenue().length > 0}
					<AreaChart
						data={monthlyRevenue()}
						x="month"
						y="revenue"
						color="currentColor"
						height={300}
						formatValue={formatCurrency}
					/>
				{:else}
					<div class="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
						Aucune donnée
					</div>
				{/if}
			</div>

			<div class="rounded-xl border border-border p-6">
				<div class="mb-4">
					<h2 class="text-base font-semibold text-foreground">Statut des paiements</h2>
					<p class="text-xs text-muted-foreground">Répartition par statut</p>
				</div>
				{#if paymentStatusDistribution().some((d) => d.value > 0)}
					<PieChart
						data={paymentStatusDistribution()}
						value="value"
						label="label"
						colors={['#16a34a', '#d97706', '#dc2626', '#6b7280']}
						height={300}
					/>
				{:else}
					<div class="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
						Aucune donnée
					</div>
				{/if}
			</div>

			<div class="rounded-xl border border-border p-6">
				<div class="mb-4">
					<h2 class="text-base font-semibold text-foreground">Tendance des paiements</h2>
					<p class="text-xs text-muted-foreground">Nombre de paiements créés</p>
				</div>
				{#if paymentTrend().length > 0}
					<LineChart
						data={paymentTrend()}
						x="month"
						y="count"
						color="currentColor"
						height={300}
					/>
				{:else}
					<div class="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
						Aucune donnée
					</div>
				{/if}
			</div>

			<div class="rounded-xl border border-border p-6">
				<div class="mb-4">
					<h2 class="text-base font-semibold text-foreground">Revenus par mois (barres)</h2>
					<p class="text-xs text-muted-foreground">Comparaison mensuelle</p>
				</div>
				{#if monthlyRevenue().length > 0}
					<BarChart
						data={monthlyRevenue()}
						x="month"
						y="revenue"
						color="currentColor"
						height={300}
						formatValue={formatCurrency}
					/>
				{:else}
					<div class="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
						Aucune donnée
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
