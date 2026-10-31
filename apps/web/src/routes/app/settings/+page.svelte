<script lang="ts">
  import authStore from '$lib/auth-store';
  import { trpc } from '$lib/trpc';
  import { Alert, Avatar, Button, Input, Spinner } from '@facile/muse';
  import { LanguageSwitcher } from '$lib/ui';
  import 'iconify-icon';
  import type { SessionUser } from '@repo/auth-shared';
  import { onMount } from 'svelte';
  import { logger } from '@repo/logger';

  let saving = $state(false);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let showSavedMessage = $state(false);
  let avatarUrl = $state<string | null>($authStore.user?.avatarUrl ?? null);
  let avatarFromSSO = $state(false);

  onMount(async () => {
    try {
      const profile = await trpc.user.me.query();
      if (profile.avatar) {
        avatarUrl = profile.avatar.url;
        avatarFromSSO = profile.avatar.key.includes('oidc-avatar');
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to load profile');
    }
  });

  let formData = $state({
    firstName: $authStore.user?.firstName || '',
    lastName: $authStore.user?.lastName || '',
    email: $authStore.user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  let originalFormData = $state({
    firstName: $authStore.user?.firstName || '',
    lastName: $authStore.user?.lastName || '',
  });

  let hasProfileChanges = $derived(
    formData.firstName !== originalFormData.firstName ||
      formData.lastName !== originalFormData.lastName
  );

  async function handleUpdateProfile() {
    saving = true;
    message = null;
    showSavedMessage = false;
    try {
      const updatedUser = await trpc.user.updateProfile.mutate({
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      authStore.updateUser(updatedUser as SessionUser);
      originalFormData.firstName = formData.firstName;
      originalFormData.lastName = formData.lastName;
      showSavedMessage = true;
      setTimeout(() => {
        showSavedMessage = false;
      }, 3000);
    } catch {
      message = { type: 'error', text: 'Échec de la mise à jour du profil' };
    } finally {
      saving = false;
    }
  }

  async function handleChangePassword() {
    if (formData.newPassword !== formData.confirmPassword) {
      message = { type: 'error', text: 'Les mots de passe ne correspondent pas' };
      return;
    }
    if (formData.newPassword.length < 8) {
      message = { type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères' };
      return;
    }
    saving = true;
    message = null;
    try {
      await trpc.user.changePassword.mutate({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      formData.currentPassword = '';
      formData.newPassword = '';
      formData.confirmPassword = '';
      message = { type: 'success', text: 'Mot de passe modifié avec succès' };
    } catch {
      message = { type: 'error', text: 'Échec de la modification du mot de passe' };
    } finally {
      saving = false;
    }
  }
</script>

<div class="flex flex-col gap-6 p-6 max-w-2xl">
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-foreground">Paramètres</h1>
    <p class="text-sm text-muted-foreground">
      Gérez vos informations personnelles et vos préférences.
    </p>
  </div>

  {#if message}
    <Alert tone={message.type === 'success' ? 'success' : 'danger'}>
      {message.text}
    </Alert>
  {/if}

  <div class="flex items-center gap-4">
    <Avatar
      src={avatarUrl}
      alt={formData.firstName || 'Avatar'}
      name={formData.firstName?.[0] || 'U'}
      size="lg"
    />
    <div>
      <p class="text-base font-semibold text-foreground">
        {formData.firstName} {formData.lastName}
      </p>
      <p class="text-sm text-muted-foreground">{formData.email}</p>
      {#if avatarFromSSO}
        <p class="text-xs text-muted-foreground mt-1">Synchronisé depuis le SSO</p>
      {/if}
    </div>
  </div>

  <div class="rounded-xl border border-border p-6 space-y-6">
    <div>
      <h3 class="text-base font-semibold text-foreground">Informations personnelles</h3>
      <p class="text-sm text-muted-foreground">Vos informations de compte</p>
    </div>

    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="firstName" class="text-sm font-medium text-foreground block">Prénom</label>
          <Input
            id="firstName"
            bind:value={formData.firstName}
            placeholder="Jean"
          />
        </div>
        <div class="space-y-2">
          <label for="lastName" class="text-sm font-medium text-foreground block">Nom</label>
          <Input
            id="lastName"
            bind:value={formData.lastName}
            placeholder="Dupont"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label for="email" class="text-sm font-medium text-foreground block">Adresse email</label>
        <Input
          id="email"
          value={formData.email}
          disabled
        />
      </div>

      <div class="pt-4 flex items-center justify-end gap-3 border-t border-border">
        {#if showSavedMessage}
          <span class="text-sm font-medium text-success flex items-center gap-1.5">
            <iconify-icon icon="solar:check-circle-linear" width="16"></iconify-icon>
            Enregistré
          </span>
        {/if}
        <Button onclick={handleUpdateProfile} disabled={saving || !hasProfileChanges}>
          {#if saving}
            <Spinner size="sm" />
          {:else}
            <iconify-icon icon="solar:diskette-linear" width="16"></iconify-icon>
          {/if}
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  </div>

  <div class="rounded-xl border border-border p-6 space-y-6">
    <div>
      <h3 class="text-base font-semibold text-foreground">Sécurité</h3>
      <p class="text-sm text-muted-foreground">Modifiez votre mot de passe</p>
    </div>

    <div class="space-y-4">
      <div class="space-y-2">
        <label for="currentPassword" class="text-sm font-medium text-foreground block">Mot de passe actuel</label>
        <Input
          id="currentPassword"
          type="password"
          bind:value={formData.currentPassword}
          placeholder="••••••••"
        />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="newPassword" class="text-sm font-medium text-foreground block">Nouveau mot de passe</label>
          <Input
            id="newPassword"
            type="password"
            bind:value={formData.newPassword}
            placeholder="••••••••"
          />
        </div>
        <div class="space-y-2">
          <label for="confirmPassword" class="text-sm font-medium text-foreground block">Confirmer le mot de passe</label>
          <Input
            id="confirmPassword"
            type="password"
            bind:value={formData.confirmPassword}
            placeholder="••••••••"
          />
        </div>
      </div>
    </div>

    <div class="flex justify-end pt-2">
      <Button onclick={handleChangePassword} disabled={saving}>
        {#if saving}
          <Spinner size="sm" />
        {:else}
          <iconify-icon icon="solar:diskette-linear" width="16"></iconify-icon>
        {/if}
        {saving ? 'Mise à jour...' : 'Mettre à jour'}
      </Button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="rounded-xl border border-border p-6 flex flex-col justify-between">
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-foreground mb-0.5">Langue</h4>
        <p class="text-sm text-muted-foreground">Langue de l'interface</p>
      </div>
      <LanguageSwitcher />
    </div>

    <div class="rounded-xl border border-border p-6 flex flex-col justify-between">
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-foreground mb-0.5">Session</h4>
        <p class="text-sm text-muted-foreground">Déconnexion de cet appareil</p>
      </div>
      <Button variant="danger" onclick={() => authStore.logout()}>
        <iconify-icon icon="solar:logout-2-linear" width="16"></iconify-icon>
        Déconnexion
      </Button>
    </div>
  </div>
</div>
