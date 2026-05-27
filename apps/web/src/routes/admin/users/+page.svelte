<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
		if (!confirm($i18n.t('admin.users.deleteConfirm', { name }))) return;
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
	<div class="flex flex-col items-center justify-center h-screen space-y-4">
		<Spinner size="xl" />
		<p class="text-xs text-muted-foreground">Chargement...</p>
	</div>
{:else}
	<div class="p-6 max-w-5xl mx-auto space-y-6">
		<header class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground">{$i18n.t('admin.users.title')}</h1>
				<p class="text-sm text-muted-foreground mt-1">{$i18n.t('admin.users.subtitle')}</p>
			</div>
			<button
				onclick={() => goto(resolve('/admin/users/create'))}
				class="bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium flex items-center gap-2"
			>
				<iconify-icon icon="mdi:plus" width="16"></iconify-icon>
				Nouvel utilisateur
			</button>
		</header>

		{#if stats}
			<div class="grid grid-cols-2 gap-4">
				<div class="rounded-xl border border-border p-4">
					<div class="flex items-center justify-between mb-1">
						<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">{$i18n.t('admin.users.total')}</div>
						<iconify-icon icon="solar:users-group-two-rounded-bold" class="text-muted-foreground" width="16"></iconify-icon>
					</div>
					<div class="text-xl font-bold text-foreground">{stats.totalUsers}</div>
				</div>
				<div class="rounded-xl border border-border p-4">
					<div class="flex items-center justify-between mb-1">
						<div class="text-xs font-medium text-red-600 uppercase tracking-wide">{$i18n.t('admin.users.admin')}</div>
						<iconify-icon icon="solar:crown-bold" class="text-red-600" width="16"></iconify-icon>
					</div>
					<div class="text-xl font-bold text-red-600">{stats.adminUsers}</div>
				</div>
			</div>
		{/if}

		<div class="space-y-3">
			<div class="relative">
				<iconify-icon
					icon="solar:magnifer-linear"
					width="16"
					class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
				></iconify-icon>
				<input
					type="text"
					placeholder={$i18n.t('admin.users.searchPlaceholder')}
					class="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					bind:value={searchQuery}
				/>
			</div>

			<div class="flex gap-2 flex-wrap">
				<button
					onclick={() => filters.role = 'all'}
					class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {filters.role === 'all'
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground border border-border hover:bg-muted'}"
				>
					{$i18n.t('admin.users.allRoles')}
				</button>
				<button
					onclick={() => filters.role = 'admin'}
					class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {filters.role === 'admin'
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground border border-border hover:bg-muted'}"
				>
					{$i18n.t('admin.users.admin')}
				</button>
				<button
					onclick={() => filters.role = 'user'}
					class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {filters.role === 'user'
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground border border-border hover:bg-muted'}"
				>
					{$i18n.t('admin.users.user')}
				</button>
			</div>
		</div>

		{#if filteredUsers.length > 0}
		<div class="rounded-xl border border-border overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-muted border-b border-border">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{$i18n.t('admin.users.table.user')}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{$i18n.t('admin.users.table.status')}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{$i18n.t('admin.users.table.role')}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{$i18n.t('admin.users.table.joined')}</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">{$i18n.t('admin.users.table.actions')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each filteredUsers as user (user.id)}
							<tr
								class="hover:bg-muted transition-colors cursor-pointer"
								onclick={(e) => {
									if (!(e.target as HTMLElement).closest('button')) {
										goto(resolve(`/admin/users/${user.id}`));
									}
								}}
							>
								<td class="px-4 py-3">
									<div class="flex items-center gap-3">
										{#if user.avatar?.url}
											<img src={user.avatar.url} alt={user.firstName} class="w-8 h-8 rounded-lg object-cover" />
										{:else}
											<div class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
												{user.firstName[0]}
											</div>
										{/if}
										<div>
											<div class="text-sm font-medium text-foreground">
												{user.firstName} {user.lastName}
											</div>
											<div class="text-xs text-muted-foreground">{user.email}</div>
										</div>
									</div>
								</td>
								<td class="px-4 py-3">
									<Badge variant={getStatusColor(user.status || 'ACTIVE')}>
										{user.status || 'ACTIVE'}
									</Badge>
								</td>
								<td class="px-4 py-3">
									<button
										onclick={() => handleToggleRole(user.id, user.role)}
										class="px-2 py-0.5 rounded text-xs font-medium transition-colors {user.role === 'ADMIN' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-muted text-muted-foreground hover:bg-border'}"
									>
										{user.role}
									</button>
								</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">
									{formatDate(user.createdAt)}
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center justify-end">
										<button
											onclick={(e) => {
												e.stopPropagation();
												handleDelete(user.id, `${user.firstName} ${user.lastName}`);
											}}
											class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
											title={$i18n.t('admin.users.deleteUser')}
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

			<div class="text-xs text-muted-foreground text-center">
				{$i18n.t('admin.users.showing', { count: filteredUsers.length, total: users.length })}
			</div>
		{:else}
			<div class="text-center py-16">
				<div class="flex flex-col items-center gap-3">
					<iconify-icon icon="solar:users-group-two-rounded-bold" width="40" class="text-muted-foreground"></iconify-icon>
					<h3 class="text-lg font-semibold text-foreground">{$i18n.t('admin.users.noUsersFound')}</h3>
					<p class="text-sm text-muted-foreground max-w-md">{$i18n.t('admin.users.tryAdjustingFilters')}</p>
					{#if !searchQuery && filters.role === 'all'}
						<button
							onclick={() => goto(resolve('/admin/users/create'))}
							class="bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium flex items-center gap-2 mt-2"
						>
							<iconify-icon icon="mdi:plus" width="16"></iconify-icon>
							Nouvel utilisateur
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
