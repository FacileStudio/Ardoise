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
		billingCountry: 'France',
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

		if (!formData.billingAddress.trim()) {
			nextErrors.billingAddress = "L'adresse de facturation est requise";
		}

		if (!formData.billingCity.trim()) {
			nextErrors.billingCity = 'La ville est requise';
		}

		if (!formData.billingCountry.trim()) {
			nextErrors.billingCountry = 'Le pays est requis';
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

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
	<div class="max-w-[1200px] mx-auto">
		<div class="mb-8">
			<button
				onclick={() => goto('/admin/clients')}
				class="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="20"></iconify-icon>
				<span class="font-bold">Retour aux clients</span>
			</button>
			<h1 class="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
				<iconify-icon icon="solar:user-plus-bold" width="40" class="text-[#291334]"></iconify-icon>
				{$i18n.t('backoffice.clients.newClient')}
			</h1>
			<p class="text-slate-500 mt-2">Créez une fiche client, avec ou sans accès à Charles</p>
		</div>

		<div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
			{#if formMessage}
				<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
					{formMessage}
				</div>
			{/if}

			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:user-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Contact client
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2">Prénom <span class="text-rose-500">*</span></div>
							<Input bind:value={formData.contactFirstName} placeholder="Jean" error={!!getFieldError('contactFirstName')} />
							{#if getFieldError('contactFirstName')}
								<p class="mt-2 text-xs font-bold text-rose-600">{getFieldError('contactFirstName')}</p>
							{/if}
						</div>

						<div>
							<div class="block text-sm font-black text-slate-700 mb-2">Nom <span class="text-rose-500">*</span></div>
							<Input bind:value={formData.contactLastName} placeholder="Dupont" error={!!getFieldError('contactLastName')} />
							{#if getFieldError('contactLastName')}
								<p class="mt-2 text-xs font-bold text-rose-600">{getFieldError('contactLastName')}</p>
							{/if}
						</div>
					</div>

					<div>
						<div class="block text-sm font-black text-slate-700 mb-2">Email de contact</div>
						<Input bind:value={formData.contactEmail} type="email" placeholder="contact@entreprise.fr" error={!!getFieldError('contactEmail')} />
						{#if getFieldError('contactEmail')}
							<p class="mt-2 text-xs font-bold text-rose-600">{getFieldError('contactEmail')}</p>
						{:else}
							<p class="mt-2 text-xs text-slate-500">Utilisé pour le suivi commercial et les paiements Stripe.</p>
						{/if}
					</div>
				</div>
			</div>

			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:buildings-2-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Informations entreprise
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<div class="block text-sm font-black text-slate-700 mb-2">Nom de l'entreprise <span class="text-rose-500">*</span></div>
						<Input bind:value={formData.companyName} placeholder="Entreprise SAS" error={!!getFieldError('companyName')} />
						{#if getFieldError('companyName')}
							<p class="mt-2 text-xs font-bold text-rose-600">{getFieldError('companyName')}</p>
						{/if}
					</div>

					<div>
						<div class="block text-sm font-black text-slate-700 mb-2">SIRET</div>
						<Input bind:value={formData.siret} placeholder="12345678901234" />
					</div>
				</div>
			</div>

			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:map-point-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Adresse de facturation
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<div class="block text-sm font-black text-slate-700 mb-2">Adresse <span class="text-rose-500">*</span></div>
						<Input bind:value={formData.billingAddress} placeholder="123 rue de la Paix" error={!!getFieldError('billingAddress')} />
						{#if getFieldError('billingAddress')}
							<p class="mt-2 text-xs font-bold text-rose-600">{getFieldError('billingAddress')}</p>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2">Ville <span class="text-rose-500">*</span></div>
							<Input bind:value={formData.billingCity} placeholder="Paris" error={!!getFieldError('billingCity')} />
							{#if getFieldError('billingCity')}
								<p class="mt-2 text-xs font-bold text-rose-600">{getFieldError('billingCity')}</p>
							{/if}
						</div>

						<div>
							<div class="block text-sm font-black text-slate-700 mb-2">Pays <span class="text-rose-500">*</span></div>
							<Input bind:value={formData.billingCountry} placeholder="France" error={!!getFieldError('billingCountry')} />
							{#if getFieldError('billingCountry')}
								<p class="mt-2 text-xs font-bold text-rose-600">{getFieldError('billingCountry')}</p>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:lock-password-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Accès client à Charles
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<label class="flex items-start gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.createCredentials}
							class="mt-1 h-4 w-4 rounded border-slate-300 text-[#291334] focus:ring-[#FEC129]"
						/>
						<div>
							<div class="font-black text-slate-900">Créer des identifiants de connexion</div>
							<p class="text-sm text-slate-500">Activez seulement si ce client doit se connecter à Charles.</p>
						</div>
					</label>

					{#if formData.createCredentials}
						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="block text-sm font-black text-slate-700 mb-2">Email de connexion <span class="text-rose-500">*</span></div>
								<Input bind:value={formData.credentialEmail} type="email" placeholder="login@entreprise.fr" error={!!getFieldError('credentialEmail')} />
								{#if getFieldError('credentialEmail')}
									<p class="mt-2 text-xs font-bold text-rose-600">{getFieldError('credentialEmail')}</p>
								{/if}
							</div>

							<div>
								<div class="block text-sm font-black text-slate-700 mb-2">Mot de passe <span class="text-rose-500">*</span></div>
								<Input bind:value={formData.credentialPassword} type="password" placeholder="••••••••" error={!!getFieldError('credentialPassword')} />
								{#if getFieldError('credentialPassword')}
									<p class="mt-2 text-xs font-bold text-rose-600">{getFieldError('credentialPassword')}</p>
								{:else}
									<p class="mt-2 text-xs text-slate-500">Minimum 8 caractères.</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<div class="flex gap-4 pt-4">
				<Button onclick={() => goto('/admin/clients')} intent="secondary" class="flex-1" disabled={submitting}>
					<iconify-icon icon="solar:close-circle-bold" width="20"></iconify-icon>
					<span>Annuler</span>
				</Button>
				<button
					onclick={handleCreate}
					disabled={submitting}
					class="flex-1 px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<iconify-icon icon="solar:user-plus-bold" width="20"></iconify-icon>
					<span>{submitting ? 'Création...' : 'Créer le client'}</span>
				</button>
			</div>
		</div>
	</div>
</div>
