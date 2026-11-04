<script lang="ts">
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import {
    Alert,
    Button,
    Divider,
    Field,
    Input,
    Page,
    PageHeader,
    SecretField,
    SettingsRow,
    SettingsSection,
    Spinner,
    StatusDot,
    Tabs,
    Textarea,
    toast,
  } from '@facile/muse';
  import { icons } from '$lib/icons';
  import { loadAuthConfig, type AuthConfig } from '$lib/auth-config';
  import ProfileSection from '$lib/components/settings/ProfileSection.svelte';
  import AppearanceSection from '$lib/components/settings/AppearanceSection.svelte';
  import { ImageUpload } from '$lib/ui';

  let loading = $state(true);
  let loadFailed = $state(false);
  let formError = $state('');
  let saving = $state(false);
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

  const SECTIONS = [
    { id: 'profile', label: 'Profil' },
    { id: 'appearance', label: 'Apparence' },
    { id: 'company', label: 'Entreprise' },
    { id: 'billing', label: 'Facturation' },
    { id: 'payments', label: 'Paiements' },
    { id: 'email', label: 'Email' },
    { id: 'integrations', label: 'Intégrations' },
    { id: 'advanced', label: 'Avancé' },
  ] as const;

  const section = $derived(
    SECTIONS.some((s) => s.id === page.params.section) ? page.params.section! : 'profile'
  );
  const tabs = SECTIONS.map((s) => ({ ...s, href: `/admin/settings/${s.id}` }));
  const webhookPlaceholder = ['admin.user.created', 'admin.user.updated', 'settings.updated', 'settings.*'].join('\n');

  let authConfig = $state<AuthConfig | null>(null);

  const stripeStatus = $derived(
    formData.stripePublishableKey
      ? { tone: 'success' as const, label: 'Clés Stripe renseignées' }
      : { tone: 'neutral' as const, label: 'Stripe non configuré' }
  );
  const smtpStatus = $derived(
    formData.smtpHost
      ? { tone: 'success' as const, label: `Serveur ${formData.smtpHost}` }
      : { tone: 'warning' as const, label: 'Aucun serveur SMTP : les emails ne partent pas' }
  );
  const webhookStatus = $derived(
    formData.webhookUrl
      ? { tone: 'success' as const, label: 'Webhook actif' }
      : { tone: 'neutral' as const, label: 'Webhook désactivé' }
  );

  onMount(async () => {
    authConfig = await loadAuthConfig();
    await loadSettings();
  });

  async function loadSettings() {
    loading = true;
    loadFailed = false;
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
      loadFailed = true;
    } finally {
      loading = false;
    }
  }

  function validate() {
    const { smtpPort, tvaRate, defaultPaymentTermsDays, defaultRecoveryFeeAmount } = formData;
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return 'Le port SMTP doit être compris entre 1 et 65535.';
    }
    if (!Number.isFinite(tvaRate) || tvaRate < 0 || tvaRate > 100) {
      return 'Le taux de TVA doit être compris entre 0 et 100.';
    }
    if (!Number.isInteger(defaultPaymentTermsDays) || defaultPaymentTermsDays < 0) {
      return 'Le délai de paiement doit être un nombre de jours entier.';
    }
    if (!Number.isFinite(defaultRecoveryFeeAmount) || defaultRecoveryFeeAmount < 0) {
      return "L'indemnité forfaitaire doit être un montant positif.";
    }
    if (formData.companyShareCapital != null && formData.companyShareCapital < 0) {
      return 'Le capital social doit être positif.';
    }
    return '';
  }

  async function saveSettings() {
    formError = validate();
    if (formError) return;
    saving = true;

    try {
      await trpc.settings.update.mutate({
        ...formData,
        webhookEvents: parseWebhookEvents(webhookEventsText),
      });
      formData.stripeSecretKey = '';
      formData.stripeWebhookSecret = '';
      formData.smtpPass = '';
      formData.webhookSecret = '';
      toast.success('Paramètres enregistrés');
    } catch {
      toast.danger("Impossible d'enregistrer les paramètres");
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

<svelte:head>
  <title>Réglages - Ardoise</title>
</svelte:head>

{#snippet saveRow()}
  {#if formError}
    <SettingsRow>
      <Alert tone="danger" role="alert">{formError}</Alert>
    </SettingsRow>
  {/if}
  <SettingsRow>
    <Button icon={icons.check} disabled={saving} onclick={saveSettings}>
      {saving ? 'Enregistrement...' : 'Enregistrer'}
    </Button>
  </SettingsRow>
{/snippet}

<Page width="xl">
  <div class="flex flex-col gap-4">
    <PageHeader title="Réglages" />
    <Tabs items={tabs} value={section} label="Sections des réglages" />
    <Divider class="my-0" />
  </div>

  {#if section === 'profile'}
    <ProfileSection area="admin" />
  {:else if section === 'appearance'}
    <AppearanceSection />
  {:else if section === 'advanced'}
    <SettingsSection
      title="Espaces"
      description="Les espaces viennent de Registre et décident qui voit quels clients."
    >
      <SettingsRow label="Espaces et membres">
        <Button variant="ghost" href={resolve('/admin/spaces')}>Gérer les espaces</Button>
      </SettingsRow>
    </SettingsSection>
    <SettingsSection title="Instance" description="Faits utiles quand quelque chose casse.">
      <SettingsRow label="Application">
        <span class="text-fc-sm text-fc-fg">Ardoise</span>
      </SettingsRow>
      <SettingsRow label="Connexion du personnel">
        <StatusDot
          tone={authConfig?.oidcEnabled ? 'success' : 'danger'}
          label={authConfig?.oidcEnabled ? 'Facile SSO' : 'SSO non configuré'}
        />
      </SettingsRow>
      <SettingsRow label="Portail client">
        <StatusDot
          tone={authConfig?.clientMagicLink ? 'success' : 'neutral'}
          label="Lien de connexion par email"
        />
      </SettingsRow>
    </SettingsSection>
  {:else if loading}
    <div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
  {:else if loadFailed}
    <Alert tone="danger" title="Impossible de charger les paramètres" role="alert">
      <p class="mb-3">Rien n'a été modifié. Réessayez avant de saisir quoi que ce soit.</p>
      <Button variant="ghost" icon={icons.refresh} onclick={loadSettings}>Réessayer</Button>
    </Alert>
  {:else}
    <svelte:boundary>
      {@render configSection()}
      {#snippet failed(error, reset)}
        <Alert tone="danger" title="Cette section ne peut pas s'afficher" role="alert">
          <p class="mb-3">{error instanceof Error ? error.message : 'Erreur inattendue.'}</p>
          <Button variant="ghost" icon={icons.refresh} onclick={reset}>Réessayer</Button>
        </Alert>
      {/snippet}
    </svelte:boundary>
  {/if}
</Page>

{#snippet configSection()}
  {#if section === 'company'}
    <SettingsSection title="Entreprise" description="Identité affichée sur vos documents.">
      <SettingsRow label="Nom commercial" stacked>
        <Field><Input bind:value={formData.companyName} /></Field>
      </SettingsRow>
      <SettingsRow label="Raison sociale" stacked>
        <Field><Input bind:value={formData.companyLegal} /></Field>
      </SettingsRow>
      <SettingsRow label="Localisation" stacked>
        <div class="grid gap-4 sm:grid-cols-3">
          <Field label="Adresse" class="sm:col-span-3"><Input bind:value={formData.companyAddress} /></Field>
          <Field label="Ville"><Input bind:value={formData.companyCity} /></Field>
          <Field label="Pays"><Input bind:value={formData.companyCountry} /></Field>
          <Field label="SIRET"><Input bind:value={formData.companySiret} /></Field>
        </div>
      </SettingsRow>
      <SettingsRow label="Contact" stacked>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input bind:value={formData.companyEmail} type="email" /></Field>
          <Field label="Téléphone"><Input bind:value={formData.companyPhone} /></Field>
        </div>
      </SettingsRow>
      <SettingsRow label="Logo" stacked>
        <ImageUpload bind:value={formData.logoUrl} label="" {getPresignedUrl} {trpc} />
      </SettingsRow>
      {@render saveRow()}
    </SettingsSection>

    <SettingsSection
      title="Mentions légales obligatoires"
      description="Requises sur toute facture émise (Art. 242 nonies A CGI, L441-9 Code commerce). Sans ces champs, la facture n'est pas conforme."
    >
      <SettingsRow label="Société" stacked>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field label="Forme juridique" helper="SAS, SARL, EI...">
            <Input bind:value={formData.companyLegalForm} />
          </Field>
          <Field label="Capital social (€)">
            <Input
              bind:value={
                () => formData.companyShareCapital ?? '',
                (v) => (formData.companyShareCapital = v === '' || v == null ? null : Number(v))
              }
              type="number"
              step="0.01"
            />
          </Field>
          <Field label="RCS, ville d'immatriculation">
            <Input bind:value={formData.companyRcsCity} />
          </Field>
          <Field label="Code APE/NAF" helper="Exemple : 6201Z">
            <Input bind:value={formData.companyApeCode} />
          </Field>
        </div>
      </SettingsRow>
      <SettingsRow label="TVA intracommunautaire" stacked>
        <Field><Input bind:value={formData.companyTvaIntracom} placeholder="FR..." class="font-fc-mono" /></Field>
      </SettingsRow>
      {@render saveRow()}
    </SettingsSection>
  {:else if section === 'billing'}
    <SettingsSection
      title="Valeurs par défaut"
      description="Délai de paiement, pénalités et indemnité forfaitaire 40 € (Art. L441-10 Code commerce)."
    >
      <SettingsRow label="Délais et indemnités" stacked>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field label="Délai de paiement (jours)">
            <Input bind:value={formData.defaultPaymentTermsDays} type="number" />
          </Field>
          <Field label="Indemnité forfaitaire (€)">
            <Input bind:value={formData.defaultRecoveryFeeAmount} type="number" step="0.01" />
          </Field>
        </div>
      </SettingsRow>
      <SettingsRow label="Taux des pénalités de retard" stacked>
        <Field><Input bind:value={formData.defaultLateFeeRate} /></Field>
      </SettingsRow>
      <SettingsRow label="Mention d'exonération de TVA" stacked>
        <Field helper="Exemple : Art. 293 B CGI"><Input bind:value={formData.defaultVatExemptionMention} /></Field>
      </SettingsRow>
      {@render saveRow()}
    </SettingsSection>

    <SettingsSection title="Coordonnées bancaires et TVA" description="Imprimées sur vos factures.">
      <SettingsRow label="Banque" stacked>
        <Field><Input bind:value={formData.bankName} /></Field>
      </SettingsRow>
      <SettingsRow label="IBAN et BIC" stacked>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field label="IBAN"><Input bind:value={formData.iban} class="font-fc-mono" /></Field>
          <Field label="BIC"><Input bind:value={formData.bic} class="font-fc-mono" /></Field>
        </div>
      </SettingsRow>
      <SettingsRow label="Taux de TVA par défaut (%)" stacked>
        <Field><Input bind:value={formData.tvaRate} type="number" /></Field>
      </SettingsRow>
      {@render saveRow()}
    </SettingsSection>
  {:else if section === 'payments'}
    <SettingsSection title="Stripe" description="Encaissement des paiements clients par carte.">
      <SettingsRow label="État">
        <StatusDot tone={stripeStatus.tone} label={stripeStatus.label} />
      </SettingsRow>
      <SettingsRow label="Clé publique" stacked>
        <Field><Input bind:value={formData.stripePublishableKey} placeholder="pk_..." class="font-fc-mono" /></Field>
      </SettingsRow>
      <SettingsRow label="Clé secrète" description="Laissez vide pour conserver la clé actuelle." stacked>
        <SecretField bind:value={formData.stripeSecretKey} editable placeholder="sk_..." />
      </SettingsRow>
      <SettingsRow label="Secret du webhook" description="Laissez vide pour conserver le secret actuel." stacked>
        <SecretField bind:value={formData.stripeWebhookSecret} editable placeholder="whsec_..." />
      </SettingsRow>
      {@render saveRow()}
    </SettingsSection>
  {:else if section === 'email'}
    <SettingsSection title="SMTP" description="Serveur d'envoi des factures, liens de connexion et relances.">
      <SettingsRow label="État">
        <StatusDot tone={smtpStatus.tone} label={smtpStatus.label} />
      </SettingsRow>
      <SettingsRow label="Serveur" stacked>
        <div class="grid gap-4 sm:grid-cols-3">
          <Field label="Hôte" class="sm:col-span-2"><Input bind:value={formData.smtpHost} class="font-fc-mono" /></Field>
          <Field label="Port"><Input bind:value={formData.smtpPort} type="number" /></Field>
        </div>
      </SettingsRow>
      <SettingsRow label="Utilisateur" stacked>
        <Field><Input bind:value={formData.smtpUser} /></Field>
      </SettingsRow>
      <SettingsRow label="Mot de passe" description="Laissez vide pour conserver le mot de passe actuel." stacked>
        <SecretField bind:value={formData.smtpPass} editable placeholder="Nouveau mot de passe" />
      </SettingsRow>
      <SettingsRow label="Expéditeur" stacked>
        <Field><Input bind:value={formData.smtpFrom} type="email" /></Field>
      </SettingsRow>
      {@render saveRow()}
    </SettingsSection>
  {:else if section === 'integrations'}
    <SettingsSection
      title="Webhooks"
      description="Ardoise envoie des POST avec X-Ardoise-Event, X-Ardoise-Delivery et X-Ardoise-Signature-256 si un secret est défini."
    >
      <SettingsRow label="État">
        <StatusDot tone={webhookStatus.tone} label={webhookStatus.label} />
      </SettingsRow>
      <SettingsRow label="URL" stacked>
        <Field><Input bind:value={formData.webhookUrl} type="url" placeholder="https://example.com/webhooks/ardoise" class="font-fc-mono" /></Field>
      </SettingsRow>
      <SettingsRow label="Secret de signature" description="Optionnel. Laissez vide pour conserver le secret actuel." stacked>
        <SecretField bind:value={formData.webhookSecret} editable placeholder="Secret de signature" />
      </SettingsRow>
      <SettingsRow label="Événements" stacked>
        <Field helper="Un événement par ligne ou séparé par des virgules. Laissez vide pour tout envoyer.">
          <Textarea
            bind:value={webhookEventsText}
            rows={5}
            class="font-fc-mono"
            placeholder={webhookPlaceholder}
          />
        </Field>
      </SettingsRow>
      {@render saveRow()}
    </SettingsSection>
  {/if}
{/snippet}
