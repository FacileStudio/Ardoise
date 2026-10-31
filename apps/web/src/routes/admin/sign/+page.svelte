<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Badge,
		Button,
		Card,
		ConfirmModal,
		EmptyState,
		Input,
		Page,
		PageHeader,
		Spinner,
		StatCard,
		Table,
		Tabs,
		toast,
	} from '@facile/muse';
	import { icons, ardoise } from '$lib/icons';
	import { logger } from '@repo/logger';

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

	let status = $state<'all' | SubmissionStatus>('all');
	let deleting = $state<Submission | null>(null);

	const statusTabs = [
		{ id: 'all', label: 'Tous' },
		{ id: 'pending', label: 'En attente' },
		{ id: 'completed', label: 'Signés' },
		{ id: 'expired', label: 'Expirés' },
	];

	function selectStatus(id: string) {
		status = id as typeof status;
		fetchSubmissions();
	}

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
				status: status === 'all' ? undefined : status,
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

	function getStatusBadge(status: SubmissionStatus): { variant: 'neutral' | 'success' | 'warning' | 'danger'; label: string } {
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
				return { variant: 'neutral', label: status };
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	async function deleteSubmission() {
		const target = deleting;
		if (!target) return;

		actionLoading = target.id.toString();
		try {
			await trpc.docuseal.deleteSubmission.mutate({ id: target.id });
			await fetchSubmissions();
			await calculateStats();
			toast.success('Demande de signature supprimée');
		} catch (err) {
			logger.error({ err }, 'Failed to delete submission');
			toast.danger('Erreur lors de la suppression de la demande de signature');
		} finally {
			actionLoading = '';
			deleting = null;
		}
	}

	const filteredSubmissions = $derived(
		submissions.filter((submission) => {
			const template = submission.template?.name.toLowerCase() || '';
			const submitters = submission.submitters.map(s => s.name?.toLowerCase() || s.email?.toLowerCase() || '').join(' ');
			const query = searchQuery.toLowerCase();
			return template.includes(query) || submitters.includes(query);
		})
	);
</script>

<svelte:head>
	<title>Signatures - Ardoise</title>
</svelte:head>

<Page width="xl">
	<PageHeader title="Signature de documents" description="Gérez les demandes de signature de documents">
		{#snippet actions()}
			<Button href={resolve('/admin/sign/create')} icon={icons.plus} disabled={!isConfigured}>
				Nouvelle signature
			</Button>
		{/snippet}
	</PageHeader>

	{#if !isConfigured}
		<Alert tone="warning" title="DocuSeal non configuré">
			Pour utiliser la signature de documents, configurez DocuSeal dans les
			<a href={resolve('/admin/settings/integrations')} class="font-medium underline">réglages</a>.
		</Alert>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<StatCard label="Total" value={stats.totalSubmissions} />
		<StatCard label="En attente" value={stats.pending} />
		<StatCard label="Signés" value={stats.completed} />
		<StatCard label="Expirés" value={stats.expired} />
	</div>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<Tabs items={statusTabs} value={status} onChange={selectStatus} label="Filtrer par statut" />
		<Input
			bind:value={searchQuery}
			placeholder="Rechercher"
			class="sm:max-w-80"
		/>
	</div>

	{#if pageLoading}
		<div class="flex min-h-[30dvh] items-center justify-center"><Spinner size="lg" /></div>
	{:else if filteredSubmissions.length === 0}
		<EmptyState
			icon={ardoise.signature}
			title="Aucune demande de signature"
			description={searchQuery
				? 'Aucune demande ne correspond à votre recherche'
				: 'Créez votre première demande de signature'}
		/>
	{:else}
		<Table class="hidden md:block">
			<thead>
				<tr>
					<th scope="col">Template</th>
					<th scope="col">Signataires</th>
					<th scope="col">Statut</th>
					<th scope="col">Date de création</th>
					<th scope="col" class="text-right"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each filteredSubmissions as submission (submission.id)}
					<tr>
						<td>
							<a
								href={resolve(`/admin/sign/${submission.id}`)}
								class="flex flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
							>
								<span class="font-medium text-fc-fg">{submission.template?.name || 'Sans template'}</span>
								<span class="font-fc-mono text-fc-xs text-fc-fg-muted">#{submission.slug}</span>
							</a>
						</td>
						<td>
							<div class="flex flex-col gap-1">
								{#each submission.submitters as submitter (submitter.id)}
									<div class="flex items-center gap-2">
										<Badge tone={getStatusBadge(submitter.status).variant}>{submitter.role}</Badge>
										<span class="text-fc-xs text-fc-fg-muted">
											{submitter.name || submitter.email || 'Sans nom'}
										</span>
									</div>
								{/each}
							</div>
						</td>
						<td>
							<Badge tone={getStatusBadge(submission.status).variant}>
								{getStatusBadge(submission.status).label}
							</Badge>
						</td>
						<td class="text-fc-fg-muted">{formatDate(submission.created_at)}</td>
						<td class="text-right">
							<Button
								variant="ghost"
								size="sm"
								icon={icons.eye}
								href={resolve(`/admin/sign/${submission.id}`)}
								aria-label="Voir les détails"
							/>
							<Button
								variant="ghost-danger"
								size="sm"
								icon={icons.remove}
								aria-label="Supprimer"
								disabled={actionLoading === submission.id.toString()}
								onclick={() => (deleting = submission)}
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</Table>

		<div class="flex flex-col gap-3 md:hidden">
			{#each filteredSubmissions as submission (submission.id)}
				<Card href={resolve(`/admin/sign/${submission.id}`)} class="flex flex-col gap-2">
					<div class="flex items-start justify-between gap-3">
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-fc-sm font-medium text-fc-fg">
								{submission.template?.name || 'Sans template'}
							</span>
							<span class="text-fc-xs text-fc-fg-muted">{formatDate(submission.created_at)}</span>
						</div>
						<Badge tone={getStatusBadge(submission.status).variant}>
							{getStatusBadge(submission.status).label}
						</Badge>
					</div>
					<span class="truncate text-fc-xs text-fc-fg-muted">
						{submission.submitters.map((s) => s.name || s.email || 'Sans nom').join(', ')}
					</span>
				</Card>
			{/each}
		</div>
	{/if}
</Page>

<ConfirmModal
	open={deleting !== null}
	title="Supprimer cette demande ?"
	description="Les signataires ne pourront plus signer le document. Cette action est définitive."
	confirmLabel="Supprimer"
	tone="danger"
	onConfirm={deleteSubmission}
	onCancel={() => (deleting = null)}
/>
