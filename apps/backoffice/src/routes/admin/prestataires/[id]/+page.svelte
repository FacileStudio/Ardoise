<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Spinner, Button, Input } from '@repo/ui';
	import { uploadFileSimple } from '@repo/storage-client';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

	let providerId = $derived($page.params.id);
	let pageLoading = $state(true);
	let submitting = $state(false);
	let uploadingLogo = $state(false);
	let previewLogoUrl = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);

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

	onMount(async () => {
		await fetchProvider();
	});

	async function fetchProvider() {
		pageLoading = true;
		try {
			const provider = await trpc.provider.get.query({ id: providerId });
			formData.name = provider.name;
			formData.legalName = provider.legalName || '';
			formData.siret = provider.siret || '';
			formData.address = provider.address || '';
			formData.city = provider.city || '';
			formData.country = provider.country;
			formData.email = provider.email || '';
			formData.phone = provider.phone || '';
			formData.bankName = provider.bankName || '';
			formData.iban = provider.iban || '';
			formData.bic = provider.bic || '';
			formData.logoUrl = provider.logoUrl || '';
			formData.tvaRate = provider.tvaRate;
			await loadLogoPreview();
		} catch (err) {
			logger.error({ err }, 'Failed to fetch provider');
			toast.push('Erreur lors du chargement du prestataire', 'error');
		} finally {
			pageLoading = false;
		}
	}

	async function loadLogoPreview() {
		if (!formData.logoUrl) {
			previewLogoUrl = '';
			return;
		}

		if (formData.logoUrl.includes('storageapi.dev')) {
			try {
				const result = await trpc.media.getDownloadUrl.query({ url: formData.logoUrl });
				previewLogoUrl = result.url;
			} catch (err) {
				logger.error({ err }, 'Failed to load logo preview');
				previewLogoUrl = formData.logoUrl;
			}
		} else {
			previewLogoUrl = formData.logoUrl;
		}
	}

	async function handleLogoUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		previewLogoUrl = URL.createObjectURL(file);
		uploadingLogo = true;

		try {
			const presignedUrlResult = await trpc.media.getUploadUrl.mutate({
				fileName: file.name,
				fileType: 'image/*'
			});
			const finalUrl = await uploadFileSimple(file, presignedUrlResult.uploadUrl);

			formData.logoUrl = finalUrl;
			await loadLogoPreview();
			toast.push('Logo envoyé!', 'success');
		} catch (err) {
			logger.error({ err }, 'Logo upload failed');
			toast.push("Erreur lors de l'upload du logo", 'error');
			previewLogoUrl = formData.logoUrl;
		} finally {
			uploadingLogo = false;
		}
	}

	function removeLogo() {
		formData.logoUrl = '';
		previewLogoUrl = '';
		if (fileInput) fileInput.value = '';
	}

	function validateForm(): string | null {
		if (!formData.name.trim()) return 'Le nom est requis';
		if (formData.tvaRate < 0 || formData.tvaRate > 100) return 'Le taux de TVA doit être entre 0 et 100';
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
			await trpc.provider.update.mutate({
				id: providerId,
				data: {
					...formData,
					tvaRate: Number(formData.tvaRate),
				}
			});
			toast.push('Prestataire modifié avec succès!', 'success');
			goto('/admin/prestataires');
		} catch (err: any) {
			logger.error({ err }, 'Failed to update provider');

			let message = 'Erreur lors de la modification';

			if (err.data?.zodError?.fieldErrors) {
				const fieldErrors = err.data.zodError.fieldErrors;
				const firstError = Object.values(fieldErrors)[0];
				if (Array.isArray(firstError) && firstError.length > 0) {
					message = firstError[0] as string;
				}
			} else if (err.message) {
				try {
					const parsed = JSON.parse(err.message);
					if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
						message = parsed[0].message;
					}
				} catch {
					message = err.message;
				}
			}

			toast.push(message, 'error');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
	{#if pageLoading}
		<div class="py-20 flex justify-center">
			<Spinner size="xl" />
		</div>
	{:else}
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
					Modifier le prestataire
				</h1>
				<p class="text-slate-500 mt-2">Modifiez les informations du prestataire</p>
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
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:buildings-2-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Nom du prestataire *
							</div>
							<Input bind:value={formData.name} placeholder="Nom du prestataire" />
						</div>

						<div>
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:document-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Raison sociale
							</div>
							<Input bind:value={formData.legalName} placeholder="ex: Facile Studio SAS" />
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:bill-list-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									SIRET
								</div>
								<Input bind:value={formData.siret} placeholder="12345678901234" />
							</div>

							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:percent-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									Taux de TVA (%) *
								</div>
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
						<div class="flex items-start gap-6">
							<!-- Logo Preview -->
							<div class="relative group">
								<div class="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-white overflow-hidden flex items-center justify-center p-3 transition-all group-hover:border-[#FEC129]/50">
									{#if previewLogoUrl}
										<img
											src={previewLogoUrl}
											alt="Logo preview"
											class="max-w-full max-h-full object-contain {uploadingLogo ? 'opacity-40 blur-sm' : ''}"
										/>
									{:else}
										<div class="flex flex-col items-center justify-center text-slate-300">
											<iconify-icon icon="solar:gallery-bold-duotone" width="32"></iconify-icon>
											<p class="text-[8px] font-black uppercase mt-1">Aucun logo</p>
										</div>
									{/if}

									{#if uploadingLogo}
										<div class="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
											<iconify-icon icon="line-md:loading-twotone-loop" width="24" class="text-[#FEC129]"></iconify-icon>
										</div>
									{/if}
								</div>

								{#if previewLogoUrl && !uploadingLogo}
									<button
										type="button"
										onclick={removeLogo}
										class="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
										title="Supprimer le logo"
									>
										<iconify-icon icon="solar:trash-bin-trash-bold" width="14"></iconify-icon>
									</button>
								{/if}
							</div>

							<!-- Upload Actions -->
							<div class="flex-1 space-y-3">
								<div>
									<div class="block text-sm font-black text-slate-700 mb-2">
										Télécharger un nouveau logo
									</div>
									<input
										type="file"
										bind:this={fileInput}
										onchange={handleLogoUpload}
										accept="image/*"
										class="hidden"
									/>
									<button
										type="button"
										onclick={() => fileInput?.click()}
										disabled={uploadingLogo}
										class="px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:border-[#FEC129] hover:bg-[#FEC129]/5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<iconify-icon icon="solar:cloud-upload-bold" width="18"></iconify-icon>
										<span>Choisir un fichier</span>
									</button>
								</div>

								<div class="bg-blue-50 border border-blue-100 rounded-lg p-3">
									<p class="text-xs text-blue-700 flex items-start gap-2">
										<iconify-icon icon="solar:info-circle-bold" width="14" class="mt-0.5 flex-shrink-0"></iconify-icon>
										<span>
											<span class="font-black">Recommandations:</span><br />
											Format PNG ou SVG avec fond transparent<br />
											Taille minimale: 512x512px<br />
											Poids maximal: 5 MB
										</span>
									</p>
								</div>
							</div>
						</div>
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
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:home-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Adresse
							</div>
							<Input bind:value={formData.address} placeholder="123 rue de la Paix" />
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:city-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									Ville
								</div>
								<Input bind:value={formData.city} placeholder="Paris" />
							</div>

							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:global-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									Pays
								</div>
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
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:letter-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									Email
								</div>
								<Input
									bind:value={formData.email}
									type="email"
									placeholder="contact@example.com"
								/>
							</div>

							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:phone-calling-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									Téléphone
								</div>
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
							<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
								<iconify-icon icon="solar:bank-bold" width="16" class="text-[#FEC129]"
								></iconify-icon>
								Nom de la banque
							</div>
							<Input bind:value={formData.bankName} placeholder="BNP Paribas" />
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:card-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									IBAN
								</div>
								<Input bind:value={formData.iban} placeholder="FR76 1234 5678 9012 3456 7890 123" />
							</div>

							<div>
								<div class="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
									<iconify-icon icon="solar:card-bold" width="16" class="text-[#FEC129]"
									></iconify-icon>
									BIC
								</div>
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
						onclick={handleUpdate}
						disabled={submitting}
						class="flex-1 px-6 py-3 bg-[#FEC129] text-[#291334] rounded-xl font-bold text-sm hover:bg-[#FEC129]/90 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if submitting}
							<iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
							<span>Modification en cours...</span>
						{:else}
							<iconify-icon icon="solar:check-circle-bold" width="20"></iconify-icon>
							<span>Modifier le prestataire</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
