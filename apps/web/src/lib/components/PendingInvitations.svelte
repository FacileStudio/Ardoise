<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge, Button, Table, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { isSmtpNotConfigured } from '@repo/trpc-client';
	import { trpc } from '$lib/trpc';

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
	<div class="flex flex-col gap-3">
		<h3 class="text-fc-sm font-semibold text-fc-fg">Invitations en attente</h3>
		<Table>
			<thead>
				<tr>
					<th scope="col">Email</th>
					<th scope="col">Rôle</th>
					<th scope="col">Expire le</th>
					<th scope="col" class="text-right"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each invitations as invitation (invitation.id)}
					<tr>
						<td class="font-medium">{invitation.email}</td>
						<td>
							<Badge tone={invitation.role === 'ADMIN' ? 'admin' : 'neutral'}>
								{invitation.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
							</Badge>
						</td>
						<td class="text-fc-fg-muted">
							{new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}
						</td>
						<td class="text-right">
							<Button
								variant="ghost"
								size="sm"
								disabled={busyId === invitation.id}
								onclick={() => resend(invitation.id)}
							>
								Renvoyer
							</Button>
							<Button
								variant="ghost-danger"
								size="sm"
								disabled={busyId === invitation.id}
								onclick={() => revoke(invitation.id)}
							>
								Révoquer
							</Button>
						</td>
					</tr>
				{/each}
			</tbody>
		</Table>
	</div>
{/if}
