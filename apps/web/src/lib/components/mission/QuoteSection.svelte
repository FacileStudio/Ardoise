<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { runAction } from '$lib/mission-actions';
	import { downloadDocument } from '$lib/download-document';
	import { formatEuro, formatDate } from '$lib/mission';
	import { Alert, Badge, Button, Section } from '@facile/muse';
	import { icons } from '$lib/icons';

	interface Props {
		mission: any;
		onChange: () => Promise<void> | void;
	}

	let { mission, onChange }: Props = $props();

	let busy = $state(false);

	const billing = $derived(mission.billing);
	const quotes = $derived(
		mission.documents.filter((d: any) => d.type === 'devis').sort((a: any, b: any) => b.version - a.version)
	);

	async function act(action: () => Promise<unknown>, success: string, failure: string) {
		busy = true;

		const ok = await runAction(action, success, failure);

		busy = false;

		if (ok)
			await onChange();
	}

	function generate() {
		return act(
			() => trpc.mission.generateQuote.mutate({ id: mission.id }),
			'Devis généré',
			'Erreur lors de la génération du devis'
		);
	}

	function accept() {
		return act(
			() => trpc.mission.acceptQuote.mutate({ id: mission.id, documentId: billing.currentQuoteId }),
			'Devis accepté',
			"Erreur lors de l'acceptation du devis"
		);
	}

	function stateOf(quote: any) {
		if (quote.id !== billing.currentQuoteId)
			return { label: 'Remplacé', variant: 'neutral' as const };

		if (billing.quoteOutdated)
			return { label: 'Périmé', variant: 'warning' as const };

		if (quote.acceptedAt)
			return { label: `Accepté le ${formatDate(quote.acceptedAt)}`, variant: 'success' as const };

		return { label: 'En attente', variant: 'info' as const };
	}
</script>

<Section title="Devis" card>
	{#snippet actions()}
		{#if billing.canAcceptQuote}
			<Button variant="ghost" size="sm" disabled={busy} onclick={accept}>
				Marquer le devis comme accepté
			</Button>
		{/if}
		<Button size="sm" disabled={busy || !billing.canGenerateQuote} onclick={generate}>
			{quotes.length === 0 ? 'Générer le devis' : 'Générer un nouveau devis'}
		</Button>
	{/snippet}

	{#if billing.quoteOutdated}
		<Alert tone="warning">
			Les prestations ont changé depuis le dernier devis. Générez un nouveau devis pour pouvoir facturer.
		</Alert>
	{/if}

	{#if quotes.length > 0}
		<ul class="flex flex-col gap-2">
			{#each quotes as quote (quote.id)}
				{@const state = stateOf(quote)}
				<li class="flex items-center justify-between gap-3 rounded-fc-md bg-fc-surface px-3 py-2">
					<div class="min-w-0">
						<div class="text-fc-sm font-medium text-fc-fg">
							Devis v{quote.version}
							<span class="font-normal text-fc-fg-muted"> · {quote.quoteNumber}</span>
						</div>
						<div class="text-fc-xs text-fc-fg-muted">
							{formatDate(quote.createdAt)} · {formatEuro(quote.total)} TTC
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Badge tone={state.variant}>{state.label}</Badge>
						<Button
							variant="ghost"
							size="sm"
							icon={icons.download}
							aria-label="Télécharger"
							onclick={() => downloadDocument(quote.id)}
						/>
					</div>
				</li>
			{/each}
		</ul>
	{:else if mission.prestations.length === 0}
		<p class="text-fc-sm text-fc-fg-muted">Ajoutez des prestations pour générer un devis.</p>
	{:else}
		<p class="text-fc-sm text-fc-fg-muted">Aucun devis pour l'instant.</p>
	{/if}
</Section>
