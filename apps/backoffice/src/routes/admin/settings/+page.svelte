<script lang="ts">
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import { Button, Input, Spinner, Alert } from '@repo/ui';
  import 'iconify-icon';

  let loading = $state(true);
  let saving = $state(false);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

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
    bankName: '',
    iban: '',
    bic: '',
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
        bankName: settings.bankName || '',
        iban: settings.iban || '',
        bic: settings.bic || '',
        tvaRate: Number(settings.tvaRate || 20),
      };
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
      await trpc.settings.update.mutate(formData);
      formData.stripeSecretKey = '';
      formData.stripeWebhookSecret = '';
      formData.smtpPass = '';
      message = { type: 'success', text: 'Paramètres enregistrés' };
    } catch {
      message = { type: 'error', text: 'Impossible d’enregistrer les paramètres' };
    } finally {
      saving = false;
    }
  }
</script>

<div class="min-h-screen p-8 lg:p-12 bg-[#FAF7F5]">
  <div class="max-w-5xl mx-auto space-y-8">
    <header class="flex items-center justify-between">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.25em] text-[#291334]/40">Administration</p>
        <h1 class="text-4xl font-black tracking-tight text-[#291334]">Paramètres</h1>
      </div>
      <Button onclick={saveSettings} disabled={saving || loading} class="bg-[#291334] text-white">
        {#if saving}
          <Spinner size="sm" class="text-white" />
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
      <section class="bg-white border border-[#291334]/10 rounded-[28px] p-8 space-y-6">
        <h2 class="text-xl font-black text-[#291334]">Entreprise</h2>
        <div class="grid md:grid-cols-2 gap-5">
          <Input bind:value={formData.companyName} placeholder="Nom commercial" />
          <Input bind:value={formData.companyLegal} placeholder="Raison sociale" />
          <Input bind:value={formData.companyAddress} placeholder="Adresse" />
          <Input bind:value={formData.companyCity} placeholder="Ville" />
          <Input bind:value={formData.companyCountry} placeholder="Pays" />
          <Input bind:value={formData.companySiret} placeholder="SIRET" />
          <Input bind:value={formData.companyEmail} type="email" placeholder="Email" />
          <Input bind:value={formData.companyPhone} placeholder="Téléphone" />
        </div>
      </section>

      <section class="bg-white border border-[#291334]/10 rounded-[28px] p-8 space-y-6">
        <h2 class="text-xl font-black text-[#291334]">Stripe</h2>
        <div class="grid md:grid-cols-2 gap-5">
          <Input bind:value={formData.stripePublishableKey} placeholder="Clé publique pk_..." />
          <Input bind:value={formData.stripeSecretKey} type="password" placeholder="Nouvelle clé secrète sk_..." />
          <Input bind:value={formData.stripeWebhookSecret} type="password" placeholder="Nouveau secret webhook whsec_..." class="md:col-span-2" />
        </div>
      </section>

      <section class="bg-white border border-[#291334]/10 rounded-[28px] p-8 space-y-6">
        <h2 class="text-xl font-black text-[#291334]">SMTP</h2>
        <div class="grid md:grid-cols-2 gap-5">
          <Input bind:value={formData.smtpHost} placeholder="Serveur SMTP" />
          <Input bind:value={formData.smtpPort} type="number" placeholder="Port" />
          <Input bind:value={formData.smtpUser} placeholder="Utilisateur" />
          <Input bind:value={formData.smtpPass} type="password" placeholder="Nouveau mot de passe" />
          <Input bind:value={formData.smtpFrom} type="email" placeholder="Expéditeur" class="md:col-span-2" />
        </div>
      </section>

      <section class="bg-white border border-[#291334]/10 rounded-[28px] p-8 space-y-6">
        <h2 class="text-xl font-black text-[#291334]">Facturation</h2>
        <div class="grid md:grid-cols-2 gap-5">
          <Input bind:value={formData.bankName} placeholder="Banque" />
          <Input bind:value={formData.tvaRate} type="number" placeholder="TVA" />
          <Input bind:value={formData.iban} placeholder="IBAN" />
          <Input bind:value={formData.bic} placeholder="BIC" />
        </div>
      </section>
    {/if}
  </div>
</div>
