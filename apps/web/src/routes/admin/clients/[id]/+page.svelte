<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Badge, Button, Card, Input, Spinner, toast } from '@facile/muse';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import TransferClientModal from '$lib/components/TransferClientModal.svelte';
	import 'iconify-icon';

	let clientId = $derived($page.params.id);
	let pageLoading = $state(true);
	let submitting = $state(false);
	let client: any = $state(null);
	let showTransfer = $state(false);

	let formData = $state({
		contactFirstName: '',
		contactLastName: '',
		contactEmail: '',
		companyName: '',
		billingAddress: '',
		billingCity: '',
		billingCountry: 'France',
		siret: '',
	});

	onMount(async () => {
		await fetchClient();
	});

	async function fetchClient() {
		pageLoading = true;
		try {
			client = await trpc.client.getById.query({ id: clientId });
			formData.contactFirstName = client.contactFirstName;
			formData.contactLastName = client.contactLastName;
			formData.contactEmail = client.contactEmail || '';
			formData.companyName = client.companyName;
			formData.billingAddress = client.billingAddress || '';
			formData.billingCity = client.billingCity || '';
			formData.billingCountry = client.billingCountry;
			formData.siret = client.siret || '';
		} catch (err) {
			logger.error({ err }, 'Failed to fetch client');
			toast.danger('Erreur lors du chargement du client');
		} finally {
			pageLoading = false;
		}
	}

	function validateForm(): string | null {
		if (!formData.contactFirstName.trim()) return 'Le prénom est requis';
		if (!formData.contactLastName.trim()) return 'Le nom est requis';
		if (formData.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
			return "Format d'email invalide";
		}
		if (!formData.companyName.trim()) return 'Le nom de l\'entreprise est requis';
		return null;
	}

	async function handleUpdate() {
		const validationError = validateForm();
		if (validationError) {
			toast.danger(validationError);
			return;
		}

		try {
			submitting = true;
			await trpc.client.update.mutate({
				id: clientId,
				...formData,
			});
			toast.success('Client modifié avec succès!');
			await fetchClient();
		} catch (err: any) {
			logger.error({ err }, 'Failed to update client');
			const message = err.message || 'Erreur lors de la modification';
			toast.danger(message);
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
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(date));
	}

	function formatDateShort(date: Date | string | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(new Date(date));
	}

	function formatCurrency(amount: number | string) {
		const num = typeof amount === 'string' ? parseFloat(amount) : amount;
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(num);
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'ACTIVE': return 'success';
			case 'PENDING': return 'warning';
			case 'SUSPENDED': return 'danger';
			case 'BANNED': return 'danger';
			default: return 'neutral';
		}
	}

	function getPaymentStatusColor(status: string) {
		switch (status) {
			case 'PAID': return 'success';
			case 'PENDING': return 'warning';
			case 'EXPIRED': return 'danger';
			case 'CANCELLED': return 'neutral';
			default: return 'neutral';
		}
	}
</script>

