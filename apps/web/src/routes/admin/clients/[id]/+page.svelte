<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Badge,
		Button,
		ConfirmModal,
		EmptyState,
		Field,
		Icon,
		Input,
		Page,
		PageHeader,
		Section,
		Spinner,
		toast,
	} from '@facile/muse';
	import { icons, ardoise } from '$lib/icons';
	import { logger } from '@repo/logger';
	import { i18n } from '@repo/i18n/svelte';
	import TransferClientModal from '$lib/components/TransferClientModal.svelte';

	let clientId = $derived($page.params.id as string);
	let pageLoading = $state(true);
	let submitting = $state(false);
	let client: any = $state(null);
	let showTransfer = $state(false);
	let confirmDelete = $state(false);
	let blockedMessage = $state('');

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
		if (!formData.companyName.trim()) return "Le nom de l'entreprise est requis";
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

	async function handleDelete() {
		blockedMessage = '';
		try {
			await trpc.client.delete.mutate({ id: clientId });
			toast.success($i18n.t('import.blocked.clientDeleted'));
			await goto(resolve('/admin/clients'));
		} catch (err: any) {
			logger.error({ err }, 'Failed to delete client');
			blockedMessage = err?.message || $i18n.t('import.blocked.client');
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
			case 'ACTIVE':
				return 'success';
			case 'PENDING':
				return 'warning';
			case 'SUSPENDED':
				return 'danger';
			case 'BANNED':
				return 'danger';
			default:
				return 'neutral';
		}
	}

	function getPaymentStatusColor(status: string) {
		switch (status) {
			case 'PAID':
				return 'success';
			case 'PENDING':
				return 'warning';
			case 'EXPIRED':
				return 'danger';
			case 'CANCELLED':
				return 'neutral';
			default:
				return 'neutral';
		}
	}
</script>

<svelte:head><title>Modifier le client - Ardoise</title></svelte:head>

