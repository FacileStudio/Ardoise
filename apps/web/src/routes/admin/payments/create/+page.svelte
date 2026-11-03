<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import {
    Alert,
    Button,
    Checkbox,
    EmptyState,
    Field,
    Icon,
    Input,
    OptionCards,
    Page,
    PageHeader,
    Section,
    Select,
    Switch,
    Textarea,
    toast,
  } from '@facile/muse';
  import { icons, ardoise } from '$lib/icons';
  import { logger } from '@repo/logger';
  import { isSmtpNotConfigured } from '@repo/trpc-client';
  import { i18n } from '@repo/i18n/svelte';
  import { spaceFilter } from '$lib/space-filter.svelte';

  type PaymentFrequency = 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  type PaymentCollectionMethod = 'STRIPE' | 'MANUAL';

  interface Client {
    id: string;
    companyName: string;
    contactFirstName: string;
    contactLastName: string;
    contactEmail?: string | null;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }

  interface Document {
    id: string;
    name: string;
    type: string;
    invoiceNumber?: string | null;
    quoteNumber?: string | null;
    contractRef?: string | null;
    clientName: string;
    total: number | string;
    createdAt: string;
  }

  let submitting = $state(false);
  let clients: Client[] = $state([]);
  let selectedClientId = $state('');
  let documents: Document[] = $state([]);
  let documentSearchQuery = $state('');
  let selectedDocumentIds = $state<string[]>([]);

  let formData = $state({
    clientId: '',
    amount: 0,
    description: '',
    frequency: 'ONE_TIME' as PaymentFrequency,
    collectionMethod: 'STRIPE' as PaymentCollectionMethod,
    reference: '',
    alreadyPaid: false,
    paidAt: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    attachedFiles: [] as string[],
    attachedDocumentIds: [] as string[],
  });

  onMount(async () => {
    await Promise.all([loadClients(), loadDocuments()]);
  });

  async function loadClients() {
    try {
      const result = await trpc.client.list.query({
        page: 1,
        limit: 100,
        spaceId: spaceFilter.spaceId,
      });
      clients = result.clients as Client[];
    } catch (err) {
      logger.error({ err }, 'Failed to fetch clients');
      toast.danger('Erreur lors du chargement des clients');
    }
  }

  async function loadDocuments() {
    try {
      const result = await trpc.document.list.query({
        page: 1,
        pageSize: 100,
        search: documentSearchQuery || undefined,
        spaceId: spaceFilter.spaceId,
      });
      documents = result.items;
    } catch (err) {
      logger.error({ err }, 'Failed to fetch documents');
      toast.danger('Erreur lors du chargement des documents');
    }
  }

  $effect(() => {
    if (selectedClientId) {
      formData.clientId = selectedClientId;
    }
  });

  $effect(() => {
    formData.attachedDocumentIds = selectedDocumentIds;
  });

  function toggleDocument(documentId: string) {
    if (selectedDocumentIds.includes(documentId)) {
      selectedDocumentIds = selectedDocumentIds.filter((id) => id !== documentId);
    } else {
      selectedDocumentIds = [...selectedDocumentIds, documentId];
    }
  }

  function removeDocument(documentId: string) {
    selectedDocumentIds = selectedDocumentIds.filter((id) => id !== documentId);
  }

  let filteredDocuments = $derived(
    documents.filter((doc) => {
      const searchTerm = documentSearchQuery.toLowerCase().trim();
      if (!searchTerm) return true;
      const searchContent =
        `${doc.name} ${doc.clientName} ${doc.invoiceNumber || ''} ${doc.quoteNumber || ''} ${doc.contractRef || ''}`.toLowerCase();
      return searchContent.includes(searchTerm);
    })
  );

  function validateForm(): string | null {
    if (!formData.clientId) return 'Veuillez sélectionner un client';
    if (!formData.amount || formData.amount <= 0) return 'Le montant doit être supérieur à 0';
    if (!formData.description.trim()) return 'La description est requise';
    if (!formData.dueDate) return "La date d'échéance est requise";
    if (formData.collectionMethod === 'STRIPE') {
      const client = clients.find((item) => item.id === formData.clientId);
      const clientEmail = client?.contactEmail || client?.user?.email;
      if (!clientEmail) {
        return 'Un email de contact client est requis pour créer un paiement Stripe';
      }
    }
    if (formData.collectionMethod === 'MANUAL' && !formData.reference.trim()) {
      return 'La référence manuelle est requise';
    }
    if (formData.collectionMethod === 'MANUAL' && formData.alreadyPaid && !formData.paidAt) {
      return $i18n.t('import.payment.errors.paidAt');
    }
    return null;
  }

  async function handleCreate() {
    const validationError = validateForm();
    if (validationError) {
      toast.danger(validationError);
      return;
    }

    try {
      submitting = true;
      if (formData.collectionMethod === 'MANUAL') {
        await trpc.payment.createManual.mutate({
          clientId: formData.clientId,
          amount: formData.amount,
          description: formData.description,
          reference: formData.reference.trim() || undefined,
          dueDate: new Date(formData.dueDate),
          paid: formData.alreadyPaid,
          paidAt: formData.alreadyPaid ? new Date(formData.paidAt) : undefined,
        });
      } else {
        await trpc.payment.create.mutate({
          ...formData,
          reference: formData.reference.trim() || undefined,
          dueDate: new Date(formData.dueDate),
        });
      }

      toast.success(
        formData.collectionMethod === 'STRIPE'
          ? 'Paiement créé avec succès! Un email a été envoyé au client.'
          : 'Paiement manuel enregistré avec succès!'
      );
      goto(resolve('/admin/payments'));
    } catch (err: any) {
      logger.error({ err }, 'Failed to create payment');
      if (!isSmtpNotConfigured(err)) toast.danger(err.message || 'Erreur lors de la création');
    } finally {
      submitting = false;
    }
  }

  function getFrequencyLabel(frequency: PaymentFrequency) {
    switch (frequency) {
      case 'ONE_TIME':
        return 'Ponctuel';
      case 'MONTHLY':
        return 'Mensuel';
      case 'YEARLY':
        return 'Annuel';
      default:
        return frequency;
    }
  }

  function getCollectionMethodLabel(method: PaymentCollectionMethod) {
    return method === 'STRIPE' ? 'Paiement Stripe' : 'Suivi manuel';
  }
