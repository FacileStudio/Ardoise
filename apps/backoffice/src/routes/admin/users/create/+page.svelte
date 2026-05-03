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

			toast.push('✅ Utilisateur créé avec succès!', 'success');
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

			toast.push(`❌ ${message}`, 'error');
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
				onclick={() => goto('/admin/users')}
				class="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="20"></iconify-icon>
				<span class="font-bold">Retour aux utilisateurs</span>
			</button>
			<h1 class="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
				<iconify-icon icon="solar:user-bold" width="40" class="text-[#291334]"></iconify-icon>
				Créer un utilisateur
			</h1>
			<p class="text-slate-500 mt-2">Créez un nouveau compte utilisateur ou administrateur</p>
		</div>

		<!-- Main Form -->
		<div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
			<!-- Account Info -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:user-id-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Informations du compte
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:letter-bold" width="16" class="text-[#FEC129]"></iconify-icon>
							Email *
						</div>
						<input
							type="email"
							bind:value={formData.email}
							class="w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all {errors.email ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20'}"
							placeholder="user@example.com"
						/>
						{#if errors.email}
							<p class="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
								<iconify-icon icon="solar:danger-circle-bold" width="16"></iconify-icon>
								{errors.email}
							</p>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Prénom *
							</div>
							<input
								type="text"
								bind:value={formData.firstName}
								class="w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all {errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20'}"
								placeholder="John"
							/>
							{#if errors.firstName}
								<p class="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
									<iconify-icon icon="solar:danger-circle-bold" width="16"></iconify-icon>
									{errors.firstName}
								</p>
							{/if}
						</div>

						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Nom *
							</div>
							<input
								type="text"
								bind:value={formData.lastName}
								class="w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all {errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20'}"
								placeholder="Doe"
							/>
							{#if errors.lastName}
								<p class="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
									<iconify-icon icon="solar:danger-circle-bold" width="16"></iconify-icon>
									{errors.lastName}
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Security -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:lock-password-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Sécurité
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:lock-bold" width="16" class="text-[#FEC129]"></iconify-icon>
							Mot de passe *
						</div>
						<input
							type="password"
							bind:value={formData.password}
							class="w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all {errors.password ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20'}"
							placeholder="Minimum 8 caractères"
						/>
						{#if errors.password}
							<p class="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
								<iconify-icon icon="solar:danger-circle-bold" width="16"></iconify-icon>
								{errors.password}
							</p>
						{/if}
					</div>

					<div>
						<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:lock-bold" width="16" class="text-[#FEC129]"></iconify-icon>
							Confirmer le mot de passe *
						</div>
						<input
							type="password"
							bind:value={formData.confirmPassword}
							class="w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all {errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20'}"
							placeholder="Confirmez le mot de passe"
						/>
						{#if errors.confirmPassword}
							<p class="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
								<iconify-icon icon="solar:danger-circle-bold" width="16"></iconify-icon>
								{errors.confirmPassword}
							</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Role -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:shield-user-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Rôle
				</h2>
				<div class="bg-slate-50 rounded-xl p-6">
					<div class="grid grid-cols-2 gap-3">
						<button
							type="button"
							onclick={() => (formData.role = 'USER')}
							class="px-4 py-3 rounded-xl font-bold text-sm transition-all {formData.role === 'USER'
								? 'bg-[#291334] text-white'
								: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
						>
							<div class="flex items-center justify-center gap-2">
								<iconify-icon icon="solar:user-bold" width="20"></iconify-icon>
								Utilisateur
							</div>
						</button>
						<button
							type="button"
							onclick={() => (formData.role = 'ADMIN')}
							class="px-4 py-3 rounded-xl font-bold text-sm transition-all {formData.role === 'ADMIN'
								? 'bg-[#291334] text-white'
								: 'bg-white text-slate-700 border border-slate-200 hover:border-[#FEC129]'}"
						>
							<div class="flex items-center justify-center gap-2">
								<iconify-icon icon="solar:crown-bold" width="20"></iconify-icon>
								Administrateur
							</div>
						</button>
					</div>
				</div>
			</div>

			<!-- Notice -->
			<div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
				<div class="flex items-start gap-3">
					<iconify-icon icon="solar:info-circle-bold" class="text-blue-600 mt-0.5" width="24"></iconify-icon>
					<div class="flex-1">
						<h3 class="text-sm font-black text-blue-900 mb-1">Permissions administrateur</h3>
						<p class="text-sm text-blue-800">
							Les administrateurs ont accès à toutes les fonctionnalités du backoffice, incluant la gestion des clients, paiements, documents et utilisateurs.
						</p>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-4 pt-4">
				<Button
					onclick={() => goto('/admin/users')}
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
						<span>Créer l'utilisateur</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>
