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
  });

  type AdminSettings = typeof formData & {
    tvaRate?: number | string;
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
            Charles envoie des POST avec X-Charles-Event, X-Charles-Delivery et
            X-Charles-Signature-256 si un secret est défini.
          </p>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.webhookUrl} placeholder="https://example.com/webhooks/charles" class="md:col-span-2" />
          <Input bind:value={formData.webhookSecret} type="password" placeholder="Secret de signature optionnel" class="md:col-span-2" />
          <div class="md:col-span-2 space-y-2">
            <label class="text-sm font-medium text-foreground" for="webhook-events">Événements</label>
            <textarea
              id="webhook-events"
              bind:value={webhookEventsText}
              rows="5"
              placeholder={"admin.user.created\nadmin.user.updated\nsettings.updated\nsettings.*"}
              class="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground"
            ></textarea>
            <p class="text-xs text-muted-foreground">Un événement par ligne ou séparé par des virgules. Laisse vide pour tout envoyer.</p>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-border p-6 space-y-4">
        <h2 class="text-base font-semibold text-foreground">Facturation</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <Input bind:value={formData.bankName} placeholder="Banque" />
          <Input bind:value={formData.tvaRate} type="number" placeholder="TVA" />
          <Input bind:value={formData.iban} placeholder="IBAN" />
          <Input bind:value={formData.bic} placeholder="BIC" />
        </div>
      </section>
    {/if}
  </div>
</div>
