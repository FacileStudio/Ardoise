<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Badge,
		ConfirmDialog,
		Pagination,
		Button
	} from '@repo/ui';
	import { downloadCSV } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let pageLoading = $state(true);
	let loading = $state(false);
	let clients: any[] = $state([]);
	let searchQuery = $state('');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let total = $state(0);
	let limit = $state(20);

	let confirmDeleteClient: any = $state(null);
	let showDeleteDialog = $state(false);

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
				search: searchQuery || undefined
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
				alert('Impossible de supprimer un client avec des paiements existants. Veuillez d\'abord supprimer les paiements.');
			} else {
				alert('Échec de la suppression du client: ' + (err?.message || 'Erreur inconnue'));
			}
			confirmDeleteClient = null;
			showDeleteDialog = false;
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		return new Date(date).toLocaleDateString();
	}

	function getStatusColor(status: string | null) {
		switch (status) {
			case 'ACTIVE': return 'emerald';
			case 'BANNED': return 'rose';
			case 'SUSPENDED': return 'amber';
			case 'PENDING': return 'slate';
			default: return 'slate';
		}
	}

	function getStatusLabel(status: string | null) {
		switch (status) {
			case 'ACTIVE': return $i18n.t('common.status.active');
			case 'BANNED': return $i18n.t('common.status.banned');
			case 'SUSPENDED': return $i18n.t('common.status.suspended');
			case 'PENDING': return $i18n.t('common.status.pending');
			default: return $i18n.t('common.status.active');
		}
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
		const csvData = clients.map(client => ({
			'Nom': `${client.contactFirstName} ${client.contactLastName}`,
			'Email contact': client.contactEmail || '',
			'Email connexion': client.user?.email || '',
			'Entreprise': client.companyName || '',
			'SIRET': client.siret || '',
			'Adresse': client.billingAddress || '',
			'Ville': client.billingCity || '',
			'Pays': client.billingCountry || '',
			'Statut accès': client.user?.status || 'AUCUN ACCÈS',
			'Date création': new Date(client.createdAt).toLocaleDateString('fr-FR')
		}));
		downloadCSV(csvData, 'clients');
	}
</script>

