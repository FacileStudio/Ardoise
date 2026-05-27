<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Spinner } from '@repo/ui';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

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
			alert('Erreur lors du chargement des templates');
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
			alert('Veuillez sélectionner un template');
			return;
		}

		const hasEmail = formData.submitters.every((s) => s.email);
		if (!hasEmail) {
			alert('Veuillez renseigner tous les emails des signataires');
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

			alert('Demande de signature créée avec succès !');
			goto(resolve('/admin/sign'));
		} catch (err) {
			logger.error({ err }, 'Failed to create submission');
			alert('Erreur lors de la création de la demande de signature');
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

<div class="max-w-2xl mx-auto p-6 space-y-6">
	<div>
		<button
			onclick={() => goto(resolve('/admin/sign'))}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
			Retour aux signatures
		</button>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">
			Nouvelle demande de signature
		</h1>
		<p class="text-sm text-muted-foreground mt-1">
			Créez une demande de signature à partir d'un template
		</p>
	</div>

	{#if pageLoading}
		<div class="flex items-center justify-center py-20">
			<Spinner size="xl" />
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="space-y-6">
			<div class="rounded-xl border border-border p-6 space-y-6">
				<div>
					<div class="text-sm font-medium mb-2">
						Template <span class="text-red-500">*</span>
					</div>
					<select
						bind:value={selectedTemplateId}
						class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						required
					>
						<option value={null}>Sélectionnez un template</option>
						{#each templates as template (template.id)}
							<option value={template.id}>{template.name}</option>
						{/each}
					</select>
					{#if templates.length === 0}
						<p class="text-xs text-amber-600 mt-1">
							Aucun template disponible. Créez d'abord un template dans DocuSeal.
						</p>
					{/if}
				</div>

				{#if formData.submitters.length > 0}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h3 class="text-base font-semibold text-foreground">Signataires</h3>
							{#if selectedTemplateId === null}
								<Button type="button" intent="secondary" size="sm" onclick={addSubmitter}>
									<iconify-icon icon="solar:add-circle-bold" width="16"></iconify-icon>
									Ajouter un signataire
								</Button>
							{/if}
						</div>

						{#each formData.submitters as submitter, index (index)}
							<div class="bg-muted rounded-lg p-4 space-y-3">
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center gap-2">
										<div class="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
											{index + 1}
										</div>
										<div>
											<p class="text-sm font-medium text-foreground">Signataire {index + 1}</p>
											<p class="text-xs text-muted-foreground">Rôle: {submitter.role}</p>
										</div>
									</div>
									{#if selectedTemplateId === null}
										<button
											type="button"
											onclick={() => removeSubmitter(index)}
											class="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
											title="Supprimer"
										>
											<iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
										</button>
									{/if}
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									{#if selectedTemplateId === null}
										<div>
											<div class="text-sm font-medium mb-1">
												Rôle <span class="text-red-500">*</span>
											</div>
											<input
												type="text"
												bind:value={submitter.role}
												class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
												placeholder="Ex: Signataire, Approbateur..."
												required
											/>
										</div>
									{/if}

									<div>
										<div class="text-sm font-medium mb-1">Nom</div>
										<input
											type="text"
											bind:value={submitter.name}
											class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
											placeholder="Nom complet"
										/>
									</div>

									<div>
										<div class="text-sm font-medium mb-1">
											Email <span class="text-red-500">*</span>
										</div>
										<input
											type="email"
											bind:value={submitter.email}
											class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
											placeholder="email@example.com"
											required
										/>
									</div>

									{#if formData.send_sms}
										<div>
											<div class="text-sm font-medium mb-1">Téléphone</div>
											<input
												type="tel"
												bind:value={submitter.phone}
												class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
												placeholder="+33 6 00 00 00 00"
											/>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<div class="space-y-3">
					<h3 class="text-base font-semibold text-foreground">Options d'envoi</h3>

					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.send_email}
							class="w-4 h-4 rounded border-border"
						/>
						<span class="text-sm font-medium text-foreground">Envoyer par email</span>
					</label>

					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.send_sms}
							class="w-4 h-4 rounded border-border"
						/>
						<span class="text-sm font-medium text-foreground">Envoyer par SMS</span>
					</label>
				</div>

				{#if formData.send_email}
					<div class="space-y-3">
						<h3 class="text-base font-semibold text-foreground">Message personnalisé (optionnel)</h3>

						<div>
							<div class="text-sm font-medium mb-1">Sujet de l'email</div>
							<input
								type="text"
								bind:value={formData.message.subject}
								class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
								placeholder="Ex: Veuillez signer ce document"
							/>
						</div>

						<div>
							<div class="text-sm font-medium mb-1">Corps du message</div>
							<textarea
								bind:value={formData.message.body}
								rows="3"
								class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
								placeholder="Message personnalisé pour les signataires..."
							></textarea>
						</div>
					</div>
				{/if}

				<div class="flex items-center gap-3 pt-4 border-t border-border">
					<button
						type="submit"
						disabled={submitLoading || selectedTemplateId === null}
						class="flex-1 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{#if submitLoading}
							<Spinner size={16} />
						{:else}
							<iconify-icon icon="solar:pen-new-square-bold" width="16"></iconify-icon>
						{/if}
						Créer la demande
					</button>
					<Button type="button" intent="secondary" onclick={() => goto(resolve('/admin/sign'))}>
						Annuler
					</Button>
				</div>
			</div>
		</form>
	{/if}
</div>
