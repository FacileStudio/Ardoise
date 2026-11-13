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
	import { Badge, Button, Section, Select, Tooltip } from '@facile/muse';
	import { icons } from '$lib/icons';

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
		if (billing.locked || !open) return '';

		if (!billing.currentQuoteId)
			return 'Générez puis faites accepter un devis pour pouvoir facturer.';

		if (billing.quoteOutdated)
			return 'Les prestations ont changé : générez un nouveau devis avant de facturer.';

		if (billing.canAcceptQuote) return 'Faites accepter le devis pour pouvoir facturer.';

		return '';
	});

	async function act(action: () => Promise<unknown>, success: string, failure: string) {
		busy = true;

		const ok = await runAction(action, success, failure);

		busy = false;

		if (ok) await onChange();
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

<Section title="Factures et paiements" card>
	{#snippet actions()}
		<Select
			bind:value={collectionMethod}
			class="h-8 w-auto text-fc-xs"
			aria-label="Mode d'encaissement des prochains paiements"
		>
			<option value="STRIPE">Stripe (lien par email)</option>
			<option value="MANUAL">Manuel</option>
		</Select>
		{#if mission.depositPercent != null}
			<Button
				variant="ghost"
				size="sm"
				disabled={busy || !billing.canInvoiceDeposit}
				onclick={() => generateInvoice('DEPOSIT')}
			>
				Facture d'acompte ({Number(mission.depositPercent)} %)
			</Button>
		{/if}
		<Button
			size="sm"
			disabled={busy || !billing.canInvoiceTotal}
			onclick={() => generateInvoice('TOTAL')}
		>
			{hasDeposit ? 'Facture de solde' : 'Facture totale'}
		</Button>
	{/snippet}

	{#if hint}
		<p class="text-fc-sm text-fc-fg-muted">{hint}</p>
	{/if}

	{#if invoices.length > 0}
		<ul class="flex flex-col gap-2">
			{#each invoices as invoice (invoice.id)}
				<li class="flex flex-col gap-2 rounded-fc-md bg-fc-surface px-3 py-2">
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0">
							<div class="text-fc-sm font-medium text-fc-fg">
								{INVOICE_KIND_LABELS[invoice.invoiceKind ?? 'FULL']}
								<span class="font-normal text-fc-fg-muted"> · {invoice.invoiceNumber}</span>
							</div>
							<div class="text-fc-xs text-fc-fg-muted">
								{formatEuro(invoice.total)} TTC
								{#if invoice.dueDate}· échéance {formatDate(invoice.dueDate)}{/if}
							</div>
						</div>
						<Tooltip text="Télécharger" describe={false} class="contents">
							<Button
								variant="ghost"
								size="sm"
								icon={icons.download}
								aria-label="Télécharger"
								onclick={() => downloadDocument(invoice.id)}
							/>
						</Tooltip>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						{#each paymentsOf(invoice.id) as payment (payment.id)}
							<a
								href={resolve(`/admin/payments/${payment.id}`)}
								class="inline-flex items-center gap-1.5 text-fc-xs text-fc-fg hover:underline"
							>
								{formatEuro(payment.amount)}
								<Badge tone={PAYMENT_STATUS_VARIANTS[payment.status] ?? 'neutral'}>
									{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
								</Badge>
							</a>
						{/each}
						{#if open && !hasLivePayment(invoice.id)}
							<Button size="sm" disabled={busy} onclick={() => generatePayment(invoice.id)}>
								Générer le paiement
							</Button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else if !hint}
		<p class="text-fc-sm text-fc-fg-muted">Aucune facture pour l'instant.</p>
	{/if}

	{#if unlinkedPayments.length > 0}
		<div class="flex flex-col gap-2">
			<span class="text-fc-xs font-medium uppercase text-fc-fg-muted">Autres paiements</span>
			{#each unlinkedPayments as payment (payment.id)}
				<a
					href={resolve(`/admin/payments/${payment.id}`)}
					class="flex items-center justify-between rounded-fc-md bg-fc-surface px-3 py-2 text-fc-sm text-fc-fg hover:underline"
				>
					{formatEuro(payment.amount)}
					<Badge tone={PAYMENT_STATUS_VARIANTS[payment.status] ?? 'neutral'}>
						{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
					</Badge>
				</a>
			{/each}
		</div>
	{/if}
</Section>
