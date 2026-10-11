<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Badge, Spinner } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import {
		STATUS_LABELS,
		STATUS_VARIANTS,
		NEXT_STATUSES,
		ROLE_LABELS,
		DOCUMENT_TYPE_LABELS,
		PAYMENT_STATUS_LABELS,
		PAYMENT_STATUS_VARIANTS,
		formatEuro,
		formatDate,
		documentNumber,
		type MissionStatus,
	} from '$lib/mission';
	import 'iconify-icon';

	const LIVE_PAYMENT_STATUSES = ['PENDING', 'PAID', 'PAST_DUE'];

	const missionId = $derived($page.params.id as string);

	let pageLoading = $state(true);
	let busy = $state(false);
	let mission: any = $state(null);
	let collectionMethod = $state<'STRIPE' | 'MANUAL'>('STRIPE');

	const status = $derived(mission?.status as MissionStatus | undefined);
	const invoices = $derived((mission?.documents ?? []).filter((d: any) => d.invoiceNumber));
	const closed = $derived(status === 'CANCELLED' || status === 'PAID');

	// invoiced is the sum of the invoice totals, paid the sum of the payments already settled
	const invoicedTotal = $derived(invoices.reduce((sum: number, d: any) => sum + Number(d.total), 0));
	const paidTotal = $derived(
		(mission?.payments ?? [])
			.filter((p: any) => p.status === 'PAID')
			.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
	);
	// what is left to collect never goes below zero
	const remainingTotal = $derived(Math.max(invoicedTotal - paidTotal, 0));

	onMount(async () => {
		await load();
		pageLoading = false;
	});

	async function load() {
		try {
			mission = await trpc.mission.getById.query({ id: missionId });
		} catch (err) {
			logger.error({ err }, 'Failed to fetch mission');
			toast.push('Mission introuvable', 'error');
			goto(resolve('/admin/missions'));
		}
	}

	async function run(action: () => Promise<unknown>, success: string, failure: string) {
		busy = true;

		try {
			await action();
			toast.push(success, 'success');
			await load();
		} catch (err: any) {
			logger.error({ err }, failure);
			toast.push(err?.message || failure, 'error');
		} finally {
			busy = false;
		}
	}

	function setStatus(next: MissionStatus) {
		return run(
			() => trpc.mission.setStatus.mutate({ id: missionId, status: next }),
			'Statut mis à jour',
			'Erreur lors du changement de statut'
		);
	}

	function cancelMission() {
		if (!confirm('Annuler cette mission ? Cette action est définitive.'))
			return;

		return setStatus('CANCELLED');
	}

	async function deleteMission() {
		if (!confirm('Supprimer cette mission ?'))
			return;

		busy = true;

		try {
			await trpc.mission.delete.mutate({ id: missionId });
			toast.push('Mission supprimée', 'success');
			goto(resolve('/admin/missions'));
		} catch (err: any) {
			logger.error({ err }, 'Failed to delete mission');
			toast.push(err?.message || 'Erreur lors de la suppression', 'error');
		} finally {
			busy = false;
		}
	}

	function detach(documentId: string) {
		if (!confirm('Détacher ce document de la mission ?'))
			return;

		return run(
			() => trpc.mission.detachDocument.mutate({ id: missionId, documentId }),
			'Document détaché',
			'Erreur lors du détachement'
		);
	}

	function generatePayment(documentId: string) {
		return run(
			() =>
				trpc.mission.createPayment.mutate({
					id: missionId,
					documentId,
					collectionMethod,
				}),
			'Paiement généré',
			'Erreur lors de la génération du paiement'
		);
	}

	async function download(documentId: string) {
		try {
			const result = await trpc.document.download.mutate({ id: documentId });
			const bytes = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0));
			const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
			const a = document.createElement('a');

			a.href = url;
			a.download = result.fileName;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			logger.error({ err }, 'Failed to download document');
			toast.push('Erreur lors du téléchargement', 'error');
		}
	}

	function livePaymentFor(documentId: string) {
		return mission.payments.find(
			(p: any) => p.documentId === documentId && LIVE_PAYMENT_STATUSES.includes(p.status)
		);
	}

	function addDocumentHref(type: string) {
		return `/admin/documents/create?missionId=${missionId}&type=${type}`;
	}
