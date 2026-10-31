<script lang="ts">
	import { Button, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { trpc } from '$lib/trpc';

	interface Props {
		documentId: string;
		enabled: boolean;
		onsent?: () => Promise<void> | void;
	}

	let { documentId, enabled, onsent }: Props = $props();

	let loading = $state(false);

	const title = $derived(
		enabled
			? 'Envoyer le contrat au client et au prestataire pour signature'
			: "Plume n'est pas configuré sur ce serveur (PLUME_URL, PLUME_API_TOKEN, PLUME_WEBHOOK_SECRET)"
	);

	async function send() {
		loading = true;

		try {
			await trpc.document.sendForSignature.mutate({ id: documentId });
			toast.success('Document envoyé pour signature');
			await onsent?.();
		} catch (err: any) {
			logger.error({ err }, 'Failed to send document for signature');
			toast.danger(err?.message || "Impossible d'envoyer le document pour signature");
		} finally {
			loading = false;
		}
	}
</script>

<Button
	variant="outline"
	size="sm"
	icon="solar:pen-bold"
	disabled={!enabled || loading}
	{title}
	onclick={send}
>
	{loading ? 'Envoi...' : 'Envoyer pour signature'}
</Button>
