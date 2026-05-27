<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { toast } from '@repo/utils';
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
			const result = await trpc.client.list.query({ limit: 100, offset: 0 });
			clients = result.data;
		} catch (error: any) {
			logger.error('Failed to load clients', error);
			toast.push('Failed to load clients', 'error');
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

<div>
	<div class="block text-sm font-medium text-foreground mb-2">
		Client {required ? '*' : ''}
	</div>
	<select
		value={value}
		onchange={handleChange}
		class="w-full h-9 px-3 text-sm bg-transparent border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
		disabled={loading}
		required={required}
	>
		<option value="">
			{loading ? 'Chargement...' : 'Sélectionner un client'}
		</option>
		{#each clients as client (client.id)}
			<option value={client.id}>{client.companyName}</option>
		{/each}
	</select>
</div>
