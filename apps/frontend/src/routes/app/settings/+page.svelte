<script lang="ts">
  import authStore from '$lib/auth-store';
  import { trpc } from '$lib/trpc';
  import { Button, Input, Spinner, Alert, LanguageSwitcher } from '@repo/ui';
  import 'iconify-icon';
  import type { SessionUser } from '@repo/auth-shared';
  import { fade, slide } from 'svelte/transition';

  let saving = $state(false);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let showSavedMessage = $state(false);

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

<div class="min-h-screen p-8 lg:p-12 max-w-4xl mx-auto space-y-8 pb-32 bg-[#FAF7F5]">
  <header class="text-center space-y-4">
    <div class="inline-flex items-center justify-center p-3 bg-[#FEC129]/20 rounded-2xl mb-2">
      <iconify-icon icon="solar:settings-bold" width="32" class="text-[#291334]"></iconify-icon>
    </div>
    <h1 class="text-4xl md:text-5xl font-black uppercase tracking-tighter text-[#291334]">
      Paramètres<span class="text-[#FEC129]">.</span>
    </h1>
    <p class="text-[#291334]/70 font-medium text-lg max-w-md mx-auto">
      Gérez vos informations personnelles et vos préférences.
    </p>
  </header>

  {#if message}
    <div in:slide class="max-w-2xl mx-auto">
      <Alert variant={message.type === 'success' ? 'success' : 'danger'}>
        {message.text}
      </Alert>
    </div>
  {/if}

  <div class="max-w-2xl mx-auto space-y-6">
    <div class="bg-white p-8 rounded-[32px] border border-[#291334]/10 space-y-6 shadow-sm">
      <div class="flex items-center gap-4 mb-2">
        <div class="p-3 bg-[#FEC129]/20 rounded-xl">
          <iconify-icon icon="solar:user-bold" width="24" class="text-[#291334]"></iconify-icon>
        </div>
        <div>
          <h3 class="text-lg font-black uppercase tracking-tight text-[#291334]">Informations personnelles</h3>
          <p class="text-sm text-[#291334]/60">Vos informations de compte</p>
        </div>
      </div>

      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label for="firstName" class="text-sm font-bold text-[#291334] pl-1 block">Prénom</label>
            <Input
              id="firstName"
              bind:value={formData.firstName}
              placeholder="Jean"
              class="rounded-xl border-[#291334]/20 focus:border-[#FEC129] transition-colors bg-[#FAF7F5]/50 px-4 py-3"
            />
          </div>
          <div class="space-y-2">
            <label for="lastName" class="text-sm font-bold text-[#291334] pl-1 block">Nom</label>
            <Input
              id="lastName"
              bind:value={formData.lastName}
              placeholder="Dupont"
              class="rounded-xl border-[#291334]/20 focus:border-[#FEC129] transition-colors bg-[#FAF7F5]/50 px-4 py-3"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label for="email" class="text-sm font-bold text-[#291334] pl-1 block">Adresse email</label>
          <Input
            id="email"
            value={formData.email}
            disabled
            class="bg-[#FAF7F5] border-transparent text-[#291334]/60 cursor-not-allowed rounded-xl px-4 py-3"
          />
        </div>

        <div class="pt-6 flex items-center justify-end gap-4 border-t border-[#291334]/10">
          {#if showSavedMessage}
            <span class="text-sm font-bold text-[#FEC129] flex items-center gap-2" in:fade>
              <iconify-icon icon="solar:check-circle-bold"></iconify-icon> Enregistré
            </span>
          {/if}
          <Button onclick={handleUpdateProfile} disabled={saving || !hasProfileChanges} class="bg-[#291334] hover:bg-[#291334]/90 text-[#FAF7F5]">
            {#if saving}
              <Spinner size="sm" class="text-white" />
            {:else}
              <iconify-icon icon="solar:diskette-bold" width="18"></iconify-icon>
            {/if}
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>

    <div class="bg-white p-8 rounded-[32px] border border-[#291334]/10 space-y-6 shadow-sm">
      <div class="flex items-center gap-4 mb-2">
        <div class="p-3 bg-[#FEC129]/20 rounded-xl">
          <iconify-icon icon="solar:key-square-bold" width="24" class="text-[#291334]"></iconify-icon>
        </div>
        <div>
          <h3 class="text-lg font-black uppercase tracking-tight text-[#291334]">Sécurité</h3>
          <p class="text-sm text-[#291334]/60">Modifiez votre mot de passe</p>
        </div>
      </div>

      <div class="space-y-4">
        <div class="space-y-2">
          <label for="currentPassword" class="text-sm font-bold text-[#291334] pl-1 block">Mot de passe actuel</label>
          <Input
            id="currentPassword"
            type="password"
            bind:value={formData.currentPassword}
            placeholder="••••••••"
            class="bg-[#FAF7F5]/50 rounded-xl border-[#291334]/20 focus:border-[#FEC129] px-4 py-3"
          />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="newPassword" class="text-sm font-bold text-[#291334] pl-1 block">Nouveau mot de passe</label>
            <Input
              id="newPassword"
              type="password"
              bind:value={formData.newPassword}
              placeholder="••••••••"
              class="bg-[#FAF7F5]/50 rounded-xl border-[#291334]/20 focus:border-[#FEC129] px-4 py-3"
            />
          </div>
          <div class="space-y-2">
            <label for="confirmPassword" class="text-sm font-bold text-[#291334] pl-1 block">Confirmer le mot de passe</label>
            <Input
              id="confirmPassword"
              type="password"
              bind:value={formData.confirmPassword}
              placeholder="••••••••"
              class="bg-[#FAF7F5]/50 rounded-xl border-[#291334]/20 focus:border-[#FEC129] px-4 py-3"
            />
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <Button onclick={handleChangePassword} disabled={saving} class="bg-[#291334] hover:bg-[#291334]/90 text-[#FAF7F5]">
          {#if saving}
            <Spinner size="sm" class="text-white" />
          {:else}
            <iconify-icon icon="solar:diskette-bold" width="18"></iconify-icon>
          {/if}
          {saving ? 'Mise à jour...' : 'Mettre à jour'}
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-[28px] border border-[#291334]/10 flex flex-col justify-between shadow-sm">
        <div class="mb-4">
          <h4 class="font-black uppercase text-sm mb-1 text-[#291334]">Langue</h4>
          <p class="text-sm text-[#291334]/60">Langue de l'interface</p>
        </div>
        <LanguageSwitcher />
      </div>

      <div class="bg-white p-6 rounded-[28px] border border-[#291334]/10 flex flex-col justify-between shadow-sm">
        <div class="mb-4">
          <h4 class="font-black uppercase text-sm mb-1 text-[#291334]">Session</h4>
          <p class="text-sm text-[#291334]/60">Déconnexion de cet appareil</p>
        </div>
        <Button onclick={() => authStore.logout()} class="bg-red-600 hover:bg-red-700 text-white">
          <iconify-icon icon="solar:logout-2-bold" width="20"></iconify-icon>
          Déconnexion
        </Button>
      </div>
    </div>
  </div>
</div>
