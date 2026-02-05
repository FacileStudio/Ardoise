<script lang="ts">
	import { Modal, Badge, Spinner, Button, Tabs } from '@repo/ui';
	import { trpc } from '$lib/trpc';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

	let { userId = $bindable(''), onClose = () => {} }: { userId?: string; onClose?: () => void } = $props();

	let loading = $state(true);
	let user: any = $state(null);
	let activeTab = $state<'overview' | 'activity' | 'moderation'>('overview');
	let actionLoading = $state(false);

	let banReason = $state('');
	let suspensionReason = $state('');
	let suspensionDays = $state(7);

	$effect(() => {
		if (userId && userId !== '') {
			loadUser();
		} else {
			user = null;
		}
	});

	async function loadUser() {
		loading = true;
		try {
			user = await trpc.user.getById.query({ id: userId });
		} catch (err) {
			logger.error({ err }, 'Failed to load user details');
		} finally {
			loading = false;
		}
	}

	async function handleBan() {
		if (!banReason.trim()) {
			alert('Please provide a ban reason');
			return;
		}
		if (!confirm('Are you sure you want to ban this user?')) return;

		actionLoading = true;
		try {
			await trpc.user.ban.mutate({ id: userId, reason: banReason });
			await loadUser();
			banReason = '';
		} catch (err) {
			logger.error({ err }, 'Failed to ban user');
			alert('Failed to ban user');
		} finally {
			actionLoading = false;
		}
	}

	async function handleUnban() {
		if (!confirm('Are you sure you want to unban this user?')) return;

		actionLoading = true;
		try {
			await trpc.user.unban.mutate({ id: userId });
			await loadUser();
		} catch (err) {
			logger.error({ err }, 'Failed to unban user');
			alert('Failed to unban user');
		} finally {
			actionLoading = false;
		}
	}

	async function handleSuspend() {
		if (!suspensionReason.trim()) {
			alert('Please provide a suspension reason');
			return;
		}
		if (!confirm(`Are you sure you want to suspend this user for ${suspensionDays} days?`)) return;

		actionLoading = true;
		try {
			const until = new Date();
			until.setDate(until.getDate() + suspensionDays);

			await trpc.user.suspend.mutate({ id: userId, reason: suspensionReason, until });
			await loadUser();
			suspensionReason = '';
		} catch (err) {
			logger.error({ err }, 'Failed to suspend user');
			alert('Failed to suspend user');
		} finally {
			actionLoading = false;
		}
	}

	async function handleUnsuspend() {
		if (!confirm('Are you sure you want to unsuspend this user?')) return;

		actionLoading = true;
		try {
			await trpc.user.unsuspend.mutate({ id: userId });
			await loadUser();
		} catch (err) {
			logger.error({ err }, 'Failed to unsuspend user');
			alert('Failed to unsuspend user');
		} finally {
			actionLoading = false;
		}
	}

	async function handleVerifyEmail() {
		if (!confirm('Manually verify this user\'s email?')) return;

		actionLoading = true;
		try {
			await trpc.user.verifyEmail.mutate({ id: userId });
			await loadUser();
		} catch (err) {
			logger.error({ err }, 'Failed to verify user email');
			alert('Failed to verify email');
		} finally {
			actionLoading = false;
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleString();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'ACTIVE': return 'emerald';
			case 'BANNED': return 'rose';
			case 'SUSPENDED': return 'amber';
			case 'PENDING': return 'slate';
			default: return 'slate';
		}
	}
</script>

