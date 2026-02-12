<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Spinner, Badge, Card } from '@repo/ui';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let userId = $derived($page.params.id);
	let pageLoading = $state(true);
	let user: any = $state(null);

	onMount(async () => {
		await fetchUser();
	});

	async function fetchUser() {
		pageLoading = true;
		try {
			user = await trpc.user.getById.query({ id: userId });
		} catch (err) {
			logger.error({ err }, 'Failed to fetch user');
		} finally {
			pageLoading = false;
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(date));
	}

	function formatDateShort(date: Date | string | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(new Date(date));
	}

	function formatCurrency(amount: number | string) {
		const num = typeof amount === 'string' ? parseFloat(amount) : amount;
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(num);
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'ACTIVE': return 'emerald';
			case 'PENDING': return 'amber';
			case 'SUSPENDED': return 'rose';
			case 'BANNED': return 'rose';
			default: return 'slate';
		}
	}

	function getRoleColor(role: string) {
		switch (role) {
			case 'ADMIN': return 'rose';
			case 'CLIENT': return 'indigo';
			default: return 'slate';
		}
	}

	function getPaymentStatusColor(status: string) {
		switch (status) {
			case 'PAID': return 'emerald';
			case 'PENDING': return 'amber';
			case 'EXPIRED': return 'rose';
			case 'CANCELLED': return 'slate';
			default: return 'slate';
		}
	}
</script>

