<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Badge,
		Button,
		Card,
		ConfirmModal,
		EmptyState,
		Page,
		PageHeader,
		Spinner,
		StatCard,
		Table,
	} from '@facile/muse';
	import { icons, ardoise } from '$lib/icons';
	import { Pagination, SearchInput } from '$lib/ui';
	import { downloadCSV } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import { spaceContext } from '$lib/space-context.svelte';
	import TransferClientModal from '$lib/components/TransferClientModal.svelte';

	let pageLoading = $state(true);
	let loading = $state(false);
	let clients: any[] = $state([]);
	let searchQuery = $state('');
	let searchInput = $state('');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let total = $state(0);
	let limit = $state(20);

	let confirmDeleteClient: any = $state(null);
	let transferClient: any = $state(null);
	let showTransfer = $state(false);
	let showDeleteDialog = $state(false);
	let deleteError = $state('');

	let isInitialMount = true;

	onMount(async () => {
		await fetchClients(true);
		isInitialMount = false;
	});

	async function fetchClients(isInitialLoad = false) {
		if (isInitialLoad) {
			pageLoading = true;
		} else {
			loading = true;
		}
		try {
			const response = await trpc.client.list.query({
				page: currentPage,
				limit,
				search: searchQuery || undefined,
				spaceId: spaceContext.spaceId,
			});
			clients = response.clients;
			total = response.total;
			totalPages = response.totalPages;
		} catch (err) {
			logger.error({ err }, 'Failed to fetch clients');
		} finally {
			if (isInitialLoad) {
				pageLoading = false;
			} else {
				loading = false;
			}
		}
	}

	$effect(() => {
		if (!isInitialMount) {
			currentPage;
			searchQuery;
			fetchClients();
		}
	});

	async function handleDeleteClient() {
		if (!confirmDeleteClient) return;

		try {
			await trpc.client.delete.mutate({ id: confirmDeleteClient.id });
			await fetchClients();
			confirmDeleteClient = null;
			showDeleteDialog = false;
		} catch (err: any) {
			logger.error({ err }, 'Failed to delete client');
			if (err?.message?.includes('existing payments')) {
				deleteError =
					"Impossible de supprimer un client avec des paiements existants. Veuillez d'abord supprimer les paiements.";
			} else {
				deleteError = 'Echec de la suppression du client: ' + (err?.message || 'Erreur inconnue');
			}
			confirmDeleteClient = null;
			showDeleteDialog = false;
			setTimeout(() => {
				deleteError = '';
			}, 6000);
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		return new Date(date).toLocaleDateString();
	}

	function getStatusColor(status: string | null) {
		switch (status) {
			case 'ACTIVE':
				return 'success';
			case 'BANNED':
				return 'danger';
			case 'SUSPENDED':
				return 'warning';
			case 'PENDING':
				return 'neutral';
			default:
				return 'neutral';
		}
	}

	function getStatusLabel(status: string | null) {
		switch (status) {
			case 'ACTIVE':
				return $i18n.t('common.status.active');
			case 'BANNED':
				return $i18n.t('common.status.banned');
			case 'SUSPENDED':
				return $i18n.t('common.status.suspended');
			case 'PENDING':
				return $i18n.t('common.status.pending');
			default:
				return $i18n.t('common.status.active');
		}
	}

	function askDelete(client: any) {
		confirmDeleteClient = client;
		showDeleteDialog = true;
	}

	function openTransfer(client: any) {
		transferClient = client;
		showTransfer = true;
	}

	function handlePageChange(page: number) {
		currentPage = page;
	}

	let searchDebounce: any;
	function handleSearchInput(value: string) {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			searchQuery = value;
			currentPage = 1;
		}, 300);
	}

	function handleExportCSV() {
		const csvData = clients.map((client) => ({
			Nom: `${client.contactFirstName} ${client.contactLastName}`,
			'Email contact': client.contactEmail || '',
			'Email connexion': client.user?.email || '',
			Entreprise: client.companyName || '',
			SIRET: client.siret || '',
			Adresse: client.billingAddress || '',
			Ville: client.billingCity || '',
			Pays: client.billingCountry || '',
			'Statut accès': client.user?.status || 'AUCUN ACCÈS',
			'Date création': new Date(client.createdAt).toLocaleDateString('fr-FR'),
		}));
		downloadCSV(csvData, 'clients');
	}
