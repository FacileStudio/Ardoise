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
			toast.error('Failed to load clients');
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
	<label class="block text-sm font-medium mb-2">
		Client {required ? '*' : ''}
	</label>
	<select
		value={value}
		onchange={handleChange}
		class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
		disabled={loading}
		required={required}
	>
		<option value="">
			{loading ? 'Chargement...' : 'Sélectionner un client'}
		</option>
		{#each clients as client}
			<option value={client.id}>{client.companyName}</option>
		{/each}
	</select>
</div>