{#if pageLoading}
	<div class="flex min-h-[40dvh] items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else if client}
	<Page width="lg">
		<PageHeader
			title="Modifier le client"
			description="Modifiez les informations du client"
			back={{ href: resolve('/admin/clients'), label: 'Retour aux clients' }}
		>
			{#snippet actions()}
				<Button variant="ghost" icon={ardoise.transfer} onclick={() => (showTransfer = true)}>
					Copier / déplacer
				</Button>
				<Button variant="ghost-danger" icon={icons.remove} onclick={() => (confirmDelete = true)}>
					{$i18n.t('import.blocked.deleteClient')}
				</Button>
			{/snippet}
		</PageHeader>

		{#if blockedMessage}
			<Alert tone="danger" title={$i18n.t('import.blocked.title')}>
				{$i18n.t('import.blocked.client')}
				{$i18n.t('import.blocked.reason', { message: blockedMessage })}
			</Alert>
		{/if}

		<TransferClientModal
			bind:open={showTransfer}
			clientId={client.id}
			currentSpaceId={client.spaceId}
			onDone={(relocated) => relocated && goto(resolve('/admin/clients'))}
		/>

		<div class="grid gap-6 lg:grid-cols-3">
			<div class="flex flex-col gap-6 lg:col-span-2">
				<Section title="Informations entreprise" card>
					<Field label="Nom de l'entreprise *">
						<Input bind:value={formData.companyName} placeholder="Entreprise SAS" />
					</Field>
					<Field label="SIRET">
						<Input bind:value={formData.siret} placeholder="12345678901234" />
					</Field>
				</Section>

				<Section title="Adresse de facturation" card>
					<Field label="Adresse">
						<Input bind:value={formData.billingAddress} placeholder="123 rue de la Paix" />
					</Field>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field label="Ville">
							<Input bind:value={formData.billingCity} placeholder="Paris" />
						</Field>
						<Field label="Pays">
							<Input bind:value={formData.billingCountry} placeholder="France" />
						</Field>
					</div>
				</Section>

				<Section title="Informations utilisateur" card>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field label="Prénom *">
							<Input bind:value={formData.contactFirstName} placeholder="Jean" />
						</Field>
						<Field label="Nom *">
							<Input bind:value={formData.contactLastName} placeholder="Dupont" />
						</Field>
					</div>
					<Field
						label="Email de contact"
						helper={client.user?.email ? `Email de connexion : ${client.user.email}` : undefined}
					>
						<Input
							bind:value={formData.contactEmail}
							type="email"
							placeholder="jean.dupont@entreprise.fr"
						/>
					</Field>
				</Section>

				{#if client.payments && client.payments.length > 0}
					<Section
						title="Paiements"
						description="{client.payments.length} {client.payments.length > 1
							? 'paiements'
							: 'paiement'}"
						card
					>
						<div class="flex flex-col gap-2">
							{#each client.payments as payment (payment.id)}
								<a
									href={resolve(`/admin/payments/${payment.id}`)}
									class="flex items-center gap-4 rounded-fc-md bg-fc-surface p-3 transition-colors hover:bg-fc-surface/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
								>
									<Icon
										icon={payment.status === 'PAID'
											? icons.check
											: payment.status === 'PENDING'
												? icons.clock
												: icons.error}
										size={20}
										class={payment.status === 'PAID'
											? 'text-fc-success'
											: payment.status === 'PENDING'
												? 'text-fc-warning'
												: 'text-fc-danger'}
									/>
									<div class="flex min-w-0 flex-1 flex-col gap-0.5">
										<div class="flex items-center justify-between gap-2">
											<span class="text-fc-sm font-medium text-fc-fg"
												>{formatCurrency(payment.totalWithFees)}</span
											>
											<Badge tone={getPaymentStatusColor(payment.status)}>{payment.status}</Badge>
										</div>
										<span class="truncate text-fc-xs text-fc-fg-muted">{payment.description}</span>
										<span class="text-fc-xs text-fc-fg-muted">
											Échéance : {formatDateShort(payment.dueDate)}
											{#if payment.paidAt}
												- Payé : {formatDateShort(payment.paidAt)}
											{/if}
										</span>
									</div>
								</a>
							{/each}
						</div>
					</Section>
				{/if}

				<div class="flex justify-end gap-3">
					<Button href={resolve('/admin/clients')} variant="ghost" disabled={submitting}
						>Annuler</Button
					>
					<Button onclick={handleUpdate} disabled={submitting}>
						{submitting ? 'Modification en cours...' : 'Modifier le client'}
					</Button>
				</div>
			</div>

			<div class="flex flex-col gap-6">
				<Section title="Statut" card>
					<div class="flex flex-col gap-1">
						<span class="text-fc-xs text-fc-fg-muted">Statut du compte</span>
						{#if client.user}
							<Badge tone={getStatusColor(client.user.status)}>{client.user.status}</Badge>
						{:else}
							<Badge tone="neutral">Aucun accès</Badge>
						{/if}
					</div>
					{#if client.user?.emailVerified}
						<div class="flex flex-col gap-1">
							<span class="text-fc-xs text-fc-fg-muted">Email vérifié</span>
							<Badge tone="success">Vérifié</Badge>
						</div>
					{/if}
					{#if client.gloutonUrl}
						<div class="flex flex-col gap-1">
							<span class="text-fc-xs text-fc-fg-muted">Glouton</span>
							<div class="flex flex-wrap items-center gap-2">
								<Badge tone="info">Lié dans Glouton</Badge>
								<Button
									variant="ghost"
									size="sm"
									href={client.gloutonUrl}
									target="_blank"
									rel="noopener noreferrer"
								>
									Voir dans Glouton
								</Button>
							</div>
						</div>
					{/if}
				</Section>

				<Section title="Dates" card>
					<div class="flex flex-col gap-1">
						<span class="text-fc-xs text-fc-fg-muted">Créé le</span>
						<span class="text-fc-sm font-medium text-fc-fg">{formatDate(client.createdAt)}</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-fc-xs text-fc-fg-muted">Dernière modification</span>
						<span class="text-fc-sm font-medium text-fc-fg">{formatDate(client.updatedAt)}</span>
					</div>
					{#if client.user?.lastLoginAt}
						<div class="flex flex-col gap-1">
							<span class="text-fc-xs text-fc-fg-muted">Dernière connexion</span>
							<span class="text-fc-sm font-medium text-fc-fg"
								>{formatDate(client.user.lastLoginAt)}</span
							>
						</div>
					{/if}
				</Section>

				{#if client.stripeCustomerId}
					<Section title="Stripe" card>
						<div class="flex flex-col gap-1">
							<span class="text-fc-xs text-fc-fg-muted">Customer ID</span>
							<span
								class="break-all rounded-fc-sm bg-fc-surface p-2 font-mono text-fc-xs text-fc-fg-muted"
							>
								{client.stripeCustomerId}
							</span>
						</div>
					</Section>
				{/if}
			</div>
		</div>
	</Page>
{:else}
	<Page width="lg">
		<EmptyState
			icon={ardoise.company}
			title="Client introuvable"
			description="Ce client n'existe pas ou a été supprimé."
		>
			<Button href={resolve('/admin/clients')}>Retour aux clients</Button>
		</EmptyState>
	</Page>
{/if}

<ConfirmModal
	bind:open={confirmDelete}
	tone="danger"
	title={$i18n.t('import.blocked.deleteClientTitle')}
	description={$i18n.t('import.blocked.deleteClientDescription')}
	confirmLabel={$i18n.t('import.blocked.deleteClient')}
	cancelLabel={$i18n.t('import.blocked.keep')}
	onConfirm={handleDelete}
/>
