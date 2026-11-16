<script lang="ts">
	import { Badge, Button, Section, Table, Tooltip } from '@facile/muse';
	import { icons } from '$lib/icons';
	import { formatEuro } from '$lib/mission';
	import { BILLING_LABELS, itemTotal, type CatalogItem } from '$lib/catalog';

	interface Props {
		title: string;
		items: CatalogItem[];
		onEdit: (item: CatalogItem) => void;
		onToggle: (item: CatalogItem) => void;
		onDelete: (item: CatalogItem) => void;
	}

	let { title, items, onEdit, onToggle, onDelete }: Props = $props();
</script>

<Section {title}>
	<Table>
		<thead>
			<tr>
				<th scope="col">Élément</th>
				<th scope="col">Quantité</th>
				<th scope="col">Prix unitaire HT</th>
				<th scope="col">Total HT</th>
				<th scope="col"><span class="sr-only">Actions</span></th>
			</tr>
		</thead>
		<tbody>
			{#each items as item (item.id)}
				<tr class={item.active ? '' : 'opacity-60'}>
					<td>
						<button
							type="button"
							class="text-left font-medium hover:underline focus-visible:outline-2 focus-visible:outline-fc-ring"
							onclick={() => onEdit(item)}
						>
							{item.name}
						</button>
						<div class="flex flex-wrap items-center gap-1 pt-0.5">
							{#if item.pack}
								<span class="text-fc-xs text-fc-fg-muted">{item.pack}</span>
							{/if}
							{#if item.billing === 'MONTHLY'}
								<Badge tone="info">{BILLING_LABELS.MONTHLY}</Badge>
							{/if}
							{#if !item.active}
								<Badge tone="warning">Archivé</Badge>
							{/if}
						</div>
						{#if item.description}
							<div class="max-w-prose text-fc-xs text-fc-fg-muted">{item.description}</div>
						{/if}
					</td>
					<td class="whitespace-nowrap">{Number(item.quantity).toLocaleString('fr-FR')} {item.unit}</td>
					<td class="whitespace-nowrap">{formatEuro(item.unitPrice)}</td>
					<td class="whitespace-nowrap font-medium">
						{formatEuro(itemTotal(item))}{item.billing === 'MONTHLY' ? ' / mois' : ''}
					</td>
					<td>
						<div class="flex justify-end gap-1">
							<Tooltip text="Modifier" describe={false}>
								<Button
									variant="ghost"
									size="sm"
									icon={icons.edit}
									aria-label="Modifier {item.name}"
									onclick={() => onEdit(item)}
								/>
							</Tooltip>
							<Tooltip text={item.active ? 'Archiver' : 'Réactiver'} describe={false}>
								<Button
									variant="ghost"
									size="sm"
									icon={item.active ? icons.eyeClosed : icons.eye}
									aria-label="{item.active ? 'Archiver' : 'Réactiver'} {item.name}"
									onclick={() => onToggle(item)}
								/>
							</Tooltip>
							<Tooltip text="Supprimer" describe={false}>
								<Button
									variant="ghost-danger"
									size="sm"
									icon={icons.remove}
									aria-label="Supprimer {item.name}"
									onclick={() => onDelete(item)}
								/>
							</Tooltip>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</Table>
</Section>
