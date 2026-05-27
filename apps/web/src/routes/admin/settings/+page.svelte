<script lang="ts">
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import { Button, Input, Spinner, Alert, ImageUpload } from '@repo/ui';
  import 'iconify-icon';

  let loading = $state(true);
  let saving = $state(false);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let webhookEventsText = $state('');

  let formData = $state({
    companyName: '',
    companyLegal: '',
    companyAddress: '',
    companyCity: '',
    companyCountry: 'France',
    companySiret: '',
    companyEmail: '',
    companyPhone: '',
    companyTvaIntracom: '',
    companyLegalForm: '',
    companyShareCapital: null as number | null,
    companyRcsCity: '',
    companyApeCode: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePublishableKey: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    docusealApiUrl: '',
    docusealApiKey: '',
    webhookUrl: '',
    webhookSecret: '',
    webhookEvents: [] as string[],
    bankName: '',
    iban: '',
    bic: '',
    logoUrl: '',
    tvaRate: 20,
    defaultPaymentTermsDays: 30,
    defaultLateFeeRate: "3 fois le taux d'intérêt légal en vigueur",
    defaultRecoveryFeeAmount: 40,
    defaultVatExemptionMention: 'TVA non applicable, article 293 B du CGI',
  });

  type AdminSettings = typeof formData & {
    tvaRate?: number | string;
    companyShareCapital?: number | string | null;
    defaultRecoveryFeeAmount?: number | string;
  };

  onMount(loadSettings);

  async function loadSettings() {
    try {
      const settings = await trpc.settings.getAdmin.query() as unknown as Partial<AdminSettings>;
      formData = {
        ...formData,
        companyName: settings.companyName || '',
        companyLegal: settings.companyLegal || '',
        companyAddress: settings.companyAddress || '',
        companyCity: settings.companyCity || '',
        companyCountry: settings.companyCountry || 'France',
        companySiret: settings.companySiret || '',
        companyEmail: settings.companyEmail || '',
        companyPhone: settings.companyPhone || '',
        companyTvaIntracom: settings.companyTvaIntracom || '',
        companyLegalForm: settings.companyLegalForm || '',
        companyShareCapital: settings.companyShareCapital != null ? Number(settings.companyShareCapital) : null,
        companyRcsCity: settings.companyRcsCity || '',
        companyApeCode: settings.companyApeCode || '',
        stripeSecretKey: settings.stripeSecretKey || '',
        stripeWebhookSecret: settings.stripeWebhookSecret || '',
        stripePublishableKey: settings.stripePublishableKey || '',
        smtpHost: settings.smtpHost || '',
        smtpPort: settings.smtpPort || 587,
        smtpUser: settings.smtpUser || '',
        smtpPass: settings.smtpPass || '',
        smtpFrom: settings.smtpFrom || '',
        docusealApiUrl: settings.docusealApiUrl || '',
        docusealApiKey: settings.docusealApiKey || '',
        webhookUrl: settings.webhookUrl || '',
        webhookSecret: settings.webhookSecret || '',
        webhookEvents: Array.isArray(settings.webhookEvents) ? settings.webhookEvents : [],
        bankName: settings.bankName || '',
        iban: settings.iban || '',
        bic: settings.bic || '',
        logoUrl: settings.logoUrl || '',
        tvaRate: Number(settings.tvaRate || 20),
        defaultPaymentTermsDays: Number(settings.defaultPaymentTermsDays ?? 30),
        defaultLateFeeRate: settings.defaultLateFeeRate || "3 fois le taux d'intérêt légal en vigueur",
        defaultRecoveryFeeAmount: Number(settings.defaultRecoveryFeeAmount ?? 40),
        defaultVatExemptionMention: settings.defaultVatExemptionMention || '',
      };
      webhookEventsText = formData.webhookEvents.join('\n');
    } catch {
      message = { type: 'error', text: 'Impossible de charger les paramètres' };
    } finally {
      loading = false;
    }
  }

  async function saveSettings() {
    saving = true;
    message = null;

    try {
      await trpc.settings.update.mutate({
        ...formData,
        webhookEvents: parseWebhookEvents(webhookEventsText),
      });
      formData.stripeSecretKey = '';
      formData.stripeWebhookSecret = '';
      formData.smtpPass = '';
      formData.docusealApiKey = '';
      formData.webhookSecret = '';
      message = { type: 'success', text: 'Paramètres enregistrés' };
    } catch {
      message = { type: 'error', text: 'Impossible d\'enregistrer les paramètres' };
    } finally {
      saving = false;
    }
  }

  async function getPresignedUrl(filename: string, _folder: string) {
    const result = await trpc.media.getUploadUrl.mutate({
      fileName: filename,
      fileType: "image/*",
    });
    return result.uploadUrl;
  }

  function parseWebhookEvents(value: string) {
    return Array.from(new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    ));
  }
</script>

