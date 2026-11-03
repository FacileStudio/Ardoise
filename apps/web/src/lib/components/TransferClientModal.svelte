<script lang="ts">
	import { Button, Field, Modal, OptionCards, Select, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { spaceFilter } from '$lib/space-filter.svelte';
	import { trpc } from '$lib/trpc';

	let {
		open = $bindable(false),
		clientId,
		currentSpaceId,
		onDone,
	} = $props<{
		open: boolean;
		clientId: string;
		currentSpaceId: string;
		onDone?: (relocated: boolean) => void;
	}>();

	let target = $state('');
	let mode = $state<'copy' | 'move'>('copy');
	let submitting = $state(false);

	const destinations = $derived(spaceFilter.spaces.filter((s) => s.id !== currentSpaceId));

	async function submit() {
		if (!target) return;

		submitting = true;
		try {
			const { relocated } = await trpc.client.transfer.mutate({
				id: clientId,
				mode,
				targetSpaceId: target,
			});

			open = false;
			if (relocated) {
				toast.success('Client déplacé');
			} else if (mode === 'move') {
				toast.success("Client copié : l'historique reste dans l'espace d'origine");
			} else {
				toast.success('Client copié');
			}
			onDone?.(relocated);
		} catch (err: any) {
			logger.error({ err }, 'Failed to transfer client');
			toast.danger(err.message || 'Échec du transfert');
		} finally {
			submitting = false;
		}
	}
</script>

<Modal bind:open title="Copier ou déplacer le client">
	<div class="flex flex-col gap-4">
		<OptionCards
			label="Mode"
			options={[
				{ value: 'copy', label: 'Copier' },
				{ value: 'move', label: 'Déplacer' },
			]}
			bind:value={mode}
		/>

		<Field label="Espace de destination">
			<Select bind:value={target}>
				<option value="" disabled>Choisir un espace</option>
				{#each destinations as destination (destination.id)}
					<option value={destination.id}>{destination.name}</option>
				{/each}
			</Select>
		</Field>

		<p class="text-fc-xs text-fc-fg-muted">
			Seules les informations du client sont reprises. Ses missions, paiements et documents restent
			dans l'espace d'origine. Un client qui a déjà un historique est copié plutôt que déplacé.
		</p>

		<div class="flex justify-end gap-3">
			<Button variant="ghost" onclick={() => (open = false)} disabled={submitting}>Annuler</Button>
			<Button onclick={submit} disabled={!target || submitting}>
				{submitting ? 'En cours...' : mode === 'copy' ? 'Copier' : 'Déplacer'}
			</Button>
		</div>
	</div>
</Modal>
