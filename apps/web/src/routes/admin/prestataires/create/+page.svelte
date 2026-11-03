<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Alert, Button, Field, Input, Page, PageHeader, Section, toast } from '@facile/muse';
	import { ImageUpload } from '$lib/ui';
	import { logger } from '@repo/logger';

	let submitting = $state(false);
	let formMessage = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	async function getPresignedUrl(filename: string, folder: string) {
		const result = await trpc.media.getUploadUrl.mutate({
			fileName: filename,
			fileType: 'image/*',
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
		const optional = (value: string) => value.trim() || undefined;
		return {
			name: formData.name.trim(),
			legalName: optional(formData.legalName),
			siret: optional(formData.siret),
			address: optional(formData.address),
			city: optional(formData.city),
			country: formData.country.trim() || 'France',
			email: optional(formData.email),
			phone: optional(formData.phone),
			bankName: optional(formData.bankName),
			iban: optional(formData.iban),
			bic: optional(formData.bic),
			logoUrl: optional(formData.logoUrl),
			tvaRate: Number(formData.tvaRate),
		};
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
			toast.danger(formMessage);
			return;
		}

		try {
			submitting = true;
			await trpc.provider.create.mutate(normalizePayload());
			toast.success('Prestataire créé avec succès!');
			goto(resolve('/admin/prestataires'));
		} catch (err: any) {
			logger.error({ err }, 'Failed to create provider');
			const message = applyServerErrors(err);
			toast.danger(message);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Nouveau prestataire - Ardoise</title></svelte:head>

<Page width="md">
	<PageHeader
		title="Nouveau prestataire"
		description="Ajoutez un nouveau prestataire à votre système"
		back={{ href: resolve('/admin/prestataires'), label: 'Retour aux prestataires' }}
	/>

	{#if formMessage}
		<Alert tone="danger">{formMessage}</Alert>
	{/if}

	<Section title="Informations générales" card>
		<Field label="Nom du prestataire *" error={getFieldError('name')}>
			<Input bind:value={formData.name} placeholder="Nom du prestataire" />
		</Field>
		<Field label="Raison sociale">
			<Input bind:value={formData.legalName} placeholder="ex: Facile Studio SAS" />
		</Field>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="SIRET">
				<Input bind:value={formData.siret} placeholder="12345678901234" />
			</Field>
			<Field label="Taux de TVA (%) *" error={getFieldError('tvaRate')}>
				<Input
					type="number"
					step="0.1"
					min="0"
					max="100"
					bind:value={formData.tvaRate}
					placeholder="20"
				/>
			</Field>
		</div>
	</Section>

	<Section title="Logo" card>
		<ImageUpload
			bind:value={formData.logoUrl}
			label="Logo du prestataire"
			{getPresignedUrl}
			{trpc}
		/>
		<p class="text-fc-xs text-fc-fg-muted">
			Format recommandé: PNG ou SVG avec fond transparent, 512x512px minimum
		</p>
	</Section>

	<Section title="Adresse" card>
		<Field label="Adresse">
			<Input bind:value={formData.address} placeholder="123 rue de la Paix" />
		</Field>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="Ville">
				<Input bind:value={formData.city} placeholder="Paris" />
			</Field>
			<Field label="Pays">
				<Input bind:value={formData.country} placeholder="France" />
			</Field>
		</div>
	</Section>

	<Section title="Contact" card>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="Email" error={getFieldError('email')}>
				<Input bind:value={formData.email} type="email" placeholder="contact@example.com" />
			</Field>
			<Field label="Téléphone">
				<Input bind:value={formData.phone} placeholder="+33 1 23 45 67 89" />
			</Field>
		</div>
	</Section>

	<Section title="Informations bancaires" card>
		<Field label="Nom de la banque">
			<Input bind:value={formData.bankName} placeholder="BNP Paribas" />
		</Field>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="IBAN">
				<Input bind:value={formData.iban} placeholder="FR76 1234 5678 9012 3456 7890 123" />
			</Field>
			<Field label="BIC">
				<Input bind:value={formData.bic} placeholder="BNPAFRPPXXX" />
			</Field>
		</div>
	</Section>

	<div class="flex justify-end gap-3">
		<Button href={resolve('/admin/prestataires')} variant="ghost" disabled={submitting}
			>Annuler</Button
		>
		<Button onclick={handleCreate} disabled={submitting}>
			{submitting ? 'Création en cours...' : 'Créer le prestataire'}
		</Button>
	</div>
</Page>
