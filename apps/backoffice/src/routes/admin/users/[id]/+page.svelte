<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Spinner, Button } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import 'iconify-icon';

	let userId = $derived($page.params.id);
	let pageLoading = $state(true);
	let submitting = $state(false);
	let user: any = $state(null);

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
			toast.push('Erreur lors du chargement de l\'utilisateur', 'error');
		} finally {
			pageLoading = false;
		}
	}

	function validateForm(): string | null {
		if (!formData.email.trim()) return 'L\'email est requis';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Email invalide';
		if (!formData.firstName.trim()) return 'Le prénom est requis';
		if (!formData.lastName.trim()) return 'Le nom est requis';

		if (formData.password || formData.confirmPassword) {
			if (formData.password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
			if (formData.password !== formData.confirmPassword) return 'Les mots de passe ne correspondent pas';
		}

		return null;
	}

	async function handleUpdate() {
		const validationError = validateForm();
		if (validationError) {
			toast.push(validationError, 'error');
			return;
		}

		try {
			submitting = true;
			const updateData: any = {
				id: userId,
				email: formData.email,
				firstName: formData.firstName,
				lastName: formData.lastName,
				role: formData.role,
			};

			if (formData.password) {
				updateData.password = formData.password;
			}

			await trpc.user.adminUpdate.mutate(updateData);

			toast.push('Utilisateur modifié avec succès!', 'success');
			goto('/admin/users');
		} catch (err: any) {
			logger.error({ err }, 'Failed to update user');
			const message = err.message || 'Erreur lors de la modification';
			toast.push(message, 'error');
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

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
	{#if pageLoading}
		<div class="py-20 flex justify-center">
			<Spinner size={40} />
		</div>
	{:else if user}
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
					Modifier l'utilisateur
				</h1>
				<p class="text-slate-500 mt-2">
					Modifiez les informations de {user.firstName} {user.lastName}
				</p>
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
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:letter-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Email *
							</label>
							<input
								type="email"
								bind:value={formData.email}
								class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all"
								placeholder="user@example.com"
							/>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"></iconify-icon>
									Prénom *
								</label>
								<input
									type="text"
									bind:value={formData.firstName}
									class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all"
									placeholder="John"
								/>
							</div>

							<div>
								<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:user-bold" width="16" class="text-[#FEC129]"></iconify-icon>
									Nom *
								</label>
								<input
									type="text"
									bind:value={formData.lastName}
									class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all"
									placeholder="Doe"
								/>
							</div>
						</div>

						<div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
							<div class="flex items-start gap-3">
								<iconify-icon icon="solar:calendar-bold" width="20" class="text-blue-600 mt-0.5"></iconify-icon>
								<div class="flex-1 text-sm text-blue-800">
									<span class="font-bold">Créé le:</span> {formatDate(user.createdAt)}
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Password Reset -->
				<div>
					<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
						<iconify-icon icon="solar:lock-password-bold" width="24" class="text-[#FEC129]"></iconify-icon>
						Réinitialiser le mot de passe
					</h2>
					<div class="bg-slate-50 rounded-xl p-6 space-y-4">
						<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
							<div class="flex items-start gap-3">
								<iconify-icon icon="solar:info-circle-bold" class="text-amber-600 mt-0.5" width="20"></iconify-icon>
								<p class="text-sm text-amber-800">
									Laissez ces champs vides si vous ne souhaitez pas modifier le mot de passe.
								</p>
							</div>
						</div>

						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:lock-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Nouveau mot de passe
							</label>
							<input
								type="password"
								bind:value={formData.password}
								class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all"
								placeholder="Minimum 8 caractères"
							/>
						</div>

						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:lock-bold" width="16" class="text-[#FEC129]"></iconify-icon>
								Confirmer le nouveau mot de passe
							</label>
							<input
								type="password"
								bind:value={formData.confirmPassword}
								class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all"
								placeholder="Confirmez le mot de passe"
							/>
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
						onclick={handleUpdate}
						disabled={submitting}
						class="flex-1 px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if submitting}
							<iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
							<span>Modification en cours...</span>
						{:else}
							<iconify-icon icon="solar:check-circle-bold" width="20"></iconify-icon>
							<span>Enregistrer les modifications</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