</script>

<svelte:head><title>Nouveau paiement - Ardoise</title></svelte:head>

<Page width="md">
  <PageHeader
    title={$i18n.t('admin.payments.createPayment')}
    description="Créez une demande de paiement pour un client"
    back={{ href: resolve('/admin/payments'), label: 'Retour aux paiements' }}
  />

  <Section title="Client" card>
    <Field label="Sélectionner un client *">
      <Select bind:value={selectedClientId}>
        <option value="">-- Choisir un client --</option>
        {#each clients as client (client.id)}
          <option value={client.id}>
            {client.companyName} - {client.contactFirstName}
            {client.contactLastName}
            ({client.contactEmail || client.user?.email || 'aucun email'})
          </option>
        {/each}
      </Select>
    </Field>
  </Section>

  <Section title="Détails du paiement" card>
    <Field label="Description *">
      <Textarea
        bind:value={formData.description}
        rows={3}
        placeholder="Ex: Prestation de développement web - Janvier 2024"
      />
    </Field>

    <div class="grid gap-4 sm:grid-cols-2">
      <Field label="Montant (EUR) *">
        <Input type="number" step="0.01" min="0" bind:value={formData.amount} placeholder="0.00" />
      </Field>
      <Field label="Date d'échéance *">
        <Input type="date" bind:value={formData.dueDate} />
      </Field>
    </div>

    <OptionCards
      label="Mode de paiement *"
      value={formData.collectionMethod}
      onSelect={(value) => (formData.collectionMethod = value as PaymentCollectionMethod)}
      options={(['STRIPE', 'MANUAL'] as const).map((method) => ({
        value: method,
        label: getCollectionMethodLabel(method),
      }))}
    />

    <OptionCards
      label="Fréquence *"
      value={formData.frequency}
      onSelect={(value) => (formData.frequency = value as PaymentFrequency)}
      options={(['ONE_TIME', 'MONTHLY', 'YEARLY'] as const).map((freq) => ({
        value: freq,
        label: getFrequencyLabel(freq),
      }))}
    />

    {#if formData.collectionMethod === 'MANUAL'}
      <Field
        label="Référence manuelle *"
        helper="Utilisée pour tracer un paiement hors ligne ou déjà demandé ailleurs."
      >
        <Input bind:value={formData.reference} placeholder="Ex: VIR-2026-001" />
      </Field>
      <Switch
        bind:checked={formData.alreadyPaid}
        label={$i18n.t('import.payment.alreadyPaid')}
      />
      <p class="text-fc-xs text-fc-fg-muted">{$i18n.t('import.payment.alreadyPaidHint')}</p>
      {#if formData.alreadyPaid}
        <Field label={$i18n.t('import.payment.paidAt')}>
          <Input type="date" bind:value={formData.paidAt} />
        </Field>
      {/if}
    {:else}
      <p class="text-fc-xs text-fc-fg-muted">
        Un lien de paiement Stripe sera créé. Le client doit avoir un email de contact.
      </p>
    {/if}
  </Section>

  <Section
    title="Documents joints"
    description="Les documents sélectionnés seront visibles et téléchargeables par le client sur la page de paiement."
    card
  >
    {#if selectedDocumentIds.length > 0}
      <div class="flex flex-col gap-2">
        <span class="text-fc-sm font-medium text-fc-fg">
          Documents sélectionnés ({selectedDocumentIds.length})
        </span>
        {#each selectedDocumentIds as docId (docId)}
          {@const doc = documents.find((d) => d.id === docId)}
          {#if doc}
            <div class="flex items-center justify-between gap-2 rounded-fc-md bg-fc-surface p-2">
              <div class="flex min-w-0 items-center gap-2">
                <Icon icon={ardoise.document} size={16} class="text-fc-fg-muted" />
                <div class="min-w-0">
                  <div class="truncate text-fc-sm font-medium text-fc-fg">{doc.name}</div>
                  <div class="truncate text-fc-xs text-fc-fg-muted">
                    {doc.type} - {doc.clientName}
                    {#if doc.invoiceNumber}
                      - N° {doc.invoiceNumber}{/if}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost-danger"
                size="sm"
                icon={icons.remove}
                aria-label="Retirer le document"
                onclick={() => removeDocument(docId)}
              />
            </div>
          {/if}
        {/each}
      </div>
    {/if}

    <Field label="Rechercher un document">
      <div class="relative">
        <Icon
          icon={icons.search}
          size={16}
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fc-fg-muted"
        />
        <Input
          type="text"
          bind:value={documentSearchQuery}
          placeholder="Rechercher par nom, client, numéro..."
          class="pl-9"
        />
      </div>
    </Field>

    <div class="flex max-h-64 flex-col gap-1 overflow-y-auto">
      {#if filteredDocuments.length === 0}
        <EmptyState bare icon={ardoise.document} title="Aucun document trouvé" />
      {:else}
        {#each filteredDocuments as doc (doc.id)}
          {@const selected = selectedDocumentIds.includes(doc.id)}
          <div
            class="flex items-center gap-3 rounded-fc-md p-2 transition-colors hover:bg-fc-surface {selected
              ? 'bg-fc-surface'
              : ''}"
          >
            <Checkbox
              checked={selected}
              onchange={() => toggleDocument(doc.id)}
              aria-label={doc.name}
            />
            <div class="min-w-0 flex-1">
              <div class="truncate text-fc-sm font-medium text-fc-fg">{doc.name}</div>
              <div class="truncate text-fc-xs text-fc-fg-muted">
                {doc.type} - {doc.clientName}
                {#if doc.invoiceNumber}
                  - N° {doc.invoiceNumber}{/if}
                {#if doc.quoteNumber}
                  - Devis N° {doc.quoteNumber}{/if}
              </div>
            </div>
            <span class="text-fc-sm font-medium text-fc-fg">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                Number(doc.total)
              )}
            </span>
          </div>
        {/each}
      {/if}
    </div>
  </Section>

  <Alert tone="warning" title={$i18n.t('admin.payments.create.emailNotice')}>
    {$i18n.t('admin.payments.create.emailDescription')}
  </Alert>

  <div class="flex justify-end gap-3">
    <Button href={resolve('/admin/payments')} variant="ghost" disabled={submitting}>Annuler</Button>
    <Button onclick={handleCreate} disabled={submitting}>
      {submitting ? 'Création en cours...' : 'Créer le paiement'}
    </Button>
  </div>
</Page>
