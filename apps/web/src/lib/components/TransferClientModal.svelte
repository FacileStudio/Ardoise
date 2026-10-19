<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Modal, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { trpc } from '$lib/trpc';

	let { open = $bindable(false), clientId, currentSpaceId, onDone } = $props<{
		open: boolean;
		clientId: string;
		currentSpaceId: string | null;
		onDone?: (relocated: boolean) => void;
	}>();

	let spaces = $state<{ id?: string; name?: string }[]>([]);
	let target = $state('');
	let mode = $state<'copy' | 'move'>('copy');
	let submitting = $state(false);

	const PERSONAL = 'personal';

	const destinations = $derived([
		...(currentSpaceId ? [{ id: PERSONAL, name: 'Espace personnel' }] : []),
		...spaces.filter((s) => s.id !== currentSpaceId).map((s) => ({ id: s.id!, name: s.name! })),
	]);

	onMount(async () => {
		try {
			spaces = await trpc.space.list.query();
		} catch (err) {
			logger.error({ err }, 'Failed to fetch spaces');
		}
	});

	async function submit() {
		if (!target)
			return;

		submitting = true;
		try {
			const { relocated } = await trpc.client.transfer.mutate({
				id: clientId,
				mode,
				targetSpaceId: target === PERSONAL ? null : target,
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
	<div class="space-y-4">
		<div class="grid grid-cols-2 gap-2">
			{#each [['copy', 'Copier'], ['move', 'Déplacer']] as [value, label] (value)}
				<button
					type="button"
					onclick={() => (mode = value as 'copy' | 'move')}
					class="px-3 py-2 rounded-md text-sm font-medium transition-colors {mode === value
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground border border-border hover:bg-muted'}"
				>
					{label}
				</button>
			{/each}
		</div>

		<div>
			<label for="transfer-target" class="text-sm font-medium mb-2 block">Espace de destination</label>
			<select
				id="transfer-target"
				bind:value={target}
				class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
			>
				<option value="" disabled>Choisir un espace</option>
				{#each destinations as destination (destination.id)}
					<option value={destination.id}>{destination.name}</option>
				{/each}
			</select>
		</div>

		<p class="text-xs text-muted-foreground">
			Seules les informations du client sont reprises. Ses missions, paiements et documents restent dans l'espace d'origine.
			Un client qui a déjà un historique est copié plutôt que déplacé.
		</p>

		<div class="flex gap-3">
			<Button variant="outline" class="flex-1" onclick={() => (open = false)} disabled={submitting}>
				Annuler
			</Button>
			<button
				onclick={submit}
				disabled={!target || submitting}
				class="flex-1 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{submitting ? 'En cours...' : mode === 'copy' ? 'Copier' : 'Déplacer'}
			</button>
		</div>
	</div>
</Modal>
