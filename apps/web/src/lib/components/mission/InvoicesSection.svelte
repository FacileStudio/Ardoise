<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { resolve } from '$app/paths';
	import { runAction } from '$lib/mission-actions';
	import { downloadDocument } from '$lib/download-document';
	import {
		INVOICE_KIND_LABELS,
		LIVE_PAYMENT_STATUSES,
		PAYMENT_STATUS_LABELS,
		PAYMENT_STATUS_VARIANTS,
		formatEuro,
		formatDate,
	} from '$lib/mission';
	import { Badge } from '@repo/ui';
	import 'iconify-icon';

	interface Props {
		mission: any;
		onChange: () => Promise<void> | void;
	}

	let { mission, onChange }: Props = $props();

	let busy = $state(false);
	let collectionMethod = $state<'STRIPE' | 'MANUAL'>('STRIPE');

	const billing = $derived(mission.billing);
	const open = $derived(mission.status !== 'CANCELLED');
	const invoices = $derived(mission.documents.filter((d: any) => d.invoiceNumber));
	const hasDeposit = $derived(invoices.some((d: any) => d.invoiceKind === 'DEPOSIT'));
	const unlinkedPayments = $derived(mission.payments.filter((p: any) => !p.documentId));

	const hint = $derived.by(() => {
		if (billing.locked || !open)
			return '';

		if (!billing.currentQuoteId)
			return 'Générez puis faites accepter un devis pour pouvoir facturer.';

		if (billing.quoteOutdated)
			return 'Les prestations ont changé : générez un nouveau devis avant de facturer.';

		if (billing.canAcceptQuote)
			return 'Faites accepter le devis pour pouvoir facturer.';

		return '';
	});

	async function act(action: () => Promise<unknown>, success: string, failure: string) {
		busy = true;

		const ok = await runAction(action, success, failure);

		busy = false;

		if (ok)
			await onChange();
	}

	function generateInvoice(kind: 'TOTAL' | 'DEPOSIT') {
		return act(
			() => trpc.mission.generateInvoice.mutate({ id: mission.id, kind }),
			'Facture générée',
			'Erreur lors de la génération de la facture'
		);
	}

	function generatePayment(documentId: string) {
		return act(
			() => trpc.mission.createPayment.mutate({ id: mission.id, documentId, collectionMethod }),
			'Paiement généré',
			'Erreur lors de la génération du paiement'
		);
	}

	const paymentsOf = (documentId: string) =>
		mission.payments.filter((p: any) => p.documentId === documentId);

	const hasLivePayment = (documentId: string) =>
		paymentsOf(documentId).some((p: any) => LIVE_PAYMENT_STATUSES.includes(p.status));
</script>

<section class="rounded-xl bg-muted/40 p-6 space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-base font-semibold text-foreground">Factures et paiements</h2>
		<div class="flex flex-wrap items-center gap-2">
			<select
				bind:value={collectionMethod}
				class="h-8 rounded-md bg-background px-2 text-xs outline-none"
				title="Mode d'encaissement des prochains paiements"
			>
				<option value="STRIPE">Stripe (lien par email)</option>
				<option value="MANUAL">Manuel</option>
			</select>
			{#if mission.depositPercent != null}
				<button
					disabled={busy || !billing.canInvoiceDeposit}
					onclick={() => generateInvoice('DEPOSIT')}
					class="rounded-md bg-background px-3 h-8 text-xs font-medium text-foreground cursor-pointer hover:bg-muted disabled:opacity-50"
				>
					Facture d'acompte ({Number(mission.depositPercent)} %)
				</button>
			{/if}
			<button
				disabled={busy || !billing.canInvoiceTotal}
				onclick={() => generateInvoice('TOTAL')}
				class="bg-primary text-primary-foreground rounded-md px-3 h-8 text-xs font-medium cursor-pointer hover:opacity-90 disabled:opacity-50"
			>
				{hasDeposit ? 'Facture de solde' : 'Facture totale'}
			</button>
		</div>
	</div>

	{#if hint}
		<p class="text-sm text-muted-foreground">{hint}</p>
	{/if}

	{#if invoices.length > 0}
		<ul class="space-y-2">
			{#each invoices as invoice (invoice.id)}
				<li class="rounded-md bg-background px-3 py-2 space-y-2">
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0">
							<div class="text-sm font-medium text-foreground">
								{INVOICE_KIND_LABELS[invoice.invoiceKind ?? 'FULL']}
								<span class="text-muted-foreground font-normal"> · {invoice.invoiceNumber}</span>
							</div>
							<div class="text-xs text-muted-foreground">
								{formatEuro(invoice.total)} TTC
								{#if invoice.dueDate}· échéance {formatDate(invoice.dueDate)}{/if}
							</div>
						</div>
						<button
							onclick={() => downloadDocument(invoice.id)}
							class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
							title="Télécharger"
						>
							<iconify-icon icon="solar:download-bold" width="16"></iconify-icon>
						</button>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						{#each paymentsOf(invoice.id) as payment (payment.id)}
							<a href={resolve(`/admin/payments/${payment.id}`)} class="inline-flex items-center gap-1.5 text-xs text-foreground hover:underline">
								{formatEuro(payment.amount)}
								<Badge variant={PAYMENT_STATUS_VARIANTS[payment.status] ?? 'slate'}>
									{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
								</Badge>
							</a>
						{/each}
						{#if open && !hasLivePayment(invoice.id)}
							<button
								disabled={busy}
								onclick={() => generatePayment(invoice.id)}
								class="bg-primary text-primary-foreground rounded-md px-3 h-7 text-xs font-medium cursor-pointer hover:opacity-90 disabled:opacity-50"
							>
								Générer le paiement
							</button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else if !hint}
		<p class="text-sm text-muted-foreground">Aucune facture pour l'instant.</p>
	{/if}

	{#if unlinkedPayments.length > 0}
		<div class="space-y-2">
			<div class="text-xs font-medium text-muted-foreground uppercase">Autres paiements</div>
			{#each unlinkedPayments as payment (payment.id)}
				<a
					href={resolve(`/admin/payments/${payment.id}`)}
					class="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm text-foreground hover:underline"
				>
					{formatEuro(payment.amount)}
					<Badge variant={PAYMENT_STATUS_VARIANTS[payment.status] ?? 'slate'}>
						{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
					</Badge>
				</a>
			{/each}
		</div>
	{/if}
</section>