<Modal open={!!userId && userId !== ''} title="User Details" onClose={onClose}>
	{#if loading}
		<div class="py-20 flex justify-center">
			<Spinner size="xl" />
		</div>
	{:else if user}
		<div class="space-y-6">
			<div class="flex items-start gap-4">
				{#if user.avatar?.url}
					<img src={user.avatar.url} alt={user.firstName} class="w-20 h-20 rounded-2xl object-cover" />
				{:else}
					<div class="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-3xl">
						{user.firstName[0]}
					</div>
				{/if}

				<div class="flex-1">
					<div class="flex items-center gap-3 mb-2">
						<h2 class="text-2xl font-black text-slate-900">{user.firstName} {user.lastName}</h2>
						<Badge variant={getStatusColor(user.status)}>{user.status}</Badge>
					</div>
					<p class="text-sm text-slate-500 mb-2">{user.email}</p>
					<div class="flex gap-2">
						{#if user.isPremium}
							<Badge variant="indigo">Premium</Badge>
						{/if}
						{#if user.role === 'ADMIN'}
							<Badge variant="rose">Admin</Badge>
						{/if}
						{#if user.emailVerified}
							<Badge variant="emerald">Verified</Badge>
						{:else}
							<Badge variant="slate">Unverified</Badge>
						{/if}
					</div>
				</div>
			</div>

			<Tabs
				tabs={[
					{ label: 'Overview', value: 'overview', icon: 'solar:info-circle-bold' },
					{ label: 'Activity', value: 'activity', icon: 'solar:history-bold' },
					{ label: 'Moderation', value: 'moderation', icon: 'solar:shield-warning-bold' }
				]}
				bind:activeTab
			/>

			{#if activeTab === 'overview'}
				<div class="grid grid-cols-2 gap-4">
					<div class="bg-slate-50 p-4 rounded-2xl">
						<div class="text-xs font-black uppercase text-slate-400 mb-1">Messages</div>
						<div class="text-2xl font-black text-slate-900">{user.messages?.length || 0}</div>
					</div>
					<div class="bg-slate-50 p-4 rounded-2xl">
						<div class="text-xs font-black uppercase text-slate-400 mb-1">Rooms</div>
						<div class="text-2xl font-black text-slate-900">{user.rooms?.length || 0}</div>
					</div>
					<div class="bg-slate-50 p-4 rounded-2xl">
						<div class="text-xs font-black uppercase text-slate-400 mb-1">Joined</div>
						<div class="text-sm font-bold text-slate-700">{formatDate(user.createdAt)}</div>
					</div>
					<div class="bg-slate-50 p-4 rounded-2xl">
						<div class="text-xs font-black uppercase text-slate-400 mb-1">Last Login</div>
						<div class="text-sm font-bold text-slate-700">{formatDate(user.lastLoginAt)}</div>
					</div>
				</div>

				{#if user.subscription}
					<div class="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
						<div class="text-xs font-black uppercase text-indigo-600 mb-2">Subscription</div>
						<div class="text-sm text-slate-700">
							<div>Status: <span class="font-bold">{user.subscription.status}</span></div>
							<div>Plan: <span class="font-bold">{user.subscription.plan}</span></div>
						</div>
					</div>
				{/if}

				{#if user.messages && user.messages.length > 0}
					<div>
						<h3 class="text-sm font-black uppercase text-slate-400 mb-3">Recent Messages</h3>
						<div class="space-y-2 max-h-60 overflow-y-auto">
							{#each user.messages.slice(0, 5) as message}
								<div class="bg-slate-50 p-3 rounded-xl text-sm">
									<div class="text-slate-600 mb-1">{message.text}</div>
									<div class="text-xs text-slate-400">{formatDate(message.createdAt)}</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{:else if activeTab === 'activity'}
				<div class="space-y-3 max-h-96 overflow-y-auto">
					{#if user.auditLogs && user.auditLogs.length > 0}
						{#each user.auditLogs as log}
							<div class="bg-slate-50 p-4 rounded-xl">
								<div class="flex items-center justify-between mb-2">
									<Badge variant={log.action === 'DELETE' ? 'rose' : log.action === 'CREATE' ? 'emerald' : 'amber'}>
										{log.action}
									</Badge>
									<span class="text-xs text-slate-400">{formatDate(log.createdAt)}</span>
								</div>
								<div class="text-sm font-bold text-slate-700">{log.entity} #{log.entityId}</div>
								{#if log.ipAddress}
									<div class="text-xs text-slate-500 mt-1">IP: {log.ipAddress}</div>
								{/if}
							</div>
						{/each}
					{:else}
						<div class="text-center py-12 text-slate-400">
							<iconify-icon icon="solar:history-bold" width="48"></iconify-icon>
							<p class="mt-2 text-sm">No activity logs</p>
						</div>
					{/if}
				</div>
			{:else if activeTab === 'moderation'}
				<div class="space-y-4">
					{#if user.isBanned}
						<div class="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
							<div class="flex items-center gap-2 mb-2">
								<iconify-icon icon="solar:shield-warning-bold" class="text-rose-600"></iconify-icon>
								<h3 class="font-black text-rose-900">User is Banned</h3>
							</div>
							<div class="text-sm text-rose-700 space-y-1">
								<div><strong>Reason:</strong> {user.banReason}</div>
								<div><strong>Banned at:</strong> {formatDate(user.bannedAt)}</div>
							</div>
							<button
								onclick={handleUnban}
								disabled={actionLoading}
								class="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
							>
								Unban User
							</button>
						</div>
					{:else if user.isSuspended}
						<div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
							<div class="flex items-center gap-2 mb-2">
								<iconify-icon icon="solar:clock-circle-bold" class="text-amber-600"></iconify-icon>
								<h3 class="font-black text-amber-900">User is Suspended</h3>
							</div>
							<div class="text-sm text-amber-700 space-y-1">
								<div><strong>Reason:</strong> {user.suspensionReason}</div>
								<div><strong>Until:</strong> {formatDate(user.suspendedUntil)}</div>
							</div>
							<button
								onclick={handleUnsuspend}
								disabled={actionLoading}
								class="mt-3 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors disabled:opacity-50"
							>
								Unsuspend User
							</button>
						</div>
					{/if}

					{#if !user.emailVerified}
						<div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="font-black text-slate-900 mb-1">Email Not Verified</h3>
									<p class="text-sm text-slate-600">Manually verify user's email address</p>
								</div>
								<button
									onclick={handleVerifyEmail}
									disabled={actionLoading}
									class="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
								>
									Verify Email
								</button>
							</div>
						</div>
					{/if}

					{#if !user.isBanned}
						<div class="bg-white border border-slate-200 p-4 rounded-2xl">
							<h3 class="font-black text-slate-900 mb-3">Ban User</h3>
							<input
								type="text"
								bind:value={banReason}
								placeholder="Ban reason..."
								class="w-full px-4 py-2 bg-slate-50 border-2 border-transparent focus:border-rose-200 rounded-xl outline-none mb-3"
							/>
							<button
								onclick={handleBan}
								disabled={actionLoading || !banReason.trim()}
								class="w-full px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
							>
								Ban User Permanently
							</button>
						</div>
					{/if}

					{#if !user.isSuspended && !user.isBanned}
						<div class="bg-white border border-slate-200 p-4 rounded-2xl">
							<h3 class="font-black text-slate-900 mb-3">Suspend User</h3>
							<input
								type="text"
								bind:value={suspensionReason}
								placeholder="Suspension reason..."
								class="w-full px-4 py-2 bg-slate-50 border-2 border-transparent focus:border-amber-200 rounded-xl outline-none mb-3"
							/>
							<div class="flex gap-2 mb-3">
								<button
									onclick={() => suspensionDays = 1}
									class="flex-1 px-3 py-2 rounded-xl font-bold text-sm transition-colors {suspensionDays === 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}"
								>
									1 day
								</button>
								<button
									onclick={() => suspensionDays = 7}
									class="flex-1 px-3 py-2 rounded-xl font-bold text-sm transition-colors {suspensionDays === 7 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}"
								>
									7 days
								</button>
								<button
									onclick={() => suspensionDays = 30}
									class="flex-1 px-3 py-2 rounded-xl font-bold text-sm transition-colors {suspensionDays === 30 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}"
								>
									30 days
								</button>
							</div>
							<button
								onclick={handleSuspend}
								disabled={actionLoading || !suspensionReason.trim()}
								class="w-full px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors disabled:opacity-50"
							>
								Suspend for {suspensionDays} days
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</Modal>
