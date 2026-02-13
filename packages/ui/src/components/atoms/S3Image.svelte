<script lang="ts">
	import type { Snippet } from 'svelte';

	type TrpcClient = {
		media: {
			getDownloadUrl: {
				query: (params: { url: string }) => Promise<{ url: string }>;
			};
		};
	};

	interface Props {
		src: string;
		alt: string;
		class?: string;
		trpc: TrpcClient;
		fallback?: Snippet;
	}

	let { src, alt, class: className = '', trpc, fallback }: Props = $props();

	let presignedUrl = $state<string | null>(null);
	let loading = $state(true);
	let error = $state(false);

	async function loadPresignedUrl() {
		if (!src || !src.includes('storageapi.dev')) {
			presignedUrl = src;
			loading = false;
			return;
		}

		try {
			const result = await trpc.media.getDownloadUrl.query({ url: src });
			presignedUrl = result.url;
			loading = false;
		} catch (err) {
			console.error('Failed to load presigned URL:', err);
			error = true;
			loading = false;
		}
	}

	$effect(() => {
		loadPresignedUrl();
	});
</script>

{#if loading}
	<div class={`animate-pulse bg-slate-200 ${className}`}></div>
{:else if error}
	{#if fallback}
		{@render fallback()}
	{:else}
		<div class={`bg-slate-100 flex items-center justify-center ${className}`}>
			<span class="text-slate-400 text-sm">Image non disponible</span>
		</div>
	{/if}
{:else if presignedUrl}
	<img {alt} src={presignedUrl} class={className} />
{/if}