</script>

{#if pageLoading || !mission}
	<div class="flex flex-col items-center justify-center h-screen space-y-4">
		<Spinner />
		<p class="text-sm text-muted-foreground">Chargement...</p>
	</div>
{:else}
	<div class="p-8 max-w-[1100px] mx-auto space-y-6">
		<div>
			<button
				onclick={() => goto(resolve('/admin/missions'))}
				class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
				Retour aux missions
			</button>

			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div class="flex items-center gap-3">
						<h1 class="text-2xl font-bold text-foreground">{mission.name}</h1>
						<Badge variant={STATUS_VARIANTS[mission.status as MissionStatus]}>
							{STATUS_LABELS[mission.status as MissionStatus]}
						</Badge>
					</div>
					{#if mission.description}
						<p class="text-sm text-muted-foreground mt-1 max-w-2xl">{mission.description}</p>
					{/if}
				</div>

				<div class="flex flex-wrap gap-2">
					{#each NEXT_STATUSES[mission.status as MissionStatus] as next (next.status)}
						<button
							disabled={busy}
							onclick={() => setStatus(next.status)}
							class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium cursor-pointer hover:opacity-90 disabled:opacity-50"
						>
							{next.label}
						</button>
					{/each}
					{#if !closed}
						<button
							disabled={busy}
							onclick={cancelMission}
							class="rounded-md px-4 h-9 text-sm font-medium text-muted-foreground cursor-pointer hover:text-red-600 hover:bg-muted disabled:opacity-50"
						>
							Annuler
						</button>
					{/if}
					<button
						disabled={busy}
						onclick={deleteMission}
						class="rounded-md px-3 h-9 text-muted-foreground cursor-pointer hover:text-red-600 hover:bg-muted disabled:opacity-50"
						title="Supprimer"
					>
						<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
					</button>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="rounded-xl bg-muted/40 p-4">
				<div class="text-xs font-medium text-muted-foreground uppercase mb-2">Client</div>
				<a
					href={resolve(`/admin/clients/${mission.client.id}`)}
					class="font-medium text-foreground hover:underline"
				>
					{mission.client.companyName}
				</a>
				<div class="text-sm text-muted-foreground">
					{mission.client.contactFirstName}
					{mission.client.contactLastName}
				</div>
				{#if mission.client.contactEmail}
					<div class="text-sm text-muted-foreground">{mission.client.contactEmail}</div>
				{/if}
			</div>

			<div class="rounded-xl bg-muted/40 p-4">
				<div class="text-xs font-medium text-muted-foreground uppercase mb-2">Prestataires</div>
				{#each mission.providers as link (link.id)}
					<div class="text-sm">
						<span class="font-medium text-foreground">{link.provider.name}</span>
						<span class="text-muted-foreground"> · {ROLE_LABELS[link.role]}</span>
					</div>
				{:else}
					<div class="text-sm text-muted-foreground">Aucun prestataire</div>
				{/each}
			</div>

			<div class="rounded-xl bg-muted/40 p-4">
				<div class="text-xs font-medium text-muted-foreground uppercase mb-2">Facturation</div>
				<div class="text-sm flex justify-between"><span class="text-muted-foreground">Facturé</span><span class="font-medium text-foreground">{formatEuro(invoicedTotal)}</span></div>
				<div class="text-sm flex justify-between"><span class="text-muted-foreground">Encaissé</span><span class="font-medium text-foreground">{formatEuro(paidTotal)}</span></div>
				<div class="text-sm flex justify-between"><span class="text-muted-foreground">Reste à payer</span><span class="font-medium text-foreground">{formatEuro(remainingTotal)}</span></div>
			</div>
		</div>

		<section class="rounded-xl bg-muted/40 p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Documents</h2>

			{#if mission.documents.length > 0}
				<ul class="space-y-2">
					{#each mission.documents as doc (doc.id)}
						<li class="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2">
							<div class="min-w-0">
								<div class="text-sm font-medium text-foreground">
									{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.name}
									{#if documentNumber(doc)}
										<span class="text-muted-foreground font-normal"> · {documentNumber(doc)}</span>
									{/if}
								</div>
								<div class="text-xs text-muted-foreground">
									{formatDate(doc.createdAt)}
									{#if doc.invoiceNumber}· {formatEuro(doc.total)} TTC{/if}
								</div>
							</div>
							<div class="flex items-center gap-1">
								<button
									onclick={() => download(doc.id)}
									class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
									title="Télécharger"
								>
									<iconify-icon icon="solar:download-bold" width="16"></iconify-icon>
								</button>
								<button
									disabled={busy}
									onclick={() => detach(doc.id)}
									class="p-2 text-muted-foreground hover:text-red-600 hover:bg-muted rounded-md disabled:opacity-50"
									title="Détacher de la mission"
								>
									<iconify-icon icon="solar:link-broken-bold" width="16"></iconify-icon>
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-muted-foreground">Aucun document pour l'instant.</p>
			{/if}

			{#if status !== 'CANCELLED'}
				<div class="flex flex-wrap gap-2 pt-2">
					{#each Object.entries(DOCUMENT_TYPE_LABELS) as [type, label] (type)}
						<a
							href={resolve(addDocumentHref(type) as any)}
							class="inline-flex items-center gap-1.5 rounded-md bg-background px-3 h-8 text-xs font-medium text-foreground hover:bg-muted"
						>
							<iconify-icon icon="mdi:plus" width="14"></iconify-icon>
							{label}
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<section class="rounded-xl bg-muted/40 p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-base font-semibold text-foreground">Paiements</h2>
				<select
					bind:value={collectionMethod}
					class="h-8 rounded-md bg-background px-2 text-xs outline-none"
					title="Mode d'encaissement des prochains paiements"
				>
					<option value="STRIPE">Stripe (lien par email)</option>
					<option value="MANUAL">Manuel</option>
				</select>
			</div>

			{#if mission.payments.length > 0}
				<ul class="space-y-2">
					{#each mission.payments as payment (payment.id)}
						<li class="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2">
							<div>
								<a
									href={resolve(`/admin/payments/${payment.id}`)}
									class="text-sm font-medium text-foreground hover:underline"
								>
									{formatEuro(payment.amount)}
								</a>
								<div class="text-xs text-muted-foreground">
									{payment.collectionMethod === 'STRIPE' ? 'Stripe' : 'Manuel'} · échéance {formatDate(payment.dueDate)}
									{#if payment.paidAt}· payé le {formatDate(payment.paidAt)}{/if}
								</div>
							</div>
							<Badge variant={PAYMENT_STATUS_VARIANTS[payment.status] ?? 'slate'}>
								{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
							</Badge>
						</li>
					{/each}
				</ul>
			{/if}

			{#if status !== 'CANCELLED'}
				{@const toBill = invoices.filter((d: any) => !livePaymentFor(d.id))}
				{#each toBill as doc (doc.id)}
					<div class="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2">
						<div class="text-sm text-foreground">
							Facture {doc.invoiceNumber}
							<span class="text-muted-foreground"> · {formatEuro(doc.total)} TTC, sans paiement</span>
						</div>
						<button
							disabled={busy}
							onclick={() => generatePayment(doc.id)}
							class="bg-primary text-primary-foreground rounded-md px-3 h-8 text-xs font-medium cursor-pointer hover:opacity-90 disabled:opacity-50"
						>
							Générer le paiement
						</button>
					</div>
				{/each}
				{#if mission.payments.length === 0 && toBill.length === 0}
					<p class="text-sm text-muted-foreground">
						Ajoutez une facture pour pouvoir générer son paiement.
					</p>
				{/if}
			{/if}
		</section>
	</div>
{/if}
