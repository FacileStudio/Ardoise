<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { Button } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let submitting = $state(false);
	let errors = $state<Record<string, string>>({});

	let formData = $state({
		email: '',
		password: '',
		confirmPassword: '',
		firstName: '',
		lastName: '',
		role: 'USER' as 'USER' | 'ADMIN',
	});

	function validateForm(): boolean {
		errors = {};

		if (!formData.email.trim()) {
			errors.email = 'L\'email est requis';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errors.email = 'Format d\'email invalide (ex: user@example.com)';
		}

		if (!formData.firstName.trim()) {
			errors.firstName = 'Le prénom est requis';
		}

		if (!formData.lastName.trim()) {
			errors.lastName = 'Le nom est requis';
		}

		if (!formData.password) {
			errors.password = 'Le mot de passe est requis';
		} else if (formData.password.length < 8) {
			errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
		}

		if (!formData.confirmPassword) {
			errors.confirmPassword = 'Veuillez confirmer le mot de passe';
		} else if (formData.password !== formData.confirmPassword) {
			errors.confirmPassword = 'Les mots de passe ne correspondent pas';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleCreate() {
		if (!validateForm()) {
			toast.push('Veuillez corriger les erreurs dans le formulaire', 'error');
			return;
		}

		try {
			submitting = true;
			await trpc.user.create.mutate({
				email: formData.email.trim(),
				password: formData.password,
				firstName: formData.firstName.trim(),
				lastName: formData.lastName.trim(),
				role: formData.role,
			});

			toast.push('Utilisateur créé avec succès!', 'success');
			goto('/admin/users');
		} catch (err: any) {
			logger.error({ err }, 'Failed to create user');

			let message = 'Erreur lors de la création de l\'utilisateur';

			if (err.message?.includes('already exists') || err.message?.includes('CONFLICT')) {
				message = 'Un utilisateur avec cet email existe déjà';
				errors.email = message;
			} else if (err.message?.includes('NOT_FOUND')) {
				message = 'Endpoint non trouvé - le backend doit être redéployé';
			} else if (err.message) {
				message = err.message;
			}

			toast.push(message, 'error');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6">
	<div>
		<button
			onclick={() => goto('/admin/users')}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
			Retour aux utilisateurs
		</button>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Créer un utilisateur</h1>
		<p class="text-sm text-muted-foreground mt-1">Créez un nouveau compte utilisateur ou administrateur</p>
	</div>

	<div class="space-y-6">
		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Informations du compte</h2>
			<div>
				<div class="text-sm font-medium mb-2">Email *</div>
				<input
					type="email"
					bind:value={formData.email}
					class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary/20'}"
					placeholder="user@example.com"
				/>
				{#if errors.email}
					<p class="text-red-600 text-xs mt-1">{errors.email}</p>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="text-sm font-medium mb-2">Prénom *</div>
					<input
						type="text"
						bind:value={formData.firstName}
						class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary/20'}"
						placeholder="John"
					/>
					{#if errors.firstName}
						<p class="text-red-600 text-xs mt-1">{errors.firstName}</p>
					{/if}
				</div>

				<div>
					<div class="text-sm font-medium mb-2">Nom *</div>
					<input
						type="text"
						bind:value={formData.lastName}
						class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary/20'}"
						placeholder="Doe"
					/>
					{#if errors.lastName}
						<p class="text-red-600 text-xs mt-1">{errors.lastName}</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Sécurité</h2>
			<div>
				<div class="text-sm font-medium mb-2">Mot de passe *</div>
				<input
					type="password"
					bind:value={formData.password}
					class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary/20'}"
					placeholder="Minimum 8 caractères"
				/>
				{#if errors.password}
					<p class="text-red-600 text-xs mt-1">{errors.password}</p>
				{/if}
			</div>

			<div>
				<div class="text-sm font-medium mb-2">Confirmer le mot de passe *</div>
				<input
					type="password"
					bind:value={formData.confirmPassword}
					class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary/20'}"
					placeholder="Confirmez le mot de passe"
				/>
				{#if errors.confirmPassword}
					<p class="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>
				{/if}
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Rôle</h2>
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					onclick={() => (formData.role = 'USER')}
					class="px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 {formData.role === 'USER'
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground border border-border hover:bg-muted'}"
				>
					<iconify-icon icon="solar:user-bold" width="16"></iconify-icon>
					Utilisateur
				</button>
				<button
					type="button"
					onclick={() => (formData.role = 'ADMIN')}
					class="px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 {formData.role === 'ADMIN'
						? 'bg-primary text-primary-foreground'
						: 'bg-background text-foreground border border-border hover:bg-muted'}"
				>
					<iconify-icon icon="solar:crown-bold" width="16"></iconify-icon>
					Administrateur
				</button>
			</div>
		</div>

		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
			<div class="flex items-start gap-3">
				<iconify-icon icon="solar:info-circle-bold" class="text-blue-600 mt-0.5" width="18"></iconify-icon>
				<div class="flex-1">
					<h3 class="text-sm font-semibold text-blue-900 mb-1">Permissions administrateur</h3>
					<p class="text-xs text-blue-800">
						Les administrateurs ont accès à toutes les fonctionnalités d'administration, incluant la gestion des clients, paiements, documents et utilisateurs.
					</p>
				</div>
			</div>
		</div>

		<div class="flex gap-3 pt-2">
			<Button onclick={() => goto('/admin/users')} intent="secondary" class="flex-1" disabled={submitting}>
				Annuler
			</Button>
			<button
				onclick={handleCreate}
				disabled={submitting}
				class="flex-1 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if submitting}
					<iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
					Création en cours...
				{:else}
					Créer l'utilisateur
				{/if}
			</button>
		</div>
	</div>
</div>
