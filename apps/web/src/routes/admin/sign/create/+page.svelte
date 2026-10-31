<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Checkbox,
		Field,
		Input,
		Page,
		PageHeader,
		Section,
		Select,
		Spinner,
		Textarea,
		toast,
	} from '@facile/muse';
	import { icons } from '$lib/icons';
	import { logger } from '@repo/logger';

	interface Template {
		id: number;
		name: string;
		external_id: string | null;
		folder_name: string | null;
		submitters: Array<{
			name: string;
			uuid: string;
		}>;
	}

	let pageLoading = $state(true);
	let submitLoading = $state(false);
	let templates: Template[] = $state([]);
	let selectedTemplateId = $state<number | null>(null);

	let formData = $state({
		send_email: true,
		send_sms: false,
		submitters: [] as Array<{
			role: string;
			email: string;
			phone: string;
			name: string;
		}>,
		message: {
			subject: '',
			body: '',
		},
	});

	onMount(async () => {
		await fetchTemplates();
	});

	async function fetchTemplates() {
		pageLoading = true;
		try {
			const result = await trpc.docuseal.listTemplates.query({});
			templates = result as Template[];
		} catch (err) {
			logger.error({ err }, 'Failed to fetch templates');
			toast.danger('Erreur lors du chargement des templates');
		} finally {
			pageLoading = false;
		}
	}

	$effect(() => {
		if (selectedTemplateId !== null) {
			const template = templates.find((t) => t.id === selectedTemplateId);
			if (template) {
				formData.submitters = template.submitters.map((s) => ({
					role: s.name,
					email: '',
					phone: '',
					name: '',
				}));
			}
		} else {
			formData.submitters = [];
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (selectedTemplateId === null) {
			toast.danger('Veuillez sélectionner un template');
			return;
		}

		const hasEmail = formData.submitters.every((s) => s.email);
		if (!hasEmail) {
			toast.danger('Veuillez renseigner tous les emails des signataires');
			return;
		}

		submitLoading = true;
		try {
			await trpc.docuseal.createSubmission.mutate({
				template_id: selectedTemplateId,
				send_email: formData.send_email,
				send_sms: formData.send_sms,
				submitters: formData.submitters.map((s) => ({
					role: s.role,
					email: s.email || undefined,
					phone: s.phone || undefined,
					name: s.name || undefined,
				})),
				message: formData.message.subject || formData.message.body
					? {
							subject: formData.message.subject || undefined,
							body: formData.message.body || undefined,
					  }
					: undefined,
			});

			toast.success('Demande de signature créée avec succès');
			goto(resolve('/admin/sign'));
		} catch (err) {
			logger.error({ err }, 'Failed to create submission');
			toast.danger('Erreur lors de la création de la demande de signature');
		} finally {
			submitLoading = false;
		}
	}

	function addSubmitter() {
		formData.submitters = [
			...formData.submitters,
			{
				role: '',
				email: '',
				phone: '',
				name: '',
			},
		];
	}

	function removeSubmitter(index: number) {
		formData.submitters = formData.submitters.filter((_, i) => i !== index);
	}
</script>

<svelte:head>
	<title>Nouvelle signature - Ardoise</title>
</svelte:head>

<Page width="md">
	<PageHeader
		title="Nouvelle demande de signature"
		description="Créez une demande de signature à partir d'un template"
		back={{ href: '/admin/sign', label: 'Retour aux signatures' }}
	/>

	{#if pageLoading}
		<div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
	{:else}
		<form onsubmit={handleSubmit} class="flex flex-col gap-10">
			<Section title="Template" card>
				<Field label="Template">
					<Select
						value={selectedTemplateId === null ? '' : String(selectedTemplateId)}
						onchange={(e) => {
							const v = (e.target as HTMLSelectElement).value;
							selectedTemplateId = v === '' ? null : Number(v);
						}}
						required
					>
						<option value="">Sélectionnez un template</option>
						{#each templates as template (template.id)}
							<option value={String(template.id)}>{template.name}</option>
						{/each}
					</Select>
				</Field>
				{#if templates.length === 0}
					<Alert tone="warning">
						Aucun template disponible. Créez d'abord un template dans DocuSeal.
					</Alert>
				{/if}
			</Section>

			{#if formData.submitters.length > 0}
				<Section title="Signataires">
					{#snippet actions()}
						{#if selectedTemplateId === null}
							<Button type="button" variant="ghost" size="sm" icon={icons.plus} onclick={addSubmitter}>
								Ajouter un signataire
							</Button>
						{/if}
					{/snippet}

					{#each formData.submitters as submitter, index (index)}
						<Section
							card
							title={`Signataire ${index + 1}`}
							description={submitter.role ? `Rôle : ${submitter.role}` : undefined}
						>
							{#snippet actions()}
								{#if selectedTemplateId === null}
									<Button
										type="button"
										variant="ghost-danger"
										size="sm"
										icon={icons.remove}
										aria-label="Supprimer"
										onclick={() => removeSubmitter(index)}
									/>
								{/if}
							{/snippet}

							<div class="grid gap-4 sm:grid-cols-2">
								{#if selectedTemplateId === null}
									<Field label="Rôle">
										<Input bind:value={submitter.role} placeholder="Ex: Signataire, Approbateur..." required />
									</Field>
								{/if}
								<Field label="Nom">
									<Input bind:value={submitter.name} placeholder="Nom complet" />
								</Field>
								<Field label="Email">
									<Input type="email" bind:value={submitter.email} placeholder="email@example.com" required />
								</Field>
								{#if formData.send_sms}
									<Field label="Téléphone">
										<Input type="tel" bind:value={submitter.phone} placeholder="+33 6 00 00 00 00" />
									</Field>
								{/if}
							</div>
						</Section>
					{/each}
				</Section>
			{/if}

			<Section title="Options d'envoi" card>
				<Checkbox bind:checked={formData.send_email} label="Envoyer par email" />
				<Checkbox bind:checked={formData.send_sms} label="Envoyer par SMS" />
			</Section>

			{#if formData.send_email}
				<Section title="Message personnalisé" description="Optionnel" card>
					<Field label="Sujet de l'email">
						<Input bind:value={formData.message.subject} placeholder="Ex: Veuillez signer ce document" />
					</Field>
					<Field label="Corps du message">
						<Textarea
							bind:value={formData.message.body}
							rows={3}
							placeholder="Message personnalisé pour les signataires..."
						/>
					</Field>
				</Section>
			{/if}

			<div class="flex justify-end gap-3">
				<Button href={resolve('/admin/sign')} variant="ghost">Annuler</Button>
				<Button
					type="submit"
					icon={icons.check}
					disabled={submitLoading || selectedTemplateId === null}
				>
					{submitLoading ? 'Création...' : 'Créer la demande'}
				</Button>
			</div>
		</form>
	{/if}
</Page>
