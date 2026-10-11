<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { runAction } from '$lib/mission-actions';
	import { downloadDocument } from '$lib/download-document';
	import { formatEuro, formatDate } from '$lib/mission';
	import { Badge } from '@repo/ui';
	import 'iconify-icon';

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
			return { label: 'Remplacé', variant: 'slate' as const };

		if (billing.quoteOutdated)
			return { label: 'Périmé', variant: 'amber' as const };

		if (quote.acceptedAt)
			return { label: `Accepté le ${formatDate(quote.acceptedAt)}`, variant: 'emerald' as const };

		return { label: 'En attente', variant: 'indigo' as const };
	}
</script>

<section class="rounded-xl bg-muted/40 p-6 space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-base font-semibold text-foreground">Devis</h2>
		<div class="flex flex-wrap gap-2">
			{#if billing.canAcceptQuote}
				<button
					disabled={busy}
					onclick={accept}
					class="rounded-md bg-background px-3 h-8 text-xs font-medium text-foreground cursor-pointer hover:bg-muted disabled:opacity-50"
				>
					Marquer le devis comme accepté
				</button>
			{/if}
			<button
				disabled={busy || !billing.canGenerateQuote}
				onclick={generate}
				class="bg-primary text-primary-foreground rounded-md px-3 h-8 text-xs font-medium cursor-pointer hover:opacity-90 disabled:opacity-50"
			>
				{quotes.length === 0 ? 'Générer le devis' : 'Générer un nouveau devis'}
			</button>
		</div>
	</div>

	{#if billing.quoteOutdated}
		<p class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
			Les prestations ont changé depuis le dernier devis. Générez un nouveau devis pour pouvoir facturer.
		</p>
	{/if}

	{#if quotes.length > 0}
		<ul class="space-y-2">
			{#each quotes as quote (quote.id)}
				{@const state = stateOf(quote)}
				<li class="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2">
					<div class="min-w-0">
						<div class="text-sm font-medium text-foreground">
							Devis v{quote.version}
							<span class="text-muted-foreground font-normal"> · {quote.quoteNumber}</span>
						</div>
						<div class="text-xs text-muted-foreground">
							{formatDate(quote.createdAt)} · {formatEuro(quote.total)} TTC
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Badge variant={state.variant}>{state.label}</Badge>
						<button
							onclick={() => downloadDocument(quote.id)}
							class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
							title="Télécharger"
						>
							<iconify-icon icon="solar:download-bold" width="16"></iconify-icon>
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{:else if mission.prestations.length === 0}
		<p class="text-sm text-muted-foreground">Ajoutez des prestations pour générer un devis.</p>
	{:else}
		<p class="text-sm text-muted-foreground">Aucun devis pour l'instant.</p>
	{/if}
</section>
