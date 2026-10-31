<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { toast } from '@facile/muse';
	import { logger } from '@repo/logger';

	interface Provider {
		id: string;
		name: string;
		tvaRate: string;
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
			const result = await trpc.provider.list.query({ limit: 100, page: 1 });
			providers = result.providers;
		} catch (error: any) {
			logger.error({ err: error }, 'Failed to load providers');
			toast.danger('Failed to load providers');
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
	<div class="block text-sm font-medium text-foreground mb-2">
		Prestataire {required ? '*' : ''}
	</div>
	<select
		value={value}
		onchange={handleChange}
		class="w-full h-9 px-3 text-sm bg-transparent border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
		disabled={loading}
		required={required}
	>
		<option value="">
			{loading ? 'Chargement...' : 'Sélectionner un prestataire'}
		</option>
		{#each providers as provider (provider.id)}
			<option value={provider.id}>{provider.name}</option>
		{/each}
	</select>
</div>