<div class="p-6 max-w-5xl mx-auto">
	{#if pageLoading}
		<div class="py-20 flex justify-center">
			<Spinner size="lg" />
		</div>
	{:else if client}
		<div>
			<button
				onclick={() => goto(resolve('/admin/clients'))}
				class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
			>
				<iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
				Retour aux clients
			</button>
			<div class="flex items-start justify-between gap-4">
				<div>
					<h1 class="text-2xl font-bold tracking-tight text-foreground">Modifier le client</h1>
					<p class="text-sm text-muted-foreground mt-1">Modifiez les informations du client</p>
				</div>
				<Button variant="outline" onclick={() => (showTransfer = true)}>
					<iconify-icon icon="solar:transfer-horizontal-linear" width="16"></iconify-icon>
					Copier / déplacer
				</Button>
			</div>
		</div>

		<TransferClientModal
			bind:open={showTransfer}
			clientId={client.id}
			currentSpaceId={client.spaceId ?? null}
			onDone={(relocated) => relocated && goto(resolve('/admin/clients'))}
		/>

		<div class="grid grid-cols-3 gap-6 mt-6">
			<div class="col-span-2 space-y-6">
				<div class="rounded-xl border border-border p-6 space-y-4">
					<h2 class="text-base font-semibold text-foreground">Informations entreprise</h2>
					<div>
						<div class="text-sm font-medium mb-2">Nom de l'entreprise *</div>
						<Input bind:value={formData.companyName} placeholder="Entreprise SAS" />
					</div>
					<div>
						<div class="text-sm font-medium mb-2">SIRET</div>
						<Input bind:value={formData.siret} placeholder="12345678901234" />
					</div>
				</div>

				<div class="rounded-xl border border-border p-6 space-y-4">
					<h2 class="text-base font-semibold text-foreground">Adresse de facturation</h2>
					<div>
						<div class="text-sm font-medium mb-2">Adresse</div>
						<Input bind:value={formData.billingAddress} placeholder="123 rue de la Paix" />
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="text-sm font-medium mb-2">Ville</div>
							<Input bind:value={formData.billingCity} placeholder="Paris" />
						</div>
						<div>
							<div class="text-sm font-medium mb-2">Pays</div>
							<Input bind:value={formData.billingCountry} placeholder="France" />
						</div>
					</div>
				</div>

				<div class="rounded-xl border border-border p-6 space-y-4">
					<h2 class="text-base font-semibold text-foreground">Informations utilisateur</h2>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="text-sm font-medium mb-2">Prénom *</div>
							<Input bind:value={formData.contactFirstName} placeholder="Jean" />
						</div>
						<div>
							<div class="text-sm font-medium mb-2">Nom *</div>
							<Input bind:value={formData.contactLastName} placeholder="Dupont" />
						</div>
					</div>
					<div>
						<div class="text-sm font-medium mb-2">Email de contact</div>
						<Input
							bind:value={formData.contactEmail}
							type="email"
							placeholder="jean.dupont@entreprise.fr"
						/>
						{#if client.user?.email}
							<p class="mt-1 text-xs text-muted-foreground">Email de connexion: {client.user.email}</p>
						{/if}
					</div>
				</div>

				{#if client.payments && client.payments.length > 0}
					<div class="rounded-xl border border-border p-6 space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-base font-semibold text-foreground">Paiements</h2>
							<span class="text-xs text-muted-foreground">{client.payments.length} {client.payments.length > 1 ? 'paiements' : 'paiement'}</span>
						</div>
						<div class="space-y-2">
							{#each client.payments as payment (payment.id)}
								<button type="button" class="w-full text-left flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted transition-colors" onclick={() => goto(resolve(`/admin/payments/${payment.id}`))}>
									<iconify-icon
										icon={payment.status === 'PAID' ? 'solar:check-circle-bold' : payment.status === 'PENDING' ? 'solar:clock-circle-bold' : 'solar:close-circle-bold'}
										width="20"
										class={payment.status === 'PAID' ? 'text-fc-success' : payment.status === 'PENDING' ? 'text-fc-warning' : 'text-fc-danger'}
									></iconify-icon>
									<div class="flex-1">
										<div class="flex items-center justify-between mb-0.5">
											<span class="text-sm font-medium text-foreground">{formatCurrency(payment.totalWithFees)}</span>
											<Badge tone={getPaymentStatusColor(payment.status)}>{payment.status}</Badge>
										</div>
										<div class="text-xs text-muted-foreground">{payment.description}</div>
										<div class="text-xs text-muted-foreground">
											Due: {formatDateShort(payment.dueDate)}
											{#if payment.paidAt}
												 - Paid: {formatDateShort(payment.paidAt)}
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex gap-3 pt-2">
					<Button
						onclick={() => goto(resolve('/admin/clients'))}
						variant="outline"
						class="flex-1"
						disabled={submitting}
					>
						Annuler
					</Button>
					<button
						onclick={handleUpdate}
						disabled={submitting}
						class="flex-1 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{#if submitting}
							<iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
							Modification en cours...
						{:else}
							Modifier le client
						{/if}
					</button>
				</div>
			</div>

			<div class="space-y-6">
				<div class="rounded-xl border border-border p-6 space-y-4">
					<h2 class="text-base font-semibold text-foreground">Statut</h2>
					<div class="space-y-3">
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Statut du compte</div>
							{#if client.user}
								<Badge tone={getStatusColor(client.user.status)}>
									{client.user.status}
								</Badge>
							{:else}
								<Badge tone="neutral">Aucun accès</Badge>
							{/if}
						</div>

						{#if client.user?.emailVerified}
							<div>
								<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Email vérifié</div>
								<Badge tone="success">Vérifié</Badge>
							</div>
						{/if}
					</div>
				</div>

				<div class="rounded-xl border border-border p-6 space-y-4">
					<h2 class="text-base font-semibold text-foreground">Dates</h2>
					<div class="space-y-3">
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Créé le</div>
							<div class="text-sm font-medium text-foreground">{formatDate(client.createdAt)}</div>
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Dernière modification</div>
							<div class="text-sm font-medium text-foreground">{formatDate(client.updatedAt)}</div>
						</div>
						{#if client.user?.lastLoginAt}
							<div>
								<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Dernière connexion</div>
								<div class="text-sm font-medium text-foreground">{formatDate(client.user.lastLoginAt)}</div>
							</div>
						{/if}
					</div>
				</div>

				{#if client.stripeCustomerId}
					<div class="rounded-xl border border-border p-6 space-y-4">
						<h2 class="text-base font-semibold text-foreground">Stripe</h2>
						<div>
							<div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Customer ID</div>
							<div class="text-xs font-mono text-muted-foreground bg-muted p-2 rounded-lg break-all">
								{client.stripeCustomerId}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="text-center py-20">
			<iconify-icon icon="solar:buildings-2-bold" width="48" class="text-muted-foreground"></iconify-icon>
			<h2 class="text-xl font-bold text-foreground mt-4">Client introuvable</h2>
			<p class="text-sm text-muted-foreground mt-2">Ce client n'existe pas ou a été supprimé.</p>
			<button
				onclick={() => goto(resolve('/admin/clients'))}
				class="mt-6 bg-primary text-primary-foreground rounded-md h-9 px-4 text-sm font-medium"
			>
				Retour aux clients
			</button>
		</div>
	{/if}
</div>
