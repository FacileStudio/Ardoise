<script lang="ts">
	import { Badge, Button } from '@facile/muse';

	type Status = 'none' | 'sent' | 'signed' | 'declined';
	type Tone = 'neutral' | 'info' | 'success' | 'danger';

	interface Props {
		status: Status;
		plumeUrl?: string | null;
		signedAt?: string | Date | null;
		archived?: boolean;
	}

	let { status, plumeUrl = null, signedAt = null, archived = false }: Props = $props();

	const labels: Record<Status, string> = {
		none: 'Non envoyé',
		sent: 'En attente de signature',
		signed: 'Signé',
		declined: 'Refusé',
	};

	const tones: Record<Status, Tone> = {
		none: 'neutral',
		sent: 'info',
		signed: 'success',
		declined: 'danger',
	};

	const signedLabel = $derived(signedAt ? new Date(signedAt).toLocaleDateString('fr-FR') : null);
</script>

<div class="flex flex-wrap items-center gap-2 text-fc-xs">
	<Badge tone={tones[status]}>
		{labels[status]}{status === 'signed' && signedLabel ? ` le ${signedLabel}` : ''}
	</Badge>
	{#if plumeUrl && status !== 'none'}
		<Button
			variant="ghost"
			size="sm"
			href={plumeUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			Voir dans Plume
		</Button>
	{/if}
	{#if archived}
		<span class="text-fc-fg-muted">Copie signée archivée dans Nuage</span>
	{/if}
</div>