</script>

<svelte:head><title>Clients - Ardoise</title></svelte:head>

{#if pageLoading}
	<div class="flex min-h-[40dvh] items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else}
	<Page width="xl">
		{#if deleteError}
			<Alert tone="danger">{deleteError}</Alert>
		{/if}

		<PageHeader
			title={$i18n.t('admin.clients.title')}
			description={$i18n.t('admin.clients.subtitle')}
		>
			{#snippet actions()}
				{#if clients.length > 0}
					<Button variant="ghost" icon={icons.download} onclick={handleExportCSV}
						>Exporter CSV</Button
					>
				{/if}
				<Button href={resolve('/admin/clients/create')} icon={icons.plus}>
					{$i18n.t('admin.clients.newClient')}
				</Button>
			{/snippet}
		</PageHeader>

		<div class="grid gap-4 sm:grid-cols-3">
			<StatCard label={$i18n.t('admin.clients.totalClients')} value={total} />
			<StatCard
				label={$i18n.t('admin.clients.activeClients')}
				value={clients.filter((c) => c.user?.status === 'ACTIVE').length}
			/>
			<StatCard label={$i18n.t('admin.clients.thisPage')} value={clients.length} />
		</div>

		<SearchInput
			placeholder={$i18n.t('admin.clients.searchPlaceholder')}
			bind:value={searchInput}
			oninput={() => handleSearchInput(searchInput)}
		/>

		{#if clients.length > 0}
			<div class="hidden md:block">
				<Table>
					<thead>
						<tr>
							<th scope="col">{$i18n.t('admin.clients.table.company')}</th>
							<th scope="col">{$i18n.t('admin.clients.table.contact')}</th>
							<th scope="col">{$i18n.t('admin.clients.table.location')}</th>
							<th scope="col">{$i18n.t('admin.clients.table.siret')}</th>
							<th scope="col">{$i18n.t('admin.clients.table.status')}</th>
							<th scope="col">{$i18n.t('admin.clients.table.joined')}</th>
							<th scope="col" aria-label={$i18n.t('admin.clients.table.actions')}></th>
						</tr>
					</thead>
					<tbody>
						{#each clients as client (client.id)}
							<tr>
								<td>
									<a
										href={resolve(`/admin/clients/${client.id}`)}
										class="flex min-w-0 flex-col rounded-fc-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
									>
										<span class="truncate font-medium text-fc-fg">{client.companyName}</span>
										<span class="text-fc-xs text-fc-fg-muted">
											{#if client.payments?.length > 0}
												{client.payments.length}
												{client.payments.length !== 1
													? $i18n.t('admin.clients.payments')
													: $i18n.t('admin.clients.payment')}
											{:else}
												{$i18n.t('admin.clients.noPaymentsYet')}
											{/if}
										</span>
									</a>
								</td>
								<td>
									<div class="flex flex-col">
										<span class="font-medium text-fc-fg">
											{client.contactFirstName}
											{client.contactLastName}
										</span>
										<span class="text-fc-sm text-fc-fg-muted">
											{client.contactEmail || 'Aucun email de contact'}
										</span>
										{#if client.user?.email}
											<span class="text-fc-xs text-fc-fg-muted"
												>Accès client : {client.user.email}</span
											>
										{/if}
									</div>
								</td>
								<td>
									<div class="flex flex-col">
										<span class="text-fc-fg">{client.billingCity}</span>
										<span class="text-fc-xs text-fc-fg-muted">{client.billingCountry}</span>
									</div>
								</td>
								<td class="font-mono text-fc-sm text-fc-fg">{client.siret || '-'}</td>
								<td>
									{#if client.user}
										<Badge tone={getStatusColor(client.user.status)}>
											{getStatusLabel(client.user.status)}
										</Badge>
									{:else}
										<Badge tone="neutral">Aucun accès</Badge>
									{/if}
								</td>
								<td class="text-fc-fg-muted">{formatDate(client.createdAt)}</td>
								<td>
									<div class="flex items-center justify-end gap-1">
										<Button
											variant="ghost"
											size="sm"
											icon={icons.edit}
											aria-label={$i18n.t('admin.clients.editClient')}
											href={resolve(`/admin/clients/${client.id}`)}
										/>
										<Button
											variant="ghost"
											size="sm"
											icon={ardoise.transfer}
											aria-label="Copier / déplacer"
											onclick={() => openTransfer(client)}
										/>
										<Button
											variant="ghost-danger"
											size="sm"
											icon={icons.remove}
											aria-label={$i18n.t('admin.clients.deleteClient')}
											onclick={() => askDelete(client)}
										/>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</Table>
			</div>

			<div class="flex flex-col gap-2 md:hidden">
				{#each clients as client (client.id)}
					<Card class="flex flex-col gap-3">
						<a
							href={resolve(`/admin/clients/${client.id}`)}
							class="flex min-w-0 flex-col rounded-fc-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
						>
							<span class="truncate text-fc-sm font-medium text-fc-fg">{client.companyName}</span>
							<span class="truncate text-fc-xs text-fc-fg-muted">
								{client.contactFirstName}
								{client.contactLastName}
								{#if client.billingCity}- {client.billingCity}{/if}
							</span>
						</a>
						<div class="flex items-center justify-between gap-2">
							{#if client.user}
								<Badge tone={getStatusColor(client.user.status)}>
									{getStatusLabel(client.user.status)}
								</Badge>
							{:else}
								<Badge tone="neutral">Aucun accès</Badge>
							{/if}
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="lg"
									icon={ardoise.transfer}
									aria-label="Copier / déplacer"
									onclick={() => openTransfer(client)}
								/>
								<Button
									variant="ghost-danger"
									size="lg"
									icon={icons.remove}
									aria-label={$i18n.t('admin.clients.deleteClient')}
									onclick={() => askDelete(client)}
								/>
							</div>
						</div>
					</Card>
				{/each}
			</div>

			{#if totalPages > 1}
				<Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
			{/if}

			<p class="text-center text-fc-sm text-fc-fg-muted">
				{total !== 1
					? $i18n.t('admin.clients.showingPlural', { count: clients.length, total })
					: $i18n.t('admin.clients.showing', { count: clients.length, total })}
			</p>
		{:else}
			<EmptyState
				icon={ardoise.client}
				title={$i18n.t('admin.clients.noClientsFound')}
				description={searchQuery
					? $i18n.t('admin.clients.tryAdjustingSearch')
					: $i18n.t('admin.clients.getStarted')}
			>
				{#if !searchQuery}
					<Button href={resolve('/admin/clients/create')} icon={icons.plus}>
						{$i18n.t('admin.clients.newClient')}
					</Button>
				{/if}
			</EmptyState>
		{/if}
	</Page>
{/if}

<ConfirmModal
	bind:open={showDeleteDialog}
	title={$i18n.t('admin.clients.deleteConfirm.title')}
	description={$i18n.t('admin.clients.deleteConfirm.description', {
		companyName: confirmDeleteClient?.companyName || '',
	})}
	confirmLabel={$i18n.t('admin.clients.deleteClient')}
	cancelLabel={$i18n.t('common.buttons.cancel')}
	tone="danger"
	onConfirm={handleDeleteClient}
	onCancel={() => {
		confirmDeleteClient = null;
		showDeleteDialog = false;
	}}
/>

{#if transferClient}
	{#key transferClient.id}
		<TransferClientModal
			bind:open={showTransfer}
			clientId={transferClient.id}
			currentSpaceId={transferClient.spaceId ?? null}
			onDone={() => fetchClients()}
		/>
	{/key}
{/if}
