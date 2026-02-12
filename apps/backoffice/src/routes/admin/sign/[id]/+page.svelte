<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
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
			goto('/admin/sign');
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

<div class="p-12">
	<div class="mb-10">
		<div class="flex items-center gap-4 mb-8">
			<button
				onclick={() => goto('/admin/sign')}
				class="w-10 h-10 rounded-xl bg-white border border-[#291334]/10 flex items-center justify-center hover:bg-[#291334]/5 transition-all duration-200"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="20" class="text-[#291334]"></iconify-icon>
			</button>
			<div>
				<h1 class="text-4xl font-black text-[#291334] mb-2 tracking-tight">Détails de la signature</h1>
				<p class="text-[#291334]/60 text-sm font-bold">
					Consultez les informations et le statut de la demande
				</p>
			</div>
		</div>

		{#if pageLoading}
			<div class="flex items-center justify-center py-20">
				<Spinner size={40} />
			</div>
		{:else if submission}
			<div class="max-w-4xl space-y-6">
				<div class="bg-white rounded-2xl border border-[#291334]/10 p-8">
					<div class="flex items-start justify-between mb-6">
						<div>
							<h2 class="text-2xl font-black text-[#291334] mb-2">
								{submission.template?.name || 'Sans template'}
							</h2>
							<p class="text-sm text-[#291334]/60 font-medium">Référence: #{submission.slug}</p>
						</div>
						<Badge variant={getStatusBadge(submission.status).variant} size="lg">
							{getStatusBadge(submission.status).label}
						</Badge>
					</div>

					<div class="grid grid-cols-2 gap-6">
						<div>
							<p class="text-sm font-bold text-[#291334]/60 mb-1">Date de création</p>
							<p class="font-bold text-[#291334]">{formatDate(submission.created_at)}</p>
						</div>
						<div>
							<p class="text-sm font-bold text-[#291334]/60 mb-1">Dernière mise à jour</p>
							<p class="font-bold text-[#291334]">{formatDate(submission.updated_at)}</p>
						</div>
					</div>

					{#if submission.combined_document_url}
						<div class="mt-6 pt-6 border-t border-[#291334]/10">
							<Button
								intent="primary"
								onclick={() => window.open(submission.combined_document_url!, '_blank')}
							>
								<iconify-icon icon="solar:download-bold" width="20"></iconify-icon>
								Télécharger le document signé
							</Button>
						</div>
					{/if}

					{#if submission.audit_log_url}
						<div class="mt-4">
							<Button
								intent="secondary"
								onclick={() => window.open(submission.audit_log_url!, '_blank')}
							>
								<iconify-icon icon="solar:document-text-bold" width="20"></iconify-icon>
								Voir le journal d'audit
							</Button>
						</div>
					{/if}
				</div>

				<div class="bg-white rounded-2xl border border-[#291334]/10 p-8">
					<h3 class="text-xl font-black text-[#291334] mb-6">Signataires ({submission.submitters.length})</h3>

					<div class="space-y-4">
						{#each submission.submitters as submitter (submitter.id)}
							<div class="bg-[#291334]/5 rounded-xl p-6">
								<div class="flex items-start justify-between mb-4">
									<div class="flex items-center gap-3">
										<div class="w-12 h-12 rounded-xl bg-[#291334] text-white flex items-center justify-center font-black text-lg">
											{submitter.name?.[0] || submitter.email?.[0] || '?'}
										</div>
										<div>
											<p class="font-black text-[#291334]">{submitter.name || 'Sans nom'}</p>
											<p class="text-sm text-[#291334]/60 font-medium">{submitter.email}</p>
											{#if submitter.phone}
												<p class="text-sm text-[#291334]/60 font-medium">{submitter.phone}</p>
											{/if}
										</div>
									</div>
									<div class="text-right">
										<Badge variant={getStatusBadge(submitter.status).variant}>
											{submitter.role}
										</Badge>
										<p class="text-sm text-[#291334]/60 font-medium mt-2">
											{getStatusBadge(submitter.status).label}
										</p>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4 text-sm">
									<div>
										<p class="text-[#291334]/60 font-bold mb-1">Envoyé</p>
										<p class="text-[#291334] font-medium">{formatDate(submitter.sent_at)}</p>
									</div>
									<div>
										<p class="text-[#291334]/60 font-bold mb-1">Ouvert</p>
										<p class="text-[#291334] font-medium">{formatDate(submitter.opened_at)}</p>
									</div>
									<div>
										<p class="text-[#291334]/60 font-bold mb-1">Complété</p>
										<p class="text-[#291334] font-medium">{formatDate(submitter.completed_at)}</p>
									</div>
									<div>
										<p class="text-[#291334]/60 font-bold mb-1">Refusé</p>
										<p class="text-[#291334] font-medium">{formatDate(submitter.declined_at)}</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="bg-white rounded-2xl border border-[#291334]/10 p-8">
					<h3 class="text-xl font-black text-[#291334] mb-6">Timeline</h3>

					<div class="relative space-y-6">
						<div class="absolute left-6 top-0 bottom-0 w-0.5 bg-[#291334]/10"></div>

						<div class="relative flex gap-4">
							<div class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 z-10">
								<iconify-icon icon="solar:add-circle-bold" width="24" class="text-white"></iconify-icon>
							</div>
							<div class="pt-2">
								<p class="font-black text-[#291334]">Demande créée</p>
								<p class="text-sm text-[#291334]/60 font-medium">{formatDate(submission.created_at)}</p>
							</div>
						</div>

						{#each submission.submitters as submitter (submitter.id)}
							{#if submitter.sent_at}
								<div class="relative flex gap-4">
									<div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 z-10">
										<iconify-icon icon="solar:letter-bold" width="24" class="text-white"></iconify-icon>
									</div>
									<div class="pt-2">
										<p class="font-black text-[#291334]">Envoyé à {submitter.name || submitter.email}</p>
										<p class="text-sm text-[#291334]/60 font-medium">{formatDate(submitter.sent_at)}</p>
									</div>
								</div>
							{/if}

							{#if submitter.opened_at}
								<div class="relative flex gap-4">
									<div class="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 z-10">
										<iconify-icon icon="solar:eye-bold" width="24" class="text-white"></iconify-icon>
									</div>
									<div class="pt-2">
										<p class="font-black text-[#291334]">Ouvert par {submitter.name || submitter.email}</p>
										<p class="text-sm text-[#291334]/60 font-medium">{formatDate(submitter.opened_at)}</p>
									</div>
								</div>
							{/if}

							{#if submitter.completed_at}
								<div class="relative flex gap-4">
									<div class="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 z-10">
										<iconify-icon icon="solar:check-circle-bold" width="24" class="text-white"></iconify-icon>
									</div>
									<div class="pt-2">
										<p class="font-black text-[#291334]">Signé par {submitter.name || submitter.email}</p>
										<p class="text-sm text-[#291334]/60 font-medium">{formatDate(submitter.completed_at)}</p>
									</div>
								</div>
							{/if}

							{#if submitter.declined_at}
								<div class="relative flex gap-4">
									<div class="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 z-10">
										<iconify-icon icon="solar:close-circle-bold" width="24" class="text-white"></iconify-icon>
									</div>
									<div class="pt-2">
										<p class="font-black text-[#291334]">Refusé par {submitter.name || submitter.email}</p>
										<p class="text-sm text-[#291334]/60 font-medium">{formatDate(submitter.declined_at)}</p>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
