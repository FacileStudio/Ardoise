<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { runAction } from '$lib/mission-actions';
	import { formatEuro } from '$lib/mission';
	import { Button } from '@repo/ui';
	import 'iconify-icon';

	interface Props {
		mission: any;
		onChange: () => Promise<void> | void;
	}

	interface Row {
		description: string;
		quantity: number | null;
		unit: string;
		unitPrice: number | null;
		providerId: string;
	}

	let { mission, onChange }: Props = $props();

	const fromMission = (): Row[] =>
		mission.prestations.map((p: any) => ({
			description: p.description,
			quantity: Number(p.quantity),
			unit: p.unit,
			unitPrice: Number(p.unitPrice),
			providerId: p.providerId ?? '',
		}));

	let rows: Row[] = $state(fromMission());
	let saving = $state(false);

	const editable = $derived(mission.billing.canEditPrestations);
	const providers = $derived(mission.providers.map((link: any) => link.provider));
	const dirty = $derived(JSON.stringify(rows) !== JSON.stringify(fromMission()));
	const valid = $derived(
		rows.every((r) => r.description.trim() && (r.quantity ?? 0) > 0 && (r.unitPrice ?? -1) >= 0)
	);
	// the total excluding tax is the sum of quantity times unit price over every line
	const totalHt = $derived(rows.reduce((sum, r) => sum + (r.quantity ?? 0) * (r.unitPrice ?? 0), 0));

	function addRow() {
		rows.push({ description: '', quantity: 1, unit: 'jour', unitPrice: 0, providerId: '' });
	}

	function removeRow(index: number) {
		rows.splice(index, 1);
	}

	async function save() {
		saving = true;

		const ok = await runAction(
			() =>
				trpc.mission.setPrestations.mutate({
					id: mission.id,
					prestations: rows.map((r) => ({
						description: r.description,
						quantity: r.quantity as number,
						unit: r.unit || 'jour',
						unitPrice: r.unitPrice as number,
						providerId: r.providerId || null,
					})),
				}),
			'Prestations enregistrées',
			"Erreur lors de l'enregistrement"
		);

		saving = false;

		if (ok)
			await onChange();
	}
</script>

<section class="rounded-xl bg-muted/40 p-6 space-y-4">
	<div class="flex items-center justify-between gap-3">
		<h2 class="text-base font-semibold text-foreground">Prestations</h2>
		{#if editable}
			<Button intent="secondary" size="sm" onclick={addRow}>
				<iconify-icon icon="mdi:plus" width="14"></iconify-icon>
				Ajouter une prestation
			</Button>
		{/if}
	</div>

	{#if !editable && mission.billing.locked}
		<p class="text-sm text-muted-foreground">
			Les prestations sont verrouillées : la mission est entièrement facturée.
		</p>
	{/if}

	{#if rows.length > 0}
		<ul class="space-y-2">
			{#each rows as row, index (index)}
				<li class="grid gap-2 sm:grid-cols-[1fr_5rem_6rem_7rem_9rem_2rem] items-center">
					<input
						type="text"
						bind:value={row.description}
						disabled={!editable}
						placeholder="Description"
						aria-label="Description"
						class="sm:col-auto col-span-full h-9 rounded-md bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
					/>
					<input
						type="number"
						min="0"
						step="0.01"
						bind:value={row.quantity}
						disabled={!editable}
						aria-label="Quantité"
						class="h-9 rounded-md bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
					/>
					<input
						type="text"
						bind:value={row.unit}
						disabled={!editable}
						aria-label="Unité"
						class="h-9 rounded-md bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
					/>
					<input
						type="number"
						min="0"
						step="0.01"
						bind:value={row.unitPrice}
						disabled={!editable}
						aria-label="Prix unitaire HT"
						class="h-9 rounded-md bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
					/>
					<select
						bind:value={row.providerId}
						disabled={!editable || providers.length === 0}
						aria-label="Prestataire"
						class="h-9 rounded-md bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
					>
						<option value="">Prestataire</option>
						{#each providers as provider (provider.id)}
							<option value={provider.id}>{provider.name}</option>
						{/each}
					</select>
					{#if editable}
						<button
							type="button"
							onclick={() => removeRow(index)}
							class="p-1 text-muted-foreground hover:text-red-600"
							title="Retirer"
						>
							<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
						</button>
					{/if}
				</li>
			{/each}
		</ul>

		<div class="flex items-center justify-between gap-3 pt-2">
			<div class="text-sm text-foreground">
				Total HT <span class="font-semibold">{formatEuro(totalHt)}</span>
			</div>
			{#if editable}
				<Button onclick={save} disabled={!dirty || !valid || saving}>
					{saving ? 'Enregistrement...' : 'Enregistrer'}
				</Button>
			{/if}
		</div>
		{#if editable && dirty && !valid}
			<p class="text-xs text-red-600">Chaque ligne a besoin d'une description, d'une quantité et d'un prix.</p>
		{/if}
	{:else}
		<p class="text-sm text-muted-foreground">
			Ajoutez les prestations de la mission : le devis et la facture se génèrent à partir d'elles.
		</p>
	{/if}
</section>