<div class="p-8 lg:p-12">
  <div class="max-w-5xl mx-auto space-y-8">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Paramètres</h1>
        <p class="text-sm text-muted-foreground mt-1">Administration</p>
      </div>
      <Button onclick={saveSettings} disabled={saving || loading} class="bg-primary text-primary-foreground">
        {#if saving}
          <Spinner size="sm" />
        {:else}
          <iconify-icon icon="solar:diskette-bold" width="18"></iconify-icon>
        {/if}
        Enregistrer
      </Button>
    </header>

    {#if message}
      <Alert variant={message.type === 'success' ? 'success' : 'danger'}>
        {message.text}
      </Alert>
    {/if}

    {#if loading}
      <div class="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    {:else}
      <section class="rounded-xl border border-border p-6 space-y-4">
        <h2 class="text-base font-semibold text-foreground">Entreprise</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.companyName} placeholder="Nom commercial" />
          <Input bind:value={formData.companyLegal} placeholder="Raison sociale" />
          <Input bind:value={formData.companyAddress} placeholder="Adresse" />
          <Input bind:value={formData.companyCity} placeholder="Ville" />
          <Input bind:value={formData.companyCountry} placeholder="Pays" />
          <Input bind:value={formData.companySiret} placeholder="SIRET" />
          <Input bind:value={formData.companyEmail} type="email" placeholder="Email" />
          <Input bind:value={formData.companyPhone} placeholder="Téléphone" />
        </div>
        <ImageUpload
          bind:value={formData.logoUrl}
          label="Logo de l'entreprise"
          {getPresignedUrl}
          {trpc}
        />
      </section>

      <section class="rounded-xl border border-border p-6 space-y-4">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-foreground">Mentions légales obligatoires</h2>
          <p class="text-sm text-muted-foreground">
            Requises sur toute facture émise (Art. 242 nonies A CGI, L441-9 Code commerce).
            Sans ces champs, la facture n'est pas conforme.
          </p>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.companyLegalForm} placeholder="Forme juridique (SAS, SARL, EI...)" />
          <Input bind:value={formData.companyShareCapital} type="number" step="0.01" placeholder="Capital social (€)" />
          <Input bind:value={formData.companyRcsCity} placeholder="RCS — ville d'immatriculation" />
          <Input bind:value={formData.companyApeCode} placeholder="Code APE/NAF (ex: 6201Z)" />
          <Input bind:value={formData.companyTvaIntracom} placeholder="N° TVA intracommunautaire (FR...)" class="md:col-span-2" />
        </div>
      </section>

      <section class="rounded-xl border border-border p-6 space-y-4">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-foreground">Facturation — valeurs par défaut</h2>
          <p class="text-sm text-muted-foreground">
            Délai de paiement, pénalités et indemnité forfaitaire 40 € (Art. L441-10 Code commerce).
          </p>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.defaultPaymentTermsDays} type="number" placeholder="Délai paiement (jours)" />
          <Input bind:value={formData.defaultRecoveryFeeAmount} type="number" step="0.01" placeholder="Indemnité forfaitaire (€)" />
          <Input bind:value={formData.defaultLateFeeRate} placeholder="Taux pénalités retard" class="md:col-span-2" />
          <Input bind:value={formData.defaultVatExemptionMention} placeholder="Mention exonération TVA (ex: Art. 293 B CGI)" class="md:col-span-2" />
        </div>
      </section>

      <section class="rounded-xl border border-border p-6 space-y-4">
        <h2 class="text-base font-semibold text-foreground">Stripe</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.stripePublishableKey} placeholder="Clé publique pk_..." />
          <Input bind:value={formData.stripeSecretKey} type="password" placeholder="Nouvelle clé secrète sk_..." />
          <Input bind:value={formData.stripeWebhookSecret} type="password" placeholder="Nouveau secret webhook whsec_..." class="md:col-span-2" />
        </div>
      </section>

      <section class="rounded-xl border border-border p-6 space-y-4">
        <h2 class="text-base font-semibold text-foreground">SMTP</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.smtpHost} placeholder="Serveur SMTP" />
          <Input bind:value={formData.smtpPort} type="number" placeholder="Port" />
          <Input bind:value={formData.smtpUser} placeholder="Utilisateur" />
          <Input bind:value={formData.smtpPass} type="password" placeholder="Nouveau mot de passe" />
          <Input bind:value={formData.smtpFrom} type="email" placeholder="Expéditeur" class="md:col-span-2" />
        </div>
      </section>

      <section class="rounded-xl border border-border p-6 space-y-4">
        <h2 class="text-base font-semibold text-foreground">DocuSeal</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.docusealApiUrl} placeholder="https://docuseal.example.com/api" />
          <Input bind:value={formData.docusealApiKey} type="password" placeholder="Nouvelle clé API" />
        </div>
      </section>

      <section class="rounded-xl border border-border p-6 space-y-4">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-foreground">Webhooks</h2>
          <p class="text-sm text-muted-foreground">
            Ardoise envoie des POST avec X-Ardoise-Event, X-Ardoise-Delivery et
            X-Ardoise-Signature-256 si un secret est défini.
          </p>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.webhookUrl} placeholder="https://example.com/webhooks/ardoise" class="md:col-span-2" />
          <Input bind:value={formData.webhookSecret} type="password" placeholder="Secret de signature optionnel" class="md:col-span-2" />
          <div class="md:col-span-2 space-y-2">
            <label class="text-sm font-medium text-foreground" for="webhook-events">Événements</label>
            <textarea
              id="webhook-events"
              bind:value={webhookEventsText}
              rows="5"
              placeholder="admin.user.created
admin.user.updated
settings.updated
settings.*"
              class="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground"
            ></textarea>
            <p class="text-xs text-muted-foreground">Un événement par ligne ou séparé par des virgules. Laisse vide pour tout envoyer.</p>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-border p-6 space-y-4">
        <h2 class="text-base font-semibold text-foreground">Coordonnées bancaires &amp; TVA</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.bankName} placeholder="Banque" />
          <Input bind:value={formData.tvaRate} type="number" placeholder="Taux TVA par défaut (%)" />
          <Input bind:value={formData.iban} placeholder="IBAN" />
          <Input bind:value={formData.bic} placeholder="BIC" />
        </div>
      </section>
    {/if}
  </div>
</div>
