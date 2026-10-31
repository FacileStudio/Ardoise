<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import env from '$lib/env';
  import { isAdmin, type SessionUser } from '@repo/auth-shared';
  import 'iconify-icon';

  const apiUrl = env.API_URL?.replace(/\/trpc\/?$/, '').replace(/\/$/, '') ?? '';

  const inputClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
  const labelClass = 'text-sm font-medium leading-none';
  const primaryButtonClass =
    'inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50';
  let loading = $state(false);
  let oidcLoading = $state(false);
  let error = $state('');
  let email = $state('');
  let password = $state('');
  let oidcEnabled = $state(false);
  let ssoOnly = $state(false);
  let configLoaded = $state(false);

  const ssoErrors: Record<string, string> = {
    oidc_failed: "Échec de l'authentification SSO.",
    not_invited:
      "Aucun compte Ardoise n'est associé à cette adresse. Demandez à un administrateur de l'ajouter.",
    email_unverified: "Votre adresse email n'est pas vérifiée auprès du fournisseur SSO.",
    identity_conflict: 'Ce compte est déjà lié à une autre identité SSO.',
    blocked: 'Ce compte est suspendu ou banni.',
  };

  function redirectForRole(user: SessionUser) {
    return isAdmin(user) ? '/admin/clients' : '/app';
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);

    if (params.has('oidc') && params.get('oidc') === 'success') {
      oidcLoading = true;
      try {
        const user = await trpc.auth.me.query({});
        authStore.setAuth(user as SessionUser);
        window.history.replaceState({}, '', window.location.pathname);
        await goto(resolve(redirectForRole(user as SessionUser)));
        return;
      } catch {
        error = "Échec de la récupération du profil après connexion SSO.";
        window.history.replaceState({}, '', window.location.pathname);
      } finally {
        oidcLoading = false;
      }
    }

    const ssoError = params.get('error');
    if (ssoError) {
      error = ssoErrors[ssoError] ?? ssoErrors.oidc_failed;
      window.history.replaceState({}, '', window.location.pathname);
    }

    try {
      const res = await fetch(`${apiUrl}/auth/config`);
      const config = await res.json();
      oidcEnabled = config.oidc_enabled ?? false;
      ssoOnly = config.sso_only ?? false;
    } catch { /* noop */ }

    configLoaded = true;
  });

  async function handleLogin() {
    loading = true;
    error = '';
    try {
      const { user } = await trpc.auth.login.mutate({ email, password });
      authStore.setAuth(user as SessionUser);
      await goto(resolve(redirectForRole(user as SessionUser)));
    } catch (err) {
      error = err instanceof Error ? err.message : "Échec de l'authentification.";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Connexion — Ardoise</title>
</svelte:head>

<div class="flex min-h-screen">
  <div class="hidden lg:flex lg:w-1/2 flex-col bg-black px-12 py-10">
    <a href={resolve('/')} class="flex items-center gap-3 mb-auto">
      <iconify-icon icon="solar:bill-list-bold-duotone" width="28" class="text-white"></iconify-icon>
      <span class="text-xl font-bold font-heading tracking-tight text-white">Ardoise</span>
    </a>

    <div class="mb-auto">
      <h2 class="text-4xl font-bold font-heading text-white leading-tight tracking-tight">
        Facturation.<br />Paiement.
      </h2>
      <p class="mt-4 text-sm text-white/50 max-w-xs leading-relaxed">
        Plateforme de facturation et de paiement pour Facile Studio.
      </p>
    </div>

    <p class="text-xs text-white/30">
      © {new Date().getFullYear()} Ardoise par Facile.
    </p>
  </div>

  <div class="flex w-full lg:w-1/2 flex-col items-center justify-center px-8 py-12 bg-background">
    <div class="w-full max-w-sm">
      <a href={resolve('/')} class="mb-10 flex items-center gap-3 lg:hidden">
        <iconify-icon icon="solar:bill-list-bold-duotone" width="28"></iconify-icon>
        <span class="text-xl font-bold font-heading tracking-tight">Ardoise</span>
      </a>

      <div class="mb-8">
        <h1 class="text-2xl font-bold font-heading tracking-tight text-foreground">
          Bienvenue
        </h1>
        <p class="mt-1.5 text-sm text-muted-foreground">
          Connectez-vous à votre espace.
        </p>
      </div>

      {#if oidcLoading}
        <div class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <iconify-icon icon="svg-spinners:ring-resize" width="16"></iconify-icon>
          Connexion en cours…
        </div>
      {:else if !configLoaded}
        <div class="h-40"></div>
      {:else}
        {#if error}
          <p class="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        {/if}

        {#if oidcEnabled}
          <a
            href="{apiUrl}/auth/oidc?redirect={encodeURIComponent(window.location.origin + resolve('/login'))}"
            rel="external"
            data-sveltekit-reload
            class={primaryButtonClass}
          >
            <iconify-icon
              icon="solar:key-minimalistic-square-bold-duotone"
              width="18"
              class="mr-2"
            ></iconify-icon>
            Se connecter avec Facile
          </a>
          <div class="my-6 flex items-center gap-3">
            <span class="h-px flex-1 bg-border"></span>
            <span class="text-xs text-muted-foreground">ou</span>
            <span class="h-px flex-1 bg-border"></span>
          </div>
        {/if}

        {#if ssoOnly}
          <p class="mb-4 text-sm text-muted-foreground">
            Accès client : connectez-vous avec votre email et votre mot de passe.
          </p>
        {/if}

        <form
          onsubmit={(e) => { e.preventDefault(); handleLogin(); }}
          class="space-y-4"
        >
          <div class="space-y-1.5">
            <label for="email" class={labelClass}>Email</label>
            <input
              id="email"
              type="email"
              bind:value={email}
              placeholder="vous@exemple.com"
              autocomplete="email"
              required
              disabled={loading}
              class={inputClass}
            />
          </div>

          <div class="space-y-1.5">
            <label for="password" class={labelClass}>Mot de passe</label>
            <input
              id="password"
              type="password"
              bind:value={password}
              placeholder="••••••••"
              autocomplete="current-password"
              required
              disabled={loading}
              class={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            class={primaryButtonClass}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>
