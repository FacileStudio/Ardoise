<script lang="ts">
  import authStore from '$lib/auth-store';
  import { trpc } from '$lib/trpc';
  import { Button, Input, Spinner, Alert, Toggle, LanguageSwitcher } from '@repo/ui';
  import { uploadFile } from '@repo/storage-client';
  import { logger } from '@repo/logger';
  import 'iconify-icon';
  import type { SessionUser } from '@repo/auth-shared';
  import { onMount } from 'svelte';
  import { fade, slide, scale } from 'svelte/transition';

  // --- LOGIC SECTION ---
  let activeTab = $state('profile');
  let saving = $state(false);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let uploading = $state(false);
  let uploadingBanner = $state(false);
  let avatarInput: HTMLInputElement = $state(null);
  let bannerInput: HTMLInputElement = $state(null);
  let showSavedMessage = $state(false);

  // Delete Account Logic
  let deleting = $state(false);
  let deleteModalOpen = $state(false);
  let deleteConfirmationText = $state('');

  let user = $state(null);

  onMount(async () => {
    try {
      user = await trpc.user.me.query();
    } catch (err) {
      logger.error({ err }, 'Failed to fetch user data on settings page');
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

  let notifications = $state({
    email: true,
    push: false,
    marketing: false,
  });

  let privacy = $state({
    profileVisible: true,
    showOnline: true,
    activityStatus: false,
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: 'solar:user-bold' },
    { id: 'account', name: 'Account', icon: 'solar:shield-user-bold' },
    { id: 'notifications', name: 'Notifications', icon: 'solar:bell-bold' },
    { id: 'privacy', name: 'Privacy', icon: 'solar:lock-bold' },
  ];

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
    } catch (err) {
      message = { type: 'error', text: 'Failed to update profile' };
    } finally {
      saving = false;
    }
  }

  async function handleChangePassword() {
    if (formData.newPassword !== formData.confirmPassword) {
      message = { type: 'error', text: 'Passwords do not match' };
      return;
    }
    if (formData.newPassword.length < 8) {
      message = { type: 'error', text: 'Password must be at least 8 characters' };
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
      message = { type: 'success', text: 'Password changed successfully!' };
    } catch (err) {
      message = { type: 'error', text: 'Failed to change password' };
    } finally {
      saving = false;
    }
  }

  async function handleAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploading = true;
    message = null;
    try {
      const uploadUrlResponse = await trpc.media.getUploadUrl.mutate({
        fileName: file.name,
        fileType: file.type,
      });

      await uploadFile(file, uploadUrlResponse.uploadUrl);

      const newImage = await trpc.media.updateAvatar.mutate({
        url: uploadUrlResponse.publicUrl,
        key: uploadUrlResponse.fileKey,
        size: file.size,
      });
      const updatedUser = { ...$authStore.user, avatarUrl: newImage.url };

      authStore.updateUser(updatedUser as SessionUser);
      message = { type: 'success', text: 'Avatar updated successfully!' };
    } catch (err) {
      logger.error({ err }, 'Failed to upload avatar');
      message = { type: 'error', text: 'Failed to upload avatar' };
    } finally {
      uploading = false;
    }
  }

  async function handleBannerChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadingBanner = true;
    message = null;
    try {
      const uploadUrlResponse = await trpc.media.getUploadUrl.mutate({
        fileName: file.name,
        fileType: file.type,
      });

      await uploadFile(file, uploadUrlResponse.uploadUrl);

      const newImage = await trpc.media.updateCover.mutate({
        url: uploadUrlResponse.publicUrl,
        key: uploadUrlResponse.fileKey,
        size: file.size,
      });
      const updatedUser = {
        ...$authStore.user,
        coverImageUrl: newImage.url,
      };

      authStore.updateUser(updatedUser as SessionUser);
      message = { type: 'success', text: 'Banner updated successfully!' };
    } catch (err) {
      logger.error({ err }, 'Failed to upload banner');
      message = { type: 'error', text: 'Failed to upload banner' };
    } finally {
      uploadingBanner = false;
    }
  }

  async function handleDeleteAccount() {
    // Instead of native confirm, we open our modal
    deleteModalOpen = true;
    deleteConfirmationText = '';
  }

  async function confirmDeleteAccount() {
    if (deleteConfirmationText !== 'DELETE') return;

    deleting = true;
    message = null;
    try {
      await trpc.user.deleteOwnAccount.mutate();
      authStore.logout();
    } catch (err) {
      logger.error({ err }, 'Failed to delete account');
      message = { type: 'error', text: 'Failed to delete account.' };
      deleteModalOpen = false;
    } finally {
      deleting = false;
    }
  }
