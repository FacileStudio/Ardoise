<script lang="ts">
	import authStore from '$lib/auth-store';
	import { trpc } from '$lib/trpc';
	import { Button, Input, Spinner, Alert, Toggle, LanguageSwitcher } from '@repo/ui';
	import { uploadFile } from '@repo/storage-client';
	import { logger } from '@repo/logger';
	import 'iconify-icon';
    import type { SessionUser } from '@repo/auth-shared';
    import { onMount } from 'svelte';

	let activeTab = $state('profile');
	let saving = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let uploading = $state(false);
	let uploadingBanner = $state(false);
	let avatarInput: HTMLInputElement = $state(null);
	let bannerInput: HTMLInputElement = $state(null);
	let showSavedMessage = $state(false);
	let deleting = $state(false);
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
		const confirmation = confirm(
			'Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.'
		);

		if (!confirmation) return;

		const doubleConfirmation = confirm(
			'This is your last chance. Type "DELETE" in the next prompt to confirm account deletion.'
		);

		if (!doubleConfirmation) return;

		const finalConfirmation = prompt('Type DELETE to confirm:');

		if (finalConfirmation !== 'DELETE') {
			message = { type: 'error', text: 'Account deletion cancelled. Confirmation text did not match.' };
			return;
		}

		deleting = true;
		message = null;
		try {
			await trpc.user.deleteOwnAccount.mutate();
			authStore.logout();
		} catch (err) {
			logger.error({ err }, 'Failed to delete account');
			message = { type: 'error', text: 'Failed to delete account. Please try again.' };
		} finally {
			deleting = false;
		}
	}
</script>

