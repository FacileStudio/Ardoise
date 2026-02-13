<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { Spinner, SearchInput, Badge, EmptyState } from '@repo/ui';
	import { logger } from '@repo/logger';
	import type { User, UserStats } from '$lib/types';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let pageLoading = $state(true);
	let users: User[] = $state([]);
	let stats: UserStats | null = $state(null);
	let searchQuery = $state('');

	let filters = $state({
		role: 'all' as 'all' | 'admin' | 'user',
	});

	onMount(async () => {
		await Promise.all([fetchUsers(), fetchStats()]);
	});

	async function fetchUsers() {
		pageLoading = true;
		try {
			users = await trpc.user.list.query(filters);
		} catch (err) {
			logger.error({ err }, 'Failed to fetch users');
		} finally {
			pageLoading = false;
		}
	}

	async function fetchStats() {
		try {
			stats = await trpc.user.getStats.query();
		} catch (err) {
			logger.error({ err }, 'Failed to fetch user statistics');
		}
	}

	$effect(() => {
		fetchUsers();
	});

	const handleDelete = async (id: string, name: string) => {
		if (!confirm($i18n.t('backoffice.users.deleteConfirm', { name }))) return;
		try {
			await trpc.user.delete.mutate({ id });
			users = users.filter(u => u.id !== id);
			await fetchStats();
		} catch (err) {
			logger.error({ err }, 'Failed to delete user');
			alert('Failed to delete user');
		}
	};

	const handleToggleRole = async (id: string, currentRole: string) => {
		const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
		try {
			await trpc.user.update.mutate({ id, role: newRole });
			users = users.map(u => u.id === id ? { ...u, role: newRole } : u);
		} catch (err) {
			logger.error({ err }, 'Failed to update user role');
			alert('Failed to update role');
		}
	};

	function getStatusColor(status: string) {
		switch (status) {
			case 'ACTIVE': return 'emerald';
			case 'PENDING': return 'slate';
			default: return 'slate';
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		return new Date(date).toLocaleDateString();
	}

	let searchTerm = $derived(searchQuery.toLowerCase().trim());
	let filteredUsers = $derived(users.filter(user => {
		if (!searchTerm) return true;
		const searchContent = `${user.firstName} ${user.lastName} ${user.email} ${user.id}`.toLowerCase();
		return searchTerm.split(' ').every(word => searchContent.includes(word));
	}));
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
		<header class="flex items-center justify-between mb-6" in:fade>
			<div>
				<h1 class="text-3xl font-black text-slate-900 tracking-tighter">{$i18n.t('backoffice.users.title')}</h1>
				<p class="text-slate-500 text-sm mt-1">{$i18n.t('backoffice.users.subtitle')}</p>
			</div>
			<button
				onclick={() => goto('/admin/users/create')}
				class="px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
			>
				<iconify-icon icon="mdi:plus" width="20"></iconify-icon>
				Nouvel utilisateur
			</button>
		</header>

		{#if stats}
			<div class="grid grid-cols-2 gap-4">
				<div class="bg-white rounded-2xl p-4 border border-slate-100" in:fly={{ y: 20, delay: 100 }}>
					<div class="flex items-center justify-between mb-2">
						<div class="text-xs font-bold text-slate-400 uppercase">{$i18n.t('backoffice.users.total')}</div>
						<iconify-icon icon="solar:users-group-two-rounded-bold" class="text-slate-400" width="20"></iconify-icon>
					</div>
					<div class="text-2xl font-black text-slate-900">{stats.totalUsers}</div>
				</div>
				<div class="bg-white rounded-2xl p-4 border border-slate-100" in:fly={{ y: 20, delay: 200 }}>
					<div class="flex items-center justify-between mb-2">
						<div class="text-xs font-bold text-rose-600 uppercase">{$i18n.t('backoffice.users.admin')}</div>
						<iconify-icon icon="solar:crown-bold" class="text-rose-600" width="20"></iconify-icon>
					</div>
					<div class="text-2xl font-black text-rose-600">{stats.adminUsers}</div>
				</div>
			</div>
		{/if}

		<div class="bg-white rounded-2xl border border-slate-100 p-4" in:fly={{ y: 20, delay: 300 }}>
			<div class="flex gap-3 items-center">
				<div class="flex-1">
					<SearchInput bind:value={searchQuery} placeholder={$i18n.t('backoffice.users.searchPlaceholder')} />
				</div>
				<select
					bind:value={filters.role}
					class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm focus:border-indigo-300"
				>
					<option value="all">{$i18n.t('backoffice.users.allRoles')}</option>
					<option value="admin">{$i18n.t('backoffice.users.admin')}</option>
					<option value="user">{$i18n.t('backoffice.users.user')}</option>
				</select>
			</div>
		</div>

		{#if filteredUsers.length > 0}
		<div class="bg-white rounded-2xl border border-slate-100 overflow-hidden" in:fade>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-slate-50 border-b border-slate-100">
						<tr>
							<th class="text-left px-6 py-3 text-xs font-black text-slate-500 uppercase">{$i18n.t('backoffice.users.table.user')}</th>
							<th class="text-left px-6 py-3 text-xs font-black text-slate-500 uppercase">{$i18n.t('backoffice.users.table.status')}</th>
							<th class="text-left px-6 py-3 text-xs font-black text-slate-500 uppercase">{$i18n.t('backoffice.users.table.role')}</th>
							<th class="text-left px-6 py-3 text-xs font-black text-slate-500 uppercase">{$i18n.t('backoffice.users.table.joined')}</th>
							<th class="text-right px-6 py-3 text-xs font-black text-slate-500 uppercase">{$i18n.t('backoffice.users.table.actions')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each filteredUsers as user (user.id)}
							<tr
								class="hover:bg-[#FAF7F5] transition-colors cursor-pointer"
								onclick={(e) => {
									if (!(e.target as HTMLElement).closest('button')) {
										goto(`/admin/users/${user.id}`);
									}
								}}
							>
								<td class="px-6 py-4">
									<div class="flex items-center gap-3">
										{#if user.avatar?.url}
											<img src={user.avatar.url} alt={user.firstName} class="w-10 h-10 rounded-xl object-cover" />
										{:else}
											<div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
												{user.firstName[0]}
											</div>
										{/if}
										<div>
											<div class="font-bold text-slate-900">
												{user.firstName} {user.lastName}
											</div>
											<div class="text-sm text-slate-500">{user.email}</div>
										</div>
									</div>
								</td>
								<td class="px-6 py-4">
									<Badge variant={getStatusColor(user.status || 'ACTIVE')}>
										{user.status || 'ACTIVE'}
									</Badge>
								</td>
								<td class="px-6 py-4">
									<button
										onclick={() => handleToggleRole(user.id, user.role)}
										class="px-3 py-1 rounded-lg text-xs font-bold transition-colors {user.role === 'ADMIN' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
									>
										{user.role}
									</button>
								</td>
								<td class="px-6 py-4 text-sm text-slate-600">
									{formatDate(user.createdAt)}
								</td>
								<td class="px-6 py-4">
									<div class="flex items-center justify-end gap-2">
										<button
											onclick={(e) => {
												e.stopPropagation();
												handleDelete(user.id, `${user.firstName} ${user.lastName}`);
											}}
											class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
											title={$i18n.t('backoffice.users.deleteUser')}
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

			<div class="text-sm text-slate-500 text-center">
				{$i18n.t('backoffice.users.showing', { count: filteredUsers.length, total: users.length })}
			</div>
		{:else}
			<EmptyState
				icon="solar:users-group-two-rounded-bold"
				title={$i18n.t('backoffice.users.noUsersFound')}
				description={$i18n.t('backoffice.users.tryAdjustingFilters')}
			/>
		{/if}
	</div>
{/if}

