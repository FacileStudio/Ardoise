<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
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
			'Nom': `${client.user?.firstName} ${client.user?.lastName}`,
			'Email': client.user?.email || '',
			'Entreprise': client.companyName || '',
			'SIRET': client.siret || '',
			'Adresse': client.billingAddress || '',
			'Ville': client.billingCity || '',
			'Pays': client.billingCountry || '',
			'Statut': client.user?.status || '',
			'Date création': new Date(client.createdAt).toLocaleDateString('fr-FR')
		}));
		downloadCSV(csvData, 'clients');
	}
</script>

{#if pageLoading}
	<div class="flex flex-col items-center justify-center h-screen space-y-6">
		<iconify-icon icon="svg-spinners:blocks-shuffle-3" width="48" class="text-[#291334]"></iconify-icon>
		<p class="text-xs font-black uppercase tracking-[0.3em] text-[#291334]/40">
			Chargement...
		</p>
	</div>
{:else}
	<div class="p-8 max-w-[1400px] mx-auto space-y-6">
		<header class="flex justify-between items-center" in:fade>
			<div>
				<h1 class="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
					<iconify-icon icon="solar:buildings-2-bold" width="32" class="text-[#291334]"></iconify-icon>
					{$i18n.t('backoffice.clients.title')}
				</h1>
				<p class="text-slate-500 text-sm mt-1">{$i18n.t('backoffice.clients.subtitle')}</p>
			</div>
			<div class="flex gap-3">
				{#if clients.length > 0}
					<Button onclick={handleExportCSV} class="rounded-full">
						<iconify-icon icon="solar:file-download-bold" width="18"></iconify-icon>
						<span>Exporter CSV</span>
					</Button>
				{/if}
				<button
					onclick={() => goto('/admin/clients/create')}
					class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
				>
					<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
					{$i18n.t('backoffice.clients.newClient')}
				</button>
			</div>
		</header>

		<div class="grid grid-cols-3 gap-4">
			<div class="bg-white rounded-2xl p-4 border border-slate-100" in:fly={{ y: 20, delay: 100 }}>
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-bold text-slate-400 uppercase">{$i18n.t('backoffice.clients.totalClients')}</div>
					<iconify-icon icon="solar:buildings-2-bold" class="text-slate-400" width="20"></iconify-icon>
				</div>
				<div class="text-2xl font-black text-slate-900">{total}</div>
			</div>
			<div class="bg-white rounded-2xl p-4 border border-slate-100" in:fly={{ y: 20, delay: 200 }}>
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-bold text-emerald-600 uppercase">{$i18n.t('backoffice.clients.activeClients')}</div>
					<iconify-icon icon="solar:verified-check-bold" class="text-emerald-600" width="20"></iconify-icon>
				</div>
				<div class="text-2xl font-black text-emerald-600">
					{clients.filter(c => c.user?.status === 'ACTIVE').length}
				</div>
			</div>
			<div class="bg-white rounded-2xl p-4 border border-slate-100" in:fly={{ y: 20, delay: 300 }}>
				<div class="flex items-center justify-between mb-2">
					<div class="text-xs font-bold text-[#FEC129] uppercase">{$i18n.t('backoffice.clients.thisPage')}</div>
					<iconify-icon icon="solar:document-bold" class="text-[#FEC129]" width="20"></iconify-icon>
				</div>
				<div class="text-2xl font-black text-[#FEC129]">{clients.length}</div>
			</div>
		</div>

		<div class="relative" in:fly={{ y: 20, delay: 400 }}>
			<iconify-icon
				icon="solar:magnifer-linear"
				width="20"
				class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
			></iconify-icon>
			<input
				type="text"
				placeholder={$i18n.t('backoffice.clients.searchPlaceholder')}
				class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-all"
				oninput={(e: any) => handleSearchInput(e.target.value)}
			/>
		</div>

		{#if clients.length > 0}
		<div class="bg-white rounded-2xl border border-slate-100 overflow-hidden" in:fade>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-slate-50 border-b border-slate-100">
						<tr>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">{$i18n.t('backoffice.clients.table.company')}</th>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">{$i18n.t('backoffice.clients.table.contact')}</th>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">{$i18n.t('backoffice.clients.table.location')}</th>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">{$i18n.t('backoffice.clients.table.siret')}</th>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">{$i18n.t('backoffice.clients.table.status')}</th>
							<th class="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">{$i18n.t('backoffice.clients.table.joined')}</th>
							<th class="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase tracking-wider">{$i18n.t('backoffice.clients.table.actions')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each clients as client (client.id)}
							<tr
								class="hover:bg-[#FAF7F5] transition-colors cursor-pointer"
								onclick={(e) => {
									if (!(e.target as HTMLElement).closest('button')) {
										goto(`/admin/clients/${client.id}`);
									}
								}}
							>
								<td class="px-6 py-4">
									<div class="font-bold text-[#291334]">{client.companyName}</div>
									<div class="text-xs text-slate-500 mt-1">
										{#if client.payments?.length > 0}
											<span class="flex items-center gap-1">
												<iconify-icon icon="solar:wallet-bold" width="12"></iconify-icon>
												{client.payments.length} {client.payments.length !== 1 ? $i18n.t('backoffice.clients.payments') : $i18n.t('backoffice.clients.payment')}
											</span>
										{:else}
											<span class="text-slate-400">{$i18n.t('backoffice.clients.noPaymentsYet')}</span>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="font-bold text-slate-900 flex items-center gap-2">
										{client.user.firstName} {client.user.lastName}
										{#if client.user.emailVerified}
											<iconify-icon icon="solar:verified-check-bold" class="text-emerald-500" width="14"></iconify-icon>
										{/if}
									</div>
									<div class="text-sm text-slate-500">{client.user.email}</div>
								</td>
								<td class="px-6 py-4">
									<div class="text-sm text-slate-700">{client.billingCity}</div>
									<div class="text-xs text-slate-500">{client.billingCountry}</div>
								</td>
								<td class="px-6 py-4">
									<div class="text-sm text-slate-700 font-mono">
										{client.siret || '-'}
									</div>
								</td>
								<td class="px-6 py-4">
									<Badge variant={getStatusColor(client.user.status)}>
										{getStatusLabel(client.user.status)}
									</Badge>
								</td>
								<td class="px-6 py-4 text-sm text-slate-600">
									{formatDate(client.createdAt)}
								</td>
								<td class="px-6 py-4">
									<div class="flex items-center justify-end gap-2">
										<button
											onclick={() => goto(`/admin/clients/${client.id}`)}
											class="p-2 text-[#291334] hover:bg-[#291334]/10 rounded-lg transition-colors"
											title={$i18n.t('backoffice.clients.editClient')}
										>
											<iconify-icon icon="solar:pen-bold" width="18"></iconify-icon>
										</button>

										<button
											onclick={() => { confirmDeleteClient = client; showDeleteDialog = true; }}
											class="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
											title={$i18n.t('backoffice.clients.deleteClient')}
										>
											<iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
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

		<div class="text-sm text-slate-500 text-center">
			{total !== 1
				? $i18n.t('backoffice.clients.showingPlural', { count: clients.length, total })
				: $i18n.t('backoffice.clients.showing', { count: clients.length, total })}
		</div>
	{:else}
			<div class="text-center py-16" in:fade>
				<div class="flex flex-col items-center gap-4">
					<div class="w-20 h-20 bg-[#FEC129]/20 text-[#291334] rounded-2xl flex items-center justify-center">
						<iconify-icon icon="solar:buildings-2-bold" width="40"></iconify-icon>
					</div>
					<h3 class="text-2xl font-black text-[#291334]">{$i18n.t('backoffice.clients.noClientsFound')}</h3>
					<p class="text-[#291334]/60 max-w-md">{searchQuery ? $i18n.t('backoffice.clients.tryAdjustingSearch') : $i18n.t('backoffice.clients.getStarted')}</p>
					{#if !searchQuery}
						<button
							onclick={() => goto('/admin/clients/create')}
							class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer mt-2"
						>
							<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
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
