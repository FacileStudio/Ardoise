<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Input } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { spaceContext } from '$lib/space-context.svelte';
	import { ROLE_LABELS } from '$lib/prestation';
	import 'iconify-icon';

	type Role = 'LEAD' | 'SUBCONTRACTOR';

	let submitting = $state(false);
	let formMessage = $state('');
	let clients: Array<{ id: string; companyName: string }> = $state([]);
	let providers: Array<{ id: string; name: string }> = $state([]);

	let name = $state('');
	let description = $state('');
	let clientId = $state('');
	let linked: Array<{ providerId: string; role: Role }> = $state([]);
	let newProviderId = $state('');
	let newRole = $state<Role>('LEAD');

	const availableProviders = $derived(
		providers.filter((p) => !linked.some((link) => link.providerId === p.id))
	);

	onMount(async () => {
		try {
			const [clientResult, providerResult] = await Promise.all([
				trpc.client.list.query({ page: 1, limit: 100, spaceId: spaceContext.spaceId }),
				trpc.provider.list.query({ page: 1, limit: 100, spaceId: spaceContext.spaceId }),
			]);

			clients = clientResult.clients as unknown as typeof clients;
			providers = providerResult.providers as unknown as typeof providers;
		} catch (err) {
			logger.error({ err }, 'Failed to load clients and providers');
			toast.push('Erreur lors du chargement', 'error');
		}
	});

	function providerName(id: string) {
		return providers.find((p) => p.id === id)?.name ?? id;
	}

	function addProvider() {
		if (!newProviderId)
			return;

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
			const prestation = await trpc.prestation.create.mutate({
				name,
				description: description || undefined,
				clientId,
				providers: linked,
				spaceId: spaceContext.spaceId,
			});

			toast.push('Prestation créée', 'success');
			goto(resolve(`/admin/prestations/${prestation.id}`));
		} catch (err: any) {
			logger.error({ err }, 'Failed to create prestation');
			formMessage = err.message || 'Erreur lors de la création';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-3xl mx-auto p-6 space-y-6">
	<div>
		<button
			onclick={() => goto(resolve('/admin/prestations'))}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
			Retour aux prestations
		</button>
		<h1 class="text-2xl font-bold text-foreground">Nouvelle prestation</h1>
		<p class="text-sm text-muted-foreground mt-1">
			Vous ajouterez les devis, contrats et factures depuis la prestation
		</p>
	</div>

	<form onsubmit={handleSubmit} class="space-y-6">
		{#if formMessage}
			<div class="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formMessage}</div>
		{/if}

		<div class="rounded-xl bg-muted/40 p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Mission</h2>
			<div>
				<div class="text-sm font-medium mb-2">Nom</div>
				<Input bind:value={name} placeholder="Ex: Refonte du site vitrine" />
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Description</div>
				<textarea
					bind:value={description}
					rows="3"
					class="w-full rounded-md bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
				></textarea>
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Client</div>
				<select
					bind:value={clientId}
					class="w-full h-9 rounded-md bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
				>
					<option value="">-- Sélectionner un client --</option>
					{#each clients as client (client.id)}
						<option value={client.id}>{client.companyName}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="rounded-xl bg-muted/40 p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Prestataires</h2>

			{#if linked.length > 0}
				<ul class="space-y-2">
					{#each linked as link (link.providerId)}
						<li class="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
							<span>
								<span class="font-medium text-foreground">{providerName(link.providerId)}</span>
								<span class="text-muted-foreground"> · {ROLE_LABELS[link.role]}</span>
							</span>
							<button
								type="button"
								onclick={() => removeProvider(link.providerId)}
								class="p-1 text-muted-foreground hover:text-red-600"
								title="Retirer"
							>
								<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="flex gap-2">
				<select
					bind:value={newProviderId}
					class="flex-1 h-9 rounded-md bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
				>
					<option value="">-- Ajouter un prestataire --</option>
					{#each availableProviders as provider (provider.id)}
						<option value={provider.id}>{provider.name}</option>
					{/each}
				</select>
				<select
					bind:value={newRole}
					class="h-9 rounded-md bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
				>
					{#each Object.entries(ROLE_LABELS) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
				<Button type="button" intent="secondary" onclick={addProvider} disabled={!newProviderId}>
					Ajouter
				</Button>
			</div>
		</div>

		<div class="flex justify-end gap-3">
			<Button type="button" intent="ghost" onclick={() => goto(resolve('/admin/prestations'))}>
				Annuler
			</Button>
			<Button type="submit" disabled={submitting}>
				{submitting ? 'Création...' : 'Créer la prestation'}
			</Button>
		</div>
	</form>
</div>
