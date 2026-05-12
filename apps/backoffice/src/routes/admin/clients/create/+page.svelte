<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { Button, Input } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let submitting = $state(false);
	let formMessage = $state('');

	let formData = $state({
		contactFirstName: '',
		contactLastName: '',
		contactEmail: '',
		companyName: '',
		billingAddress: '',
		billingCity: '',
		billingCountry: '',
		siret: '',
		createCredentials: false,
		credentialEmail: '',
		credentialPassword: '',
	});

	let formErrors = $state<Record<string, string>>({});

	function resetErrors() {
		formErrors = {};
		formMessage = '';
	}

	function getFieldError(field: string) {
		return formErrors[field] || '';
	}

	function isValidEmail(value: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}

	function validateForm(): boolean {
		resetErrors();
		const nextErrors: Record<string, string> = {};

		if (!formData.contactFirstName.trim()) {
			nextErrors.contactFirstName = 'Le prénom du contact est requis';
		}

		if (!formData.contactLastName.trim()) {
			nextErrors.contactLastName = 'Le nom du contact est requis';
		}

		if (formData.contactEmail.trim() && !isValidEmail(formData.contactEmail.trim())) {
			nextErrors.contactEmail = "Format d'email invalide";
		}

		if (!formData.companyName.trim()) {
			nextErrors.companyName = "Le nom de l'entreprise est requis";
		}

		if (formData.createCredentials) {
			if (!formData.credentialEmail.trim()) {
				nextErrors.credentialEmail = "L'email de connexion est requis";
			} else if (!isValidEmail(formData.credentialEmail.trim())) {
				nextErrors.credentialEmail = "Format d'email invalide";
			}

			if (!formData.credentialPassword) {
				nextErrors.credentialPassword = 'Le mot de passe est requis';
			} else if (formData.credentialPassword.length < 8) {
				nextErrors.credentialPassword = 'Le mot de passe doit contenir au moins 8 caractères';
			}
		}

		formErrors = nextErrors;
		formMessage = Object.values(nextErrors)[0] || '';
		return Object.keys(nextErrors).length === 0;
	}

	async function handleCreate() {
		if (!validateForm()) {
			toast.push(formMessage, 'error');
			return;
		}

		try {
			submitting = true;
			await trpc.client.create.mutate({
				...formData,
				contactEmail: formData.contactEmail.trim(),
				credentialEmail: formData.credentialEmail.trim(),
			});
			toast.push('Client créé avec succès!', 'success');
			goto('/admin/clients');
		} catch (err: any) {
			logger.error({ err }, 'Failed to create client');
			const message = err.message || 'Erreur lors de la création';

			if (message.includes('email already exists')) {
				formErrors.credentialEmail = 'Un utilisateur avec cet email existe déjà';
				formMessage = formErrors.credentialEmail;
			} else if (message.includes('Credential email')) {
				formErrors.credentialEmail = message;
				formMessage = message;
			} else if (message.includes('Credential password')) {
				formErrors.credentialPassword = message;
				formMessage = message;
			} else {
				formMessage = message;
			}

			toast.push(formMessage, 'error');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6">
	<div>
		<button
			onclick={() => goto('/admin/clients')}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
			Retour aux clients
		</button>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">
			{$i18n.t('backoffice.clients.newClient')}
		</h1>
		<p class="text-sm text-muted-foreground mt-1">Créez une fiche client, avec ou sans accès à Charles</p>
	</div>

	<div class="space-y-6">
		{#if formMessage}
			<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
				{formMessage}
			</div>
		{/if}

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Contact client</h2>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="text-sm font-medium mb-2">Prénom <span class="text-red-500">*</span></div>
					<Input bind:value={formData.contactFirstName} placeholder="Jean" error={!!getFieldError('contactFirstName')} />
					{#if getFieldError('contactFirstName')}
						<p class="mt-1 text-xs text-red-600">{getFieldError('contactFirstName')}</p>
					{/if}
				</div>

				<div>
					<div class="text-sm font-medium mb-2">Nom <span class="text-red-500">*</span></div>
					<Input bind:value={formData.contactLastName} placeholder="Dupont" error={!!getFieldError('contactLastName')} />
					{#if getFieldError('contactLastName')}
						<p class="mt-1 text-xs text-red-600">{getFieldError('contactLastName')}</p>
					{/if}
				</div>
			</div>

			<div>
				<div class="text-sm font-medium mb-2">Email de contact</div>
				<Input bind:value={formData.contactEmail} type="email" placeholder="contact@entreprise.fr" error={!!getFieldError('contactEmail')} />
				{#if getFieldError('contactEmail')}
					<p class="mt-1 text-xs text-red-600">{getFieldError('contactEmail')}</p>
				{:else}
					<p class="mt-1 text-xs text-muted-foreground">Utilisé pour le suivi commercial et les paiements Stripe.</p>
				{/if}
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Informations entreprise</h2>
			<div>
				<div class="text-sm font-medium mb-2">Nom de l'entreprise <span class="text-red-500">*</span></div>
				<Input bind:value={formData.companyName} placeholder="Entreprise SAS" error={!!getFieldError('companyName')} />
				{#if getFieldError('companyName')}
					<p class="mt-1 text-xs text-red-600">{getFieldError('companyName')}</p>
				{/if}
			</div>

			<div>
				<div class="text-sm font-medium mb-2">SIRET</div>
				<Input bind:value={formData.siret} placeholder="12345678901234" />
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Adresse de facturation</h2>
			<div>
				<div class="text-sm font-medium mb-2">Adresse</div>
				<Input bind:value={formData.billingAddress} placeholder="123 rue de la Paix" />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="text-sm font-medium mb-2">Ville</div>
					<Input bind:value={formData.billingCity} placeholder="Paris" />
				</div>

				<div>
					<div class="text-sm font-medium mb-2">Pays</div>
					<Input bind:value={formData.billingCountry} placeholder="France" />
				</div>
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Accès client à Charles</h2>
			<label class="flex items-start gap-3 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={formData.createCredentials}
					class="mt-1 h-4 w-4 rounded border-border"
				/>
				<div>
					<div class="text-sm font-semibold text-foreground">Créer des identifiants de connexion</div>
					<p class="text-xs text-muted-foreground">Activez seulement si ce client doit se connecter à Charles.</p>
				</div>
			</label>

			{#if formData.createCredentials}
				<div class="grid grid-cols-2 gap-4">
					<div>
						<div class="text-sm font-medium mb-2">Email de connexion <span class="text-red-500">*</span></div>
						<Input bind:value={formData.credentialEmail} type="email" placeholder="login@entreprise.fr" error={!!getFieldError('credentialEmail')} />
						{#if getFieldError('credentialEmail')}
							<p class="mt-1 text-xs text-red-600">{getFieldError('credentialEmail')}</p>
						{/if}
					</div>

					<div>
						<div class="text-sm font-medium mb-2">Mot de passe <span class="text-red-500">*</span></div>
						<Input bind:value={formData.credentialPassword} type="password" placeholder="••••••••" error={!!getFieldError('credentialPassword')} />
						{#if getFieldError('credentialPassword')}
							<p class="mt-1 text-xs text-red-600">{getFieldError('credentialPassword')}</p>
						{:else}
							<p class="mt-1 text-xs text-muted-foreground">Minimum 8 caractères.</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<div class="flex gap-3 pt-2">
			<Button onclick={() => goto('/admin/clients')} intent="secondary" class="flex-1" disabled={submitting}>
				Annuler
			</Button>
			<button
				onclick={handleCreate}
				disabled={submitting}
				class="flex-1 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{submitting ? 'Création...' : 'Créer le client'}
			</button>
		</div>
	</div>
</div>
