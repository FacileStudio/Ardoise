<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { Field, Select, toast } from '@facile/muse';
	import { logger } from '@repo/logger';

	interface Client {
		id: string;
		companyName: string;
	}

	interface Props {
		value: string;
		onchange?: (value: string) => void;
		required?: boolean;
	}

	let { value = $bindable(), onchange, required = true }: Props = $props();

	let clients: Client[] = $state([]);
	let loading = $state(false);

	onMount(async () => {
		await loadClients();
	});

	async function loadClients() {
		loading = true;
		try {
			const result = await trpc.client.list.query({ limit: 100, page: 1 });
			clients = result.clients;
		} catch (error: any) {
			logger.error({ err: error }, 'Failed to load clients');
			toast.danger('Failed to load clients');
		} finally {
			loading = false;
		}
	}

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
		onchange?.(target.value);
	}
</script>

<Field label="Client {required ? '*' : ''}">
	<Select {value} onchange={handleChange} disabled={loading} {required}>
		<option value="">
			{loading ? 'Chargement...' : 'Sélectionner un client'}
		</option>
		{#each clients as client (client.id)}
			<option value={client.id}>{client.companyName}</option>
		{/each}
	</Select>
</Field>
