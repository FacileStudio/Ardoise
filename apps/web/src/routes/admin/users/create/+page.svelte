<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

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
			goto(resolve('/admin/users'));
		} catch (err: any) {
			logger.error({ err }, 'Failed to send invitation');

			if (err.message?.includes('already exists'))
				emailError = 'Un utilisateur avec cet email existe déjà';
			else
				toast.danger(err.message || 'Erreur lors de l\'envoi de l\'invitation');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6">
	<div>
		<button
			onclick={() => goto(resolve('/admin/users'))}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
			Retour aux utilisateurs
		</button>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Inviter un utilisateur</h1>
		<p class="text-sm text-muted-foreground mt-1">
			La personne reçoit un lien par email, valable 7 jours, pour choisir son mot de passe
		</p>
	</div>

	<div class="space-y-6">
		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Destinataire</h2>
			<div>
				<div class="text-sm font-medium mb-2">Email *</div>
				<input
					type="email"
					bind:value={email}
					class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {emailError ? 'border-fc-danger/30 focus:border-fc-danger focus:ring-fc-danger/30' : 'border-border focus:border-primary focus:ring-primary/20'}"
					placeholder="user@example.com"
				/>
				{#if emailError}
					<p class="text-fc-danger text-xs mt-1">{emailError}</p>
				{/if}
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Rôle</h2>
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					onclick={() => (role = 'CLIENT')}
					class="px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 {role === 'CLIENT'
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground border border-border hover:bg-muted'}"
				>
					<iconify-icon icon="solar:user-bold" width="16"></iconify-icon>
					Utilisateur
				</button>
				<button
					type="button"
					onclick={() => (role = 'ADMIN')}
					class="px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 {role === 'ADMIN'
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground border border-border hover:bg-muted'}"
				>
					<iconify-icon icon="solar:crown-bold" width="16"></iconify-icon>
					Administrateur
				</button>
			</div>
		</div>

		{#if role === 'ADMIN'}
			<div class="rounded-lg border border-fc-info/30 bg-fc-info/10 p-4">
				<div class="flex items-start gap-3">
					<iconify-icon icon="solar:info-circle-bold" class="text-fc-info mt-0.5" width="18"></iconify-icon>
					<div class="flex-1">
						<h3 class="text-sm font-semibold text-fc-info mb-1">Permissions administrateur</h3>
						<p class="text-xs text-fc-info">
							Les administrateurs ont accès à toutes les fonctionnalités d'administration, incluant la gestion des clients, paiements, documents et utilisateurs.
						</p>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex gap-3 pt-2">
			<Button onclick={() => goto(resolve('/admin/users'))} variant="outline" class="flex-1" disabled={submitting}>
				Annuler
			</Button>
			<button
				onclick={handleInvite}
				disabled={submitting}
				class="flex-1 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if submitting}
					<iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
					Envoi en cours...
				{:else}
					Envoyer l'invitation
				{/if}
			</button>
		</div>
	</div>
</div>
