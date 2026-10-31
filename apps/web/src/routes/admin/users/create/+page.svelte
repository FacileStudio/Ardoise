<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Field,
		Input,
		OptionCards,
		Page,
		PageHeader,
		Section,
		toast,
	} from '@facile/muse';
	import { icons } from '$lib/icons';
	import { logger } from '@repo/logger';
	import { isSmtpNotConfigured } from '@repo/trpc-client';

	let submitting = $state(false);
	let emailError = $state('');
	let email = $state('');
	let role = $state<'CLIENT' | 'ADMIN'>('ADMIN');

	async function handleInvite() {
		emailError = '';

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			emailError = 'Format d\'email invalide (ex: user@example.com)';
			return;
		}

		try {
			submitting = true;
			await trpc.invitation.create.mutate({ email: email.trim(), role });
			toast.success('Invitation envoyée');
			goto(resolve('/admin/settings/users'));
		} catch (err: any) {
			logger.error({ err }, 'Failed to send invitation');

			if (isSmtpNotConfigured(err))
				return;

			if (err.message?.includes('already exists'))
				emailError = 'Un utilisateur avec cet email existe déjà';
			else
				toast.danger(err.message || 'Erreur lors de l\'envoi de l\'invitation');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Inviter un utilisateur - Ardoise</title>
</svelte:head>

<Page width="md">
	<PageHeader
		title="Inviter un utilisateur"
		description="La personne reçoit un lien par email, valable 7 jours, pour rejoindre Ardoise"
		back={{ href: '/admin/settings/users', label: 'Retour aux utilisateurs' }}
	/>

	<Section title="Destinataire" card>
		<Field label="Email" error={emailError}>
			<Input type="email" bind:value={email} placeholder="user@example.com" />
		</Field>
	</Section>

	<Section title="Rôle" card>
		<OptionCards
			options={[
				{ value: 'CLIENT', label: 'Utilisateur', icon: icons.userCircle },
				{ value: 'ADMIN', label: 'Administrateur', icon: icons.shield },
			]}
			bind:value={role}
			label="Rôle"
		/>
	</Section>

	{#if role === 'ADMIN'}
		<Alert tone="info" title="Permissions administrateur">
			Les administrateurs ont accès à toutes les fonctionnalités d'administration, incluant la
			gestion des clients, paiements, documents et utilisateurs.
		</Alert>
	{/if}

	<div class="flex justify-end gap-3">
		<Button href={resolve('/admin/settings/users')} variant="ghost" disabled={submitting}>
			Annuler
		</Button>
		<Button onclick={handleInvite} disabled={submitting}>
			{submitting ? 'Envoi en cours...' : "Envoyer l'invitation"}
		</Button>
	</div>
</Page>
