<script lang="ts">
import { trpc } from '$lib/trpc';
import authStore from '$lib/auth-store';
import { Modal, Button, Alert } from '@repo/ui';
import 'iconify-icon';

let showEditForm = $state(false);
let showPasswordModal = $state(false);

let editFirstName = $state('');
let editLastName = $state('');
let editSaving = $state(false);
let editError = $state('');
let editSuccess = $state(false);

let currentPassword = $state('');
let newPassword = $state('');
let confirmPassword = $state('');
let passwordSaving = $state(false);
let passwordError = $state('');
let passwordSuccess = $state(false);

function openEditForm() {
	const user = authStore.getState().user;
	if (!user) return;
	editFirstName = user.firstName;
	editLastName = user.lastName;
	editError = '';
	editSuccess = false;
	showEditForm = true;
}

function cancelEdit() {
	showEditForm = false;
	editError = '';
	editSuccess = false;
}

async function saveProfile() {
	editSaving = true;
	editError = '';
	editSuccess = false;
	try {
		await trpc.user.updateProfile.mutate({
			firstName: editFirstName,
			lastName: editLastName,
		});
		const current = authStore.getState().user;
		if (current) {
			authStore.updateUser({
				...current,
				firstName: editFirstName,
				lastName: editLastName,
			});
		}
		editSuccess = true;
		showEditForm = false;
	} catch (err: any) {
		editError = err?.message || 'Erreur lors de la mise à jour du profil';
	} finally {
		editSaving = false;
	}
}

function openPasswordModal() {
	currentPassword = '';
	newPassword = '';
	confirmPassword = '';
	passwordError = '';
	passwordSuccess = false;
	showPasswordModal = true;
}

async function changePassword() {
	passwordError = '';
	passwordSuccess = false;

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
		await trpc.user.changePassword.mutate({
			currentPassword,
			newPassword,
		});
		passwordSuccess = true;
		setTimeout(() => {
			showPasswordModal = false;
		}, 1500);
	} catch (err: any) {
		if (err?.message?.includes('incorrect')) {
			passwordError = 'Le mot de passe actuel est incorrect.';
		} else {
			passwordError = err?.message || 'Erreur lors du changement de mot de passe';
		}
	} finally {
		passwordSaving = false;
	}
}
</script>

