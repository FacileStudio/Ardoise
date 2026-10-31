<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
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
		Spinner,
		toast,
	} from '@facile/muse';
	import { icons } from '$lib/icons';
	import { logger } from '@repo/logger';

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
			goto(resolve('/admin/settings/users'));
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

<svelte:head>
	<title>Modifier l'utilisateur - Ardoise</title>
</svelte:head>

<Page width="md">
	{#if pageLoading}
		<div class="flex min-h-[40dvh] items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if user}
		<PageHeader
			title="Modifier l'utilisateur"
			description={`Modifiez les informations de ${user.firstName} ${user.lastName}`}
			back={{ href: '/admin/settings/users', label: 'Retour aux utilisateurs' }}
		/>

		<Section title="Informations du compte" card>
			<Field label="Email" error={errors.email}>
				<Input type="email" bind:value={formData.email} placeholder="user@example.com" />
			</Field>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field label="Prénom" error={errors.firstName}>
					<Input bind:value={formData.firstName} placeholder="John" />
				</Field>
				<Field label="Nom" error={errors.lastName}>
					<Input bind:value={formData.lastName} placeholder="Doe" />
				</Field>
			</div>
			<p class="text-fc-xs text-fc-fg-muted">Créé le {formatDate(user.createdAt)}</p>
		</Section>

		<Section title="Réinitialiser le mot de passe" card>
			<Alert tone="warning">
				Laissez ces champs vides si vous ne souhaitez pas modifier le mot de passe.
			</Alert>
			<Field label="Nouveau mot de passe" error={errors.password}>
				<Input type="password" bind:value={formData.password} placeholder="Minimum 8 caractères" />
			</Field>
			<Field label="Confirmer le nouveau mot de passe" error={errors.confirmPassword}>
				<Input
					type="password"
					bind:value={formData.confirmPassword}
					placeholder="Confirmez le mot de passe"
				/>
			</Field>
		</Section>

		<Section title="Rôle" card>
			<OptionCards
				options={[
					{ value: 'USER', label: 'Utilisateur', icon: icons.userCircle },
					{ value: 'ADMIN', label: 'Administrateur', icon: icons.shield },
				]}
				bind:value={formData.role}
				label="Rôle"
			/>
		</Section>

		<div class="flex justify-end gap-3">
			<Button href={resolve('/admin/settings/users')} variant="ghost" disabled={submitting}>
				Annuler
			</Button>
			<Button onclick={handleUpdate} disabled={submitting}>
				{submitting ? 'Modification en cours...' : 'Enregistrer les modifications'}
			</Button>
		</div>
	{/if}
</Page>
