<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Spinner, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let userId = $derived($page.params.id as string);
	let pageLoading = $state(true);
	let submitting = $state(false);
	let user: any = $state(null);
	let errors = $state<Record<string, string>>({});

	let formData = $state({
		email: '',
		firstName: '',
		lastName: '',
		role: 'USER' as 'USER' | 'ADMIN',
		password: '',
		confirmPassword: '',
	});

	onMount(async () => {
		await fetchUser();
	});

	async function fetchUser() {
		pageLoading = true;
		try {
			user = await trpc.user.getById.query({ id: userId });
			formData.email = user.email;
			formData.firstName = user.firstName;
			formData.lastName = user.lastName;
			formData.role = user.role;
		} catch (err) {
			logger.error({ err }, 'Failed to fetch user');
			toast.danger('Erreur lors du chargement de l\'utilisateur');
		} finally {
			pageLoading = false;
		}
	}

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

		if (formData.password || formData.confirmPassword) {
			if (formData.password && formData.password.length < 8) {
				errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
			}
			if (formData.password !== formData.confirmPassword) {
				errors.confirmPassword = 'Les mots de passe ne correspondent pas';
			}
		}

		return Object.keys(errors).length === 0;
	}

	async function handleUpdate() {
		if (!validateForm()) {
			toast.danger('Veuillez corriger les erreurs dans le formulaire');
			return;
		}

		try {
			submitting = true;
			const updateData: any = {
				id: userId,
				email: formData.email.trim(),
				firstName: formData.firstName.trim(),
				lastName: formData.lastName.trim(),
				role: formData.role,
			};

			if (formData.password) {
				updateData.password = formData.password;
			}

			await trpc.user.adminUpdate.mutate(updateData);

			toast.success('Utilisateur modifié avec succès!');
			goto(resolve('/admin/users'));
		} catch (err: any) {
			logger.error({ err }, 'Failed to update user');

			let message = 'Erreur lors de la modification de l\'utilisateur';

			if (err.message?.includes('already exists') || err.message?.includes('CONFLICT')) {
				message = 'Un utilisateur avec cet email existe déjà';
				errors.email = message;
			} else if (err.message?.includes('NOT_FOUND')) {
				message = 'Endpoint non trouvé - le backend doit être redéployé';
			} else if (err.message) {
				message = err.message;
			}

			toast.danger(message);
		} finally {
			submitting = false;
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
		}).format(new Date(date));
	}
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6">
	{#if pageLoading}
		<div class="py-20 flex justify-center">
			<Spinner size="lg" />
		</div>
	{:else if user}
		<div>
			<button
				onclick={() => goto(resolve('/admin/users'))}
				class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
				Retour aux utilisateurs
			</button>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Modifier l'utilisateur</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Modifiez les informations de {user.firstName} {user.lastName}
			</p>
		</div>

		<div class="space-y-6">
			<div class="rounded-xl border border-border p-6 space-y-4">
				<h2 class="text-base font-semibold text-foreground">Informations du compte</h2>
				<div>
					<div class="text-sm font-medium mb-2">Email *</div>
					<input
						type="email"
						bind:value={formData.email}
						class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.email ? 'border-fc-danger/30 focus:border-fc-danger focus:ring-fc-danger/30' : 'border-border focus:border-primary focus:ring-primary/20'}"
						placeholder="user@example.com"
					/>
					{#if errors.email}
						<p class="text-fc-danger text-xs mt-1">{errors.email}</p>
					{/if}
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<div class="text-sm font-medium mb-2">Prénom *</div>
						<input
							type="text"
							bind:value={formData.firstName}
							class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.firstName ? 'border-fc-danger/30 focus:border-fc-danger focus:ring-fc-danger/30' : 'border-border focus:border-primary focus:ring-primary/20'}"
							placeholder="John"
						/>
						{#if errors.firstName}
							<p class="text-fc-danger text-xs mt-1">{errors.firstName}</p>
						{/if}
					</div>

					<div>
						<div class="text-sm font-medium mb-2">Nom *</div>
						<input
							type="text"
							bind:value={formData.lastName}
							class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.lastName ? 'border-fc-danger/30 focus:border-fc-danger focus:ring-fc-danger/30' : 'border-border focus:border-primary focus:ring-primary/20'}"
							placeholder="Doe"
						/>
						{#if errors.lastName}
							<p class="text-fc-danger text-xs mt-1">{errors.lastName}</p>
						{/if}
					</div>
				</div>

				<div class="bg-muted rounded-lg p-3 text-xs text-muted-foreground">
					Créé le: {formatDate(user.createdAt)}
				</div>
			</div>

			<div class="rounded-xl border border-border p-6 space-y-4">
				<h2 class="text-base font-semibold text-foreground">Réinitialiser le mot de passe</h2>
				<div class="rounded-lg border border-fc-warning/30 bg-fc-warning/10 p-3">
					<p class="text-xs text-fc-warning">
						Laissez ces champs vides si vous ne souhaitez pas modifier le mot de passe.
					</p>
				</div>

				<div>
					<div class="text-sm font-medium mb-2">Nouveau mot de passe</div>
					<input
						type="password"
						bind:value={formData.password}
						class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.password ? 'border-fc-danger/30 focus:border-fc-danger focus:ring-fc-danger/30' : 'border-border focus:border-primary focus:ring-primary/20'}"
						placeholder="Minimum 8 caractères"
					/>
					{#if errors.password}
						<p class="text-fc-danger text-xs mt-1">{errors.password}</p>
					{/if}
				</div>

				<div>
					<div class="text-sm font-medium mb-2">Confirmer le nouveau mot de passe</div>
					<input
						type="password"
						bind:value={formData.confirmPassword}
						class="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors {errors.confirmPassword ? 'border-fc-danger/30 focus:border-fc-danger focus:ring-fc-danger/30' : 'border-border focus:border-primary focus:ring-primary/20'}"
						placeholder="Confirmez le mot de passe"
					/>
					{#if errors.confirmPassword}
						<p class="text-fc-danger text-xs mt-1">{errors.confirmPassword}</p>
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

			<div class="flex gap-3 pt-2">
				<Button onclick={() => goto(resolve('/admin/users'))} variant="outline" class="flex-1" disabled={submitting}>
					Annuler
				</Button>
				<button
					onclick={handleUpdate}
					disabled={submitting}
					class="flex-1 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if submitting}
						<iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
						Modification en cours...
					{:else}
						Enregistrer les modifications
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>
