<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { Spinner, Button, Input } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let submitting = $state(false);

	let formData = $state({
		email: '',
		firstName: '',
		lastName: '',
		password: '',
		companyName: '',
		billingAddress: '',
		billingCity: '',
		billingCountry: 'France',
		siret: ''
	});

	let formErrors = $state({
		email: '',
		firstName: '',
		lastName: '',
		password: '',
		companyName: '',
		billingAddress: '',
		billingCity: '',
		billingCountry: ''
	});

	function resetErrors() {
		formErrors = {
			email: '',
			firstName: '',
			lastName: '',
			password: '',
			companyName: '',
			billingAddress: '',
			billingCity: '',
			billingCountry: ''
		};
	}

	function validateForm(): boolean {
		resetErrors();
		let valid = true;

		if (!formData.email.trim()) {
			formErrors.email = "L'email est requis";
			valid = false;
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			formErrors.email = "Format d'email invalide";
			valid = false;
		}

		if (!formData.firstName.trim()) {
			formErrors.firstName = 'Le prénom est requis';
			valid = false;
		}

		if (!formData.lastName.trim()) {
			formErrors.lastName = 'Le nom est requis';
			valid = false;
		}

		if (!formData.password) {
			formErrors.password = 'Le mot de passe est requis';
			valid = false;
		} else if (formData.password.length < 8) {
			formErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
			valid = false;
		}

		if (!formData.companyName.trim()) {
			formErrors.companyName = "Le nom de l'entreprise est requis";
			valid = false;
		}

		if (!formData.billingAddress.trim()) {
			formErrors.billingAddress = "L'adresse de facturation est requise";
			valid = false;
		}

		if (!formData.billingCity.trim()) {
			formErrors.billingCity = 'La ville est requise';
			valid = false;
		}

		if (!formData.billingCountry.trim()) {
			formErrors.billingCountry = 'Le pays est requis';
			valid = false;
		}

		return valid;
	}

	async function handleCreate() {
		if (!validateForm()) return;

		try {
			submitting = true;
			await trpc.client.create.mutate(formData);
			toast.push('Client créé avec succès!', 'success');
			goto('/admin/clients');
		} catch (err: any) {
			logger.error({ err }, 'Failed to create client');
			const message = err.message || 'Erreur lors de la création';
			if (message.includes('email already exists')) {
				formErrors.email = 'Un utilisateur avec cet email existe déjà';
			} else {
				toast.push(message, 'error');
			}
		} finally {
			submitting = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
	<div class="max-w-[1200px] mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<button
				onclick={() => goto('/admin/clients')}
				class="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="20"></iconify-icon>
				<span class="font-bold">Retour aux clients</span>
			</button>
			<h1 class="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
				<iconify-icon icon="solar:user-plus-bold" width="40" class="text-[#291334]"
				></iconify-icon>
				{$i18n.t('backoffice.clients.newClient')}
			</h1>
			<p class="text-slate-500 mt-2">Créez un nouveau compte client avec ses informations d'entreprise</p>
		</div>

		<!-- Main Form -->
		<div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
			<!-- User Information -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:user-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Informations utilisateur
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-1">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Prénom <span class="text-rose-500">*</span>
							</div>
							<Input
								bind:value={formData.firstName}
								placeholder="Jean"
								class={formErrors.firstName ? 'border-rose-400 focus:border-rose-500' : ''}
							/>
							{#if formErrors.firstName}
								<p class="text-xs text-rose-500 mt-1 flex items-center gap-1">
									<iconify-icon icon="solar:danger-circle-bold" width="12"></iconify-icon>
									{formErrors.firstName}
								</p>
							{/if}
						</div>

						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-1">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Nom <span class="text-rose-500">*</span>
							</div>
							<Input
								bind:value={formData.lastName}
								placeholder="Dupont"
								class={formErrors.lastName ? 'border-rose-400 focus:border-rose-500' : ''}
							/>
							{#if formErrors.lastName}
								<p class="text-xs text-rose-500 mt-1 flex items-center gap-1">
									<iconify-icon icon="solar:danger-circle-bold" width="12"></iconify-icon>
									{formErrors.lastName}
								</p>
							{/if}
						</div>
					</div>

					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-1">
							<iconify-icon icon="solar:letter-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Email <span class="text-rose-500">*</span>
						</div>
						<Input
							bind:value={formData.email}
							type="email"
							placeholder="jean.dupont@entreprise.fr"
							class={formErrors.email ? 'border-rose-400 focus:border-rose-500' : ''}
						/>
						{#if formErrors.email}
							<p class="text-xs text-rose-500 mt-1 flex items-center gap-1">
								<iconify-icon icon="solar:danger-circle-bold" width="12"></iconify-icon>
								{formErrors.email}
							</p>
						{/if}
					</div>

					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-1">
							<iconify-icon icon="solar:lock-password-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Mot de passe <span class="text-rose-500">*</span>
						</div>
						<Input
							bind:value={formData.password}
							type="password"
							placeholder="••••••••"
							class={formErrors.password ? 'border-rose-400 focus:border-rose-500' : ''}
						/>
						{#if formErrors.password}
							<p class="text-xs text-rose-500 mt-1 flex items-center gap-1">
								<iconify-icon icon="solar:danger-circle-bold" width="12"></iconify-icon>
								{formErrors.password}
							</p>
						{:else}
							<p class="text-xs text-slate-500 mt-1">Minimum 8 caractères</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Company Information -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:buildings-2-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Informations entreprise
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-1">
							<iconify-icon icon="solar:buildings-2-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Nom de l'entreprise <span class="text-rose-500">*</span>
						</div>
						<Input
							bind:value={formData.companyName}
							placeholder="Entreprise SAS"
							class={formErrors.companyName ? 'border-rose-400 focus:border-rose-500' : ''}
						/>
						{#if formErrors.companyName}
							<p class="text-xs text-rose-500 mt-1 flex items-center gap-1">
								<iconify-icon icon="solar:danger-circle-bold" width="12"></iconify-icon>
								{formErrors.companyName}
							</p>
						{/if}
					</div>

					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-1">
							<iconify-icon icon="solar:bill-list-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							SIRET
						</div>
						<Input bind:value={formData.siret} placeholder="12345678901234" />
					</div>
				</div>
			</div>

			<!-- Billing Address -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:map-point-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Adresse de facturation
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-1">
							<iconify-icon icon="solar:home-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Adresse <span class="text-rose-500">*</span>
						</div>
						<Input
							bind:value={formData.billingAddress}
							placeholder="123 rue de la Paix"
							class={formErrors.billingAddress ? 'border-rose-400 focus:border-rose-500' : ''}
						/>
						{#if formErrors.billingAddress}
							<p class="text-xs text-rose-500 mt-1 flex items-center gap-1">
								<iconify-icon icon="solar:danger-circle-bold" width="12"></iconify-icon>
								{formErrors.billingAddress}
							</p>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-1">
								<iconify-icon icon="solar:city-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Ville <span class="text-rose-500">*</span>
							</div>
							<Input
								bind:value={formData.billingCity}
								placeholder="Paris"
								class={formErrors.billingCity ? 'border-rose-400 focus:border-rose-500' : ''}
							/>
							{#if formErrors.billingCity}
								<p class="text-xs text-rose-500 mt-1 flex items-center gap-1">
									<iconify-icon icon="solar:danger-circle-bold" width="12"></iconify-icon>
									{formErrors.billingCity}
								</p>
							{/if}
						</div>

						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-1">
								<iconify-icon icon="solar:global-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Pays <span class="text-rose-500">*</span>
							</div>
							<Input
								bind:value={formData.billingCountry}
								placeholder="France"
								class={formErrors.billingCountry ? 'border-rose-400 focus:border-rose-500' : ''}
							/>
							{#if formErrors.billingCountry}
								<p class="text-xs text-rose-500 mt-1 flex items-center gap-1">
									<iconify-icon icon="solar:danger-circle-bold" width="12"></iconify-icon>
									{formErrors.billingCountry}
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Notice -->
			<div
				class="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5"
			>
				<div class="flex items-start gap-3">
					<iconify-icon
						icon="solar:info-circle-bold"
						class="text-indigo-600 mt-0.5"
						width="24"
					></iconify-icon>
					<div class="flex-1">
						<h3 class="text-sm font-black text-indigo-900 mb-1">
							Création de compte
						</h3>
						<p class="text-sm text-indigo-800">
							Un compte utilisateur sera automatiquement créé avec ces informations. Le client pourra se connecter avec son email et le mot de passe défini.
						</p>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-4 pt-4">
				<Button
					onclick={() => goto('/admin/clients')}
					intent="secondary"
					class="flex-1"
					disabled={submitting}
				>
					<iconify-icon icon="solar:close-circle-bold" width="20"></iconify-icon>
					<span>Annuler</span>
				</Button>
				<button
					onclick={handleCreate}
					disabled={submitting}
					class="flex-1 px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if submitting}
						<iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
						<span>Création en cours...</span>
					{:else}
						<iconify-icon icon="solar:check-circle-bold" width="20"></iconify-icon>
						<span>Créer le client</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>