{#if pageLoading}
	<div class="flex flex-col items-center justify-center h-screen space-y-4">
		<iconify-icon icon="svg-spinners:blocks-shuffle-3" width="40" class="text-foreground"></iconify-icon>
		<p class="text-sm text-muted-foreground">Chargement...</p>
	</div>
{:else}
	<div class="p-8 max-w-[1400px] mx-auto space-y-6">
		<header class="flex justify-between items-center">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground">{$i18n.t('backoffice.clients.title')}</h1>
				<p class="text-sm text-muted-foreground mt-1">{$i18n.t('backoffice.clients.subtitle')}</p>
			</div>
			<div class="flex gap-3">
				{#if clients.length > 0}
					<Button onclick={handleExportCSV}>
						<iconify-icon icon="solar:file-download-bold" width="18"></iconify-icon>
						<span>Exporter CSV</span>
					</Button>
				{/if}
				<button
					onclick={() => goto('/admin/clients/create')}
					class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
				>
					<iconify-icon icon="mdi:plus" width="18"></iconify-icon>
					{$i18n.t('backoffice.clients.newClient')}
				</button>
			</div>
		</header>

		<div class="grid grid-cols-3 gap-4">
			<div class="rounded-xl border border-border p-4">
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-medium text-muted-foreground uppercase">{$i18n.t('backoffice.clients.totalClients')}</div>
					<iconify-icon icon="solar:buildings-2-bold" class="text-muted-foreground" width="18"></iconify-icon>
				</div>
				<div class="text-2xl font-bold text-foreground">{total}</div>
			</div>
			<div class="rounded-xl border border-border p-4">
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-medium text-green-600 uppercase">{$i18n.t('backoffice.clients.activeClients')}</div>
					<iconify-icon icon="solar:verified-check-bold" class="text-green-600" width="18"></iconify-icon>
				</div>
				<div class="text-2xl font-bold text-green-600">
					{clients.filter(c => c.user?.status === 'ACTIVE').length}
				</div>
			</div>
			<div class="rounded-xl border border-border p-4">
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-medium text-muted-foreground uppercase">{$i18n.t('backoffice.clients.thisPage')}</div>
					<iconify-icon icon="solar:document-bold" class="text-muted-foreground" width="18"></iconify-icon>
				</div>
				<div class="text-2xl font-bold text-foreground">{clients.length}</div>
			</div>
		</div>

		<div class="relative">
			<iconify-icon
				icon="solar:magnifer-linear"
				width="18"
				class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
			></iconify-icon>
			<input
				type="text"
				placeholder={$i18n.t('backoffice.clients.searchPlaceholder')}
				class="h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus:border-foreground transition-colors"
				oninput={(e: any) => handleSearchInput(e.target.value)}
			/>
		</div>

		{#if clients.length > 0}
		<div class="rounded-xl border border-border overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b border-border">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{$i18n.t('backoffice.clients.table.company')}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{$i18n.t('backoffice.clients.table.contact')}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{$i18n.t('backoffice.clients.table.location')}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{$i18n.t('backoffice.clients.table.siret')}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{$i18n.t('backoffice.clients.table.status')}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{$i18n.t('backoffice.clients.table.joined')}</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{$i18n.t('backoffice.clients.table.actions')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each clients as client (client.id)}
							<tr
								class="hover:bg-muted/50 transition-colors cursor-pointer"
								onclick={(e) => {
									if (!(e.target as HTMLElement).closest('button')) {
										goto(`/admin/clients/${client.id}`);
									}
								}}
							>
								<td class="px-4 py-3">
									<div class="font-medium text-foreground">{client.companyName}</div>
									<div class="text-xs text-muted-foreground mt-0.5">
										{#if client.payments?.length > 0}
											<span class="flex items-center gap-1">
												<iconify-icon icon="solar:wallet-bold" width="12"></iconify-icon>
												{client.payments.length} {client.payments.length !== 1 ? $i18n.t('backoffice.clients.payments') : $i18n.t('backoffice.clients.payment')}
											</span>
										{:else}
											<span>{$i18n.t('backoffice.clients.noPaymentsYet')}</span>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="font-medium text-foreground flex items-center gap-2">
										{client.contactFirstName} {client.contactLastName}
										{#if client.user?.emailVerified}
											<iconify-icon icon="solar:verified-check-bold" class="text-green-600" width="14"></iconify-icon>
										{/if}
									</div>
									<div class="text-sm text-muted-foreground">{client.contactEmail || 'Aucun email de contact'}</div>
									{#if client.user?.email}
										<div class="text-xs text-muted-foreground">Accès client: {client.user.email}</div>
									{/if}
								</td>
								<td class="px-4 py-3">
									<div class="text-sm text-foreground">{client.billingCity}</div>
									<div class="text-xs text-muted-foreground">{client.billingCountry}</div>
								</td>
								<td class="px-4 py-3">
									<div class="text-sm text-foreground font-mono">
										{client.siret || '-'}
									</div>
								</td>
								<td class="px-4 py-3">
									{#if client.user}
										<Badge variant={getStatusColor(client.user.status)}>
											{getStatusLabel(client.user.status)}
										</Badge>
									{:else}
										<Badge variant="slate">Aucun accès</Badge>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">
									{formatDate(client.createdAt)}
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => goto(`/admin/clients/${client.id}`)}
											class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
											title={$i18n.t('backoffice.clients.editClient')}
										>
											<iconify-icon icon="solar:pen-bold" width="16"></iconify-icon>
										</button>

										<button
											onclick={() => { confirmDeleteClient = client; showDeleteDialog = true; }}
											class="p-2 text-muted-foreground hover:text-red-600 hover:bg-muted rounded-md transition-colors"
											title={$i18n.t('backoffice.clients.deleteClient')}
										>
											<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		{#if totalPages > 1}
			<div class="flex justify-center">
				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={handlePageChange}
				/>
			</div>
		{/if}

		<div class="text-sm text-muted-foreground text-center">
			{total !== 1
				? $i18n.t('backoffice.clients.showingPlural', { count: clients.length, total })
				: $i18n.t('backoffice.clients.showing', { count: clients.length, total })}
		</div>
	{:else}
			<div class="text-center py-16">
				<div class="flex flex-col items-center gap-4">
					<div class="w-16 h-16 rounded-xl border border-border flex items-center justify-center text-muted-foreground">
						<iconify-icon icon="solar:buildings-2-bold" width="32"></iconify-icon>
					</div>
					<h3 class="text-lg font-semibold text-foreground">{$i18n.t('backoffice.clients.noClientsFound')}</h3>
					<p class="text-sm text-muted-foreground max-w-md">{searchQuery ? $i18n.t('backoffice.clients.tryAdjustingSearch') : $i18n.t('backoffice.clients.getStarted')}</p>
					{#if !searchQuery}
						<button
							onclick={() => goto('/admin/clients/create')}
							class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity mt-2"
						>
							<iconify-icon icon="mdi:plus" width="18"></iconify-icon>
							<span>{$i18n.t('backoffice.clients.newClient')}</span>
						</button>
					{/if}
				</div>
			</div>
	{/if}
	</div>
{/if}

<ConfirmDialog
	bind:isOpen={showDeleteDialog}
	title={$i18n.t('backoffice.clients.deleteConfirm.title')}
	description={$i18n.t('backoffice.clients.deleteConfirm.description', { companyName: confirmDeleteClient?.companyName || '' })}
	confirmText={$i18n.t('backoffice.clients.deleteClient')}
	cancelText={$i18n.t('common.buttons.cancel')}
	variant="danger"
	onConfirm={handleDeleteClient}
	onCancel={() => { confirmDeleteClient = null; showDeleteDialog = false; }}
/>
