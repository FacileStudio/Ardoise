<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { isSmtpNotConfigured } from '@repo/trpc-client';
	import { trpc } from '$lib/trpc';
	import 'iconify-icon';

	type Invitation = Awaited<ReturnType<typeof trpc.invitation.list.query>>[number];

	let invitations = $state<Invitation[]>([]);
	let busyId = $state('');

	onMount(load);

	async function load() {
		try {
			invitations = await trpc.invitation.list.query();
		} catch (err) {
			logger.error({ err }, 'Failed to fetch invitations');
		}
	}

	async function resend(id: string) {
		busyId = id;
		try {
			await trpc.invitation.resend.mutate({ id });
			toast.success('Invitation renvoyée');
			await load();
		} catch (err: any) {
			logger.error({ err }, 'Failed to resend invitation');
			if (!isSmtpNotConfigured(err))
				toast.danger(err.message || 'Échec du renvoi');
		} finally {
			busyId = '';
		}
	}

	async function revoke(id: string) {
		busyId = id;
		try {
			await trpc.invitation.revoke.mutate({ id });
			invitations = invitations.filter((i) => i.id !== id);
		} catch (err: any) {
			logger.error({ err }, 'Failed to revoke invitation');
			toast.danger(err.message || 'Échec de la révocation');
		} finally {
			busyId = '';
		}
	}
</script>

{#if invitations.length > 0}
	<div class="space-y-3">
		<h2 class="text-sm font-semibold text-muted-foreground">Invitations en attente</h2>
		{#each invitations as invitation (invitation.id)}
			<div class="flex items-center justify-between rounded-lg border border-border p-3">
				<div>
					<p class="text-sm font-medium">{invitation.email}</p>
					<p class="text-xs text-muted-foreground">
						{invitation.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'} · expire le
						{new Date(invitation.expiresAt).toLocaleDateString()}
					</p>
				</div>
				<div class="flex items-center gap-1">
					<button
						class="inline-flex h-8 items-center rounded-md px-2 text-xs transition-colors hover:bg-muted disabled:opacity-50"
						disabled={busyId === invitation.id}
						onclick={() => resend(invitation.id)}
					>
						Renvoyer
					</button>
					<button
						class="inline-flex h-8 items-center rounded-md px-2 text-xs text-fc-danger transition-colors hover:bg-fc-danger/10 disabled:opacity-50"
						disabled={busyId === invitation.id}
						onclick={() => revoke(invitation.id)}
					>
						Révoquer
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}
