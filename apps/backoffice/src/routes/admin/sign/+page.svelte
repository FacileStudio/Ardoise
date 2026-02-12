<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Spinner, SearchInput, Badge, EmptyState, Button } from '@repo/ui';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	type SubmissionStatus = 'pending' | 'awaiting' | 'completed' | 'expired' | 'declined';

	interface Submitter {
		id: number;
		email?: string;
		name?: string;
		role: string;
		status: SubmissionStatus;
		sent_at: string | null;
		completed_at: string | null;
	}

	interface Submission {
		id: number;
		slug: string;
		status: SubmissionStatus;
		created_at: string;
		updated_at: string;
		template: {
			id: number;
			name: string;
		} | null;
		submitters: Submitter[];
	}

	let pageLoading = $state(true);
	let submissions: Submission[] = $state([]);
	let searchQuery = $state('');
	let actionLoading = $state('');
	let isConfigured = $state(false);

	let filters = $state({
		status: undefined as SubmissionStatus | undefined,
	});

	let stats = $state({
		totalSubmissions: 0,
		pending: 0,
		completed: 0,
		expired: 0,
	});

	onMount(async () => {
		await Promise.all([checkConfiguration(), fetchSubmissions(), calculateStats()]);
	});

	async function checkConfiguration() {
		try {
			isConfigured = await trpc.docuseal.isConfigured.query();
		} catch (err) {
			logger.error({ err }, 'Failed to check DocuSeal configuration');
			isConfigured = false;
		}
	}

	async function fetchSubmissions() {
		if (!isConfigured) return;

		pageLoading = true;
		try {
			const result = await trpc.docuseal.listSubmissions.query({
				status: filters.status,
			});
			submissions = result as Submission[];
		} catch (err) {
			logger.error({ err }, 'Failed to fetch submissions');
		} finally {
			pageLoading = false;
		}
	}

	async function calculateStats() {
		if (!isConfigured) return;

		try {
			const allSubmissions = await trpc.docuseal.listSubmissions.query({});
			const submissionsData = allSubmissions as Submission[];

			stats.totalSubmissions = submissionsData.length;
			stats.pending = submissionsData.filter((s) => s.status === 'pending' || s.status === 'awaiting').length;
			stats.completed = submissionsData.filter((s) => s.status === 'completed').length;
			stats.expired = submissionsData.filter((s) => s.status === 'expired').length;
		} catch (err) {
			logger.error({ err }, 'Failed to calculate submission statistics');
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

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	async function deleteSubmission(id: number) {
		if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande de signature ?')) return;

		actionLoading = id.toString();
		try {
			await trpc.docuseal.deleteSubmission.mutate({ id });
			await fetchSubmissions();
			await calculateStats();
		} catch (err) {
			logger.error({ err }, 'Failed to delete submission');
			alert('Erreur lors de la suppression de la demande de signature');
		} finally {
			actionLoading = '';
		}
	}

	$effect(() => {
		if (filters.status !== undefined) {
			fetchSubmissions();
		}
	});

	const filteredSubmissions = $derived(
		submissions.filter((submission) => {
			const template = submission.template?.name.toLowerCase() || '';
			const submitters = submission.submitters.map(s => s.name?.toLowerCase() || s.email?.toLowerCase() || '').join(' ');
			const query = searchQuery.toLowerCase();
			return template.includes(query) || submitters.includes(query);
		})
	);
</script>

<div class="p-12">
	<div class="mb-10">
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-4xl font-black text-[#291334] mb-2 tracking-tight">Signature de documents</h1>
				<p class="text-[#291334]/60 text-sm font-bold">
					Gérez les demandes de signature de documents
				</p>
			</div>
			<Button
				intent="primary"
				onclick={() => goto('/admin/sign/create')}
				disabled={!isConfigured}
			>
				<iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon>
				Nouvelle signature
			</Button>
		</div>

		{#if !isConfigured}
			<div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8">
				<div class="flex items-start gap-4">
					<iconify-icon icon="solar:danger-triangle-bold" width="24" class="text-yellow-600 flex-shrink-0 mt-1"></iconify-icon>
					<div>
						<h3 class="font-black text-yellow-900 mb-2">DocuSeal non configuré</h3>
						<p class="text-yellow-800 text-sm font-medium">
							Pour utiliser la signature de documents, configurez les variables d'environnement DOCUSEAL_API_URL et DOCUSEAL_API_KEY.
						</p>
					</div>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
			<div class="bg-white p-6 rounded-2xl border border-[#291334]/10 transition-all duration-300 hover:border-[#FEC129] hover:shadow-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-[#291334]/60 text-sm font-bold mb-1">Total</p>
						<p class="text-3xl font-black text-[#291334]">{stats.totalSubmissions}</p>
					</div>
					<div class="w-12 h-12 rounded-xl bg-[#291334]/5 flex items-center justify-center">
						<iconify-icon icon="solar:document-text-bold" width="24" class="text-[#291334]"></iconify-icon>
					</div>
				</div>
			</div>

			<div class="bg-white p-6 rounded-2xl border border-[#291334]/10 transition-all duration-300 hover:border-[#FEC129] hover:shadow-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-[#291334]/60 text-sm font-bold mb-1">En attente</p>
						<p class="text-3xl font-black text-amber-600">{stats.pending}</p>
					</div>
					<div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
						<iconify-icon icon="solar:clock-circle-bold" width="24" class="text-amber-600"></iconify-icon>
					</div>
				</div>
			</div>

			<div class="bg-white p-6 rounded-2xl border border-[#291334]/10 transition-all duration-300 hover:border-[#FEC129] hover:shadow-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-[#291334]/60 text-sm font-bold mb-1">Signés</p>
						<p class="text-3xl font-black text-green-600">{stats.completed}</p>
					</div>
					<div class="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
						<iconify-icon icon="solar:check-circle-bold" width="24" class="text-green-600"></iconify-icon>
					</div>
				</div>
			</div>

			<div class="bg-white p-6 rounded-2xl border border-[#291334]/10 transition-all duration-300 hover:border-[#FEC129] hover:shadow-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-[#291334]/60 text-sm font-bold mb-1">Expirés</p>
						<p class="text-3xl font-black text-red-600">{stats.expired}</p>
					</div>
					<div class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
						<iconify-icon icon="solar:close-circle-bold" width="24" class="text-red-600"></iconify-icon>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-2xl border border-[#291334]/10 overflow-hidden">
			<div class="p-6 border-b border-[#291334]/10">
				<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
					<div class="flex-1 w-full sm:max-w-md">
						<SearchInput bind:value={searchQuery} placeholder="Rechercher par template ou signataire..." />
					</div>

					<div class="flex gap-2 flex-wrap">
						<button
							onclick={() => (filters.status = undefined)}
							class="px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 {filters.status ===
							undefined
								? 'bg-[#291334] text-white'
								: 'bg-[#291334]/5 text-[#291334]/70 hover:bg-[#291334]/10'}"
						>
							Tous
						</button>
						<button
							onclick={() => (filters.status = 'pending')}
							class="px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 {filters.status ===
							'pending'
								? 'bg-amber-500 text-white'
								: 'bg-amber-50 text-amber-700 hover:bg-amber-100'}"
						>
							En attente
						</button>
						<button
							onclick={() => (filters.status = 'completed')}
							class="px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 {filters.status ===
							'completed'
								? 'bg-green-500 text-white'
								: 'bg-green-50 text-green-700 hover:bg-green-100'}"
						>
							Signés
						</button>
						<button
							onclick={() => (filters.status = 'expired')}
							class="px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 {filters.status ===
							'expired'
								? 'bg-red-500 text-white'
								: 'bg-red-50 text-red-700 hover:bg-red-100'}"
						>
							Expirés
						</button>
					</div>
				</div>
			</div>

			{#if pageLoading}
				<div class="flex items-center justify-center py-20">
					<Spinner size={40} />
				</div>
			{:else if filteredSubmissions.length === 0}
				<EmptyState
					icon="solar:document-text-bold"
					title="Aucune demande de signature"
					description={searchQuery
						? 'Aucune demande ne correspond à votre recherche'
						: 'Créez votre première demande de signature'}
				/>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-[#291334]/5">
							<tr>
								<th class="px-6 py-4 text-left text-xs font-black text-[#291334] uppercase tracking-wider">
									Template
								</th>
								<th class="px-6 py-4 text-left text-xs font-black text-[#291334] uppercase tracking-wider">
									Signataires
								</th>
								<th class="px-6 py-4 text-left text-xs font-black text-[#291334] uppercase tracking-wider">
									Statut
								</th>
								<th class="px-6 py-4 text-left text-xs font-black text-[#291334] uppercase tracking-wider">
									Date de création
								</th>
								<th class="px-6 py-4 text-left text-xs font-black text-[#291334] uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[#291334]/10">
							{#each filteredSubmissions as submission (submission.id)}
								<tr class="hover:bg-[#291334]/5 transition-colors duration-200">
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<div class="w-10 h-10 rounded-xl bg-[#291334]/10 flex items-center justify-center flex-shrink-0">
												<iconify-icon icon="solar:document-text-bold" width="20" class="text-[#291334]"></iconify-icon>
											</div>
											<div>
												<p class="font-bold text-[#291334]">{submission.template?.name || 'Sans template'}</p>
												<p class="text-xs text-[#291334]/60 font-medium">#{submission.slug}</p>
											</div>
										</div>
									</td>
									<td class="px-6 py-4">
										<div class="space-y-1">
											{#each submission.submitters as submitter (submitter.id)}
												<div class="flex items-center gap-2">
													<Badge variant={getStatusBadge(submitter.status).variant} size="sm">
														{submitter.role}
													</Badge>
													<span class="text-sm text-[#291334]/70 font-medium">
														{submitter.name || submitter.email || 'Sans nom'}
													</span>
												</div>
											{/each}
										</div>
									</td>
									<td class="px-6 py-4">
										<Badge variant={getStatusBadge(submission.status).variant}>
											{getStatusBadge(submission.status).label}
										</Badge>
									</td>
									<td class="px-6 py-4">
										<p class="text-sm font-medium text-[#291334]">{formatDate(submission.created_at)}</p>
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center gap-2">
											<button
												onclick={() => goto(`/admin/sign/${submission.id}`)}
												class="p-2 rounded-xl hover:bg-[#291334]/10 transition-all duration-200 text-[#291334]"
												title="Voir les détails"
											>
												<iconify-icon icon="solar:eye-bold" width="20"></iconify-icon>
											</button>
											<button
												onclick={() => deleteSubmission(submission.id)}
												disabled={actionLoading === submission.id.toString()}
												class="p-2 rounded-xl hover:bg-red-50 transition-all duration-200 text-red-600 disabled:opacity-50"
												title="Supprimer"
											>
												{#if actionLoading === submission.id.toString()}
													<Spinner size={20} />
												{:else}
													<iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
												{/if}
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>
