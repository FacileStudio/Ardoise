<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		Badge,
		Button,
		Card,
		EmptyState,
		Page,
		PageHeader,
		Spinner,
		Table,
		Tabs,
	} from '@facile/muse';
	import { icons, ardoise } from '$lib/icons';
	import { Pagination, SearchInput } from '$lib/ui';
	import { logger } from '@repo/logger';
	import { spaceContext } from '$lib/space-context.svelte';
	import {
		STATUS_LABELS,
		STATUS_VARIANTS,
		formatDate,
		type MissionStatus,
	} from '$lib/mission';

	const limit = 20;

	let pageLoading = $state(true);
	let missions: any[] = $state([]);
	let searchQuery = $state('');
	let searchInput = $state('');
	let statusTab = $state('ALL');

	const statusTabs = [
		{ id: 'ALL', label: 'Toutes' },
		...Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label })),
	];
	let statusFilter = $state<MissionStatus | ''>('');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let total = $state(0);
	let isInitialMount = true;
	let searchDebounce: ReturnType<typeof setTimeout>;

	onMount(async () => {
		await fetchMissions();
		pageLoading = false;
		isInitialMount = false;
	});

	async function fetchMissions() {
		try {
			const response = await trpc.mission.list.query({
				page: currentPage,
				limit,
				search: searchQuery || undefined,
				status: statusFilter || undefined,
				spaceId: spaceContext.spaceId,
			});

			missions = response.missions;
			total = response.total;
			totalPages = response.totalPages;
		} catch (err) {
			logger.error({ err }, 'Failed to fetch missions');
		}
	}

	$effect(() => {
		currentPage;
		searchQuery;
		statusFilter;

		if (!isInitialMount)
			fetchMissions();
	});

	function handleStatusChange(id: string) {
		statusFilter = id === 'ALL' ? '' : (id as MissionStatus);
		currentPage = 1;
	}

	function handleSearchInput(value: string) {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			searchQuery = value;
			currentPage = 1;
		}, 300);
	}

	function providerNames(mission: any) {
		return mission.providers.map((link: any) => link.provider.name).join(', ') || '-';
	}
</script>

<svelte:head><title>Missions - Ardoise</title></svelte:head>

{#if pageLoading}
	<div class="flex min-h-[40dvh] items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else}
	<Page width="xl">
		<PageHeader
			title="Missions"
			description="Devis, contrats, factures et paiements d'une mission, au même endroit"
		>
			{#snippet actions()}
				<Button href={resolve('/admin/missions/create')} icon={icons.plus}>Nouvelle mission</Button>
			{/snippet}
		</PageHeader>

		<SearchInput
			placeholder="Rechercher une mission ou un client"
			bind:value={searchInput}
			oninput={() => handleSearchInput(searchInput)}
		/>

		<Tabs
			label="Filtrer par statut"
			items={statusTabs}
			bind:value={statusTab}
			onChange={handleStatusChange}
		/>

		{#if missions.length > 0}
			<div class="hidden md:block">
				<Table>
					<thead>
						<tr>
							<th scope="col">Mission</th>
							<th scope="col">Client</th>
							<th scope="col">Prestataires</th>
							<th scope="col">Statut</th>
							<th scope="col">Contenu</th>
							<th scope="col">Créée le</th>
						</tr>
					</thead>
					<tbody>
						{#each missions as mission (mission.id)}
							<tr>
								<td>
									<a
										href={resolve(`/admin/missions/${mission.id}`)}
										class="rounded-fc-xs font-medium text-fc-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
									>
										{mission.name}
									</a>
								</td>
								<td class="text-fc-fg">{mission.client.companyName}</td>
								<td class="text-fc-fg-muted">{providerNames(mission)}</td>
								<td>
									<Badge tone={STATUS_VARIANTS[mission.status as MissionStatus]}>
										{STATUS_LABELS[mission.status as MissionStatus]}
									</Badge>
								</td>
								<td class="text-fc-fg-muted">
									{mission._count.documents} doc. · {mission._count.payments} paiement{mission._count.payments > 1 ? 's' : ''}
								</td>
								<td class="text-fc-fg-muted">{formatDate(mission.createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</Table>
			</div>

			<div class="flex flex-col gap-2 md:hidden">
				{#each missions as mission (mission.id)}
					<Card href={resolve(`/admin/missions/${mission.id}`)} class="flex flex-col gap-2">
						<div class="flex items-start justify-between gap-2">
							<span class="min-w-0 truncate text-fc-sm font-medium text-fc-fg">{mission.name}</span>
							<Badge tone={STATUS_VARIANTS[mission.status as MissionStatus]}>
								{STATUS_LABELS[mission.status as MissionStatus]}
							</Badge>
						</div>
						<span class="text-fc-xs text-fc-fg-muted">
							{mission.client.companyName} · {formatDate(mission.createdAt)}
						</span>
					</Card>
				{/each}
			</div>

			{#if totalPages > 1}
				<Pagination {currentPage} {totalPages} onPageChange={(p: number) => (currentPage = p)} />
			{/if}

			<p class="text-center text-fc-sm text-fc-fg-muted">
				{missions.length} sur {total} mission{total > 1 ? 's' : ''}
			</p>
		{:else}
			<EmptyState
				icon={ardoise.mission}
				title="Aucune mission"
				description={searchQuery || statusFilter
					? 'Aucun résultat pour ces filtres.'
					: "Créez une mission pour y rassembler les devis, contrats, factures et paiements d'une mission."}
			>
				{#if !searchQuery && !statusFilter}
					<Button href={resolve('/admin/missions/create')} icon={icons.plus}>Nouvelle mission</Button>
				{/if}
			</EmptyState>
		{/if}
	</Page>
{/if}
