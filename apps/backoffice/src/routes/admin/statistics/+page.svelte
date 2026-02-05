<script lang="ts">
	import { AdminAutoStats } from '@repo/ui';
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { logger } from '@repo/logger';

	let loading = $state(true);
	let userStats: any = $state(null);
	let contactStats: any = $state(null);

	onMount(async () => {
		await Promise.all([fetchUserStats(), fetchContactStats()]);
		loading = false;
	});

	async function fetchUserStats() {
		try {
			userStats = await trpc.user.getStats.query();
		} catch (err) {
			logger.error({ err }, 'Failed to fetch user statistics');
		}
	}

	async function fetchContactStats() {
		try {
			contactStats = await trpc.contact.list.query({});
		} catch (err) {
			logger.error({ err }, 'Failed to fetch contact statistics');
		}
	}

	const stats = $derived(() => {
		if (!userStats) return [];
		return [
			{
				title: 'Total Users',
				value: userStats.totalUsers || 0,
				icon: 'solar:users-group-two-rounded-bold',
				color: 'indigo' as const,
			},
			{
				title: 'Active Users',
				value: userStats.activeUsers || 0,
				icon: 'solar:user-check-rounded-bold',
				color: 'emerald' as const,
			},
			{
				title: 'Suspended',
				value: userStats.suspendedUsers || 0,
				icon: 'solar:user-block-rounded-bold',
				color: 'amber' as const,
			},
			{
				title: 'Banned',
				value: userStats.bannedUsers || 0,
				icon: 'solar:user-cross-rounded-bold',
				color: 'rose' as const,
			},
			{
				title: 'Premium Users',
				value: userStats.premiumUsers || 0,
				icon: 'solar:crown-bold',
				color: 'violet' as const,
			},
			{
				title: 'Total Contacts',
				value: contactStats?.data?.length || 0,
				icon: 'solar:letter-bold',
				color: 'cyan' as const,
			},
		];
	});

	const userGrowthData = $derived(() => {
		if (!userStats?.userGrowth) return [];
		return userStats.userGrowth.map((item: any) => ({
			x: item.date,
			y: item.count,
		}));
	});

	const userRoleDistribution = $derived(() => {
		if (!userStats) return [];
		return [
			{ label: 'Users', value: (userStats.totalUsers || 0) - (userStats.adminUsers || 0) },
			{ label: 'Admins', value: userStats.adminUsers || 0 },
		];
	});

	const userStatusDistribution = $derived(() => {
		if (!userStats) return [];
		return [
			{ label: 'Active', value: userStats.activeUsers || 0 },
			{ label: 'Suspended', value: userStats.suspendedUsers || 0 },
			{ label: 'Banned', value: userStats.bannedUsers || 0 },
			{ label: 'Pending', value: userStats.pendingUsers || 0 },
		];
	});

	const charts = $derived(() => {
		const chartList = [];

		if (userGrowthData().length > 0) {
			chartList.push({
				title: 'User Growth',
				description: 'New user registrations over time',
				type: 'area' as const,
				data: userGrowthData(),
				x: 'x',
				y: 'y',
				color: '#4f46e5',
				height: 300,
			});
		}

		if (userStatusDistribution().some((d: any) => d.value > 0)) {
			chartList.push({
				title: 'User Status Distribution',
				description: 'Breakdown of users by status',
				type: 'pie' as const,
				data: userStatusDistribution(),
				value: 'value',
				label: 'label',
				colors: ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'],
				height: 300,
			});
		}

		if (userRoleDistribution().some((d: any) => d.value > 0)) {
			chartList.push({
				title: 'User Role Distribution',
				description: 'Breakdown of users by role',
				type: 'bar' as const,
				data: userRoleDistribution(),
				x: 'label',
				y: 'value',
				color: '#8b5cf6',
				height: 300,
			});
		}

		return chartList;
	});
</script>

<div class="p-8 max-w-[1400px] mx-auto">
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
		</div>
	{:else}
		<AdminAutoStats
			title="Platform Statistics"
			description="Overview of platform metrics and analytics"
			stats={stats()}
			charts={charts()}
		/>
	{/if}
</div>
