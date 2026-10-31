<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Modal } from '@facile/muse';
	import { isAdmin } from '@repo/auth-shared';
	import authStore from '$lib/auth-store';
	import { smtpNotice } from '$lib/smtp-notice.svelte';

	const admin = $derived(isAdmin($authStore.user));

	function openSettings() {
		smtpNotice.open = false;
		window.location.assign(resolve('/admin/settings/email'));
	}
</script>

<Modal bind:open={smtpNotice.open} title="Envoi d'emails non configuré">
	<div class="space-y-4">
		<p class="text-sm text-muted-foreground">
			Cette action envoie un email, mais aucun serveur SMTP n'est configuré. Rien n'a été envoyé.
		</p>
		<p class="text-sm text-muted-foreground">
			{#if admin}
				Renseignez le serveur, l'identifiant et l'expéditeur dans les paramètres, puis recommencez.
			{:else}
				Demandez à un administrateur de configurer le SMTP dans les paramètres, puis recommencez.
			{/if}
		</p>

		<div class="flex gap-3">
			<Button variant="ghost" class="flex-1" onclick={() => (smtpNotice.open = false)}>
				Fermer
			</Button>
			{#if admin}
				<Button class="flex-1" onclick={openSettings}>Configurer le SMTP</Button>
			{/if}
		</div>
	</div>
</Modal>
