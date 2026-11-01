<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Badge,
		Button,
		ConfirmModal,
		Dropzone,
		EmptyState,
		Field,
		Input,
		Page,
		PageHeader,
		Section,
		Select,
		Spinner,
		toast,
	} from '@facile/muse';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import { ardoise, icons } from '$lib/icons';
	import PdfPane from '$lib/components/PdfPane.svelte';
	import SendForSignature from '$lib/components/SendForSignature.svelte';
	import SignatureStatus from '$lib/components/SignatureStatus.svelte';
	import { loadSignatureEnabled } from '$lib/signature';
	import { downloadDocument } from '$lib/download-document';
	import { spaceContext } from '$lib/space-context.svelte';
	import {
		PDF_MAX_BYTES,
		IMPORT_TYPES,
		SIGNATURE_STATUSES,
		asImportType,
		base64ToPdfUrl,
		isSignableType,
		toDateInput,
		todayInput,
		uploadPdf,
	} from '$lib/import';

	type Option = { id: string; label: string };

	const documentId = $derived($page.params.id as string);
	const today = todayInput();

	let doc = $state<any>(null);
	let loading = $state(true);
	let saving = $state(false);
	let savingSignature = $state(false);
	let attempted = $state(false);
	let confirmDelete = $state(false);
	let signatureEnabled = $state(false);
	let storedUrl = $state<string | null>(null);
	let pdfKey = $state<string | null>(null);
	let pdfCleared = $state(false);
	let uploading = $state(false);
	let signedPdfKey = $state<string | null>(null);
	let signedFiles = $state<File[]>([]);
	let signedUploading = $state(false);
	let signedName = $state('');
	let pdfStale = $state(false);
	let clients = $state<Option[]>([]);
	let missions = $state<Option[]>([]);
	let providers = $state<Option[]>([]);
	let docTypes = $state<Array<{ value: string; label: string }>>([]);

	let form = $state({
		name: '',
		type: '',
		number: '',
		clientId: '',
		missionId: '',
		providerId: '',
		issuedAt: '',
		total: '',
	});

	let signature = $state({ status: 'none' as string, signedAt: '' });

	const signable = $derived(doc ? isSignableType(doc.type) : false);
	const imported = $derived(doc?.source === 'imported');
	const signatureOptions = $derived(
		signature.status === 'sent' ? ['sent', ...SIGNATURE_STATUSES] : [...SIGNATURE_STATUSES]
	);

	const errors = $derived.by(() => {
		const e: Record<string, string> = {};
		const total = Number(form.total);

		if (!form.name.trim()) e.name = $i18n.t('import.errors.name');
		if (!form.type) e.type = $i18n.t('import.errors.type');
		if (!form.issuedAt) e.issuedAt = $i18n.t('import.errors.issueDate');
		if (form.total === '' || !Number.isFinite(total) || total < 0)
			e.total = $i18n.t('import.errors.total');

		return e;
	});

	const signatureError = $derived(
		signature.status === 'signed' && !signature.signedAt ? $i18n.t('import.errors.signedAt') : ''
	);

	function baseline(source: any) {
		return {
			name: source.name ?? '',
			type: source.type ?? '',
			number: source.invoiceNumber || source.quoteNumber || source.contractRef || '',
			missionId: source.missionId ?? '',
			providerId: source.providerId ?? '',
			issuedAt: toDateInput(source.issuedAt ?? source.createdAt),
			total: Number(source.total ?? 0),
		};
	}

	function fill(source: any) {
		doc = source;
		form = {
			name: source.name ?? '',
			type: source.type ?? '',
			number: source.invoiceNumber || source.quoteNumber || source.contractRef || '',
			clientId: '',
			missionId: source.missionId ?? '',
			providerId: source.providerId ?? '',
			issuedAt: toDateInput(source.issuedAt ?? source.createdAt),
			total: String(Number(source.total ?? 0)),
		};
		signature = { status: source.signatureStatus ?? 'none', signedAt: toDateInput(source.signedAt) };
	}

	async function loadPreview() {
		if (storedUrl) URL.revokeObjectURL(storedUrl);
		storedUrl = null;

		try {
			const result = await trpc.document.download.mutate({ id: documentId });
			storedUrl = base64ToPdfUrl(result.pdf);
		} catch (err) {
			logger.error({ err }, 'Failed to load document preview');
		}
	}

	async function load() {
		try {
			fill(await trpc.document.get.query({ id: documentId }));
		} catch (err) {
			logger.error({ err }, 'Failed to load document');
			doc = null;
		}
	}

	onMount(() => {
		loadSignatureEnabled().then((enabled) => (signatureEnabled = enabled));
		Promise.all([
			load(),
			trpc.document.types.query().then((list) => (docTypes = list)),
			trpc.client.list
				.query({ limit: 100, page: 1 })
				.then((r: any) => (clients = r.clients.map((c: any) => ({ id: c.id, label: c.companyName })))),
			trpc.mission.list
				.query({ limit: 100, page: 1, spaceId: spaceContext.spaceId })
				.then((r: any) => (missions = r.missions.map((m: any) => ({ id: m.id, label: m.name })))),
			trpc.provider.list
				.query({ limit: 100, page: 1, spaceId: spaceContext.spaceId })
				.then((r: any) => (providers = r.providers.map((p: any) => ({ id: p.id, label: p.name })))),
		])
			.catch((err) => logger.error({ err }, 'Failed to load document options'))
			.finally(() => (loading = false));
		loadPreview();

		return () => {
			if (storedUrl) URL.revokeObjectURL(storedUrl);
		};
	});

	async function save() {
		attempted = true;
		if (uploading) return void toast.danger($i18n.t('import.errors.uploading'));
		if (Object.keys(errors).length > 0) return;

		saving = true;
		try {
			const original = baseline(doc);
			const number = form.number.trim() || null;
			const result = await trpc.document.update.mutate({
				id: documentId,
				name: form.name.trim() !== original.name ? form.name.trim() : undefined,
				type: imported && form.type !== original.type ? asImportType(form.type) : undefined,
				number: number !== (original.number || null) ? number : undefined,
				clientId: form.clientId || undefined,
				missionId: form.missionId !== original.missionId ? form.missionId || null : undefined,
				providerId: form.providerId !== original.providerId ? form.providerId || undefined : undefined,
				issuedAt: form.issuedAt !== original.issuedAt ? new Date(form.issuedAt) : undefined,
				total: imported && Number(form.total) !== Number(original.total) ? Number(form.total) : undefined,
				pdfKey: pdfCleared ? null : (pdfKey ?? undefined),
			});
			pdfStale = result.pdfStale;
			toast.success($i18n.t('import.detail.saved'));
			attempted = false;
			pdfKey = null;
			pdfCleared = false;
			await Promise.all([load(), loadPreview()]);
		} catch (err: any) {
			logger.error({ err }, 'Failed to update document');
			toast.danger(err?.message || $i18n.t('errors.serverError'));
		} finally {
			saving = false;
		}
	}

	async function handleSignedFiles(files: File[]) {
		const file = files[0];
		if (!file) return;

		signedUploading = true;
		signedName = file.name;
		try {
			signedPdfKey = await uploadPdf(file, () => {});
		} catch (err) {
			logger.error({ err }, 'Signed PDF upload failed');
			signedPdfKey = null;
			toast.danger($i18n.t('import.drop.failed'));
		} finally {
			signedUploading = false;
			signedFiles = [];
		}
	}

	async function saveSignature() {
		if (signatureError || signedUploading) return;

		savingSignature = true;
		try {
			await trpc.document.setSignature.mutate({
				id: documentId,
				status: signature.status as (typeof SIGNATURE_STATUSES)[number],
				signedAt: signature.status === 'signed' ? new Date(signature.signedAt) : undefined,
				signedPdfKey: signedPdfKey ?? undefined,
			});
			toast.success($i18n.t('import.detail.signatureSaved'));
			signedPdfKey = null;
			signedName = '';
			await Promise.all([load(), loadPreview()]);
		} catch (err: any) {
			logger.error({ err }, 'Failed to set signature');
			toast.danger(err?.message || $i18n.t('errors.serverError'));
		} finally {
			savingSignature = false;
		}
	}

	async function remove() {
		try {
			await trpc.document.delete.mutate({ id: documentId });
			toast.success($i18n.t('import.detail.deleted'));
			await goto(resolve('/admin/documents'));
		} catch (err: any) {
			logger.error({ err }, 'Failed to delete document');
			toast.danger(err?.message || $i18n.t('errors.serverError'));
		}
	}

	function shown(field: string): string {
		return attempted ? (errors[field] ?? '') : '';
	}
