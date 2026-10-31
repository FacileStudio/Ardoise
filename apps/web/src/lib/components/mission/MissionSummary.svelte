<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { resolve } from '$app/paths';
	import { runAction } from '$lib/mission-actions';
	import { ROLE_LABELS, formatEuro } from '$lib/mission';
	import { Button, Card, Input } from '@facile/muse';

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
	const invoicedTotal = $derived(
		invoices.reduce((sum: number, d: any) => sum + Number(d.total), 0)
	);
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

		if (ok) await onChange();
	}
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
	<Card class="flex flex-col gap-1">
		<span class="text-fc-xs font-medium uppercase text-fc-fg-muted">Client</span>
		<a
			href={resolve(`/admin/clients/${mission.client.id}`)}
			class="w-fit font-medium text-fc-fg hover:underline"
		>
			{mission.client.companyName}
		</a>
		<span class="text-fc-sm text-fc-fg-muted">
			{mission.client.contactFirstName}
			{mission.client.contactLastName}
		</span>
		{#if mission.client.contactEmail}
			<span class="text-fc-sm text-fc-fg-muted">{mission.client.contactEmail}</span>
		{/if}
	</Card>

	<Card class="flex flex-col gap-1">
		<span class="text-fc-xs font-medium uppercase text-fc-fg-muted">Prestataires</span>
		{#each mission.providers as link (link.id)}
			<div class="text-fc-sm">
				<span class="font-medium text-fc-fg">{link.provider.name}</span>
				<span class="text-fc-fg-muted"> · {ROLE_LABELS[link.role]}</span>
			</div>
		{:else}
			<span class="text-fc-sm text-fc-fg-muted">Aucun prestataire</span>
		{/each}
	</Card>

	<Card class="flex flex-col gap-1">
		<span class="text-fc-xs font-medium uppercase text-fc-fg-muted">Facturation</span>
		<div class="flex justify-between text-fc-sm">
			<span class="text-fc-fg-muted">Facturé</span>
			<span class="font-medium text-fc-fg">{formatEuro(invoicedTotal)}</span>
		</div>
		<div class="flex justify-between text-fc-sm">
			<span class="text-fc-fg-muted">Encaissé</span>
			<span class="font-medium text-fc-fg">{formatEuro(paidTotal)}</span>
		</div>
		<div class="flex justify-between text-fc-sm">
			<span class="text-fc-fg-muted">Reste à payer</span>
			<span class="font-medium text-fc-fg">{formatEuro(remainingTotal)}</span>
		</div>
		<div class="flex items-center justify-between gap-2 pt-2">
			<label for="deposit" class="text-fc-sm text-fc-fg-muted">Acompte (%)</label>
			<div class="flex items-center gap-2">
				<Input
					id="deposit"
					type="number"
					min="0"
					max="100"
					step="0.5"
					value={deposit ?? ''}
					oninput={(e) =>
						(deposit = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
					disabled={!editable}
					placeholder="Aucun"
					class="h-8 w-24 px-2 text-fc-sm"
				/>
				{#if dirty && editable}
					<Button size="sm" disabled={saving} onclick={saveDeposit}>OK</Button>
				{/if}
			</div>
		</div>
	</Card>
</div>
