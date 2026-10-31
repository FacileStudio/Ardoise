<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import {
		Badge,
		Button,
		Card,
		Icon,
		Page,
		PageHeader,
		Section,
		Spinner,
		toast,
	} from '@facile/muse';
	import { icons, ardoise } from '$lib/icons';
	import { logger } from '@repo/logger';

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

	const submissionId = $derived(parseInt($page.params.id as string));

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
			toast.danger('Erreur lors du chargement de la demande de signature');
			goto(resolve('/admin/sign'));
		} finally {
			pageLoading = false;
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

	type TimelineEvent = {
		key: string;
		icon: string;
		tone: 'success' | 'info' | 'warning' | 'danger';
		title: string;
		at: string;
	};

	const toneClass = {
		success: 'bg-fc-success/10 text-fc-success',
		info: 'bg-fc-info/10 text-fc-info',
		warning: 'bg-fc-warning/10 text-fc-warning',
		danger: 'bg-fc-danger/10 text-fc-danger',
	};

	const timeline = $derived.by(() => {
		if (!submission) return [] as TimelineEvent[];
		const events: TimelineEvent[] = [
			{
				key: 'created',
				icon: icons.plus,
				tone: 'success',
				title: 'Demande créée',
				at: submission.created_at,
			},
		];
		for (const s of submission.submitters) {
			const who = s.name || s.email;
			if (s.sent_at) {
				events.push({ key: `${s.id}-sent`, icon: icons.mail, tone: 'info', title: `Envoyé à ${who}`, at: s.sent_at });
			}
			if (s.opened_at) {
				events.push({ key: `${s.id}-opened`, icon: icons.eye, tone: 'warning', title: `Ouvert par ${who}`, at: s.opened_at });
			}
			if (s.completed_at) {
				events.push({ key: `${s.id}-done`, icon: icons.check, tone: 'success', title: `Signé par ${who}`, at: s.completed_at });
			}
			if (s.declined_at) {
				events.push({ key: `${s.id}-declined`, icon: icons.error, tone: 'danger', title: `Refusé par ${who}`, at: s.declined_at });
			}
		}
		return events;
	});

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

<svelte:head>
	<title>Détails de la signature - Ardoise</title>
</svelte:head>

<Page width="lg">
	<PageHeader
		title="Détails de la signature"
		description="Consultez les informations et le statut de la demande"
		back={{ href: '/admin/sign', label: 'Retour aux signatures' }}
	/>

	{#if pageLoading}
		<div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
	{:else if submission}
		<Section card>
			<div class="flex items-start justify-between gap-4">
				<div class="flex min-w-0 flex-col gap-1">
					<h2 class="text-fc-lg font-semibold text-fc-fg">
						{submission.template?.name || 'Sans template'}
					</h2>
					<p class="font-fc-mono text-fc-xs text-fc-fg-muted">Référence : #{submission.slug}</p>
				</div>
				<Badge tone={getStatusBadge(submission.status).variant}>
					{getStatusBadge(submission.status).label}
				</Badge>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-1">
					<p class="text-fc-xs text-fc-fg-muted">Date de création</p>
					<p class="text-fc-sm font-medium text-fc-fg">{formatDate(submission.created_at)}</p>
				</div>
				<div class="flex flex-col gap-1">
					<p class="text-fc-xs text-fc-fg-muted">Dernière mise à jour</p>
					<p class="text-fc-sm font-medium text-fc-fg">{formatDate(submission.updated_at)}</p>
				</div>
			</div>

			{#if submission.combined_document_url || submission.audit_log_url}
				{@const documentUrl = submission.combined_document_url}
				{@const auditLogUrl = submission.audit_log_url}
				<div class="flex flex-wrap gap-3">
					{#if documentUrl}
						<Button icon={icons.download} onclick={() => void window.open(documentUrl, '_blank')}>
							Télécharger le document signé
						</Button>
					{/if}
					{#if auditLogUrl}
						<Button
							variant="ghost"
							icon={ardoise.document}
							onclick={() => void window.open(auditLogUrl, '_blank')}
						>
							Voir le journal d'audit
						</Button>
					{/if}
				</div>
			{/if}
		</Section>

		<Section title={`Signataires (${submission.submitters.length})`}>
			<div class="flex flex-col gap-3">
				{#each submission.submitters as submitter (submitter.id)}
					<Card class="flex flex-col gap-4">
						<div class="flex items-start justify-between gap-4">
							<div class="flex min-w-0 flex-col">
								<p class="text-fc-sm font-medium text-fc-fg">{submitter.name || 'Sans nom'}</p>
								<p class="text-fc-xs text-fc-fg-muted">{submitter.email}</p>
								{#if submitter.phone}
									<p class="text-fc-xs text-fc-fg-muted">{submitter.phone}</p>
								{/if}
							</div>
							<div class="flex flex-col items-end gap-1">
								<Badge tone={getStatusBadge(submitter.status).variant}>{submitter.role}</Badge>
								<p class="text-fc-xs text-fc-fg-muted">{getStatusBadge(submitter.status).label}</p>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{#each [['Envoyé', submitter.sent_at], ['Ouvert', submitter.opened_at], ['Complété', submitter.completed_at], ['Refusé', submitter.declined_at]] as [label, at] (label)}
								<div class="flex flex-col gap-0.5">
									<p class="text-fc-xs text-fc-fg-muted">{label}</p>
									<p class="text-fc-xs text-fc-fg">{formatDate(at)}</p>
								</div>
							{/each}
						</div>
					</Card>
				{/each}
			</div>
		</Section>

		<Section title="Chronologie" card>
			<ol class="flex flex-col gap-4">
				{#each timeline as event (event.key)}
					<li class="flex items-center gap-3">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-fc-pill {toneClass[event.tone]}"
						>
							<Icon icon={event.icon} />
						</span>
						<div class="flex flex-col">
							<p class="text-fc-sm font-medium text-fc-fg">{event.title}</p>
							<p class="text-fc-xs text-fc-fg-muted">{formatDate(event.at)}</p>
						</div>
					</li>
				{/each}
			</ol>
		</Section>
	{/if}
</Page>
