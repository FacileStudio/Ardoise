<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Alert, Button, Checkbox, Field, Input, Page, PageHeader, Section, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import { spaceContext } from '$lib/space-context.svelte';

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
			toast.danger(formMessage);
			return;
		}

		try {
			submitting = true;
			await trpc.client.create.mutate({
				...formData,
				spaceId: spaceContext.spaceId,
				contactEmail: formData.contactEmail.trim(),
				credentialEmail: formData.credentialEmail.trim(),
			});
			toast.success('Client créé avec succès!');
			goto(resolve('/admin/clients'));
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

			toast.danger(formMessage);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Nouveau client - Ardoise</title></svelte:head>

<Page width="md">
	<PageHeader
		title={$i18n.t('admin.clients.newClient')}
		description="Créez une fiche client, avec ou sans accès à Ardoise"
		back={{ href: resolve('/admin/clients'), label: 'Retour aux clients' }}
	/>

	{#if formMessage}
		<Alert tone="danger">{formMessage}</Alert>
	{/if}

	<Section title="Contact client" card>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="Prénom *" error={getFieldError('contactFirstName')}>
				<Input bind:value={formData.contactFirstName} placeholder="Jean" />
			</Field>
			<Field label="Nom *" error={getFieldError('contactLastName')}>
				<Input bind:value={formData.contactLastName} placeholder="Dupont" />
			</Field>
		</div>
		<Field
			label="Email de contact"
			error={getFieldError('contactEmail')}
			helper="Utilisé pour le suivi commercial et les paiements Stripe."
		>
			<Input bind:value={formData.contactEmail} type="email" placeholder="contact@entreprise.fr" />
		</Field>
	</Section>

	<Section title="Informations entreprise" card>
		<Field label="Nom de l'entreprise *" error={getFieldError('companyName')}>
			<Input bind:value={formData.companyName} placeholder="Entreprise SAS" />
		</Field>
		<Field label="SIRET">
			<Input bind:value={formData.siret} placeholder="12345678901234" />
		</Field>
	</Section>

	<Section title="Adresse de facturation" card>
		<Field label="Adresse">
			<Input bind:value={formData.billingAddress} placeholder="123 rue de la Paix" />
		</Field>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="Ville">
				<Input bind:value={formData.billingCity} placeholder="Paris" />
			</Field>
			<Field label="Pays">
				<Input bind:value={formData.billingCountry} placeholder="France" />
			</Field>
		</div>
	</Section>

	<Section title="Accès client à Ardoise" card>
		<div class="flex flex-col gap-1 rounded-fc-md bg-fc-surface p-3">
			<Checkbox
				bind:checked={formData.createCredentials}
				label="Créer des identifiants de connexion"
			/>
			<span class="pl-6 text-fc-xs text-fc-fg-muted">
				Activez seulement si ce client doit se connecter à Ardoise.
			</span>
		</div>

		{#if formData.createCredentials}
			<div class="grid gap-4 sm:grid-cols-2">
				<Field label="Email de connexion *" error={getFieldError('credentialEmail')}>
					<Input bind:value={formData.credentialEmail} type="email" placeholder="login@entreprise.fr" />
				</Field>
				<Field
					label="Mot de passe *"
					error={getFieldError('credentialPassword')}
					helper="Minimum 8 caractères."
				>
					<Input bind:value={formData.credentialPassword} type="password" placeholder="••••••••" />
				</Field>
			</div>
		{/if}
	</Section>

	<div class="flex justify-end gap-3">
		<Button href={resolve('/admin/clients')} variant="ghost" disabled={submitting}>Annuler</Button>
		<Button onclick={handleCreate} disabled={submitting}>
			{submitting ? 'Création...' : 'Créer le client'}
		</Button>
	</div>
</Page>
