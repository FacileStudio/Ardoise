<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Spinner,
		SearchInput,
		Badge,
		EmptyState,
		Drawer,
		Input,
		Button,
		ConfirmDialog,
		Pagination
	} from '@repo/ui';
	import { downloadCSV } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let pageLoading = $state(true);
	let clients: any[] = $state([]);
	let searchQuery = $state('');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let total = $state(0);
	let limit = $state(20);

	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let editingClient: any = $state(null);
	let confirmDeleteClient: any = $state(null);
	let showDeleteDialog = $state(false);

	let formData = $state({
		email: '',
		firstName: '',
		lastName: '',
		password: '',
		companyName: '',
		billingAddress: '',
		billingCity: '',
		billingCountry: 'France',
		siret: ''
	});

	let formErrors = $state({
		email: '',
		firstName: '',
		lastName: '',
		password: '',
		companyName: '',
		billingAddress: '',
		billingCity: '',
		billingCountry: '',
		siret: ''
	});

	let submitting = $state(false);

	onMount(async () => {
		await fetchClients();
	});

	async function fetchClients() {
		pageLoading = true;
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
			pageLoading = false;
		}
	}

	$effect(() => {
		currentPage;
		searchQuery;
		fetchClients();
	});

	function resetForm() {
		formData = {
			email: '',
			firstName: '',
			lastName: '',
			password: '',
			companyName: '',
			billingAddress: '',
			billingCity: '',
			billingCountry: 'France',
			siret: ''
		};
		formErrors = {
			email: '',
			firstName: '',
			lastName: '',
			password: '',
			companyName: '',
			billingAddress: '',
			billingCity: '',
			billingCountry: '',
			siret: ''
		};
	}

	function openCreateModal() {
		goto('/admin/clients/create');
	}

	function openEditModal(client: any) {
		goto(`/admin/clients/${client.id}`);
	}

	function resetFormErrors() {
		formErrors = {
			email: '',
			firstName: '',
			lastName: '',
			password: '',
			companyName: '',
			billingAddress: '',
			billingCity: '',
			billingCountry: '',
			siret: ''
		};
	}

	function validateForm(isEdit: boolean = false) {
		resetFormErrors();
		let isValid = true;

		if (!isEdit && !formData.email) {
			formErrors.email = 'Email est requis';
			isValid = false;
		} else if (!isEdit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			formErrors.email = 'Format d\'email invalide';
			isValid = false;
		}

		if (!isEdit && !formData.firstName) {
			formErrors.firstName = 'Le prénom est requis';
			isValid = false;
		}

		if (!isEdit && !formData.lastName) {
			formErrors.lastName = 'Le nom de famille est requis';
			isValid = false;
		}

		if (!isEdit && !formData.password) {
			formErrors.password = 'Le mot de passe est requis';
			isValid = false;
		} else if (!isEdit && formData.password.length < 8) {
			formErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
			isValid = false;
		}

		if (!formData.companyName) {
			formErrors.companyName = 'Le nom de l\'entreprise est requis';
			isValid = false;
		}

		if (!formData.billingAddress) {
			formErrors.billingAddress = 'L\'adresse de facturation est requise';
			isValid = false;
		}

		if (!formData.billingCity) {
			formErrors.billingCity = 'La ville de facturation est requise';
			isValid = false;
		}

		if (!formData.billingCountry) {
			formErrors.billingCountry = 'Le pays de facturation est requis';
			isValid = false;
		}

		return isValid;
	}

	async function handleCreateClient() {
		if (!validateForm()) return;

		submitting = true;
		try {
			await trpc.client.create.mutate({
				email: formData.email,
				firstName: formData.firstName,
				lastName: formData.lastName,
				password: formData.password,
				companyName: formData.companyName,
				billingAddress: formData.billingAddress,
				billingCity: formData.billingCity,
				billingCountry: formData.billingCountry,
				siret: formData.siret || undefined
			});
			showCreateModal = false;
			await fetchClients();
			resetForm();
		} catch (err: any) {
			logger.error({ err }, 'Failed to create client');
			if (err?.message?.includes('email already exists')) {
				formErrors.email = 'Un utilisateur avec cet email existe déjà';
			} else {
				alert('Échec de la création du client: ' + (err?.message || 'Erreur inconnue'));
			}
		} finally {
			submitting = false;
		}
	}

	async function handleUpdateClient() {
		if (!editingClient || !validateForm(true)) return;

		submitting = true;
		try {
			await trpc.client.update.mutate({
				id: editingClient.id,
				companyName: formData.companyName,
				billingAddress: formData.billingAddress,
				billingCity: formData.billingCity,
				billingCountry: formData.billingCountry,
				siret: formData.siret || undefined
			});
			showEditModal = false;
			await fetchClients();
			editingClient = null;
			resetForm();
		} catch (err: any) {
			logger.error({ err }, 'Failed to update client');
			alert('Échec de la mise à jour du client: ' + (err?.message || 'Erreur inconnue'));
		} finally {
			submitting = false;
		}
	}

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

