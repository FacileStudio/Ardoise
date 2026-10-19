<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Modal } from '@facile/muse';
	import { isAdmin } from '@repo/auth-shared';
	import authStore from '$lib/auth-store';
	import { smtpNotice } from '$lib/smtp-notice.svelte';

	const admin = $derived(isAdmin($authStore.user));

	async function openSettings() {
		smtpNotice.open = false;
		await goto(`${resolve('/admin/settings')}#smtp`);
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
			<Button variant="outline" class="flex-1" onclick={() => (smtpNotice.open = false)}>
				Fermer
			</Button>
			{#if admin}
				<button
					onclick={openSettings}
					class="flex-1 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium"
				>
					Configurer le SMTP
				</button>
			{/if}
		</div>
	</div>
</Modal>
