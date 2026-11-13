<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Field,
		Input,
		Page,
		PageHeader,
		Section,
		Select,
		Textarea,
		toast,
		Tooltip,
	} from '@facile/muse';
	import { icons } from '$lib/icons';
	import { logger } from '@repo/logger';
	import { spaceFilter } from '$lib/space-filter.svelte';
	import { ROLE_LABELS } from '$lib/mission';

	type Role = 'LEAD' | 'SUBCONTRACTOR';

	let submitting = $state(false);
	let formMessage = $state('');
	let clients: Array<{ id: string; companyName: string }> = $state([]);
	let providers: Array<{ id: string; name: string }> = $state([]);

	let name = $state('');
	let description = $state('');
	let clientId = $state('');
	let deposit = $state('');
	let linked: Array<{ providerId: string; role: Role }> = $state([]);
	let newProviderId = $state('');
	let newRole = $state<Role>('LEAD');

	const availableProviders = $derived(
		providers.filter((p) => !linked.some((link) => link.providerId === p.id))
	);

	onMount(async () => {
		try {
			const [clientResult, providerResult] = await Promise.all([
				trpc.client.list.query({ page: 1, limit: 100, spaceId: spaceFilter.spaceId }),
				trpc.provider.list.query({ page: 1, limit: 100 }),
			]);

			clients = clientResult.clients as unknown as typeof clients;
			providers = providerResult.providers as unknown as typeof providers;
		} catch (err) {
			logger.error({ err }, 'Failed to load clients and providers');
			toast.danger('Erreur lors du chargement');
		}
	});

	function providerName(id: string) {
		return providers.find((p) => p.id === id)?.name ?? id;
	}

	function addProvider() {
		if (!newProviderId) return;

		linked = [...linked, { providerId: newProviderId, role: newRole }];
		newProviderId = '';
		newRole = 'SUBCONTRACTOR';
	}

	function removeProvider(providerId: string) {
		linked = linked.filter((link) => link.providerId !== providerId);
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		formMessage = '';

		if (!name.trim()) {
			formMessage = 'Veuillez saisir un nom';
			return;
		}

		if (!clientId) {
			formMessage = 'Veuillez sélectionner un client';
			return;
		}

		submitting = true;

		try {
			const mission = await trpc.mission.create.mutate({
				name,
				description: description || undefined,
				clientId,
				depositPercent: deposit ? Number(deposit) : undefined,
				providers: linked,
				spaceId: spaceFilter.spaceId,
			});

			toast.success('Mission créée');
			goto(resolve(`/admin/missions/${mission.id}`));
		} catch (err: any) {
			logger.error({ err }, 'Failed to create mission');
			formMessage = err.message || 'Erreur lors de la création';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Nouvelle mission - Ardoise</title></svelte:head>

<Page width="md">
	<PageHeader
		title="Nouvelle mission"
		description="Vous ajouterez les prestations depuis la mission, puis vous générerez son devis et sa facture"
		back={{ href: resolve('/admin/missions'), label: 'Retour aux missions' }}
	/>

	<form onsubmit={handleSubmit} class="flex flex-col gap-6">
		{#if formMessage}
			<Alert tone="danger">{formMessage}</Alert>
		{/if}

		<Section title="Mission" card>
			<Field label="Nom">
				<Input bind:value={name} placeholder="Ex: Refonte du site vitrine" />
			</Field>
			<Field label="Description">
				<Textarea bind:value={description} rows={3} />
			</Field>
			<Field label="Client">
				<Select bind:value={clientId}>
					<option value="">-- Sélectionner un client --</option>
					{#each clients as client (client.id)}
						<option value={client.id}>{client.companyName}</option>
					{/each}
				</Select>
			</Field>
			<Field
				label="Acompte (%)"
				helper="Part du devis facturable en acompte. Laissez vide si la mission n'en prévoit pas."
			>
				<Input
					type="number"
					min="0"
					max="100"
					step="0.5"
					bind:value={deposit}
					placeholder="Aucun acompte"
				/>
			</Field>
		</Section>

		<Section title="Prestataires" card>
			{#if linked.length > 0}
				<ul class="flex flex-col gap-2">
					{#each linked as link (link.providerId)}
						<li
							class="flex items-center justify-between rounded-fc-md bg-fc-surface px-3 py-2 text-fc-sm"
						>
							<span>
								<span class="font-medium text-fc-fg">{providerName(link.providerId)}</span>
								<span class="text-fc-fg-muted"> · {ROLE_LABELS[link.role]}</span>
							</span>
							<Tooltip text="Retirer" describe={false} class="contents">
								<Button
									type="button"
									variant="ghost-danger"
									size="sm"
									icon={icons.remove}
									aria-label="Retirer"
									onclick={() => removeProvider(link.providerId)}
								/>
							</Tooltip>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="flex flex-col gap-2 sm:flex-row">
				<Select bind:value={newProviderId} aria-label="Prestataire" class="sm:flex-1">
					<option value="">-- Ajouter un prestataire --</option>
					{#each availableProviders as provider (provider.id)}
						<option value={provider.id}>{provider.name}</option>
					{/each}
				</Select>
				<Select bind:value={newRole} aria-label="Rôle" class="sm:w-48">
					{#each Object.entries(ROLE_LABELS) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</Select>
				<Button
					type="button"
					variant="ghost"
					size="lg"
					onclick={addProvider}
					disabled={!newProviderId}
				>
					Ajouter
				</Button>
			</div>
		</Section>

		<div class="flex justify-end gap-3">
			<Button href={resolve('/admin/missions')} variant="ghost">Annuler</Button>
			<Button type="submit" disabled={submitting}>
				{submitting ? 'Création...' : 'Créer la mission'}
			</Button>
		</div>
	</form>
</Page>
