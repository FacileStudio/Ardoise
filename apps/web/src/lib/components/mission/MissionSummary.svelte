<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { resolve } from '$app/paths';
	import { runAction } from '$lib/mission-actions';
	import { ROLE_LABELS, formatEuro } from '$lib/mission';

	interface Props {
		mission: any;
		onChange: () => Promise<void> | void;
	}

	let { mission, onChange }: Props = $props();

	const stored = () => (mission.depositPercent == null ? null : Number(mission.depositPercent));

	let deposit: number | null = $state(stored());
	let saving = $state(false);

	const editable = $derived(mission.billing.canEditPrestations);
	const dirty = $derived(deposit !== stored());
	const invoices = $derived(mission.documents.filter((d: any) => d.invoiceNumber));

	// invoiced is the sum of the invoice totals, paid the sum of the payments already settled
	const invoicedTotal = $derived(invoices.reduce((sum: number, d: any) => sum + Number(d.total), 0));
	const paidTotal = $derived(
		mission.payments
			.filter((p: any) => p.status === 'PAID')
			.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
	);
	// what is left to collect never goes below zero
	const remainingTotal = $derived(Math.max(invoicedTotal - paidTotal, 0));

	async function saveDeposit() {
		saving = true;

		const ok = await runAction(
			() =>
				trpc.mission.update.mutate({
					id: mission.id,
					depositPercent: deposit || null,
				}),
			'Acompte enregistré',
			"Erreur lors de l'enregistrement de l'acompte"
		);

		saving = false;

		if (ok)
			await onChange();
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
	<div class="rounded-xl bg-muted/40 p-4">
		<div class="text-xs font-medium text-muted-foreground uppercase mb-2">Client</div>
		<a
			href={resolve(`/admin/clients/${mission.client.id}`)}
			class="font-medium text-foreground hover:underline"
		>
			{mission.client.companyName}
		</a>
		<div class="text-sm text-muted-foreground">
			{mission.client.contactFirstName}
			{mission.client.contactLastName}
		</div>
		{#if mission.client.contactEmail}
			<div class="text-sm text-muted-foreground">{mission.client.contactEmail}</div>
		{/if}
	</div>

	<div class="rounded-xl bg-muted/40 p-4">
		<div class="text-xs font-medium text-muted-foreground uppercase mb-2">Prestataires</div>
		{#each mission.providers as link (link.id)}
			<div class="text-sm">
				<span class="font-medium text-foreground">{link.provider.name}</span>
				<span class="text-muted-foreground"> · {ROLE_LABELS[link.role]}</span>
			</div>
		{:else}
			<div class="text-sm text-muted-foreground">Aucun prestataire</div>
		{/each}
	</div>

	<div class="rounded-xl bg-muted/40 p-4 space-y-1">
		<div class="text-xs font-medium text-muted-foreground uppercase mb-2">Facturation</div>
		<div class="text-sm flex justify-between">
			<span class="text-muted-foreground">Facturé</span>
			<span class="font-medium text-foreground">{formatEuro(invoicedTotal)}</span>
		</div>
		<div class="text-sm flex justify-between">
			<span class="text-muted-foreground">Encaissé</span>
			<span class="font-medium text-foreground">{formatEuro(paidTotal)}</span>
		</div>
		<div class="text-sm flex justify-between">
			<span class="text-muted-foreground">Reste à payer</span>
			<span class="font-medium text-foreground">{formatEuro(remainingTotal)}</span>
		</div>
		<div class="flex items-center justify-between gap-2 pt-2">
			<label for="deposit" class="text-sm text-muted-foreground">Acompte (%)</label>
			<div class="flex items-center gap-2">
				<input
					id="deposit"
					type="number"
					min="0"
					max="100"
					step="0.5"
					bind:value={deposit}
					disabled={!editable}
					placeholder="Aucun"
					class="h-8 w-20 rounded-md bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
				/>
				{#if dirty && editable}
					<button
						disabled={saving}
						onclick={saveDeposit}
						class="bg-primary text-primary-foreground rounded-md px-3 h-8 text-xs font-medium cursor-pointer hover:opacity-90 disabled:opacity-50"
					>
						OK
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
