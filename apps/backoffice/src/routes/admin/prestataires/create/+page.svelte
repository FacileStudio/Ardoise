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

<div class="max-w-2xl mx-auto p-6 space-y-6">
	<div>
		<button
			onclick={() => goto('/admin/prestataires')}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
			Retour aux prestataires
		</button>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Nouveau prestataire</h1>
		<p class="text-sm text-muted-foreground mt-1">Ajoutez un nouveau prestataire à votre système</p>
	</div>

	<div class="space-y-6">
		{#if formMessage}
			<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
				{formMessage}
			</div>
		{/if}

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Informations générales</h2>
			<div>
				<div class="text-sm font-medium mb-2">Nom du prestataire <span class="text-red-500">*</span></div>
				<Input bind:value={formData.name} placeholder="Nom du prestataire" error={!!getFieldError('name')} />
				{#if getFieldError('name')}
					<p class="mt-1 text-xs text-red-600">{getFieldError('name')}</p>
				{/if}
			</div>
			<div>
				<div class="text-sm font-medium mb-2">Raison sociale</div>
				<Input bind:value={formData.legalName} placeholder="ex: Facile Studio SAS" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="text-sm font-medium mb-2">SIRET</div>
					<Input bind:value={formData.siret} placeholder="12345678901234" />
				</div>
				<div>
					<div class="text-sm font-medium mb-2">Taux de TVA (%) <span class="text-red-500">*</span></div>
					<input
						type="number"
						step="0.1"
						min="0"
						max="100"
						bind:value={formData.tvaRate}
						class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary {getFieldError('tvaRate') ? 'border-red-300' : ''}"
						placeholder="20"
					/>
					{#if getFieldError('tvaRate')}
						<p class="mt-1 text-xs text-red-600">{getFieldError('tvaRate')}</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Logo</h2>
			<ImageUpload
				bind:value={formData.logoUrl}
				label="Logo du prestataire"
				{getPresignedUrl}
				{trpc}
			/>
			<p class="text-xs text-muted-foreground">
				Format recommandé: PNG ou SVG avec fond transparent, 512x512px minimum
			</p>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Adresse</h2>
			<div>
				<div class="text-sm font-medium mb-2">Adresse</div>
				<Input bind:value={formData.address} placeholder="123 rue de la Paix" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="text-sm font-medium mb-2">Ville</div>
					<Input bind:value={formData.city} placeholder="Paris" />
				</div>
				<div>
					<div class="text-sm font-medium mb-2">Pays</div>
					<Input bind:value={formData.country} placeholder="France" />
				</div>
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Contact</h2>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="text-sm font-medium mb-2">Email</div>
					<Input bind:value={formData.email} type="email" placeholder="contact@example.com" error={!!getFieldError('email')} />
					{#if getFieldError('email')}
						<p class="mt-1 text-xs text-red-600">{getFieldError('email')}</p>
					{/if}
				</div>
				<div>
					<div class="text-sm font-medium mb-2">Téléphone</div>
					<Input bind:value={formData.phone} placeholder="+33 1 23 45 67 89" />
				</div>
			</div>
		</div>

		<div class="rounded-xl border border-border p-6 space-y-4">
			<h2 class="text-base font-semibold text-foreground">Informations bancaires</h2>
			<div>
				<div class="text-sm font-medium mb-2">Nom de la banque</div>
				<Input bind:value={formData.bankName} placeholder="BNP Paribas" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="text-sm font-medium mb-2">IBAN</div>
					<Input bind:value={formData.iban} placeholder="FR76 1234 5678 9012 3456 7890 123" />
				</div>
				<div>
					<div class="text-sm font-medium mb-2">BIC</div>
					<Input bind:value={formData.bic} placeholder="BNPAFRPPXXX" />
				</div>
			</div>
		</div>

		<div class="flex gap-3 pt-2">
			<Button onclick={() => goto('/admin/prestataires')} intent="secondary" class="flex-1" disabled={submitting}>
				Annuler
			</Button>
			<button
				onclick={handleCreate}
				disabled={submitting}
				class="flex-1 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if submitting}
					<iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
					Création en cours...
				{:else}
					Créer le prestataire
				{/if}
			</button>
		</div>
	</div>
</div>
