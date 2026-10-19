<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import { isAdmin, type SessionUser } from '@repo/auth-shared';
  import 'iconify-icon';

  const inputClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
  const labelClass = 'text-sm font-medium leading-none';

  const token = $derived(page.params.token ?? '');

  let invitation = $state<{ email: string; role: string; spaceName: string | null } | null>(null);
  let loading = $state(true);
  let invalid = $state(false);
  let submitting = $state(false);
  let error = $state('');
  let firstName = $state('');
  let lastName = $state('');
  let password = $state('');
  let confirmPassword = $state('');

  onMount(async () => {
    try {
      invitation = await trpc.invitation.preview.query({ token });
    } catch {
      invalid = true;
    } finally {
      loading = false;
    }
  });

  async function handleAccept() {
    error = '';

    if (password.length < 8) {
      error = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (password !== confirmPassword) {
      error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    submitting = true;
    try {
      const { user } = await trpc.invitation.accept.mutate({
        token,
        firstName,
        lastName,
        password,
      });
      authStore.setAuth(user as SessionUser);
      await goto(resolve(isAdmin(user as SessionUser) ? '/admin/clients' : '/app'));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Impossible de créer le compte.';
    } finally {
      submitting = false;
    }
  }

  const target = $derived(
    invitation?.spaceName
      ? `l'espace « ${invitation.spaceName} »`
      : invitation?.role === 'ADMIN'
        ? "l'équipe d'administration"
        : 'Ardoise'
  );
</script>

<svelte:head>
  <title>Invitation — Ardoise</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-8 py-12">
  <div class="w-full max-w-sm">
    <a href={resolve('/')} class="mb-10 flex items-center gap-3">
      <iconify-icon icon="solar:bill-list-bold-duotone" width="28"></iconify-icon>
      <span class="text-xl font-bold font-heading">Ardoise</span>
    </a>

    {#if loading}
      <div class="flex items-center justify-center py-8">
        <iconify-icon icon="svg-spinners:ring-resize" width="20"></iconify-icon>
      </div>
    {:else if invalid || !invitation}
      <h1 class="text-2xl font-bold font-heading text-foreground">Invitation invalide</h1>
      <p class="mt-1.5 text-sm text-muted-foreground">
        Ce lien a expiré ou a déjà été utilisé. Demandez une nouvelle invitation.
      </p>
      <a href={resolve('/login')} class="mt-6 inline-block text-sm font-medium underline">
        Aller à la connexion
      </a>
    {:else}
      <h1 class="text-2xl font-bold font-heading text-foreground">Créer votre compte</h1>
      <p class="mt-1.5 text-sm text-muted-foreground">
        Vous rejoignez {target} avec l'adresse {invitation.email}.
      </p>

      <form
        onsubmit={(e) => { e.preventDefault(); handleAccept(); }}
        class="mt-8 space-y-4"
      >
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label for="firstName" class={labelClass}>Prénom</label>
            <input id="firstName" bind:value={firstName} required autocomplete="given-name" disabled={submitting} class={inputClass} />
          </div>
          <div class="space-y-1.5">
            <label for="lastName" class={labelClass}>Nom</label>
            <input id="lastName" bind:value={lastName} required autocomplete="family-name" disabled={submitting} class={inputClass} />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="password" class={labelClass}>Mot de passe</label>
          <input id="password" type="password" bind:value={password} required minlength={8} autocomplete="new-password" placeholder="Minimum 8 caractères" disabled={submitting} class={inputClass} />
        </div>

        <div class="space-y-1.5">
          <label for="confirmPassword" class={labelClass}>Confirmer le mot de passe</label>
          <input id="confirmPassword" type="password" bind:value={confirmPassword} required autocomplete="new-password" disabled={submitting} class={inputClass} />
        </div>

        {#if error}
          <p class="text-sm text-fc-danger">{error}</p>
        {/if}

        <button
          type="submit"
          disabled={submitting}
          class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
    {/if}
  </div>
</div>
