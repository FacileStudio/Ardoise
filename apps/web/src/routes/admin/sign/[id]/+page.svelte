<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { Spinner, Badge, Button } from '@repo/ui';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

	type SubmissionStatus = 'pending' | 'awaiting' | 'completed' | 'expired' | 'declined';

	interface Submitter {
		id: number;
		email?: string;
		phone?: string;
		name?: string;
		role: string;
		status: SubmissionStatus;
		sent_at: string | null;
		opened_at: string | null;
		completed_at: string | null;
		declined_at: string | null;
		created_at: string;
		updated_at: string;
	}

	interface Submission {
		id: number;
		slug: string;
		status: SubmissionStatus;
		created_at: string;
		updated_at: string;
		audit_log_url: string | null;
		combined_document_url: string | null;
		template: {
			id: number;
			name: string;
			external_id: string | null;
		} | null;
		submitters: Submitter[];
	}

	let pageLoading = $state(true);
	let submission: Submission | null = $state(null);

	const submissionId = $derived(parseInt($page.params.id));

	onMount(async () => {
		await fetchSubmission();
	});

	async function fetchSubmission() {
		pageLoading = true;
		try {
			const result = await trpc.docuseal.getSubmission.query({ id: submissionId });
			submission = result as Submission;
		} catch (err) {
			logger.error({ err }, 'Failed to fetch submission');
			alert('Erreur lors du chargement de la demande de signature');
			goto(resolve('/admin/sign'));
		} finally {
			pageLoading = false;
		}
	}

	function getStatusBadge(status: SubmissionStatus): { variant: 'default' | 'success' | 'warning' | 'danger'; label: string } {
		switch (status) {
			case 'completed':
				return { variant: 'success', label: 'Signé' };
			case 'pending':
			case 'awaiting':
				return { variant: 'warning', label: 'En attente' };
			case 'expired':
				return { variant: 'danger', label: 'Expiré' };
			case 'declined':
				return { variant: 'danger', label: 'Refusé' };
			default:
				return { variant: 'default', label: status };
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}
</script>

<div class="max-w-3xl mx-auto p-6 space-y-6">
	<div>
		<button
			onclick={() => goto(resolve('/admin/sign'))}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
			Retour aux signatures
		</button>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Détails de la signature</h1>
		<p class="text-sm text-muted-foreground mt-1">
			Consultez les informations et le statut de la demande
		</p>
	</div>

	{#if pageLoading}
		<div class="flex items-center justify-center py-20">
			<Spinner size="xl" />
		</div>
	{:else if submission}
		<div class="space-y-6">
			<div class="rounded-xl border border-border p-6">
				<div class="flex items-start justify-between mb-6">
					<div>
						<h2 class="text-lg font-semibold text-foreground mb-1">
							{submission.template?.name || 'Sans template'}
						</h2>
						<p class="text-xs text-muted-foreground">Référence: #{submission.slug}</p>
					</div>
					<Badge variant={getStatusBadge(submission.status).variant} size="lg">
						{getStatusBadge(submission.status).label}
					</Badge>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Date de création</p>
						<p class="text-sm font-medium text-foreground">{formatDate(submission.created_at)}</p>
					</div>
					<div>
						<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Dernière mise à jour</p>
						<p class="text-sm font-medium text-foreground">{formatDate(submission.updated_at)}</p>
					</div>
				</div>

				{#if submission.combined_document_url}
					<div class="mt-6 pt-4 border-t border-border">
						<Button
							intent="primary"
							onclick={() => window.open(submission.combined_document_url!, '_blank')}
						>
							<iconify-icon icon="solar:download-bold" width="16"></iconify-icon>
							Télécharger le document signé
						</Button>
					</div>
				{/if}

				{#if submission.audit_log_url}
					<div class="mt-3">
						<Button
							intent="secondary"
							onclick={() => window.open(submission.audit_log_url!, '_blank')}
						>
							<iconify-icon icon="solar:document-text-bold" width="16"></iconify-icon>
							Voir le journal d'audit
						</Button>
					</div>
				{/if}
			</div>

			<div class="rounded-xl border border-border p-6">
				<h3 class="text-base font-semibold text-foreground mb-4">Signataires ({submission.submitters.length})</h3>

				<div class="space-y-3">
					{#each submission.submitters as submitter (submitter.id)}
						<div class="bg-muted rounded-lg p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-medium">
										{submitter.name?.[0] || submitter.email?.[0] || '?'}
									</div>
									<div>
										<p class="text-sm font-medium text-foreground">{submitter.name || 'Sans nom'}</p>
										<p class="text-xs text-muted-foreground">{submitter.email}</p>
										{#if submitter.phone}
											<p class="text-xs text-muted-foreground">{submitter.phone}</p>
										{/if}
									</div>
								</div>
								<div class="text-right">
									<Badge variant={getStatusBadge(submitter.status).variant}>
										{submitter.role}
									</Badge>
									<p class="text-xs text-muted-foreground mt-1">
										{getStatusBadge(submitter.status).label}
									</p>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-3 text-sm">
								<div>
									<p class="text-xs font-medium text-muted-foreground mb-0.5">Envoyé</p>
									<p class="text-xs text-foreground">{formatDate(submitter.sent_at)}</p>
								</div>
								<div>
									<p class="text-xs font-medium text-muted-foreground mb-0.5">Ouvert</p>
									<p class="text-xs text-foreground">{formatDate(submitter.opened_at)}</p>
								</div>
								<div>
									<p class="text-xs font-medium text-muted-foreground mb-0.5">Complété</p>
									<p class="text-xs text-foreground">{formatDate(submitter.completed_at)}</p>
								</div>
								<div>
									<p class="text-xs font-medium text-muted-foreground mb-0.5">Refusé</p>
									<p class="text-xs text-foreground">{formatDate(submitter.declined_at)}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="rounded-xl border border-border p-6">
				<h3 class="text-base font-semibold text-foreground mb-4">Timeline</h3>

				<div class="relative space-y-4">
					<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>

					<div class="relative flex gap-3">
						<div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 z-10">
							<iconify-icon icon="solar:add-circle-bold" width="16" class="text-white"></iconify-icon>
						</div>
						<div class="pt-1">
							<p class="text-sm font-medium text-foreground">Demande créée</p>
							<p class="text-xs text-muted-foreground">{formatDate(submission.created_at)}</p>
						</div>
					</div>

					{#each submission.submitters as submitter (submitter.id)}
						{#if submitter.sent_at}
							<div class="relative flex gap-3">
								<div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 z-10">
									<iconify-icon icon="solar:letter-bold" width="16" class="text-white"></iconify-icon>
								</div>
								<div class="pt-1">
									<p class="text-sm font-medium text-foreground">Envoyé à {submitter.name || submitter.email}</p>
									<p class="text-xs text-muted-foreground">{formatDate(submitter.sent_at)}</p>
								</div>
							</div>
						{/if}

						{#if submitter.opened_at}
							<div class="relative flex gap-3">
								<div class="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 z-10">
									<iconify-icon icon="solar:eye-bold" width="16" class="text-white"></iconify-icon>
								</div>
								<div class="pt-1">
									<p class="text-sm font-medium text-foreground">Ouvert par {submitter.name || submitter.email}</p>
									<p class="text-xs text-muted-foreground">{formatDate(submitter.opened_at)}</p>
								</div>
							</div>
						{/if}

						{#if submitter.completed_at}
							<div class="relative flex gap-3">
								<div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 z-10">
									<iconify-icon icon="solar:check-circle-bold" width="16" class="text-white"></iconify-icon>
								</div>
								<div class="pt-1">
									<p class="text-sm font-medium text-foreground">Signé par {submitter.name || submitter.email}</p>
									<p class="text-xs text-muted-foreground">{formatDate(submitter.completed_at)}</p>
								</div>
							</div>
						{/if}

						{#if submitter.declined_at}
							<div class="relative flex gap-3">
								<div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 z-10">
									<iconify-icon icon="solar:close-circle-bold" width="16" class="text-white"></iconify-icon>
								</div>
								<div class="pt-1">
									<p class="text-sm font-medium text-foreground">Refusé par {submitter.name || submitter.email}</p>
									<p class="text-xs text-muted-foreground">{formatDate(submitter.declined_at)}</p>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
