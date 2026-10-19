<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Badge, Spinner, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { runAction } from '$lib/mission-actions';
	import { STATUS_LABELS, STATUS_VARIANTS, type MissionStatus } from '$lib/mission';
	import MissionSummary from '$lib/components/mission/MissionSummary.svelte';
	import PrestationsEditor from '$lib/components/mission/PrestationsEditor.svelte';
	import QuoteSection from '$lib/components/mission/QuoteSection.svelte';
	import InvoicesSection from '$lib/components/mission/InvoicesSection.svelte';
	import DocumentsSection from '$lib/components/mission/DocumentsSection.svelte';
	import 'iconify-icon';

	const missionId = $derived($page.params.id as string);

	let pageLoading = $state(true);
	let busy = $state(false);
	let mission: any = $state(null);

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
		if (!confirm('Annuler cette mission ? Cette action est définitive.'))
			return;

		busy = true;

		const ok = await runAction(
			() => trpc.mission.setStatus.mutate({ id: missionId, status: 'CANCELLED' }),
			'Mission annulée',
			"Erreur lors de l'annulation"
		);

		busy = false;

		if (ok)
			await load();
	}

	async function deleteMission() {
		if (!confirm('Supprimer cette mission ?'))
			return;

		busy = true;

		const ok = await runAction(
			() => trpc.mission.delete.mutate({ id: missionId }),
			'Mission supprimée',
			'Erreur lors de la suppression'
		);

		busy = false;

		if (ok)
			goto(resolve('/admin/missions'));
	}
</script>

{#if pageLoading || !mission}
	<div class="flex flex-col items-center justify-center h-screen space-y-4">
		<Spinner />
		<p class="text-sm text-muted-foreground">Chargement...</p>
	</div>
{:else}
	<div class="p-8 max-w-[1100px] mx-auto space-y-6">
		<div>
			<button
				onclick={() => goto(resolve('/admin/missions'))}
				class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
				Retour aux missions
			</button>

			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div class="flex items-center gap-3">
						<h1 class="text-2xl font-bold text-foreground">{mission.name}</h1>
						<Badge tone={STATUS_VARIANTS[mission.status as MissionStatus]}>
							{STATUS_LABELS[mission.status as MissionStatus]}
						</Badge>
					</div>
					{#if mission.description}
						<p class="text-sm text-muted-foreground mt-1 max-w-2xl">{mission.description}</p>
					{/if}
				</div>

				<div class="flex flex-wrap gap-2">
					{#if !closed}
						<button
							disabled={busy}
							onclick={cancelMission}
							class="rounded-md px-4 h-9 text-sm font-medium text-muted-foreground cursor-pointer hover:text-fc-danger hover:bg-muted disabled:opacity-50"
						>
							Annuler la mission
						</button>
					{/if}
					<button
						disabled={busy}
						onclick={deleteMission}
						class="rounded-md px-3 h-9 text-muted-foreground cursor-pointer hover:text-fc-danger hover:bg-muted disabled:opacity-50"
						title="Supprimer"
					>
						<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
					</button>
				</div>
			</div>
		</div>

		<MissionSummary {mission} onChange={load} />
		<PrestationsEditor {mission} onChange={load} />
		<QuoteSection {mission} onChange={load} />
		<InvoicesSection {mission} onChange={load} />
		<DocumentsSection {mission} onChange={load} />
	</div>
{/if}
