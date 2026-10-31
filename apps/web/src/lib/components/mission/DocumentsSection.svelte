<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { resolve } from '$app/paths';
	import { runAction } from '$lib/mission-actions';
	import { downloadDocument } from '$lib/download-document';
	import {
		CONTRACT_TYPES,
		DOCUMENT_TYPE_LABELS,
		documentNumber,
		formatDate,
	} from '$lib/mission';
	import { SIGNABLE_TYPES, loadSignatureEnabled } from '$lib/signature';
	import SignatureStatus from '$lib/components/SignatureStatus.svelte';
	import SendForSignature from '$lib/components/SendForSignature.svelte';
	import { onMount } from 'svelte';
	import { Button, ConfirmModal, Section } from '@facile/muse';
	import { icons } from '$lib/icons';

	interface Props {
		mission: any;
		onChange: () => Promise<void> | void;
	}

	let { mission, onChange }: Props = $props();

	let busy = $state(false);
	let signatureEnabled = $state(false);
	let detachTarget = $state<string | null>(null);
	let confirmDetach = $state(false);

	onMount(() => {
		loadSignatureEnabled().then((enabled) => (signatureEnabled = enabled));
	});

	const open = $derived(mission.status !== 'CANCELLED');
	const documents = $derived(
		mission.documents.filter((d: any) => d.type !== 'devis' && !d.invoiceNumber)
	);

	function askDetach(documentId: string) {
		detachTarget = documentId;
		confirmDetach = true;
	}

	async function detach() {
		const documentId = detachTarget;

		if (!documentId)
			return;

		busy = true;

		const ok = await runAction(
			() => trpc.mission.detachDocument.mutate({ id: mission.id, documentId }),
			'Document détaché',
			'Erreur lors du détachement'
		);

		busy = false;

		if (ok)
			await onChange();
	}

	const createHref = (type: string) =>
		`/admin/documents/create?missionId=${mission.id}&type=${type}`;
</script>

<Section title="Contrats et autres documents" card>
	{#if documents.length > 0}
		<ul class="flex flex-col gap-2">
			{#each documents as doc (doc.id)}
				<li class="flex items-center justify-between gap-3 rounded-fc-md bg-fc-surface px-3 py-2">
					<div class="min-w-0">
						<div class="text-fc-sm font-medium text-fc-fg">
							{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.name}
							{#if documentNumber(doc)}
								<span class="font-normal text-fc-fg-muted"> · {documentNumber(doc)}</span>
							{/if}
						</div>
						<div class="text-fc-xs text-fc-fg-muted">{formatDate(doc.createdAt)}</div>
						{#if SIGNABLE_TYPES.includes(doc.type)}
							<div class="mt-1">
								<SignatureStatus
									status={doc.signatureStatus}
									plumeUrl={doc.plumeUrl}
									signedAt={doc.signedAt}
									archived={!!doc.nuageArchivedAt}
								/>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-1">
						{#if SIGNABLE_TYPES.includes(doc.type) && doc.signatureStatus === 'none'}
							<SendForSignature
								documentId={doc.id}
								enabled={signatureEnabled}
								onsent={onChange}
							/>
						{/if}
						<Button
							variant="ghost"
							size="sm"
							icon={icons.download}
							aria-label="Télécharger"
							onclick={() => downloadDocument(doc.id)}
						/>
						<Button
							variant="ghost-danger"
							size="sm"
							icon={icons.revoke}
							aria-label="Détacher de la mission"
							disabled={busy}
							onclick={() => askDetach(doc.id)}
						/>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-fc-sm text-fc-fg-muted">Aucun contrat pour l'instant.</p>
	{/if}

	{#if open}
		<div class="flex flex-wrap gap-2">
			{#each CONTRACT_TYPES as type (type)}
				<Button
					href={resolve(createHref(type) as any)}
					variant="ghost"
					size="sm"
					icon={icons.plus}
				>
					{DOCUMENT_TYPE_LABELS[type]}
				</Button>
			{/each}
		</div>
	{/if}
</Section>

<ConfirmModal
	bind:open={confirmDetach}
	tone="danger"
	title="Détacher ce document ?"
	description="Le document reste dans vos documents, mais il n'est plus rattaché à cette mission et disparaît de son suivi."
	confirmLabel="Détacher"
	cancelLabel="Garder"
	onConfirm={detach}
/>
