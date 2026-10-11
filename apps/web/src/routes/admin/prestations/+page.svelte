<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Badge, Pagination, Spinner } from '@repo/ui';
	import { logger } from '@repo/logger';
	import { spaceContext } from '$lib/space-context.svelte';
	import {
		STATUS_LABELS,
		STATUS_VARIANTS,
		formatDate,
		type PrestationStatus,
	} from '$lib/prestation';
	import 'iconify-icon';

	const limit = 20;

	let pageLoading = $state(true);
	let prestations: any[] = $state([]);
	let searchQuery = $state('');
	let statusFilter = $state<PrestationStatus | ''>('');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let total = $state(0);
	let isInitialMount = true;
	let searchDebounce: ReturnType<typeof setTimeout>;

	onMount(async () => {
		await fetchPrestations();
		pageLoading = false;
		isInitialMount = false;
	});

	async function fetchPrestations() {
		try {
			const response = await trpc.prestation.list.query({
				page: currentPage,
				limit,
				search: searchQuery || undefined,
				status: statusFilter || undefined,
				spaceId: spaceContext.spaceId,
			});

			prestations = response.prestations;
			total = response.total;
			totalPages = response.totalPages;
		} catch (err) {
			logger.error({ err }, 'Failed to fetch prestations');
		}
	}

	$effect(() => {
		currentPage;
		searchQuery;
		statusFilter;

		if (!isInitialMount)
			fetchPrestations();
	});

	function handleSearchInput(value: string) {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			searchQuery = value;
			currentPage = 1;
		}, 300);
	}

	function providerNames(prestation: any) {
		return prestation.providers.map((link: any) => link.provider.name).join(', ') || '-';
	}
</script>

{#if pageLoading}
	<div class="flex flex-col items-center justify-center h-screen space-y-4">
		<Spinner />
		<p class="text-sm text-muted-foreground">Chargement...</p>
	</div>
{:else}
	<div class="p-8 max-w-[1400px] mx-auto space-y-6">
		<header class="flex justify-between items-center">
			<div>
				<h1 class="text-2xl font-bold text-foreground">Prestations</h1>
				<p class="text-sm text-muted-foreground mt-1">
					Devis, contrats, factures et paiements d'une mission, au même endroit
				</p>
			</div>
			<button
				onclick={() => goto(resolve('/admin/prestations/create'))}
				class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90"
			>
				<iconify-icon icon="mdi:plus" width="18"></iconify-icon>
				Nouvelle prestation
			</button>
		</header>

		<div class="flex gap-3">
			<div class="relative flex-1">
				<iconify-icon
					icon="solar:magnifer-linear"
					width="18"
					class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
				></iconify-icon>
				<input
					type="text"
					placeholder="Rechercher une prestation ou un client"
					class="h-9 w-full rounded-lg bg-muted/40 pl-9 pr-3 text-sm outline-none focus:bg-muted"
					oninput={(e: any) => handleSearchInput(e.target.value)}
				/>
			</div>
			<select
				bind:value={statusFilter}
				onchange={() => (currentPage = 1)}
				class="h-9 rounded-lg bg-muted/40 px-3 text-sm outline-none focus:bg-muted"
			>
				<option value="">Tous les statuts</option>
				{#each Object.entries(STATUS_LABELS) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</div>

		{#if prestations.length > 0}
			<div class="rounded-xl bg-muted/40 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr>
								<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Prestation</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Client</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Prestataires</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Contenu</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Créée le</th>
							</tr>
						</thead>
						<tbody>
							{#each prestations as prestation (prestation.id)}
								<tr
									class="hover:bg-muted cursor-pointer"
									onclick={() => goto(resolve(`/admin/prestations/${prestation.id}`))}
								>
									<td class="px-4 py-3 font-medium text-foreground">{prestation.name}</td>
									<td class="px-4 py-3 text-sm text-foreground">{prestation.client.companyName}</td>
									<td class="px-4 py-3 text-sm text-muted-foreground">{providerNames(prestation)}</td>
									<td class="px-4 py-3">
										<Badge variant={STATUS_VARIANTS[prestation.status as PrestationStatus]}>
											{STATUS_LABELS[prestation.status as PrestationStatus]}
										</Badge>
									</td>
									<td class="px-4 py-3 text-sm text-muted-foreground">
										{prestation._count.documents} doc. · {prestation._count.payments} paiement{prestation._count.payments > 1 ? 's' : ''}
									</td>
									<td class="px-4 py-3 text-sm text-muted-foreground">{formatDate(prestation.createdAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			{#if totalPages > 1}
				<div class="flex justify-center">
					<Pagination {currentPage} {totalPages} onPageChange={(p: number) => (currentPage = p)} />
				</div>
			{/if}

			<div class="text-sm text-muted-foreground text-center">
				{prestations.length} sur {total} prestation{total > 1 ? 's' : ''}
			</div>
		{:else}
			<div class="text-center py-16">
				<div class="flex flex-col items-center gap-4">
					<div class="w-16 h-16 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
						<iconify-icon icon="solar:case-round-bold" width="32"></iconify-icon>
					</div>
					<h3 class="text-lg font-semibold text-foreground">Aucune prestation</h3>
					<p class="text-sm text-muted-foreground max-w-md">
						{searchQuery || statusFilter
							? 'Aucun résultat pour ces filtres.'
							: 'Créez une prestation pour y rassembler les devis, contrats, factures et paiements d\'une mission.'}
					</p>
				</div>
			</div>
		{/if}
	</div>
{/if}
