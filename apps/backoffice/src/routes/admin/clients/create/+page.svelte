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

	function validateForm(): string | null {
		if (!formData.email.trim()) return 'L\'email est requis';
		if (!formData.firstName.trim()) return 'Le prénom est requis';
		if (!formData.lastName.trim()) return 'Le nom est requis';
		if (!formData.password || formData.password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
		if (!formData.companyName.trim()) return 'Le nom de l\'entreprise est requis';
		return null;
	}

	async function handleCreate() {
		const validationError = validateForm();
		if (validationError) {
			toast.push(validationError, 'error');
			return;
		}

		try {
			submitting = true;
			await trpc.client.create.mutate(formData);
			toast.push('Client créé avec succès!', 'success');
			goto('/admin/clients');
		} catch (err: any) {
			logger.error({ err }, 'Failed to create client');
			const message = err.message || 'Erreur lors de la création';
			toast.push(message, 'error');
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
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Prénom *
							</label>
							<Input bind:value={formData.firstName} placeholder="Jean" />
						</div>

						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Nom *
							</label>
							<Input bind:value={formData.lastName} placeholder="Dupont" />
						</div>
					</div>

					<div>
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:letter-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Email *
						</label>
						<Input
							bind:value={formData.email}
							type="email"
							placeholder="jean.dupont@entreprise.fr"
						/>
					</div>

					<div>
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:lock-password-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Mot de passe *
						</label>
						<Input
							bind:value={formData.password}
							type="password"
							placeholder="••••••••"
						/>
						<p class="text-xs text-slate-500 mt-1">Minimum 8 caractères</p>
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
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:buildings-2-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Nom de l'entreprise *
						</label>
						<Input bind:value={formData.companyName} placeholder="Entreprise SAS" />
					</div>

					<div>
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:bill-list-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							SIRET
						</label>
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
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:home-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Adresse
						</label>
						<Input bind:value={formData.billingAddress} placeholder="123 rue de la Paix" />
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:city-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Ville
							</label>
							<Input bind:value={formData.billingCity} placeholder="Paris" />
						</div>

						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:global-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Pays
							</label>
							<Input bind:value={formData.billingCountry} placeholder="France" />
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
