<script lang="ts">
	import { Button, Dropzone, EmptyState, UploadProgress } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import { icons, ardoise } from '$lib/icons';
	import { PDF_MAX_BYTES, uploadPdf } from '$lib/import';

	interface Props {
		pdfKey?: string | null;
		storedUrl?: string | null;
		uploading?: boolean;
		error?: string;
		onpicked?: (file: File) => void;
		onclear?: () => void;
	}

	let {
		pdfKey = $bindable(null),
		storedUrl = null,
		uploading = $bindable(false),
		error = '',
		onpicked,
		onclear,
	}: Props = $props();

	let localUrl = $state<string | null>(null);
	let fileName = $state('');
	let fileSize = $state(0);
	let progress = $state(0);
	let failed = $state(false);
	let replacing = $state(false);
	let rejected = $state(false);
	let files = $state<File[]>([]);

	const previewUrl = $derived(localUrl ?? (replacing ? null : storedUrl));
	const showDropzone = $derived(!previewUrl || replacing);

	const items = $derived(
		uploading || failed
			? [
					{
						id: 'pdf',
						name: fileName,
						size: fileSize,
						progress,
						status: failed ? ('error' as const) : ('uploading' as const),
						error: failed ? $i18n.t('import.drop.failed') : undefined,
					},
				]
			: []
	);

	async function handleFiles(accepted: File[]) {
		const file = accepted[0];
		if (!file) return;

		rejected = false;
		failed = false;
		replacing = false;
		if (localUrl) URL.revokeObjectURL(localUrl);
		localUrl = URL.createObjectURL(file);
		fileName = file.name;
		fileSize = file.size;
		progress = 0;
		uploading = true;
		onpicked?.(file);

		try {
			pdfKey = await uploadPdf(file, (percent) => (progress = percent));
		} catch (err) {
			logger.error({ err }, 'PDF upload failed');
			failed = true;
			pdfKey = null;
		} finally {
			uploading = false;
			files = [];
		}
	}

	function clear() {
		if (localUrl) URL.revokeObjectURL(localUrl);
		localUrl = null;
		pdfKey = null;
		failed = false;
		replacing = false;
		fileName = '';
		onclear?.();
	}
</script>

<div class="flex flex-col gap-3">
	{#if showDropzone}
		<Dropzone
			bind:files
			accept="application/pdf"
			maxSize={PDF_MAX_BYTES}
			disabled={uploading}
			label={$i18n.t('import.drop.label')}
			hint={$i18n.t('import.drop.hint')}
			onFiles={handleFiles}
			onReject={() => (rejected = true)}
		/>
		{#if rejected}
			<p class="text-fc-xs text-fc-danger" role="alert">{$i18n.t('import.drop.reject')}</p>
		{/if}
		{#if replacing}
			<Button variant="ghost" size="sm" onclick={() => (replacing = false)}>
				{$i18n.t('import.cancel')}
			</Button>
		{/if}
	{/if}

	{#if items.length > 0}
		<UploadProgress {items} onRetry={() => clear()} />
	{/if}

	{#if previewUrl && !replacing}
		<div class="flex items-center justify-between gap-2">
			<span class="truncate text-fc-sm font-medium text-fc-fg">
				{fileName || $i18n.t('import.drop.current')}
			</span>
			<div class="flex shrink-0 gap-1">
				<Button variant="ghost" size="sm" onclick={() => (replacing = true)}>
					{$i18n.t('import.drop.replace')}
				</Button>
				<Button
					variant="ghost-danger"
					size="sm"
					icon={icons.remove}
					aria-label={$i18n.t('import.drop.remove')}
					onclick={clear}
				/>
			</div>
		</div>
		<iframe
			title={$i18n.t('import.drop.preview')}
			src={previewUrl}
			class="h-[60dvh] w-full rounded-fc-md bg-fc-surface lg:h-[72dvh]"
		></iframe>
	{:else if !showDropzone}
		<EmptyState bare icon={ardoise.pdf} title={$i18n.t('import.drop.none')} />
	{/if}

	{#if error}
		<p class="text-fc-xs text-fc-danger" role="alert">{error}</p>
	{/if}
</div>
