<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { Spinner, Button, Input, ImageUpload } from '@repo/ui';
	import { toast } from '@repo/utils';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

	let submitting = $state(false);
	let formMessage = $state('');
	let fieldErrors = $state<Record<string, string>>({});

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

	function getFieldError(field: string): string {
		return fieldErrors[field] || '';
	}

	function clearMessages() {
		formMessage = '';
		fieldErrors = {};
	}

	function normalizePayload() {
		const optionalFields = ['legalName', 'siret', 'address', 'city', 'email', 'phone', 'bankName', 'iban', 'bic', 'logoUrl'] as const;
		const payload = {
			...formData,
			name: formData.name.trim(),
			country: formData.country.trim() || 'France',
			tvaRate: Number(formData.tvaRate),
		} as Record<string, string | number>;

		for (const field of optionalFields) {
			const value = String(payload[field] || '').trim();
			payload[field] = value === '' ? undefined : value;
		}

		return payload;
	}

	function validateForm(): boolean {
		const nextErrors: Record<string, string> = {};

		if (!formData.name.trim()) nextErrors.name = 'Le nom du prestataire est requis';
		if (Number(formData.tvaRate) < 0 || Number(formData.tvaRate) > 100) {
			nextErrors.tvaRate = 'Le taux de TVA doit être entre 0 et 100';
		}

		fieldErrors = nextErrors;
		formMessage = Object.values(nextErrors)[0] || '';
		return Object.keys(nextErrors).length === 0;
	}

	function applyServerErrors(err: any) {
		const nextErrors: Record<string, string> = {};
		let message = 'Erreur lors de la création';

		const zodErrors = err.data?.zodError?.fieldErrors || err.shape?.data?.zodError?.fieldErrors;
		if (zodErrors) {
			for (const [field, errors] of Object.entries(zodErrors)) {
				if (Array.isArray(errors) && errors.length > 0) {
					nextErrors[field] = String(errors[0]);
				}
			}
			message = Object.values(nextErrors)[0] || message;
		} else if (err.message) {
			try {
				const parsed = JSON.parse(err.message);
				if (Array.isArray(parsed) && parsed.length > 0) {
					for (const issue of parsed) {
						const field = Array.isArray(issue.path) ? issue.path[0] : undefined;
						if (field && !nextErrors[String(field)] && issue.message) {
							nextErrors[String(field)] = String(issue.message);
						}
					}
					message = parsed[0]?.message || message;
				} else {
					message = err.message;
				}
			} catch {
				message = err.message;
			}
		}

		fieldErrors = nextErrors;
		formMessage = message;
		return message;
	}

	async function handleCreate() {
		clearMessages();

		if (!validateForm()) {
			toast.push(formMessage, 'error');
			return;
		}

		try {
			submitting = true;
			await trpc.provider.create.mutate(normalizePayload());
			toast.push('Prestataire créé avec succès!', 'success');
			goto('/admin/prestataires');
		} catch (err: any) {
			logger.error({ err }, 'Failed to create provider');
			const message = applyServerErrors(err);
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
			{#if formMessage}
				<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
					{formMessage}
				</div>
			{/if}

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
							Nom du prestataire <span class="text-rose-500">*</span>
						</div>
						<Input bind:value={formData.name} placeholder="Nom du prestataire" error={!!getFieldError('name')} />
						{#if getFieldError('name')}
							<p class="mt-2 text-sm font-bold text-rose-600">{getFieldError('name')}</p>
						{/if}
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
								Taux de TVA (%) <span class="text-rose-500">*</span>
							</div>
							<input
								type="number"
								step="0.1"
								min="0"
								max="100"
								bind:value={formData.tvaRate}
								class="w-full px-4 py-3 bg-white border rounded-xl outline-none focus:ring-2 transition-all {getFieldError('tvaRate') ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-[#FEC129] focus:ring-[#FEC129]/20'}"
								placeholder="20"
							/>
							{#if getFieldError('tvaRate')}
								<p class="mt-2 text-sm font-bold text-rose-600">{getFieldError('tvaRate')}</p>
							{/if}
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
								error={!!getFieldError('email')}
							/>
							{#if getFieldError('email')}
								<p class="mt-2 text-sm font-bold text-rose-600">{getFieldError('email')}</p>
							{/if}
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