</script>

<div class="min-h-screen p-8 lg:p-12 max-w-5xl mx-auto space-y-12 pb-32">
  <header class="text-center space-y-4">
    <div class="inline-flex items-center justify-center p-3 bg-neutral-100 rounded-2xl mb-2">
      <iconify-icon icon="solar:settings-bold" width="32" class="text-neutral-900"></iconify-icon>
    </div>
    <h1 class="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black">
      Settings<span class="text-neutral-300">.</span>
    </h1>
    <p class="text-neutral-600 font-medium text-lg max-w-md mx-auto">
      Manage your personal information, security preferences and account visibility.
    </p>
  </header>

  <div class="flex justify-center">
    <div class="inline-flex p-1.5 bg-neutral-100 rounded-[24px] gap-1 overflow-x-auto max-w-full">
      {#each tabs as tab}
        <button
          onclick={() => (activeTab = tab.id)}
          class="flex items-center gap-2 px-6 py-3 rounded-[20px] font-bold text-sm transition-all duration-300 whitespace-nowrap
          {activeTab === tab.id
            ? 'bg-white text-black shadow-lg shadow-neutral-200/50'
            : 'text-neutral-500 hover:text-black hover:bg-white/50'}"
        >
          <iconify-icon icon={tab.icon} width="18"></iconify-icon>
          {tab.name}
        </button>
      {/each}
    </div>
  </div>

  {#if message}
    <div in:slide class="max-w-xl mx-auto">
      <Alert variant={message.type === 'success' ? 'success' : 'danger'}>
        {message.text}
      </Alert>
    </div>
  {/if}

  <div class="max-w-3xl mx-auto">
    {#if activeTab === 'profile'}
      <div in:fade={{ duration: 300 }} class="space-y-8">
        <div
          class="group relative bg-white rounded-[32px] border border-neutral-200 overflow-hidden shadow-sm transition-shadow hover:shadow-md"
        >
          <div class="h-40 bg-neutral-100 relative overflow-hidden">
            {#if user?.coverImage?.url}
              <img src={user?.coverImage?.url} alt="Banner" class="w-full h-full object-cover" />
            {:else}
              <div
                class="w-full h-full bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px]"
              ></div>
            {/if}

            <button
              type="button"
              disabled={uploadingBanner}
              onclick={() => bannerInput.click()}
              class="absolute top-4 right-4 bg-white/90 backdrop-blur text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white transition-colors flex items-center gap-2 shadow-sm"
            >
              {#if uploadingBanner}
                <Spinner size="sm" />
              {/if}
              <iconify-icon icon="solar:camera-add-bold"></iconify-icon>
              Edit Cover
            </button>
            <input
              type="file"
              bind:this={bannerInput}
              onchange={handleBannerChange}
              accept="image/*"
              class="hidden"
            />
          </div>

          <div class="px-8 pb-8 -mt-12 flex items-end justify-between">
            <div class="relative group/avatar">
              <div class="w-24 h-24 rounded-3xl bg-white p-1.5 shadow-xl">
                <div
                  class="w-full h-full rounded-2xl bg-neutral-100 overflow-hidden flex items-center justify-center border border-neutral-100 relative"
                >
                  {#if user?.avatar?.url}
                    <img src={user.avatar.url} alt="Avatar" class="w-full h-full object-cover" />
                  {:else}
                    <span class="text-3xl font-black text-neutral-300"
                      >{$authStore.user?.firstName?.[0]}</span
                    >
                  {/if}

                  <button
                    onclick={() => avatarInput.click()}
                    disabled={uploading}
                    class="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer backdrop-blur-sm"
                  >
                    {#if uploading}
                      <Spinner size="sm" />
                    {:else}
                      <iconify-icon icon="solar:camera-minimalistic-bold" width="24"></iconify-icon>
                    {/if}
                  </button>
                </div>
              </div>
              <input
                type="file"
                bind:this={avatarInput}
                onchange={handleAvatarChange}
                accept="image/*"
                class="hidden"
              />
            </div>

            <div class="mb-2 text-right">
              <p class="text-sm font-bold text-neutral-500 uppercase tracking-wider">
                Public Profile
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white p-8 rounded-[32px] border border-neutral-200 space-y-6 shadow-sm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label for="firstName" class="text-sm font-bold text-neutral-700 pl-1 block">First Name</label>
              <Input
                id="firstName"
                bind:value={formData.firstName}
                placeholder="John"
                class="rounded-xl border-neutral-200 focus:border-black transition-colors bg-neutral-50/50"
              />
            </div>
            <div class="space-y-2">
              <label for="lastName" class="text-sm font-bold text-neutral-700 pl-1 block">Last Name</label>
              <Input
                id="lastName"
                bind:value={formData.lastName}
                placeholder="Doe"
                class="rounded-xl border-neutral-200 focus:border-black transition-colors bg-neutral-50/50"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label for="email" class="text-sm font-bold text-neutral-700 pl-1 block">Email Address</label>
            <Input
              id="email"
              value={formData.email}
              disabled
              class="bg-neutral-100 border-transparent text-neutral-500 cursor-not-allowed rounded-xl"
            />
          </div>

          <div class="pt-6 flex items-center justify-end gap-4 border-t border-neutral-100">
            {#if showSavedMessage}
              <span class="text-sm font-bold text-green-600 flex items-center gap-2" in:fade>
                <iconify-icon icon="solar:check-circle-bold"></iconify-icon> Saved
              </span>
            {/if}
            <Button onclick={handleUpdateProfile} disabled={saving || !hasProfileChanges}>
              {#if saving}
                <Spinner size="sm" class="text-white" />
              {:else}
                <iconify-icon icon="solar:diskette-bold" width="18"></iconify-icon>
              {/if}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    {:else if activeTab === 'account'}
      <div in:fade={{ duration: 300 }} class="space-y-6">
        <div class="bg-white p-8 rounded-[32px] border border-neutral-200 space-y-6 shadow-sm">
          <div class="flex items-center gap-4 mb-2">
            <div class="p-3 bg-neutral-100 rounded-xl">
              <iconify-icon icon="solar:key-square-bold" width="24"></iconify-icon>
            </div>
            <div>
              <h3 class="text-lg font-black uppercase tracking-tight">Security</h3>
              <p class="text-sm text-neutral-500">Update your password</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="space-y-2">
              <label for="currentPassword" class="text-sm font-bold text-neutral-700 pl-1 block">Current Password</label>
              <Input
                id="currentPassword"
                type="password"
                bind:value={formData.currentPassword}
                placeholder="••••••••"
                class="bg-neutral-50/50 rounded-xl"
              />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label for="newPassword" class="text-sm font-bold text-neutral-700 pl-1 block">New Password</label>
                <Input
                  id="newPassword"
                  type="password"
                  bind:value={formData.newPassword}
                  placeholder="••••••••"
                  class="bg-neutral-50/50 rounded-xl"
                />
              </div>
              <div class="space-y-2">
                <label for="confirmPassword" class="text-sm font-bold text-neutral-700 pl-1 block">Confirm Password</label
                >
                <Input
                  id="confirmPassword"
                  type="password"
                  bind:value={formData.confirmPassword}
                  placeholder="••••••••"
                  class="bg-neutral-50/50 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <Button onclick={handleChangePassword} disabled={saving}>
              {#if saving}
                <Spinner size="sm" class="text-white" />
              {:else}
                <iconify-icon icon="solar:diskette-bold" width="18"></iconify-icon>
              {/if}
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            class="bg-white p-6 rounded-[28px] border border-neutral-200 flex flex-col justify-between shadow-sm"
          >
            <div class="mb-4">
              <h4 class="font-black uppercase text-sm mb-1">Language</h4>
              <p class="text-sm text-neutral-500">Interface language</p>
            </div>
            <LanguageSwitcher />
          </div>

          <div
            class="bg-white p-6 rounded-[28px] border border-neutral-200 flex flex-col justify-between shadow-sm"
          >
            <div class="mb-4">
              <h4 class="font-black uppercase text-sm mb-1">Session</h4>
              <p class="text-sm text-neutral-500">Log out from this device</p>
            </div>
            <Button onclick={() => authStore.logout()}>
              <iconify-icon icon="solar:logout-2-bold" width="20"></iconify-icon>
              Log Out
            </Button>
          </div>
        </div>

        <div class="mt-8 p-1 rounded-[34px] bg-gradient-to-r from-red-100 to-orange-100">
          <div class="bg-white rounded-[32px] p-8">
            <div class="flex flex-col md:flex-row items-start justify-between gap-6">
              <div>
                <h3
                  class="text-red-600 font-black uppercase tracking-tight text-lg mb-2 flex items-center gap-2"
                >
                  <iconify-icon icon="solar:danger-triangle-bold"></iconify-icon>
                  Danger Zone
                </h3>
                <p class="text-neutral-600 text-sm leading-relaxed max-w-md font-medium">
                  Deleting your account is permanent. All your data will be wiped immediately and
                  cannot be recovered.
                </p>
              </div>
              <Button onclick={handleDeleteAccount} disabled={deleting}>
                <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    {:else if activeTab === 'notifications'}
      <div
        in:fade={{ duration: 300 }}
        class="bg-white rounded-[32px] border border-neutral-200 overflow-hidden divide-y divide-neutral-100 shadow-sm"
      >
        <div class="p-8 pb-4">
          <h3 class="text-xl font-black uppercase tracking-tight mb-1">Preferences</h3>
          <p class="text-neutral-500 text-sm">Choose how we communicate with you.</p>
        </div>

        {#each [{ label: 'Email Notifications', sub: 'Receive updates about your account activity via email.', bind: 'email' }, { label: 'Push Notifications', sub: 'Receive real-time alerts on your device.', bind: 'push' }, { label: 'Marketing Emails', sub: 'Be the first to know about new features and offers.', bind: 'marketing' }] as item}
          <div
            class="p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
          >
            <div class="pr-4">
              <div class="font-bold text-neutral-900 text-base">{item.label}</div>
              <div class="text-sm text-neutral-500 mt-0.5">{item.sub}</div>
            </div>
            <Toggle bind:checked={notifications[item.bind]} />
          </div>
        {/each}
      </div>
    {:else if activeTab === 'privacy'}
      <div
        in:fade={{ duration: 300 }}
        class="bg-white rounded-[32px] border border-neutral-200 overflow-hidden divide-y divide-neutral-100 shadow-sm"
      >
        <div class="p-8 pb-4">
          <h3 class="text-xl font-black uppercase tracking-tight mb-1">Privacy</h3>
          <p class="text-neutral-500 text-sm">Control who can see your profile and activity.</p>
        </div>

        {#each [{ label: 'Public Profile', sub: 'Allow anyone to view your profile information.', bind: 'profileVisible' }, { label: 'Online Status', sub: 'Show the green dot when you are active.', bind: 'showOnline' }, { label: 'Activity Log', sub: 'Allow friends to see what you are working on.', bind: 'activityStatus' }] as item}
          <div
            class="p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
          >
            <div class="pr-4">
              <div class="font-bold text-neutral-900 text-base">{item.label}</div>
              <div class="text-sm text-neutral-500 mt-0.5">{item.sub}</div>
            </div>
            <Toggle bind:checked={privacy[item.bind]} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if deleteModalOpen}
  <div
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
  >
    <div
      in:scale={{ start: 0.95, duration: 200 }}
      class="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
    >
      <div class="space-y-2 text-center">
        <div
          class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4"
        >
          <iconify-icon icon="solar:bomb-bold-duotone" width="32"></iconify-icon>
        </div>
        <h3 class="text-2xl font-black uppercase tracking-tight 900">Delete Account?</h3>
        <p class="text-neutral-500 font-medium">
          This action is absolute. Your data will be permanently removed.
        </p>
      </div>

      <div class="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
        <label for="deleteConfirm" class="text-xs font-bold text-neutral-500 uppercase tracking-wide block mb-2">
          Type "DELETE" to confirm
        </label>
        <input
          id="deleteConfirm"
          type="text"
          bind:value={deleteConfirmationText}
          placeholder="DELETE"
          class="w-full text-center font-black tracking-widest p-3 rounded-xl border-neutral-300 focus:border-red-500 focus:ring-red-500/20 uppercase"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button
          onclick={() => (deleteModalOpen = false)}
          class="px-4 py-3 rounded-xl font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={confirmDeleteAccount}
          disabled={deleteConfirmationText !== 'DELETE' || deleting}
          class="px-4 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {deleting ? 'Goodbye...' : 'Confirm Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}