</script>

<svelte:head><title>{doc?.name ?? $i18n.t('import.detail.title')} - Ardoise</title></svelte:head>

{#if loading}
	<div class="flex min-h-[40dvh] items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else if !doc}
	<Page width="lg">
		<EmptyState
			icon={ardoise.document}
			title={$i18n.t('import.detail.notFound')}
			description={$i18n.t('import.detail.notFoundDescription')}
		>
			<Button href={resolve('/admin/documents')}>{$i18n.t('import.detail.back')}</Button>
		</EmptyState>
	</Page>
{:else}
	<Page width="xl">
		<PageHeader
			title={doc.name}
			description={$i18n.t('import.detail.title')}
			back={{ href: resolve('/admin/documents'), label: $i18n.t('import.detail.back') }}
		>
			{#snippet actions()}
				<Badge tone={imported ? 'neutral' : 'info'}>
					{imported ? $i18n.t('import.badge.imported') : $i18n.t('import.badge.generated')}
				</Badge>
				<Button
					variant="ghost"
					icon={icons.download}
					onclick={() => downloadDocument(documentId)}
				>
					{$i18n.t('import.detail.download')}
				</Button>
				<Button variant="ghost-danger" icon={icons.remove} onclick={() => (confirmDelete = true)}>
					{$i18n.t('import.detail.delete')}
				</Button>
			{/snippet}
		</PageHeader>

		<div class="grid gap-6 lg:grid-cols-2">
			<div class="flex flex-col gap-6">
				<Section title={$i18n.t('import.detail.infoSection')} card>
					<Field label={$i18n.t('import.fields.name')} error={shown('name')}>
						<Input bind:value={form.name} />
					</Field>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field label={$i18n.t('import.fields.type')} error={shown('type')}>
							<Select bind:value={form.type} disabled={!imported}>
								{#each docTypes.filter( (item) => (IMPORT_TYPES as readonly string[]).includes(item.value) ) as docType (docType.value)}
									<option value={docType.value}>{docType.label}</option>
								{/each}
							</Select>
						</Field>
						<Field label={$i18n.t('import.fields.number')}>
							<Input bind:value={form.number} />
						</Field>
					</div>
					<Field label={$i18n.t('import.fields.client')}>
						<Select bind:value={form.clientId}>
							<option value="">{doc.clientName}</option>
							{#each clients as client (client.id)}
								<option value={client.id}>{client.label}</option>
							{/each}
						</Select>
					</Field>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field label={$i18n.t('import.fields.project')}>
							<Select bind:value={form.missionId}>
								<option value="">{$i18n.t('import.fields.projectNone')}</option>
								{#each missions as mission (mission.id)}
									<option value={mission.id}>{mission.label}</option>
								{/each}
							</Select>
						</Field>
						<Field label={$i18n.t('import.fields.provider')}>
							<Select bind:value={form.providerId}>
								<option value="">{$i18n.t('import.fields.providerPlaceholder')}</option>
								{#each providers as provider (provider.id)}
									<option value={provider.id}>{provider.label}</option>
								{/each}
							</Select>
						</Field>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field label={$i18n.t('import.fields.issueDate')} error={shown('issuedAt')}>
							<Input type="date" max={today} bind:value={form.issuedAt} />
						</Field>
						<Field label={$i18n.t('import.fields.total')} error={shown('total')}>
							<Input
								type="number"
								inputmode="decimal"
								step="0.01"
								min="0"
								disabled={!imported}
								bind:value={form.total}
							/>
						</Field>
					</div>
					<div class="flex justify-end">
						<Button onclick={save} disabled={saving || uploading}>
							{saving ? $i18n.t('import.detail.saving') : $i18n.t('import.detail.save')}
						</Button>
					</div>
				</Section>

				{#if signable}
					<Section title={$i18n.t('import.detail.signatureSection')} card>
						<SignatureStatus
							status={doc.signatureStatus}
							plumeUrl={doc.plumeUrl}
							signedAt={doc.signedAt}
							archived={!!doc.nuageArchivedAt}
						/>

						{#if doc.signatureStatus === 'none'}
							<div class="flex flex-col gap-2">
								<SendForSignature {documentId} enabled={signatureEnabled} onsent={load} />
								{#if !signatureEnabled}
									<p class="text-fc-xs text-fc-fg-muted">{$i18n.t('import.detail.plumeOff')}</p>
								{/if}
							</div>
						{/if}

						<div class="flex flex-col gap-4 rounded-fc-md bg-fc-surface p-4">
							<div class="flex flex-col gap-1">
								<span class="text-fc-sm font-medium text-fc-fg">
									{$i18n.t('import.detail.signatureManual')}
								</span>
								<span class="text-fc-xs text-fc-fg-muted">
									{$i18n.t('import.detail.signatureManualHint')}
								</span>
							</div>
							<div class="grid gap-4 sm:grid-cols-2">
								<Field label={$i18n.t('import.fields.signature')}>
									<Select bind:value={signature.status}>
										{#each signatureOptions as status (status)}
											<option value={status}>{$i18n.t(`import.signature.${status}`)}</option>
										{/each}
									</Select>
								</Field>
								{#if signature.status === 'signed'}
									<Field label={$i18n.t('import.fields.signedAt')} error={signatureError}>
										<Input type="date" max={today} bind:value={signature.signedAt} />
									</Field>
								{/if}
							</div>
							{#if signature.status === 'signed'}
								<Field label={$i18n.t('import.detail.signedPdf')} helper={$i18n.t('import.detail.signedPdfHint')}>
									<Dropzone
										bind:files={signedFiles}
										accept="application/pdf"
										maxSize={PDF_MAX_BYTES}
										disabled={signedUploading}
										label={signedName || $i18n.t('import.drop.label')}
										onFiles={handleSignedFiles}
									/>
								</Field>
							{/if}
							<div class="flex justify-end">
								<Button
									variant="outline"
									onclick={saveSignature}
									disabled={savingSignature ||
										signedUploading ||
										!!signatureError ||
										signature.status === 'sent'}
								>
									{$i18n.t('import.detail.signatureSave')}
								</Button>
							</div>
						</div>
					</Section>
				{/if}
			</div>

			<div class="lg:sticky lg:top-4 lg:self-start">
				<Section title={$i18n.t('import.detail.pdfSection')} card>
					{#if pdfStale}
						<Alert tone="warning">{$i18n.t('import.drop.stale')}</Alert>
					{/if}
					<PdfPane
						bind:pdfKey
						bind:uploading
						{storedUrl}
						onpicked={() => (pdfCleared = false)}
						onclear={() => (pdfCleared = true)}
					/>
				</Section>
			</div>
		</div>
	</Page>
{/if}

<ConfirmModal
	bind:open={confirmDelete}
	tone="danger"
	title={$i18n.t('import.detail.deleteTitle')}
	description={doc?.source === 'imported'
		? $i18n.t('import.detail.deleteDescriptionPaid')
		: $i18n.t('import.detail.deleteDescription')}
	confirmLabel={$i18n.t('import.detail.deleteConfirm')}
	cancelLabel={$i18n.t('import.detail.deleteCancel')}
	onConfirm={remove}
/>
