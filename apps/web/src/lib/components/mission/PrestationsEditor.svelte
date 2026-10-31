<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { runAction } from '$lib/mission-actions';
	import { formatEuro } from '$lib/mission';
	import { Button, Input, Section, Select } from '@facile/muse';
	import { icons } from '$lib/icons';

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
	const totalHt = $derived(
		rows.reduce((sum, r) => sum + (r.quantity ?? 0) * (r.unitPrice ?? 0), 0)
	);

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

		if (ok) await onChange();
	}
</script>

<Section title="Prestations" card>
	{#snippet actions()}
		{#if editable}
			<Button variant="ghost" size="sm" icon={icons.plus} onclick={addRow}>
				Ajouter une prestation
			</Button>
		{/if}
	{/snippet}

	{#if !editable && mission.billing.locked}
		<p class="text-fc-sm text-fc-fg-muted">
			Les prestations sont verrouillées : la mission est entièrement facturée.
		</p>
	{/if}

	{#if rows.length > 0}
		<ul class="flex flex-col gap-3">
			{#each rows as row, index (index)}
				<li class="grid items-center gap-2 sm:grid-cols-[1fr_5rem_6rem_7rem_9rem_2rem]">
					<Input
						type="text"
						bind:value={row.description}
						disabled={!editable}
						placeholder="Description"
						aria-label="Description"
						class="col-span-full h-9 sm:col-auto"
					/>
					<Input
						type="number"
						min="0"
						step="0.01"
						value={row.quantity ?? ''}
						oninput={(e) =>
							(row.quantity = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
						disabled={!editable}
						aria-label="Quantité"
						class="h-9"
					/>
					<Input
						type="text"
						bind:value={row.unit}
						disabled={!editable}
						aria-label="Unité"
						class="h-9"
					/>
					<Input
						type="number"
						min="0"
						step="0.01"
						value={row.unitPrice ?? ''}
						oninput={(e) =>
							(row.unitPrice = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
						disabled={!editable}
						aria-label="Prix unitaire HT"
						class="h-9"
					/>
					<Select
						bind:value={row.providerId}
						disabled={!editable || providers.length === 0}
						aria-label="Prestataire"
						class="h-9"
					>
						<option value="">Prestataire</option>
						{#each providers as provider (provider.id)}
							<option value={provider.id}>{provider.name}</option>
						{/each}
					</Select>
					{#if editable}
						<Button
							variant="ghost-danger"
							size="sm"
							icon={icons.remove}
							aria-label="Retirer la prestation"
							onclick={() => removeRow(index)}
						/>
					{/if}
				</li>
			{/each}
		</ul>

		<div class="flex items-center justify-between gap-3 pt-2">
			<div class="text-fc-sm text-fc-fg">
				Total HT <span class="font-semibold">{formatEuro(totalHt)}</span>
			</div>
			{#if editable}
				<Button onclick={save} disabled={!dirty || !valid || saving}>
					{saving ? 'Enregistrement...' : 'Enregistrer'}
				</Button>
			{/if}
		</div>
		{#if editable && dirty && !valid}
			<p class="text-fc-xs text-fc-danger">
				Chaque ligne a besoin d'une description, d'une quantité et d'un prix.
			</p>
		{/if}
	{:else}
		<p class="text-fc-sm text-fc-fg-muted">
			Ajoutez les prestations de la mission : le devis et la facture se génèrent à partir d'elles.
		</p>
	{/if}
</Section>