<main class="bg-background">
  <div class="max-w-2xl mx-auto p-6 space-y-6">

    <div class="flex items-center justify-between">
      <div>
        <button
          onclick={() => history.back()}
          class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
          Retour au Dashboard
        </button>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Mon Profil</h1>
      </div>

      <div class="w-12 h-12 bg-muted rounded-xl border border-border flex items-center justify-center text-muted-foreground">
        <iconify-icon icon="solar:user-circle-bold" width="32"></iconify-icon>
      </div>
    </div>

    {#if $authStore.loading}
      <div class="rounded-xl border border-border p-12 flex flex-col items-center justify-center">
        <iconify-icon icon="line-md:loading-twotone-loop" width="32" class="text-muted-foreground mb-3"></iconify-icon>
        <p class="text-sm text-muted-foreground">Chargement de votre compte...</p>
      </div>
    {:else if $authStore.user}
      <div class="space-y-6">
        <div class="rounded-xl border border-border p-6 space-y-6">

          {#if editSuccess && !showEditForm}
            <Alert variant="success" dismissible>
              Profil mis à jour avec succes.
            </Alert>
          {/if}

          {#if showEditForm}
            <div class="space-y-4">
              {#if editError}
                <Alert variant="danger">{editError}</Alert>
              {/if}

              <div class="grid md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label for="edit-first-name" class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prenom</label>
                  <input
                    id="edit-first-name"
                    type="text"
                    bind:value={editFirstName}
                    class="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground transition-colors"
                  />
                </div>

                <div class="space-y-1">
                  <label for="edit-last-name" class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</label>
                  <input
                    id="edit-last-name"
                    type="text"
                    bind:value={editLastName}
                    class="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground transition-colors"
                  />
                </div>
              </div>

              <div class="flex gap-3">
                <Button intent="secondary" onclick={cancelEdit} disabled={editSaving}>
                  Annuler
                </Button>
                <Button onclick={saveProfile} disabled={editSaving || !editFirstName.trim() || !editLastName.trim()}>
                  {#if editSaving}
                    <iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
                  {/if}
                  Enregistrer
                </Button>
              </div>
            </div>
          {:else}
            <div class="grid md:grid-cols-2 gap-6">
              <div class="space-y-1">
                <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prenom</div>
                <div class="bg-muted px-4 py-3 rounded-lg text-sm font-medium text-foreground">
                  {$authStore.user.firstName}
                </div>
              </div>

              <div class="space-y-1">
                <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</div>
                <div class="bg-muted px-4 py-3 rounded-lg text-sm font-medium text-foreground">
                  {$authStore.user.lastName}
                </div>
              </div>

              <div class="space-y-1 md:col-span-2">
                <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adresse Email</div>
                <div class="bg-muted px-4 py-3 rounded-lg text-sm font-medium text-foreground flex items-center gap-2">
                  <iconify-icon icon="solar:letter-bold" class="text-muted-foreground" width="16"></iconify-icon>
                  {$authStore.user.email}
                </div>
              </div>

              <div class="space-y-1">
                <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</div>
                <div class="flex">
                  <span class="bg-muted text-foreground px-2 py-1 rounded text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                    <iconify-icon icon="solar:medal-star-bold" width="14"></iconify-icon>
                    {$authStore.user.role}
                  </span>
                </div>
              </div>
            </div>

            <div class="h-px bg-border"></div>

            <div class="flex flex-col md:flex-row gap-3">
              <button
                onclick={() => authStore.logout()}
                class="bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded-md hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm font-medium"
              >
                <iconify-icon icon="solar:logout-2-bold" width="16"></iconify-icon>
                Deconnexion
              </button>

              <Button onclick={openEditForm}>
                <iconify-icon icon="solar:pen-new-square-bold" width="16"></iconify-icon>
                Modifier mes informations
              </Button>
            </div>
          {/if}
        </div>

        <div class="rounded-xl border border-border p-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
              <iconify-icon icon="solar:lock-password-bold" width="20"></iconify-icon>
            </div>
            <div>
              <h4 class="text-sm font-medium text-foreground">Securite du compte</h4>
              <p class="text-xs text-muted-foreground">Modifiez votre mot de passe pour securiser votre compte.</p>
            </div>
          </div>
          <button
            onclick={openPasswordModal}
            class="text-sm font-medium border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer"
          >
            Changer
          </button>
        </div>
      </div>
    {/if}
  </div>
</main>

<Modal bind:open={showPasswordModal} title="Changer le mot de passe">
  <div class="space-y-4">
    {#if passwordSuccess}
      <Alert variant="success">Mot de passe mis à jour avec succes.</Alert>
    {:else}
      {#if passwordError}
        <Alert variant="danger">{passwordError}</Alert>
      {/if}

      <div class="space-y-1">
        <label for="current-password" class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mot de passe actuel</label>
        <input
          id="current-password"
          type="password"
          bind:value={currentPassword}
          class="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground transition-colors"
          placeholder="Entrez votre mot de passe actuel"
        />
      </div>

      <div class="space-y-1">
        <label for="new-password" class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nouveau mot de passe</label>
        <input
          id="new-password"
          type="password"
          bind:value={newPassword}
          class="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground transition-colors"
          placeholder="Au moins 8 caractères"
        />
      </div>

      <div class="space-y-1">
        <label for="confirm-password" class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmer le nouveau mot de passe</label>
        <input
          id="confirm-password"
          type="password"
          bind:value={confirmPassword}
          class="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground transition-colors"
          placeholder="Retapez le nouveau mot de passe"
        />
      </div>

      <div class="flex gap-3 pt-2">
        <Button intent="secondary" class="flex-1" onclick={() => { showPasswordModal = false; }} disabled={passwordSaving}>
          Annuler
        </Button>
        <Button class="flex-1" onclick={changePassword} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}>
          {#if passwordSaving}
            <iconify-icon icon="line-md:loading-twotone-loop" width="16"></iconify-icon>
          {/if}
          Changer le mot de passe
        </Button>
      </div>
    {/if}
  </div>
</Modal>
