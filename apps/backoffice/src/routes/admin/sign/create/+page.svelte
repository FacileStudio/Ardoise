<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
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
			goto('/admin/sign');
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

<div class="p-12">
	<div class="mb-10">
		<div class="flex items-center gap-4 mb-8">
			<button
				onclick={() => goto('/admin/sign')}
				class="w-10 h-10 rounded-xl bg-white border border-[#291334]/10 flex items-center justify-center hover:bg-[#291334]/5 transition-all duration-200"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="20" class="text-[#291334]"></iconify-icon>
			</button>
			<div>
				<h1 class="text-4xl font-black text-[#291334] mb-2 tracking-tight">
					Nouvelle demande de signature
				</h1>
				<p class="text-[#291334]/60 text-sm font-bold">
					Créez une demande de signature à partir d'un template
				</p>
			</div>
		</div>

		{#if pageLoading}
			<div class="flex items-center justify-center py-20">
				<Spinner size={40} />
			</div>
		{:else}
			<form onsubmit={handleSubmit} class="max-w-3xl">
				<div class="bg-white rounded-2xl border border-[#291334]/10 p-8 space-y-8">
					<div>
						<label class="block text-sm font-black text-[#291334] mb-3">
							Template <span class="text-red-500">*</span>
						</label>
						<select
							bind:value={selectedTemplateId}
							class="w-full px-4 py-3 rounded-xl border border-[#291334]/20 bg-white focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all duration-200 font-medium"
							required
						>
							<option value={null}>Sélectionnez un template</option>
							{#each templates as template (template.id)}
								<option value={template.id}>{template.name}</option>
							{/each}
						</select>
						{#if templates.length === 0}
							<p class="text-sm text-amber-600 mt-2 font-medium">
								Aucun template disponible. Créez d'abord un template dans DocuSeal.
							</p>
						{/if}
					</div>

					{#if formData.submitters.length > 0}
						<div class="space-y-6">
							<div class="flex items-center justify-between">
								<h3 class="text-lg font-black text-[#291334]">Signataires</h3>
								{#if selectedTemplateId === null}
									<Button type="button" intent="secondary" size="sm" onclick={addSubmitter}>
										<iconify-icon icon="solar:add-circle-bold" width="18"></iconify-icon>
										Ajouter un signataire
									</Button>
								{/if}
							</div>

							{#each formData.submitters as submitter, index (index)}
								<div class="bg-[#291334]/5 rounded-xl p-6 space-y-4">
									<div class="flex items-center justify-between mb-4">
										<div class="flex items-center gap-3">
											<div class="w-10 h-10 rounded-xl bg-[#291334] text-white flex items-center justify-center font-black">
												{index + 1}
											</div>
											<div>
												<p class="font-black text-[#291334]">Signataire {index + 1}</p>
												<p class="text-xs text-[#291334]/60 font-medium">Rôle: {submitter.role}</p>
											</div>
										</div>
										{#if selectedTemplateId === null}
											<button
												type="button"
												onclick={() => removeSubmitter(index)}
												class="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all duration-200"
												title="Supprimer"
											>
												<iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
											</button>
										{/if}
									</div>

									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										{#if selectedTemplateId === null}
											<div>
												<label class="block text-sm font-bold text-[#291334] mb-2">
													Rôle <span class="text-red-500">*</span>
												</label>
												<input
													type="text"
													bind:value={submitter.role}
													class="w-full px-4 py-2.5 rounded-xl border border-[#291334]/20 bg-white focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all duration-200 font-medium"
													placeholder="Ex: Signataire, Approbateur..."
													required
												/>
											</div>
										{/if}

										<div>
											<label class="block text-sm font-bold text-[#291334] mb-2">
												Nom
											</label>
											<input
												type="text"
												bind:value={submitter.name}
												class="w-full px-4 py-2.5 rounded-xl border border-[#291334]/20 bg-white focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all duration-200 font-medium"
												placeholder="Nom complet"
											/>
										</div>

										<div>
											<label class="block text-sm font-bold text-[#291334] mb-2">
												Email <span class="text-red-500">*</span>
											</label>
											<input
												type="email"
												bind:value={submitter.email}
												class="w-full px-4 py-2.5 rounded-xl border border-[#291334]/20 bg-white focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all duration-200 font-medium"
												placeholder="email@example.com"
												required
											/>
										</div>

										{#if formData.send_sms}
											<div>
												<label class="block text-sm font-bold text-[#291334] mb-2">
													Téléphone
												</label>
												<input
													type="tel"
													bind:value={submitter.phone}
													class="w-full px-4 py-2.5 rounded-xl border border-[#291334]/20 bg-white focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all duration-200 font-medium"
													placeholder="+33 6 00 00 00 00"
												/>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<div class="space-y-4">
						<h3 class="text-lg font-black text-[#291334]">Options d'envoi</h3>

						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={formData.send_email}
								class="w-5 h-5 rounded border-[#291334]/20 text-[#291334] focus:ring-[#FEC129]"
							/>
							<span class="font-bold text-[#291334]">Envoyer par email</span>
						</label>

						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={formData.send_sms}
								class="w-5 h-5 rounded border-[#291334]/20 text-[#291334] focus:ring-[#FEC129]"
							/>
							<span class="font-bold text-[#291334]">Envoyer par SMS</span>
						</label>
					</div>

					{#if formData.send_email}
						<div class="space-y-4">
							<h3 class="text-lg font-black text-[#291334]">Message personnalisé (optionnel)</h3>

							<div>
								<label class="block text-sm font-bold text-[#291334] mb-2">Sujet de l'email</label>
								<input
									type="text"
									bind:value={formData.message.subject}
									class="w-full px-4 py-2.5 rounded-xl border border-[#291334]/20 bg-white focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all duration-200 font-medium"
									placeholder="Ex: Veuillez signer ce document"
								/>
							</div>

							<div>
								<label class="block text-sm font-bold text-[#291334] mb-2">Corps du message</label>
								<textarea
									bind:value={formData.message.body}
									rows="4"
									class="w-full px-4 py-2.5 rounded-xl border border-[#291334]/20 bg-white focus:border-[#FEC129] focus:ring-2 focus:ring-[#FEC129]/20 transition-all duration-200 font-medium resize-none"
									placeholder="Message personnalisé pour les signataires..."
								></textarea>
							</div>
						</div>
					{/if}

					<div class="flex items-center gap-4 pt-6 border-t border-[#291334]/10">
						<Button
							type="submit"
							intent="primary"
							disabled={submitLoading || selectedTemplateId === null}
							class="flex-1"
						>
							{#if submitLoading}
								<Spinner size={20} />
							{:else}
								<iconify-icon icon="solar:pen-new-square-bold" width="20"></iconify-icon>
							{/if}
							Créer la demande
						</Button>
						<Button type="button" intent="secondary" onclick={() => goto('/admin/sign')}>
							Annuler
						</Button>
					</div>
				</div>
			</form>
		{/if}
	</div>
</div>
