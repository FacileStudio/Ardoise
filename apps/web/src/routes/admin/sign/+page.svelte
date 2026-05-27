<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Spinner, SearchInput, Badge, EmptyState } from '@repo/ui';
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
		if (!isConfigured) {
			pageLoading = false;
			return;
		}

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

<div class="p-6 max-w-5xl mx-auto space-y-6">
	<header class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Signature de documents</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Gérez les demandes de signature de documents
			</p>
		</div>
		<button
			onclick={() => goto('/admin/sign/create')}
			disabled={!isConfigured}
			class="bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			<iconify-icon icon="mdi:plus" width="16"></iconify-icon>
			Nouvelle signature
		</button>
	</header>

	{#if !isConfigured}
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
			<div class="flex items-start gap-3">
				<iconify-icon icon="solar:danger-triangle-bold" width="20" class="text-amber-600 flex-shrink-0 mt-0.5"></iconify-icon>
				<div>
					<h3 class="text-sm font-semibold text-amber-900 mb-1">DocuSeal non configuré</h3>
					<p class="text-xs text-amber-800">
						Pour utiliser la signature de documents, configurez DocuSeal dans les paramètres du backoffice.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<div class="rounded-xl border border-border p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-medium text-muted-foreground mb-1">Total</p>
					<p class="text-xl font-bold text-foreground">{stats.totalSubmissions}</p>
				</div>
				<iconify-icon icon="solar:document-text-bold" width="20" class="text-muted-foreground"></iconify-icon>
			</div>
		</div>

		<div class="rounded-xl border border-border p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-medium text-muted-foreground mb-1">En attente</p>
					<p class="text-xl font-bold text-amber-600">{stats.pending}</p>
				</div>
				<iconify-icon icon="solar:clock-circle-bold" width="20" class="text-amber-600"></iconify-icon>
			</div>
		</div>

		<div class="rounded-xl border border-border p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-medium text-muted-foreground mb-1">Signés</p>
					<p class="text-xl font-bold text-emerald-600">{stats.completed}</p>
				</div>
				<iconify-icon icon="solar:check-circle-bold" width="20" class="text-emerald-600"></iconify-icon>
			</div>
		</div>

		<div class="rounded-xl border border-border p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-medium text-muted-foreground mb-1">Expirés</p>
					<p class="text-xl font-bold text-red-600">{stats.expired}</p>
				</div>
				<iconify-icon icon="solar:hourglass-bold-duotone" width="20" class="text-red-600"></iconify-icon>
			</div>
		</div>
	</div>

	<div class="rounded-xl border border-border overflow-hidden">
		<div class="p-4 border-b border-border">
			<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
				<div class="flex-1 w-full sm:max-w-md">
					<SearchInput bind:value={searchQuery} placeholder="Rechercher par template ou signataire..." />
				</div>

				<div class="flex gap-1 flex-wrap">
					<button
						onclick={() => (filters.status = undefined)}
						class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {filters.status === undefined
							? 'bg-primary text-primary-foreground'
							: 'bg-background text-foreground border border-border hover:bg-muted'}"
					>
						Tous
					</button>
					<button
						onclick={() => (filters.status = 'pending')}
						class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {filters.status === 'pending'
							? 'bg-amber-500 text-white'
							: 'bg-background text-foreground border border-border hover:bg-muted'}"
					>
						En attente
					</button>
					<button
						onclick={() => (filters.status = 'completed')}
						class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {filters.status === 'completed'
							? 'bg-emerald-500 text-white'
							: 'bg-background text-foreground border border-border hover:bg-muted'}"
					>
						Signés
					</button>
					<button
						onclick={() => (filters.status = 'expired')}
						class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {filters.status === 'expired'
							? 'bg-red-500 text-white'
							: 'bg-background text-foreground border border-border hover:bg-muted'}"
					>
						Expirés
					</button>
				</div>
			</div>
		</div>

		{#if pageLoading}
			<div class="flex flex-col items-center justify-center py-20 space-y-4">
				<Spinner size="xl" />
				<p class="text-xs text-muted-foreground">Chargement...</p>
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
					<thead class="bg-muted">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Template</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Signataires</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date de création</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each filteredSubmissions as submission (submission.id)}
							<tr class="hover:bg-muted transition-colors">
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<div class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
											<iconify-icon icon="solar:document-text-bold" width="16" class="text-muted-foreground"></iconify-icon>
										</div>
										<div>
											<p class="text-sm font-medium text-foreground">{submission.template?.name || 'Sans template'}</p>
											<p class="text-xs text-muted-foreground">#{submission.slug}</p>
										</div>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="space-y-1">
										{#each submission.submitters as submitter (submitter.id)}
											<div class="flex items-center gap-1">
												<Badge variant={getStatusBadge(submitter.status).variant} size="sm">
													{submitter.role}
												</Badge>
												<span class="text-xs text-muted-foreground">
													{submitter.name || submitter.email || 'Sans nom'}
												</span>
											</div>
										{/each}
									</div>
								</td>
								<td class="px-4 py-3">
									<Badge variant={getStatusBadge(submission.status).variant}>
										{getStatusBadge(submission.status).label}
									</Badge>
								</td>
								<td class="px-4 py-3">
									<p class="text-sm text-foreground">{formatDate(submission.created_at)}</p>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-1">
										<button
											onclick={() => goto(`/admin/sign/${submission.id}`)}
											class="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
											title="Voir les détails"
										>
											<iconify-icon icon="solar:eye-bold" width="16"></iconify-icon>
										</button>
										<button
											onclick={() => deleteSubmission(submission.id)}
											disabled={actionLoading === submission.id.toString()}
											class="p-1.5 rounded hover:bg-red-50 transition-colors text-red-600 disabled:opacity-50"
											title="Supprimer"
										>
											{#if actionLoading === submission.id.toString()}
												<Spinner size={16} />
											{:else}
												<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
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
