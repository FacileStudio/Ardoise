<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button, Input, Spinner, toast } from '@facile/muse';
  import { logger } from '@repo/logger';
  import { i18n } from '@repo/i18n/svelte';
  import { spaceContext } from '$lib/space-context.svelte';
  import 'iconify-icon';

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
    invoiceNumber?: string;
    quoteNumber?: string;
    contractRef?: string;
    clientName: string;
    total: number;
    createdAt: Date;
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
        spaceId: spaceContext.spaceId,
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
        spaceId: spaceContext.spaceId,
      });
      documents = result.items as Document[];
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
      await trpc.payment.create.mutate({
        ...formData,
        reference: formData.reference.trim() || undefined,
        dueDate: new Date(formData.dueDate),
      });

      toast.success(formData.collectionMethod === 'STRIPE'
          ? 'Paiement créé avec succès! Un email a été envoyé au client.'
          : 'Paiement manuel enregistré avec succès!');
      goto(resolve('/admin/payments'));
    } catch (err: any) {
      logger.error({ err }, 'Failed to create payment');
      const message = err.message || 'Erreur lors de la création';
      toast.danger(message);
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

<div class="max-w-2xl mx-auto p-6 space-y-6">
  <div>
    <button
      onclick={() => goto(resolve('/admin/payments'))}
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
    >
      <iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
      Retour aux paiements
    </button>
    <h1 class="text-2xl font-bold tracking-tight text-foreground">
      {$i18n.t('admin.payments.createPayment')}
    </h1>
    <p class="text-sm text-muted-foreground mt-1">Créez une demande de paiement pour un client</p>
  </div>

  <div class="space-y-6">
    <div class="rounded-xl border border-border p-6 space-y-4">
      <h2 class="text-base font-semibold text-foreground">Client</h2>
      <div>
        <div class="text-sm font-medium mb-2">Sélectionner un client *</div>
        <select
          bind:value={selectedClientId}
          class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">-- Choisir un client --</option>
          {#each clients as client (client.id)}
            <option value={client.id}>
              {client.companyName} - {client.contactFirstName}
              {client.contactLastName}
              ({client.contactEmail || client.user?.email || 'aucun email'})
            </option>
          {/each}
        </select>
      </div>
    </div>

    <div class="rounded-xl border border-border p-6 space-y-4">
      <h2 class="text-base font-semibold text-foreground">Détails du paiement</h2>
      <div>
        <div class="text-sm font-medium mb-2">Description *</div>
        <textarea
          bind:value={formData.description}
          rows="3"
          class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          placeholder="Ex: Prestation de développement web - Janvier 2024"
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-sm font-medium mb-2">Montant (EUR) *</div>
          <input
            type="number"
            step="0.01"
            min="0"
            bind:value={formData.amount}
            class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="0.00"
          />
        </div>

        <div>
          <div class="text-sm font-medium mb-2">Date d'échéance *</div>
          <input
            type="date"
            bind:value={formData.dueDate}
            class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div>
        <div class="text-sm font-medium mb-2">Mode de paiement *</div>
        <div class="grid grid-cols-2 gap-2">
          {#each ['STRIPE', 'MANUAL'] as method (method)}
            <button
              type="button"
              onclick={() => (formData.collectionMethod = method as PaymentCollectionMethod)}
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors {formData.collectionMethod ===
              method
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground border border-border hover:bg-muted'}"
            >
              {getCollectionMethodLabel(method as PaymentCollectionMethod)}
            </button>
          {/each}
        </div>
      </div>

      <div>
        <div class="text-sm font-medium mb-2">Fréquence *</div>
        <div class="grid grid-cols-3 gap-2">
          {#each ['ONE_TIME', 'MONTHLY', 'YEARLY'] as freq (freq)}
            <button
              type="button"
              onclick={() => (formData.frequency = freq as PaymentFrequency)}
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors {formData.frequency ===
              freq
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground border border-border hover:bg-muted'}"
            >
              {getFrequencyLabel(freq as PaymentFrequency)}
            </button>
          {/each}
        </div>
      </div>

      {#if formData.collectionMethod === 'MANUAL'}
        <div>
          <div class="text-sm font-medium mb-2">Référence manuelle *</div>
          <Input bind:value={formData.reference} placeholder="Ex: VIR-2026-001" />
          <p class="mt-1 text-xs text-muted-foreground">
            Utilisée pour tracer un paiement hors ligne ou déjà demandé ailleurs.
          </p>
        </div>
      {:else}
        <p class="text-xs text-muted-foreground">
          Un lien de paiement Stripe sera créé. Le client doit avoir un email de contact.
        </p>
      {/if}
    </div>

    <div class="rounded-xl border border-border p-6 space-y-4">
      <h2 class="text-base font-semibold text-foreground">Documents joints</h2>
      <p class="text-xs text-muted-foreground">
        Les documents sélectionnés seront visibles et téléchargeables par le client sur la page de
        paiement.
      </p>

      {#if selectedDocumentIds.length > 0}
        <div class="space-y-2">
          <div class="text-sm font-medium">
            Documents sélectionnés ({selectedDocumentIds.length})
          </div>
          <div class="space-y-1">
            {#each selectedDocumentIds as docId (docId)}
              {@const doc = documents.find((d) => d.id === docId)}
              {#if doc}
                <div class="rounded-lg p-2 flex items-center justify-between border border-border">
                  <div class="flex items-center gap-2">
                    <iconify-icon
                      icon="solar:document-bold"
                      width="16"
                      class="text-muted-foreground"
                    ></iconify-icon>
                    <div>
                      <div class="text-sm font-medium text-foreground">{doc.name}</div>
                      <div class="text-xs text-muted-foreground">
                        {doc.type} - {doc.clientName}
                        {#if doc.invoiceNumber}
                          - N° {doc.invoiceNumber}{/if}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onclick={() => removeDocument(docId)}
                    class="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                    aria-label="Retirer le document"
                  >
                    <iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
                  </button>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}

      <div>
        <div class="text-sm font-medium mb-2">Rechercher un document</div>
        <div class="relative">
          <iconify-icon
            icon="solar:magnifer-linear"
            width="16"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          ></iconify-icon>
          <input
            type="text"
            bind:value={documentSearchQuery}
            placeholder="Rechercher par nom, client, numéro..."
            class="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div class="max-h-64 overflow-y-auto space-y-1">
        {#if filteredDocuments.length === 0}
          <div class="text-center py-6 text-muted-foreground">
            <iconify-icon icon="solar:document-bold" width="24" class="mx-auto mb-1 opacity-30"
            ></iconify-icon>
            <p class="text-xs">Aucun document trouvé</p>
          </div>
        {:else}
          {#each filteredDocuments as doc (doc.id)}
            <button
              type="button"
              onclick={() => toggleDocument(doc.id)}
              class="w-full rounded-lg p-2 flex items-center gap-2 border transition-colors text-left {selectedDocumentIds.includes(
                doc.id
              )
                ? 'border-primary bg-muted'
                : 'border-border hover:bg-muted'}"
            >
              <div class="flex-shrink-0">
                {#if selectedDocumentIds.includes(doc.id)}
                  <div class="w-4 h-4 bg-primary rounded flex items-center justify-center">
                    <iconify-icon
                      icon="solar:check-circle-bold"
                      width="12"
                      class="text-primary-foreground"
                    ></iconify-icon>
                  </div>
                {:else}
                  <div class="w-4 h-4 border-2 border-border rounded"></div>
                {/if}
              </div>
              <iconify-icon
                icon="solar:document-bold"
                width="16"
                class="text-muted-foreground flex-shrink-0"
              ></iconify-icon>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-foreground truncate">{doc.name}</div>
                <div class="text-xs text-muted-foreground truncate">
                  {doc.type} - {doc.clientName}
                  {#if doc.invoiceNumber}
                    - N° {doc.invoiceNumber}{/if}
                  {#if doc.quoteNumber}
                    - Devis N° {doc.quoteNumber}{/if}
                </div>
              </div>
              <div class="text-sm font-medium text-foreground">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                  Number(doc.total)
                )}
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <div class="rounded-lg border border-warning/30 bg-warning/10 text-warning p-4">
      <div class="flex items-start gap-3">
        <iconify-icon icon="solar:info-circle-bold" class="text-warning mt-0.5" width="20"
        ></iconify-icon>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-warning mb-1">
            {$i18n.t('admin.payments.create.emailNotice')}
          </h3>
          <p class="text-xs text-warning">
            {$i18n.t('admin.payments.create.emailDescription')}
          </p>
        </div>
      </div>
    </div>

    <div class="flex gap-3 pt-2">
      <Button
        onclick={() => goto(resolve('/admin/payments'))}
        variant="outline"
        class="flex-1"
        disabled={submitting}
      >
        Annuler
      </Button>
      <Button onclick={handleCreate} class="flex-1" disabled={submitting}>
        {#if submitting}
          <iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
          Création en cours...
        {:else}
          Créer le paiement
        {/if}
      </Button>
    </div>
  </div>
</div>
