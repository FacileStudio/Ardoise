<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Alert, Badge, Button, ConfirmModal, Page, PageHeader, Spinner, toast, Tooltip } from '@facile/muse';
	import { icons } from '$lib/icons';
	import { i18n } from '@repo/i18n/svelte';
	import { logger } from '@repo/logger';
	import { runAction } from '$lib/mission-actions';
	import { STATUS_LABELS, STATUS_VARIANTS, type MissionStatus } from '$lib/mission';
	import MissionSummary from '$lib/components/mission/MissionSummary.svelte';
	import PrestationsEditor from '$lib/components/mission/PrestationsEditor.svelte';
	import QuoteSection from '$lib/components/mission/QuoteSection.svelte';
	import InvoicesSection from '$lib/components/mission/InvoicesSection.svelte';
	import DocumentsSection from '$lib/components/mission/DocumentsSection.svelte';

	const missionId = $derived($page.params.id as string);

	let pageLoading = $state(true);
	let busy = $state(false);
	let confirmCancel = $state(false);
	let confirmDelete = $state(false);
	let mission: any = $state(null);
	let blockedMessage = $state('');

	const closed = $derived(mission?.status === 'CANCELLED' || mission?.status === 'PAID');

	onMount(async () => {
		await load();
		pageLoading = false;
	});

	async function load() {
		try {
			mission = await trpc.mission.getById.query({ id: missionId });
		} catch (err) {
			logger.error({ err }, 'Failed to fetch mission');
			toast.danger('Mission introuvable');
			goto(resolve('/admin/missions'));
		}
	}

	async function cancelMission() {
		busy = true;

		const ok = await runAction(
			() => trpc.mission.setStatus.mutate({ id: missionId, status: 'CANCELLED' }),
			'Mission annulée',
			"Erreur lors de l'annulation"
		);

		busy = false;

		if (ok) await load();
	}

	async function deleteMission() {
		busy = true;
		blockedMessage = '';

		try {
			await trpc.mission.delete.mutate({ id: missionId });
			toast.success('Mission supprimée');
			goto(resolve('/admin/missions'));
		} catch (err: any) {
			logger.error({ err }, 'Failed to delete mission');
			blockedMessage = err?.message || $i18n.t('import.blocked.mission');
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>{mission?.name ?? 'Mission'} - Ardoise</title></svelte:head>

{#if pageLoading || !mission}
	<div class="flex min-h-[40dvh] items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else}
	<Page width="lg">
		<PageHeader
			title={mission.name}
			description={mission.description || undefined}
			back={{ href: resolve('/admin/missions'), label: 'Retour aux missions' }}
		>
			{#snippet actions()}
				<Badge tone={STATUS_VARIANTS[mission.status as MissionStatus]}>
					{STATUS_LABELS[mission.status as MissionStatus]}
				</Badge>
				{#if !closed}
					<Button variant="ghost" disabled={busy} onclick={() => (confirmCancel = true)}>
						Annuler la mission
					</Button>
				{/if}
				<Tooltip text="Supprimer la mission" describe={false} class="contents">
					<Button
						variant="ghost-danger"
						icon={icons.remove}
						aria-label="Supprimer la mission"
						disabled={busy}
						onclick={() => (confirmDelete = true)}
					/>
				</Tooltip>
			{/snippet}
		</PageHeader>

		{#if blockedMessage}
			<Alert tone="danger" title={$i18n.t('import.blocked.title')}>
				{$i18n.t('import.blocked.mission')}
				{$i18n.t('import.blocked.reason', { message: blockedMessage })}
			</Alert>
		{/if}

		<MissionSummary {mission} onChange={load} />
		<PrestationsEditor {mission} onChange={load} />
		<QuoteSection {mission} onChange={load} />
		<InvoicesSection {mission} onChange={load} />
		<DocumentsSection {mission} onChange={load} />
	</Page>
{/if}

<ConfirmModal
	bind:open={confirmCancel}
	tone="danger"
	title="Annuler cette mission ?"
	description="La mission passe en statut annulée et ne peut plus être modifiée. Les documents et paiements déjà créés sont conservés."
	confirmLabel="Annuler la mission"
	cancelLabel="Garder la mission"
	onConfirm={cancelMission}
/>

<ConfirmModal
	bind:open={confirmDelete}
	tone="danger"
	title="Supprimer cette mission ?"
	description="La mission est supprimée définitivement. Ses prestations sont perdues; les documents et paiements liés ne sont plus rattachés à une mission."
	confirmLabel="Supprimer la mission"
	cancelLabel="Garder la mission"
	onConfirm={deleteMission}
/>
