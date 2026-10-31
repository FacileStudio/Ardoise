<script lang="ts">
	import {
		BarChart,
		Button,
		DonutChart,
		LineChart,
		Page,
		PageHeader,
		Section,
		Spinner,
		StatCard,
	} from '@facile/muse';
	import { icons } from '$lib/icons';
	import { downloadCSV } from '@repo/utils';
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { logger } from '@repo/logger';
	import { spaceContext } from '$lib/space-context.svelte';

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
			const result = await trpc.payment.list.query({
				page: 1,
				limit: 100,
				spaceId: spaceContext.spaceId,
			});
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
		payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0)
	);

	const pendingRevenue = $derived(
		payments.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + Number(p.amount), 0)
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
			{
				label: 'Payés',
				value: payments.filter((p) => p.status === 'PAID').length,
				color: 'var(--color-fc-success)',
			},
			{
				label: 'En attente',
				value: payments.filter((p) => p.status === 'PENDING').length,
				color: 'var(--color-fc-warning)',
			},
			{
				label: 'Expirés',
				value: payments.filter((p) => p.status === 'EXPIRED').length,
				color: 'var(--color-fc-danger)',
			},
			{
				label: 'Annulés',
				value: payments.filter((p) => p.status === 'CANCELLED').length,
				color: 'var(--color-fc-fg-muted)',
			},
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
				month: new Date(month + '-01').toLocaleDateString('fr-FR', {
					month: 'short',
					year: 'numeric',
				}),
				revenue,
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
				month: new Date(month + '-01').toLocaleDateString('fr-FR', {
					month: 'short',
					year: 'numeric',
				}),
				count,
			}));
	});

	function handleExportCSV() {
		const csvData = payments.map((payment) => ({
			ID: payment.id,
			Montant: formatCurrency(Number(payment.amount)),
			Statut: payment.status,
			'Date création': new Date(payment.createdAt).toLocaleDateString('fr-FR'),
			'Date échéance': new Date(payment.dueDate).toLocaleDateString('fr-FR'),
			'Date paiement': payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('fr-FR') : '-',
		}));
		downloadCSV(csvData, 'statistiques-paiements');
	}
</script>

<svelte:head><title>Statistiques - Ardoise</title></svelte:head>

{#if loading}
	<div class="flex min-h-[40dvh] items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else}
	<Page width="xl">
		<PageHeader
			title="Statistiques financières"
			description="Analyse détaillée des paiements et revenus"
		>
			{#snippet actions()}
				{#if payments.length > 0}
					<Button variant="ghost" icon={icons.download} onclick={handleExportCSV}
						>Exporter CSV</Button
					>
				{/if}
			{/snippet}
		</PageHeader>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard
				label="Revenu total"
				value={formatCurrency(totalRevenue)}
				delta="{payments.filter((p) => p.status === 'PAID').length} paiements"
			/>
			<StatCard
				label="En attente"
				value={formatCurrency(pendingRevenue)}
				delta="{payments.filter((p) => p.status === 'PENDING').length} factures"
			/>
			<StatCard
				label="Ce mois"
				value={formatCurrency(thisMonthRevenue())}
				delta="Revenus du mois actuel"
			/>
			<StatCard
				label="Paiement moyen"
				value={formatCurrency(averagePayment)}
				delta="Montant moyen"
			/>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<Section title="Revenus mensuels" description="6 derniers mois" card>
				{#if monthlyRevenue().length > 0}
					<LineChart
						area
						labels={monthlyRevenue().map((d) => d.month)}
						series={[{ name: 'Revenu', data: monthlyRevenue().map((d) => d.revenue) }]}
						height={300}
						yFormat={formatCurrency}
					/>
				{:else}
					<div class="flex h-[300px] items-center justify-center text-fc-sm text-fc-fg-muted">
						Aucune donnée
					</div>
				{/if}
			</Section>

			<Section title="Statut des paiements" description="Répartition par statut" card>
				{#if paymentStatusDistribution().some((d) => d.value > 0)}
					<DonutChart data={paymentStatusDistribution()} size={240} />
				{:else}
					<div class="flex h-[300px] items-center justify-center text-fc-sm text-fc-fg-muted">
						Aucune donnée
					</div>
				{/if}
			</Section>

			<Section title="Tendance des paiements" description="Nombre de paiements créés" card>
				{#if paymentTrend().length > 0}
					<LineChart
						labels={paymentTrend().map((d) => d.month)}
						series={[{ name: 'Paiements', data: paymentTrend().map((d) => d.count) }]}
						height={300}
					/>
				{:else}
					<div class="flex h-[300px] items-center justify-center text-fc-sm text-fc-fg-muted">
						Aucune donnée
					</div>
				{/if}
			</Section>

			<Section title="Revenus par mois (barres)" description="Comparaison mensuelle" card>
				{#if monthlyRevenue().length > 0}
					<BarChart
						labels={monthlyRevenue().map((d) => d.month)}
						series={[{ name: 'Revenu', data: monthlyRevenue().map((d) => d.revenue) }]}
						height={300}
						yFormat={formatCurrency}
					/>
				{:else}
					<div class="flex h-[300px] items-center justify-center text-fc-sm text-fc-fg-muted">
						Aucune donnée
					</div>
				{/if}
			</Section>
		</div>
	</Page>
{/if}