<div class="p-8 max-w-5xl mx-auto space-y-6">
	<header>
		<h1 class="text-3xl font-black text-slate-900 tracking-tighter">Settings</h1>
		<p class="text-slate-500 text-sm mt-1">Manage your account preferences and settings</p>
	</header>

	{#if message}
		<Alert variant={message.type === 'success' ? 'success' : 'danger'}>
			{message.text}
		</Alert>
	{/if}

	<div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
		<div class="border-b border-slate-100">
			<div class="flex gap-1 p-2">
				{#each tabs as tab}
					<button
						onclick={() => activeTab = tab.id}
						class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all
							{activeTab === tab.id
								? 'bg-indigo-50 text-indigo-600'
								: 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}"
					>
						<iconify-icon icon={tab.icon} width="18"></iconify-icon>
						{tab.name}
					</button>
				{/each}
			</div>
		</div>

		<div class="p-6">
			{#if activeTab === 'profile'}
				<div class="space-y-6">
					<div>
						<h3 class="text-lg font-bold text-slate-900 mb-4">Profile Information</h3>
						<div class="space-y-4">
							<div>
								<div class="block text-sm font-bold text-slate-700 mb-2">Profile Banner</div>
								<div class="flex items-center gap-4">
									<div class="relative w-full max-w-md h-32 bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-100">
										{#if uploadingBanner}
											<div class="absolute inset-0 flex items-center justify-center bg-white/80">
												<Spinner size="sm" />
											</div>
										{:else}
											<div class="flex items-center justify-center h-full text-slate-400">
                                            <img src={user?.coverImage?.url} alt="Banner" class="w-full h-full object-cover" />
											</div>
										{/if}
									</div>
									<div class="flex flex-col gap-2">
										<input
											type="file"
											bind:this={bannerInput}
											onchange={handleBannerChange}
											accept="image/*"
											class="hidden"
										/>
										<button
											type="button"
											onclick={() => bannerInput.click()}
											disabled={uploadingBanner}
											class="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors disabled:opacity-50"
										>
											Upload Banner
										</button>
										<p class="text-xs text-slate-500">JPG, PNG or GIF (max. 5MB)</p>
									</div>
								</div>
							</div>

							<div>
								<div class="block text-sm font-bold text-slate-700 mb-2">Avatar</div>
								<div class="flex items-center gap-4">
									<div class="relative">
										{#if user?.avatar?.url}
											<img
												src={user.avatar.url}
												alt="Avatar"
												class="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100"
											/>
										{:else}
											<div class="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-black border-2 border-slate-100">
												{$authStore.user?.firstName?.[0] || 'A'}
											</div>
										{/if}
										{#if uploading}
											<div class="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
												<Spinner size="sm" />
											</div>
										{/if}
									</div>
									<div class="flex flex-col gap-2">
										<input
											type="file"
											bind:this={avatarInput}
											onchange={handleAvatarChange}
											accept="image/*"
											class="hidden"
										/>
										<button
											type="button"
											onclick={() => avatarInput.click()}
											disabled={uploading}
											class="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors disabled:opacity-50"
										>
											Upload Photo
										</button>
										<p class="text-xs text-slate-500">JPG, PNG or GIF (max. 5MB)</p>
									</div>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div>
									<div class="block text-sm font-bold text-slate-700 mb-2">First Name</div>
									<Input bind:value={formData.firstName} placeholder="John" />
								</div>
								<div>
									<div class="block text-sm font-bold text-slate-700 mb-2">Last Name</div>
									<Input bind:value={formData.lastName} placeholder="Doe" />
								</div>
							</div>

							<div>
								<div class="block text-sm font-bold text-slate-700 mb-2">Email</div>
								<Input value={formData.email} disabled placeholder="john@example.com" />
								<p class="text-xs text-slate-500 mt-1">Email cannot be changed</p>
							</div>

							<div class="flex justify-end items-center gap-3">
								{#if showSavedMessage}
									<div class="flex items-center gap-2 text-green-600 font-bold text-sm animate-in fade-in slide-in-from-right-2 duration-300">
										<iconify-icon icon="solar:check-circle-bold" width="20"></iconify-icon>
										Changes saved successfully!
									</div>
								{/if}
								<Button onclick={handleUpdateProfile} disabled={saving || !hasProfileChanges}>
									{#if saving}
										<Spinner size="sm" />
									{:else}
										<iconify-icon icon="solar:diskette-bold" width="18"></iconify-icon>
										Save Changes
									{/if}
								</Button>
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === 'account'}
				<div class="space-y-6">
					<div>
						<h3 class="text-lg font-bold text-slate-900 mb-4">Change Password</h3>
						<div class="space-y-4">
							<div>
								<div class="block text-sm font-bold text-slate-700 mb-2">Current Password</div>
								<Input
									type="password"
									bind:value={formData.currentPassword}
									placeholder="Enter current password"
								/>
							</div>
							<div>
								<div class="block text-sm font-bold text-slate-700 mb-2">New Password</div>
								<Input
									type="password"
									bind:value={formData.newPassword}
									placeholder="Enter new password"
								/>
							</div>
							<div>
								<div class="block text-sm font-bold text-slate-700 mb-2">Confirm Password</div>
								<Input
									type="password"
									bind:value={formData.confirmPassword}
									placeholder="Confirm new password"
								/>
							</div>
							<div class="flex justify-end">
								<Button onclick={handleChangePassword} disabled={saving}>
									{#if saving}
										<Spinner size="sm" />
									{:else}
										Change Password
									{/if}
								</Button>
							</div>
						</div>
					</div>

					<div class="pt-6 border-t border-slate-100">
						<h3 class="text-lg font-bold text-slate-900 mb-4">Preferences</h3>
						<div class="space-y-4">
							<div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
								<div>
									<div class="font-bold text-slate-900">Language</div>
									<div class="text-sm text-slate-500">Choose your preferred language</div>
								</div>
								<LanguageSwitcher />
							</div>
						</div>
					</div>

					<div class="pt-6 border-t border-slate-100">
						<h3 class="text-lg font-bold text-slate-900 mb-4">Session</h3>
						<div class="space-y-4">
							<div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
								<div>
									<div class="font-bold text-slate-900">Sign Out</div>
									<div class="text-sm text-slate-500">Sign out of your account on this device</div>
								</div>
								<Button intent="secondary" onclick={() => authStore.logout()}>
									<iconify-icon icon="solar:logout-2-bold" width="18"></iconify-icon>
									Logout
								</Button>
							</div>
						</div>
					</div>

					<div class="pt-6 border-t border-slate-100">
						<h3 class="text-lg font-bold text-rose-600 mb-2">Danger Zone</h3>
						<p class="text-sm text-slate-600 mb-4">
							Once you delete your account, there is no going back. Please be certain.
						</p>
						<Button intent="danger" onclick={handleDeleteAccount} disabled={deleting}>
							{#if deleting}
								<Spinner size="sm" />
								Deleting Account...
							{:else}
								<iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
								Delete Account
							{/if}
						</Button>
					</div>
				</div>
			{:else if activeTab === 'notifications'}
				<div class="space-y-6">
					<div>
						<h3 class="text-lg font-bold text-slate-900 mb-4">Notification Preferences</h3>
						<div class="space-y-4">
							<div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
								<div>
									<div class="font-bold text-slate-900">Email Notifications</div>
									<div class="text-sm text-slate-500">Receive email updates about your account</div>
								</div>
								<Toggle bind:checked={notifications.email} />
							</div>

							<div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
								<div>
									<div class="font-bold text-slate-900">Push Notifications</div>
									<div class="text-sm text-slate-500">Receive push notifications on your device</div>
								</div>
								<Toggle bind:checked={notifications.push} />
							</div>

							<div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
								<div>
									<div class="font-bold text-slate-900">Marketing Emails</div>
									<div class="text-sm text-slate-500">Receive emails about new features and updates</div>
								</div>
								<Toggle bind:checked={notifications.marketing} />
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === 'privacy'}
				<div class="space-y-6">
					<div>
						<h3 class="text-lg font-bold text-slate-900 mb-4">Privacy Settings</h3>
						<div class="space-y-4">
							<div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
								<div>
									<div class="font-bold text-slate-900">Profile Visibility</div>
									<div class="text-sm text-slate-500">Make your profile visible to other users</div>
								</div>
								<Toggle bind:checked={privacy.profileVisible} />
							</div>

							<div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
								<div>
									<div class="font-bold text-slate-900">Show Online Status</div>
									<div class="text-sm text-slate-500">Let others see when you're online</div>
								</div>
								<Toggle bind:checked={privacy.showOnline} />
							</div>

							<div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
								<div>
									<div class="font-bold text-slate-900">Activity Status</div>
									<div class="text-sm text-slate-500">Share your activity with connections</div>
								</div>
								<Toggle bind:checked={privacy.activityStatus} />
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
