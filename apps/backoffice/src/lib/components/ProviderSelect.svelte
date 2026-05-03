<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';

	interface Provider {
		id: string;
		name: string;
		tvaRate: number;
	}

	interface Props {
		value: string;
		onchange?: (value: string, provider?: Provider) => void;
		required?: boolean;
	}

	let { value = $bindable(), onchange, required = true }: Props = $props();

	let providers: Provider[] = $state([]);
	let loading = $state(false);

	onMount(async () => {
		await loadProviders();
	});

	async function loadProviders() {
		loading = true;
		try {
			const result = await trpc.admin.providers.list.query({ limit: 100, offset: 0 });
			providers = result.data;
		} catch (error: any) {
			logger.error('Failed to load providers', error);
			toast.error('Failed to load providers');
		} finally {
			loading = false;
		}
	}

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
		const provider = providers.find((p) => p.id === target.value);
		onchange?.(target.value, provider);
	}
</script>

<div>
	<div class="block text-sm font-medium mb-2">
		Prestataire {required ? '*' : ''}
	</div>
	<select
		value={value}
		onchange={handleChange}
		class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
		disabled={loading}
		required={required}
	>
		<option value="">
			{loading ? 'Chargement...' : 'Sélectionner un prestataire'}
		</option>
		{#each providers as provider}
			<option value={provider.id}>{provider.name}</option>
		{/each}
	</select>
</div>
