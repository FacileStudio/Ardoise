<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Alert,
    Avatar,
    Badge,
    Button,
    ConfirmModal,
    Field,
    Input,
    Modal,
    SettingsRow,
    SettingsSection,
    Spinner,
    toast,
  } from '@facile/muse';
  import type { SessionUser } from '@repo/auth-shared';
  import { logger } from '@repo/logger';
  import authStore from '$lib/auth-store';
  import { loadAuthConfig } from '$lib/auth-config';
  import { trpc } from '$lib/trpc';
  import { icons } from '$lib/icons';

  let { area }: { area: 'admin' | 'client' } = $props();

  type ClientCompany = Awaited<ReturnType<typeof trpc.client.me.query>>;

  let ssoOnly = $state(false);
  let configLoaded = $state(false);
  let avatarUrl = $state<string | undefined>(undefined);
  let company = $state<ClientCompany | null>(null);

  let firstName = $state($authStore.user?.firstName ?? '');
  let lastName = $state($authStore.user?.lastName ?? '');
  let saving = $state(false);

  let passwordOpen = $state(false);
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordError = $state('');
  let passwordSaving = $state(false);

  let loggingOut = $state(false);

  const user = $derived($authStore.user);
  const staff = $derived(area === 'admin');
  const nameLocked = $derived(staff && ssoOnly);
  const canChangePassword = $derived(configLoaded && !(staff && ssoOnly));
  const dirty = $derived(
    firstName !== (user?.firstName ?? '') || lastName !== (user?.lastName ?? '')
  );
  const fullName = $derived(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());

  onMount(async () => {
    const [config, profile, clientCompany] = await Promise.all([
      loadAuthConfig(),
      trpc.user.me.query().catch(() => null),
      area === 'client' ? trpc.client.me.query().catch(() => null) : Promise.resolve(null),
    ]);
    ssoOnly = config.ssoOnly;
    configLoaded = true;
    avatarUrl = profile?.avatar?.url ?? $authStore.user?.avatarUrl ?? undefined;
    company = clientCompany;
  });

  $effect(() => {
    firstName = user?.firstName ?? '';
    lastName = user?.lastName ?? '';
  });

  async function saveProfile() {
    saving = true;
    try {
      const updated = await trpc.user.updateProfile.mutate({ firstName, lastName });
      authStore.updateUser(updated as SessionUser);
      toast.success('Profil mis à jour');
    } catch (err) {
      logger.error({ err }, 'Failed to update profile');
      toast.danger('Échec de la mise à jour du profil');
    } finally {
      saving = false;
    }
  }

  function openPassword() {
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    passwordError = '';
    passwordOpen = true;
  }

  async function changePassword() {
    passwordError = '';
    if (newPassword.length < 8) {
      passwordError = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (newPassword !== confirmPassword) {
      passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }
    passwordSaving = true;
    try {
      await trpc.user.changePassword.mutate({ currentPassword, newPassword });
      passwordOpen = false;
      toast.success('Mot de passe mis à jour');
    } catch (err: any) {
      passwordError = err?.message?.includes('incorrect')
        ? 'Le mot de passe actuel est incorrect.'
        : err?.message || 'Erreur lors du changement de mot de passe';
    } finally {
      passwordSaving = false;
    }
  }
</script>

{#if !configLoaded}
  <div class="flex min-h-[30dvh] items-center justify-center"><Spinner size="lg" /></div>
{:else}
  <SettingsSection title="Identité" description="Comment vous apparaissez dans Ardoise.">
    <SettingsRow label="Photo">
      <div class="flex items-center gap-3">
        <Avatar name={fullName || user?.email || ''} src={avatarUrl} size="lg" />
        {#if staff}
          <Badge tone="admin">Administrateur</Badge>
        {/if}
      </div>
    </SettingsRow>
    <SettingsRow
      label="Nom complet"
      description={nameLocked ? 'Fourni par le SSO, il se met à jour à chaque connexion.' : undefined}
      stacked
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom">
          <Input bind:value={firstName} disabled={nameLocked} />
        </Field>
        <Field label="Nom">
          <Input bind:value={lastName} disabled={nameLocked} />
        </Field>
      </div>
    </SettingsRow>
    <SettingsRow
      label="Adresse email"
      description={staff ? 'Gérée par le SSO.' : 'Identifiant de connexion.'}
      stacked
    >
      <Field>
        <Input value={user?.email ?? ''} disabled />
      </Field>
    </SettingsRow>
    {#if !nameLocked}
      <SettingsRow>
        <Button
          icon={icons.check}
          disabled={saving || !dirty || !firstName.trim() || !lastName.trim()}
          onclick={saveProfile}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </SettingsRow>
    {/if}
  </SettingsSection>

  {#if company}
    <SettingsSection title="Entreprise" description="Informations enregistrées par votre prestataire.">
      <SettingsRow label="Raison sociale">
        <span class="text-fc-sm text-fc-fg">{company.companyName}</span>
      </SettingsRow>
      {#if company.siret}
        <SettingsRow label="SIRET">
          <span class="font-fc-mono text-fc-sm text-fc-fg">{company.siret}</span>
        </SettingsRow>
      {/if}
      <SettingsRow label="Adresse de facturation">
        <span class="text-fc-sm text-fc-fg">
          {[company.billingAddress, company.billingCity, company.billingCountry]
            .filter(Boolean)
            .join(', ') || 'Non renseignée'}
        </span>
      </SettingsRow>
      <SettingsRow
        label="Modifier ces informations"
        description="Contactez-nous directement pour toute correction."
      />
    </SettingsSection>
  {/if}

  {#if canChangePassword}
    <SettingsSection title="Sécurité" description="Protégez l'accès à votre compte.">
      <SettingsRow label="Mot de passe" description="Choisissez-en un d'au moins 8 caractères.">
        <Button variant="ghost" icon={icons.key} onclick={openPassword}>Changer</Button>
      </SettingsRow>
    </SettingsSection>
  {/if}

  <SettingsSection title="Session" description="Cet appareil uniquement.">
    <SettingsRow label="Déconnexion" description="Vous devrez vous reconnecter pour revenir ici.">
      <Button variant="danger" icon={icons.logout} onclick={() => (loggingOut = true)}>
        Déconnexion
      </Button>
    </SettingsRow>
  </SettingsSection>
{/if}

<Modal bind:open={passwordOpen} title="Changer le mot de passe">
  <div class="flex flex-col gap-4">
    {#if passwordError}
      <Alert tone="danger">{passwordError}</Alert>
    {/if}
    <Field label="Mot de passe actuel">
      <Input type="password" bind:value={currentPassword} autocomplete="current-password" />
    </Field>
    <Field label="Nouveau mot de passe" helper="Au moins 8 caractères.">
      <Input type="password" bind:value={newPassword} autocomplete="new-password" />
    </Field>
    <Field label="Confirmer le nouveau mot de passe">
      <Input type="password" bind:value={confirmPassword} autocomplete="new-password" />
    </Field>
    <div class="flex justify-end gap-2">
      <Button variant="ghost" disabled={passwordSaving} onclick={() => (passwordOpen = false)}>
        Annuler
      </Button>
      <Button
        disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
        onclick={changePassword}
      >
        {passwordSaving ? 'Enregistrement...' : 'Changer le mot de passe'}
      </Button>
    </div>
  </div>
</Modal>

<ConfirmModal
  bind:open={loggingOut}
  title="Se déconnecter d'Ardoise ?"
  description="Vos données restent en place. Vous devrez vous reconnecter sur cet appareil."
  confirmLabel="Déconnexion"
  onConfirm={() => authStore.logout()}
/>
