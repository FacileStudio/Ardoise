<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { Spinner, Button, Input, ImageUpload } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

	let submitting = $state(false);

	async function getPresignedUrl(filename: string, folder: string) {
		const result = await trpc.media.getUploadUrl.mutate({
			fileName: filename,
			fileType: 'image/*'
		});
		return result.uploadUrl;
	}

	let formData = $state({
		name: '',
		legalName: '',
		siret: '',
		address: '',
		city: '',
		country: 'France',
		email: '',
		phone: '',
		bankName: '',
		iban: '',
		bic: '',
		logoUrl: '',
		tvaRate: 20,
	});

	function validateForm(): string | null {
		if (!formData.name.trim()) return 'Le nom est requis';
		if (formData.tvaRate < 0 || formData.tvaRate > 100) return 'Le taux de TVA doit être entre 0 et 100';
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
			await trpc.provider.create.mutate({
				...formData,
				tvaRate: Number(formData.tvaRate),
			});
			toast.push('Prestataire créé avec succès!', 'success');
			goto('/admin/prestataires');
		} catch (err: any) {
			logger.error({ err }, 'Failed to create provider');
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
				onclick={() => goto('/admin/prestataires')}
				class="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="20"></iconify-icon>
				<span class="font-bold">Retour aux prestataires</span>
			</button>
			<h1 class="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
				<iconify-icon icon="solar:buildings-2-bold" width="40" class="text-[#291334]"
				></iconify-icon>
				Nouveau prestataire
			</h1>
			<p class="text-slate-500 mt-2">Ajoutez un nouveau prestataire à votre système</p>
		</div>

		<!-- Main Form -->
		<div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
			<!-- General Information -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:document-text-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Informations générales
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:buildings-2-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Nom du prestataire *
						</label>
						<Input bind:value={formData.name} placeholder="Nom du prestataire" />
					</div>

					<div>
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:document-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Raison sociale
						</label>
						<Input bind:value={formData.legalName} placeholder="ex: Facile Studio SAS" />
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:bill-list-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								SIRET
							</label>
							<Input bind:value={formData.siret} placeholder="12345678901234" />
						</div>

						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:percent-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Taux de TVA (%) *
							</label>
							<input
								type="number"
								step="0.1"
								min="0"
								max="100"
								bind:value={formData.tvaRate}
								class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all"
								placeholder="20"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- Logo -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:gallery-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Logo
				</h2>
				<div class="bg-slate-50 rounded-xl p-6">
					<ImageUpload
						bind:value={formData.logoUrl}
						label="Logo du prestataire"
						{getPresignedUrl}
						{trpc}
					/>
					<p class="text-xs text-slate-500 mt-3 ml-2">
						<iconify-icon icon="solar:info-circle-bold" width="14" class="inline"></iconify-icon>
						Format recommandé: PNG ou SVG avec fond transparent, 512x512px minimum
					</p>
				</div>
			</div>

			<!-- Address Information -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:map-point-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Adresse
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:home-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Adresse
						</label>
						<Input bind:value={formData.address} placeholder="123 rue de la Paix" />
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:city-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Ville
							</label>
							<Input bind:value={formData.city} placeholder="Paris" />
						</div>

						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:global-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Pays
							</label>
							<Input bind:value={formData.country} placeholder="France" />
						</div>
					</div>
				</div>
			</div>

			<!-- Contact Information -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:phone-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Contact
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:letter-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Email
							</label>
							<Input
								bind:value={formData.email}
								type="email"
								placeholder="contact@example.com"
							/>
						</div>

						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:phone-calling-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Téléphone
							</label>
							<Input bind:value={formData.phone} placeholder="+33 1 23 45 67 89" />
						</div>
					</div>
				</div>
			</div>

			<!-- Banking Information -->
			<div>
				<h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
					<iconify-icon icon="solar:wallet-money-bold" width="24" class="text-[#FEC129]"></iconify-icon>
					Informations bancaires
				</h2>
				<div class="bg-slate-50 rounded-xl p-6 space-y-4">
					<div>
						<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
							<iconify-icon icon="solar:bank-bold" width="16" class="text-[#FEC129]"
							></iconify-icon>
							Nom de la banque
						</label>
						<Input bind:value={formData.bankName} placeholder="BNP Paribas" />
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:card-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								IBAN
							</label>
							<Input bind:value={formData.iban} placeholder="FR76 1234 5678 9012 3456 7890 123" />
						</div>

						<div>
							<label class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:card-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								BIC
							</label>
							<Input bind:value={formData.bic} placeholder="BNPAFRPPXXX" />
						</div>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-4 pt-4">
				<Button
					onclick={() => goto('/admin/prestataires')}
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
						<span>Créer le prestataire</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>