<div class="p-8 max-w-[1400px] mx-auto space-y-6">
	<header class="flex justify-between items-start">
		<div>
			<h1 class="text-3xl font-black text-[#291334] tracking-tighter">{$i18n.t('backoffice.clients.title')}</h1>
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
				onclick={openCreateModal}
				class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
			>
				<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
				{$i18n.t('backoffice.clients.newClient')}
			</button>
		</div>
	</header>

	<div class="grid grid-cols-3 gap-4">
		<div class="bg-white rounded-2xl p-4 border border-slate-100">
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-bold text-slate-400 uppercase">{$i18n.t('backoffice.clients.totalClients')}</div>
				<iconify-icon icon="solar:buildings-2-bold" class="text-slate-400" width="20"></iconify-icon>
			</div>
			<div class="text-2xl font-black text-slate-900">{total}</div>
		</div>
		<div class="bg-white rounded-2xl p-4 border border-slate-100">
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-bold text-emerald-600 uppercase">{$i18n.t('backoffice.clients.activeClients')}</div>
				<iconify-icon icon="solar:verified-check-bold" class="text-emerald-600" width="20"></iconify-icon>
			</div>
			<div class="text-2xl font-black text-emerald-600">
				{clients.filter(c => c.user?.status === 'ACTIVE').length}
			</div>
		</div>
		<div class="bg-white rounded-2xl p-4 border border-slate-100">
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs font-bold text-[#FEC129] uppercase">{$i18n.t('backoffice.clients.thisPage')}</div>
				<iconify-icon icon="solar:document-bold" class="text-[#FEC129]" width="20"></iconify-icon>
			</div>
			<div class="text-2xl font-black text-[#FEC129]">{clients.length}</div>
		</div>
	</div>

	<div class="bg-white rounded-2xl border border-slate-100 p-4">
		<SearchInput
			value={searchQuery}
			oninput={(e: any) => handleSearchInput(e.target.value)}
			placeholder={$i18n.t('backoffice.clients.searchPlaceholder')}
		/>
	</div>

	{#if pageLoading}
		<div class="flex flex-col items-center justify-center h-[80vh] space-y-6">
			<iconify-icon icon="svg-spinners:blocks-shuffle-3" width="48" class="text-[#291334]"></iconify-icon>
			<p class="text-xs font-black uppercase tracking-[0.3em] text-[#291334]/40">
				Chargement...
			</p>
		</div>
	{:else if clients.length > 0}
		<div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-[#FAF7F5] border-b border-slate-100">
						<tr>
							<th class="text-left px-6 py-3 text-xs font-black text-[#291334] uppercase">{$i18n.t('backoffice.clients.table.company')}</th>
							<th class="text-left px-6 py-3 text-xs font-black text-[#291334] uppercase">{$i18n.t('backoffice.clients.table.contact')}</th>
							<th class="text-left px-6 py-3 text-xs font-black text-[#291334] uppercase">{$i18n.t('backoffice.clients.table.location')}</th>
							<th class="text-left px-6 py-3 text-xs font-black text-[#291334] uppercase">{$i18n.t('backoffice.clients.table.siret')}</th>
							<th class="text-left px-6 py-3 text-xs font-black text-[#291334] uppercase">{$i18n.t('backoffice.clients.table.status')}</th>
							<th class="text-left px-6 py-3 text-xs font-black text-[#291334] uppercase">{$i18n.t('backoffice.clients.table.joined')}</th>
							<th class="text-right px-6 py-3 text-xs font-black text-[#291334] uppercase">{$i18n.t('backoffice.clients.table.actions')}</th>
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
											onclick={() => openEditModal(client)}
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
		<EmptyState
			icon="solar:buildings-2-bold"
			title={$i18n.t('backoffice.clients.noClientsFound')}
			description={searchQuery ? $i18n.t('backoffice.clients.tryAdjustingSearch') : $i18n.t('backoffice.clients.getStarted')}
		/>
	{/if}
</div>

<Drawer bind:open={showCreateModal} title={$i18n.t('backoffice.clients.createClient.title')}>
	<form onsubmit={(e) => { e.preventDefault(); handleCreateClient(); }} class="space-y-4">
		<div class="space-y-4 bg-[#FAF7F5] p-4 rounded-xl">
			<h4 class="font-bold text-xs uppercase text-[#291334]">{$i18n.t('backoffice.clients.createClient.userAccount')}</h4>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.firstName')}</label>
					<input
						type="text"
						bind:value={formData.firstName}
						class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
						placeholder="John"
					/>
					{#if formErrors.firstName}
						<p class="text-xs text-rose-500 mt-1">{formErrors.firstName}</p>
					{/if}
				</div>
				<div>
					<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.lastName')}</label>
					<input
						type="text"
						bind:value={formData.lastName}
						class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
						placeholder="Doe"
					/>
					{#if formErrors.lastName}
						<p class="text-xs text-rose-500 mt-1">{formErrors.lastName}</p>
					{/if}
				</div>
			</div>

			<div>
				<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.email')}</label>
				<input
					type="email"
					bind:value={formData.email}
					class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
					placeholder="john.doe@company.com"
				/>
				{#if formErrors.email}
					<p class="text-xs text-rose-500 mt-1">{formErrors.email}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.password')}</label>
				<input
					type="password"
					bind:value={formData.password}
					class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
					placeholder="Min. 8 characters"
				/>
				{#if formErrors.password}
					<p class="text-xs text-rose-500 mt-1">{formErrors.password}</p>
				{/if}
			</div>
		</div>

		<div class="space-y-4">
			<h4 class="font-bold text-xs uppercase text-[#291334]">{$i18n.t('backoffice.clients.createClient.companyInfo')}</h4>

			<div>
				<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.companyName')}</label>
				<input
					type="text"
					bind:value={formData.companyName}
					class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
					placeholder="Acme Corp"
				/>
				{#if formErrors.companyName}
					<p class="text-xs text-rose-500 mt-1">{formErrors.companyName}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.siret')}</label>
				<input
					type="text"
					bind:value={formData.siret}
					class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
					placeholder={$i18n.t('backoffice.clients.createClient.siretPlaceholder')}
				/>
				{#if formErrors.siret}
					<p class="text-xs text-rose-500 mt-1">{formErrors.siret}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.billingAddress')}</label>
				<input
					type="text"
					bind:value={formData.billingAddress}
					class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
					placeholder="123 Main Street"
				/>
				{#if formErrors.billingAddress}
					<p class="text-xs text-rose-500 mt-1">{formErrors.billingAddress}</p>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.city')}</label>
					<input
						type="text"
						bind:value={formData.billingCity}
						class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
						placeholder="Paris"
					/>
					{#if formErrors.billingCity}
						<p class="text-xs text-rose-500 mt-1">{formErrors.billingCity}</p>
					{/if}
				</div>
				<div>
					<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.country')}</label>
					<input
						type="text"
						bind:value={formData.billingCountry}
						class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
						placeholder="France"
					/>
					{#if formErrors.billingCountry}
						<p class="text-xs text-rose-500 mt-1">{formErrors.billingCountry}</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex gap-3 pt-4">
			<button
				type="button"
				onclick={() => { showCreateModal = false; resetForm(); }}
				class="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
				disabled={submitting}
			>
				{$i18n.t('common.buttons.cancel')}
			</button>
			<button
				type="submit"
				class="flex-1 px-4 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				disabled={submitting}
			>
				{#if submitting}
					<iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
					Loading
				{:else}
					{$i18n.t('backoffice.clients.createClient.createButton')}
				{/if}
			</button>
		</div>
	</form>
</Drawer>

<Drawer bind:open={showEditModal} title={$i18n.t('backoffice.clients.editClient.title')}>
	<form onsubmit={(e) => { e.preventDefault(); handleUpdateClient(); }} class="space-y-4">
		<div class="space-y-4 bg-[#FAF7F5] p-4 rounded-xl">
			<h4 class="font-bold text-xs uppercase text-[#291334]">{$i18n.t('backoffice.clients.editClient.userInfoReadonly')}</h4>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.firstName')}</label>
					<input
						type="text"
						value={formData.firstName}
						class="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500"
						disabled
					/>
				</div>
				<div>
					<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.lastName')}</label>
					<input
						type="text"
						value={formData.lastName}
						class="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500"
						disabled
					/>
				</div>
			</div>

			<div>
				<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.email')}</label>
				<input
					type="email"
					value={formData.email}
					class="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500"
					disabled
				/>
			</div>
		</div>

		<div class="space-y-4">
			<h4 class="font-bold text-xs uppercase text-[#291334]">{$i18n.t('backoffice.clients.createClient.companyInfo')}</h4>

			<div>
				<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.companyName')}</label>
				<input
					type="text"
					bind:value={formData.companyName}
					class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
					placeholder="Acme Corp"
				/>
				{#if formErrors.companyName}
					<p class="text-xs text-rose-500 mt-1">{formErrors.companyName}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.siret')}</label>
				<input
					type="text"
					bind:value={formData.siret}
					class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
					placeholder={$i18n.t('backoffice.clients.createClient.siretPlaceholder')}
				/>
				{#if formErrors.siret}
					<p class="text-xs text-rose-500 mt-1">{formErrors.siret}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.billingAddress')}</label>
				<input
					type="text"
					bind:value={formData.billingAddress}
					class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
					placeholder="123 Main Street"
				/>
				{#if formErrors.billingAddress}
					<p class="text-xs text-rose-500 mt-1">{formErrors.billingAddress}</p>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.city')}</label>
					<input
						type="text"
						bind:value={formData.billingCity}
						class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
						placeholder="Paris"
					/>
					{#if formErrors.billingCity}
						<p class="text-xs text-rose-500 mt-1">{formErrors.billingCity}</p>
					{/if}
				</div>
				<div>
					<label class="block text-sm font-bold text-slate-700 mb-1">{$i18n.t('backoffice.clients.createClient.country')}</label>
					<input
						type="text"
						bind:value={formData.billingCountry}
						class="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] transition-colors"
						placeholder="France"
					/>
					{#if formErrors.billingCountry}
						<p class="text-xs text-rose-500 mt-1">{formErrors.billingCountry}</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex gap-3 pt-4">
			<button
				type="button"
				onclick={() => { showEditModal = false; editingClient = null; resetForm(); }}
				class="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
				disabled={submitting}
			>
				{$i18n.t('common.buttons.cancel')}
			</button>
			<button
				type="submit"
				class="flex-1 px-4 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				disabled={submitting}
			>
				{#if submitting}
					<iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
					Loading
				{:else}
					{$i18n.t('backoffice.clients.editClient.updateButton')}
				{/if}
			</button>
		</div>
	</form>
</Drawer>

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