<div class="p-8 max-w-[1400px] mx-auto space-y-6">
	{#if pageLoading}
		<div class="py-20 flex justify-center">
			<Spinner size="xl" />
		</div>
	{:else if user}
		<header class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<button
					onclick={() => goto('/admin/users')}
					class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
					title="Back to users"
				>
					<iconify-icon icon="solar:arrow-left-bold" width="24"></iconify-icon>
				</button>
				<div class="flex items-center gap-3">
					{#if user.avatar?.url}
						<img src={user.avatar.url} alt={user.firstName} class="w-16 h-16 rounded-xl object-cover" />
					{:else}
						<div class="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-2xl">
							{user.firstName[0]}
						</div>
					{/if}
					<div>
						<h1 class="text-3xl font-black text-slate-900 tracking-tighter">
							{user.firstName} {user.lastName}
						</h1>
						<p class="text-slate-500 text-sm mt-1">{user.email}</p>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<Badge variant={getRoleColor(user.role)}>
					{user.role}
				</Badge>
				<Badge variant={getStatusColor(user.status)}>
					{user.status}
				</Badge>
				{#if user.emailVerified}
					<Badge variant="emerald">
						<iconify-icon icon="solar:check-circle-bold" width="14"></iconify-icon>
						Verified
					</Badge>
				{/if}
			</div>
		</header>

		<div class="grid grid-cols-3 gap-6">
			<div class="col-span-2 space-y-6">
				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-6">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-[#291334]/10 flex items-center justify-center text-[#291334]">
								<iconify-icon icon="solar:user-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">User Information</h2>
								<p class="text-sm text-slate-500">Account details</p>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">First Name</div>
								<div class="font-bold text-slate-900">{user.firstName}</div>
							</div>

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Last Name</div>
								<div class="font-bold text-slate-900">{user.lastName}</div>
							</div>

							<div class="col-span-2">
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Email</div>
								<div class="font-bold text-slate-900">{user.email}</div>
							</div>

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Role</div>
								<Badge variant={getRoleColor(user.role)}>{user.role}</Badge>
							</div>

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Status</div>
								<Badge variant={getStatusColor(user.status)}>{user.status}</Badge>
							</div>
						</div>
					</div>
				</Card>

				{#if user.client}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-6">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
									<iconify-icon icon="solar:buildings-2-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Client Profile</h2>
									<p class="text-sm text-slate-500">Company information</p>
								</div>
							</div>

							<div class="space-y-4">
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Company Name</div>
									<button
										onclick={() => goto(`/admin/clients/${user.client.id}`)}
										class="text-lg font-bold text-[#291334] hover:underline"
									>
										{user.client.companyName}
									</button>
								</div>

								{#if user.client.siret}
									<div>
										<div class="text-xs font-black uppercase text-slate-400 mb-2">SIRET</div>
										<div class="font-mono text-sm text-slate-700">{user.client.siret}</div>
									</div>
								{/if}

								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Billing Address</div>
									<div class="text-sm text-slate-600">
										<div>{user.client.billingAddress}</div>
										<div>{user.client.billingCity}</div>
										<div>{user.client.billingCountry}</div>
									</div>
								</div>
							</div>
						</div>
					</Card>
				{/if}

				{#if user.client?.payments && user.client.payments.length > 0}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-[#FEC129]/10 flex items-center justify-center text-[#FEC129]">
									<iconify-icon icon="solar:wallet-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Payments</h2>
									<p class="text-sm text-slate-500">{user.client.payments.length} {user.client.payments.length > 1 ? 'payments' : 'payment'}</p>
								</div>
							</div>

							<div class="space-y-3">
								{#each user.client.payments as payment (payment.id)}
									<div class="flex items-center gap-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:border-[#FEC129] transition-all cursor-pointer" onclick={() => goto(`/admin/payments/${payment.id}`)}>
										<div class="p-3 bg-white rounded-xl shadow-sm">
											<iconify-icon
												icon={payment.status === 'PAID' ? 'solar:check-circle-bold' : payment.status === 'PENDING' ? 'solar:clock-circle-bold' : 'solar:close-circle-bold'}
												width="24"
												class={payment.status === 'PAID' ? 'text-emerald-600' : payment.status === 'PENDING' ? 'text-amber-600' : 'text-rose-600'}
											></iconify-icon>
										</div>
										<div class="flex-1">
											<div class="flex items-center justify-between mb-1">
												<span class="text-lg font-black text-slate-900">{formatCurrency(payment.totalWithFees)}</span>
												<Badge variant={getPaymentStatusColor(payment.status)}>{payment.status}</Badge>
											</div>
											<div class="text-sm text-slate-600 mb-1">{payment.description}</div>
											<div class="text-xs text-slate-500">
												Due: {formatDateShort(payment.dueDate)}
												{#if payment.paidAt}
													• Paid: {formatDateShort(payment.paidAt)}
												{/if}
											</div>
										</div>
										<div class="p-2 text-[#291334]">
											<iconify-icon icon="solar:eye-bold" width="18"></iconify-icon>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}

				{#if user.sessions && user.sessions.length > 0}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
									<iconify-icon icon="solar:history-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Recent Sessions</h2>
									<p class="text-sm text-slate-500">{user.sessions.length} sessions</p>
								</div>
							</div>

							<div class="space-y-2">
								{#each user.sessions as session (session.id)}
									<div class="p-3 bg-slate-50 rounded-lg">
										<div class="flex items-center justify-between">
											<div class="text-sm text-slate-700">{formatDate(session.createdAt)}</div>
											{#if session.expiresAt && new Date(session.expiresAt) > new Date()}
												<Badge variant="emerald">Active</Badge>
											{:else}
												<Badge variant="slate">Expired</Badge>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}
			</div>

			<div class="space-y-6">
				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-4">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-[#291334]/10 flex items-center justify-center text-[#291334]">
								<iconify-icon icon="solar:calendar-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">Dates</h2>
							</div>
						</div>

						<div class="space-y-3">
							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-1">Created</div>
								<div class="text-sm text-slate-700">{formatDate(user.createdAt)}</div>
							</div>

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-1">Last Updated</div>
								<div class="text-sm text-slate-700">{formatDate(user.updatedAt)}</div>
							</div>

							{#if user.lastLoginAt}
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-1">Last Login</div>
									<div class="text-sm text-slate-700">{formatDate(user.lastLoginAt)}</div>
								</div>
							{/if}

							{#if user.emailVerifiedAt}
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-1">Email Verified</div>
									<div class="text-sm text-slate-700">{formatDate(user.emailVerifiedAt)}</div>
								</div>
							{/if}
						</div>
					</div>
				</Card>

				{#if user.auditLogs && user.auditLogs.length > 0}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
									<iconify-icon icon="solar:document-text-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Recent Activity</h2>
									<p class="text-sm text-slate-500">{user.auditLogs.length} events</p>
								</div>
							</div>

							<div class="space-y-2 max-h-96 overflow-y-auto">
								{#each user.auditLogs as log (log.id)}
									<div class="p-3 bg-slate-50 rounded-lg">
										<div class="flex items-start justify-between gap-2">
											<div class="flex-1">
												<div class="text-sm font-bold text-slate-900">{log.action}</div>
												{#if log.details}
													<div class="text-xs text-slate-600 mt-1">{log.details}</div>
												{/if}
											</div>
											<div class="text-xs text-slate-500 whitespace-nowrap">{formatDateShort(log.createdAt)}</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}
			</div>
		</div>
	{:else}
		<div class="text-center py-20">
			<iconify-icon icon="solar:user-bold" width="64" class="text-slate-300"></iconify-icon>
			<h2 class="text-2xl font-black text-slate-900 mt-4">User not found</h2>
			<p class="text-slate-500 mt-2">This user does not exist or has been deleted.</p>
			<button
				onclick={() => goto('/admin/users')}
				class="mt-6 px-6 py-3 bg-[#291334] text-white rounded-xl font-bold hover:shadow-lg transition-all"
			>
				Back to users
			</button>
		</div>
	{/if}
</div>
