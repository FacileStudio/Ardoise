<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Alert, Button, Field, Input, Page, PageHeader, Select, Switch, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import PdfPane from '$lib/components/PdfPane.svelte';
	import { spaceFilter } from '$lib/space-filter.svelte';
	import {
		IMPORT_TYPES,
		SIGNATURE_STATUSES,
		asImportType,
		isInvoiceType,
		isSignableType,
		titleFromFileName,
		todayInput,
	} from '$lib/import';

	type Option = { id: string; label: string };

	let clients = $state<Option[]>([]);
	let providers = $state<Option[]>([]);
	let projects = $state<Option[]>([]);
	let docTypes = $state<Array<{ value: string; label: string }>>([]);

	let pdfKey = $state<string | null>(null);
	let uploading = $state(false);
	let submitting = $state(false);
	let attempted = $state(false);
	let touched = $state<Record<string, boolean>>({});
	let formKey = $state(0);
	let lastImported = $state('');

	let form = $state({
		clientId: '',
		missionId: '',
		providerId: '',
		type: 'facture_prestation',
		name: '',
		number: '',
		issuedAt: '',
		total: '',
		signatureStatus: 'none' as (typeof SIGNATURE_STATUSES)[number],
		signedAt: '',
		paid: true,
		paidAt: '',
	});

	const today = todayInput();
	const invoice = $derived(isInvoiceType(form.type));
	const signable = $derived(isSignableType(form.type));
	const signedNeedsDate = $derived(signable && form.signatureStatus === 'signed');
	const paidAtValue = $derived(form.paidAt || form.issuedAt);

	const errors = $derived.by(() => {
		const e: Record<string, string> = {};
		const total = Number(form.total);

		if (!form.clientId) e.clientId = $i18n.t('import.errors.client');
		if (!form.providerId) e.providerId = $i18n.t('import.errors.provider');
		if (!form.type) e.type = $i18n.t('import.errors.type');
		if (!form.name.trim()) e.name = $i18n.t('import.errors.name');
		if (!form.number.trim()) e.number = $i18n.t('import.errors.number');
		if (!form.issuedAt) e.issuedAt = $i18n.t('import.errors.issueDate');
		else if (form.issuedAt > today) e.issuedAt = $i18n.t('import.errors.future');
		if (form.total === '' || !Number.isFinite(total) || total < 0)
			e.total = $i18n.t('import.errors.total');
		if (signedNeedsDate && !form.signedAt) e.signedAt = $i18n.t('import.errors.signedAt');
		if (invoice && form.paid) {
			if (!paidAtValue) e.paidAt = $i18n.t('import.errors.paidAt');
			else if (form.issuedAt && paidAtValue < form.issuedAt)
				e.paidAt = $i18n.t('import.errors.paidBeforeIssue');
		}

		return e;
	});

	function shown(field: string): string {
		return attempted || touched[field] ? (errors[field] ?? '') : '';
	}

	function touch(field: string) {
		touched[field] = true;
	}

	onMount(async () => {
		try {
			const [typeList, clientList, providerList] = await Promise.all([
				trpc.document.types.query(),
				trpc.client.list.query({ limit: 100, page: 1 }),
				trpc.provider.list.query({ limit: 100, page: 1 }),
			]);
			docTypes = typeList.filter((item) => (IMPORT_TYPES as readonly string[]).includes(item.value));
			clients = clientList.clients.map((c: any) => ({ id: c.id, label: c.companyName }));
			providers = providerList.providers.map((p: any) => ({ id: p.id, label: p.name }));
			if (providers.length === 1) form.providerId = providers[0].id;
		} catch (err) {
			logger.error({ err }, 'Failed to load import options');
			toast.danger($i18n.t('errors.serverError'));
		}
	});

	async function loadProjects(clientId: string) {
		form.missionId = '';
		projects = [];
		if (!clientId) return;

		try {
			const result = await trpc.mission.list.query({
				clientId,
				limit: 100,
				page: 1,
				spaceId: spaceFilter.spaceId,
			});
			projects = result.missions.map((m: any) => ({ id: m.id, label: m.name }));
		} catch (err) {
			logger.error({ err }, 'Failed to load projects');
		}
	}

	function handlePicked(file: File) {
		if (!form.name.trim()) form.name = titleFromFileName(file.name);
	}

	function buildPayload() {
		return {
			pdfKey: pdfKey as string,
			type: asImportType(form.type),
			name: form.name.trim(),
			number: form.number.trim(),
			clientId: form.clientId,
			missionId: form.missionId || undefined,
			providerId: form.providerId,
			total: Number(form.total),
			issuedAt: new Date(form.issuedAt),
			signatureStatus: signable ? form.signatureStatus : ('none' as const),
			signedAt: signedNeedsDate ? new Date(form.signedAt) : undefined,
			markPaid: invoice && form.paid ? true : undefined,
			paidAt: invoice && form.paid ? new Date(paidAtValue) : undefined,
			spaceId: spaceFilter.spaceId,
		};
	}

	function resetForNext() {
		form.name = '';
		form.number = '';
		form.total = '';
		form.signedAt = '';
		form.paidAt = '';
		pdfKey = null;
		attempted = false;
		touched = {};
		formKey += 1;
	}

	async function submit(another: boolean) {
		attempted = true;

		if (uploading) return void toast.danger($i18n.t('import.errors.uploading'));
		if (!pdfKey) return void toast.danger($i18n.t('import.errors.pdf'));
		if (Object.keys(errors).length > 0) return;

		submitting = true;
		try {
			await trpc.document.import.mutate(buildPayload());
			toast.success($i18n.t('import.imported'));
			if (another) {
				lastImported = form.name;
				resetForNext();
			} else {
				await goto(resolve('/admin/documents'));
			}
		} catch (err: any) {
			logger.error({ err }, 'Failed to import document');
			toast.danger(err?.message || $i18n.t('errors.serverError'));
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>{$i18n.t('import.title')} - Ardoise</title></svelte:head>

<Page width="xl">
	<PageHeader
		title={$i18n.t('import.title')}
		description={$i18n.t('import.subtitle')}
		back={{ href: resolve('/admin/documents'), label: $i18n.t('import.back') }}
	/>

	{#if lastImported}
		<Alert tone="success" title={$i18n.t('import.imported')}>
			{lastImported}. {$i18n.t('import.defaultsKept')}
		</Alert>
	{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<div class="lg:sticky lg:top-4 lg:self-start">
			{#key formKey}
				<PdfPane
					bind:pdfKey
					bind:uploading
					onpicked={handlePicked}
					error={attempted && !pdfKey && !uploading ? $i18n.t('import.errors.pdf') : ''}
				/>
			{/key}
		</div>

		<form
			class="flex flex-col gap-4"
			novalidate
			onsubmit={(e) => {
				e.preventDefault();
				submit(false);
			}}
		>
			<Field label={$i18n.t('import.fields.client')} error={shown('clientId')}>
				<Select
					bind:value={form.clientId}
					onchange={() => {
						touch('clientId');
						loadProjects(form.clientId);
					}}
				>
					<option value="">{$i18n.t('import.fields.clientPlaceholder')}</option>
					{#each clients as client (client.id)}
						<option value={client.id}>{client.label}</option>
					{/each}
				</Select>
			</Field>

			<Field label={$i18n.t('import.fields.project')} helper={$i18n.t('import.fields.projectHint')}>
				<Select bind:value={form.missionId} disabled={!form.clientId}>
					<option value="">{$i18n.t('import.fields.projectNone')}</option>
					{#each projects as project (project.id)}
						<option value={project.id}>{project.label}</option>
					{/each}
				</Select>
			</Field>

			<div class="grid gap-4 sm:grid-cols-2">
				<Field label={$i18n.t('import.fields.type')} error={shown('type')}>
					<Select bind:value={form.type} onchange={() => touch('type')}>
						<option value="">{$i18n.t('import.fields.typePlaceholder')}</option>
						{#each docTypes as docType (docType.value)}
							<option value={docType.value}>{docType.label}</option>
						{/each}
					</Select>
				</Field>
				<Field label={$i18n.t('import.fields.provider')} error={shown('providerId')}>
					<Select bind:value={form.providerId} onchange={() => touch('providerId')}>
						<option value="">{$i18n.t('import.fields.providerPlaceholder')}</option>
						{#each providers as provider (provider.id)}
							<option value={provider.id}>{provider.label}</option>
						{/each}
					</Select>
				</Field>
			</div>

			<Field
				label={$i18n.t('import.fields.name')}
				helper={$i18n.t('import.fields.nameHint')}
				error={shown('name')}
			>
				<Input bind:value={form.name} onblur={() => touch('name')} />
			</Field>

			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={$i18n.t('import.fields.number')}
					helper={$i18n.t('import.fields.numberHint')}
					error={shown('number')}
				>
					<Input bind:value={form.number} onblur={() => touch('number')} placeholder="F-2024-012" />
				</Field>
				<Field
					label={$i18n.t('import.fields.issueDate')}
					helper={$i18n.t('import.fields.issueDateHint')}
					error={shown('issuedAt')}
				>
					<Input type="date" max={today} bind:value={form.issuedAt} onblur={() => touch('issuedAt')} />
				</Field>
			</div>

			<Field label={$i18n.t('import.fields.total')} error={shown('total')}>
				<Input
					type="number"
					inputmode="decimal"
					step="0.01"
					min="0"
					bind:value={form.total}
					onblur={() => touch('total')}
				/>
			</Field>

			{#if signable}
				<div class="grid gap-4 sm:grid-cols-2">
					<Field label={$i18n.t('import.fields.signature')}>
						<Select bind:value={form.signatureStatus}>
							{#each SIGNATURE_STATUSES as status (status)}
								<option value={status}>{$i18n.t(`import.signature.${status}`)}</option>
							{/each}
						</Select>
					</Field>
					{#if signedNeedsDate}
						<Field label={$i18n.t('import.fields.signedAt')} error={shown('signedAt')}>
							<Input
								type="date"
								max={today}
								bind:value={form.signedAt}
								onblur={() => touch('signedAt')}
							/>
						</Field>
					{/if}
				</div>
			{/if}

			{#if invoice}
				<div class="flex flex-col gap-3 rounded-fc-md bg-fc-surface p-4">
					<Switch bind:checked={form.paid} label={$i18n.t('import.fields.paid')} />
					<p class="text-fc-xs text-fc-fg-muted">{$i18n.t('import.fields.paidHint')}</p>
					{#if form.paid}
						<Field label={$i18n.t('import.fields.paidAt')} error={shown('paidAt')}>
							<Input
								type="date"
								max={today}
								value={paidAtValue}
								oninput={(e) => (form.paidAt = e.currentTarget.value)}
								onblur={() => touch('paidAt')}
							/>
						</Field>
					{/if}
				</div>
			{/if}

			<div class="flex flex-wrap justify-end gap-3">
				<Button href={resolve('/admin/documents')} variant="ghost" disabled={submitting}>
					{$i18n.t('import.cancel')}
				</Button>
				<Button variant="outline" disabled={submitting || uploading} onclick={() => submit(true)}>
					{$i18n.t('import.submitAnother')}
				</Button>
				<Button type="submit" disabled={submitting || uploading}>
					{submitting ? $i18n.t('import.submitting') : $i18n.t('import.submit')}
				</Button>
			</div>
		</form>
	</div>
</Page>
