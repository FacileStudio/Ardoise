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
	import 'iconify-icon';

	interface Props {
		mission: any;
		onChange: () => Promise<void> | void;
	}

	let { mission, onChange }: Props = $props();

	let busy = $state(false);
	let signatureEnabled = $state(false);

	onMount(() => {
		loadSignatureEnabled().then((enabled) => (signatureEnabled = enabled));
	});

	const open = $derived(mission.status !== 'CANCELLED');
	const documents = $derived(
		mission.documents.filter((d: any) => d.type !== 'devis' && !d.invoiceNumber)
	);

	async function detach(documentId: string) {
		if (!confirm('Détacher ce document de la mission ?'))
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

<section class="rounded-xl bg-muted/40 p-6 space-y-4">
	<h2 class="text-base font-semibold text-foreground">Contrats et autres documents</h2>

	{#if documents.length > 0}
		<ul class="space-y-2">
			{#each documents as doc (doc.id)}
				<li class="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2">
					<div class="min-w-0">
						<div class="text-sm font-medium text-foreground">
							{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.name}
							{#if documentNumber(doc)}
								<span class="text-muted-foreground font-normal"> · {documentNumber(doc)}</span>
							{/if}
						</div>
						<div class="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</div>
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
						<button
							onclick={() => downloadDocument(doc.id)}
							class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
							title="Télécharger"
						>
							<iconify-icon icon="solar:download-bold" width="16"></iconify-icon>
						</button>
						<button
							disabled={busy}
							onclick={() => detach(doc.id)}
							class="p-2 text-muted-foreground hover:text-fc-danger hover:bg-muted rounded-md disabled:opacity-50"
							title="Détacher de la mission"
						>
							<iconify-icon icon="solar:link-broken-bold" width="16"></iconify-icon>
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-muted-foreground">Aucun contrat pour l'instant.</p>
	{/if}

	{#if open}
		<div class="flex flex-wrap gap-2">
			{#each CONTRACT_TYPES as type (type)}
				<a
					href={resolve(createHref(type) as any)}
					class="inline-flex items-center gap-1.5 rounded-md bg-background px-3 h-8 text-xs font-medium text-foreground hover:bg-muted"
				>
					<iconify-icon icon="mdi:plus" width="14"></iconify-icon>
					{DOCUMENT_TYPE_LABELS[type]}
				</a>
			{/each}
		</div>
	{/if}
</section>
