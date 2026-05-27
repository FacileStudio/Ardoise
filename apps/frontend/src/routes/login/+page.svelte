<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import env from '$lib/env';
  import 'iconify-icon';

  const apiUrl = env.API_URL?.replace(/\/trpc\/?$/, '').replace(/\/$/, '') ?? '';

  let loading = $state(false);
  let oidcLoading = $state(false);
  let error = $state('');
  let email = $state('');
  let password = $state('');
  let oidcEnabled = $state(false);
  let ssoOnly = $state(false);
  let configLoaded = $state(false);

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);

    if (params.has('oidc') && params.get('oidc') === 'success') {
      oidcLoading = true;
      try {
        const user = await trpc.auth.me.query({});
        authStore.setAuth(user);
        window.history.replaceState({}, '', window.location.pathname);
        await goto(resolve('/app/profile'));
        return;
      } catch (err) {
        error = "Échec de la récupération du profil après connexion SSO.";
        window.history.replaceState({}, '', window.location.pathname);
      } finally {
        oidcLoading = false;
      }
    }

    if (params.has('error') && params.get('error') === 'oidc_failed') {
      error = "Échec de l'authentification SSO.";
      window.history.replaceState({}, '', window.location.pathname);
    }

    try {
      const res = await fetch(`${apiUrl}/auth/config`);
      const config = await res.json();
      oidcEnabled = config.oidc_enabled ?? false;
      ssoOnly = config.sso_only ?? false;
    } catch {}

    configLoaded = true;
  });

  async function handleLogin() {
    loading = true;
    error = '';
    try {
      const { user } = await trpc.auth.login.mutate({ email, password });
      authStore.setAuth(user);
      await goto(resolve('/app/profile'));
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
  <div class="hidden lg:flex lg:w-1/2 flex-col bg-foreground px-12 py-10">
    <a href={resolve('/')} class="flex items-center gap-3 mb-auto">
      <iconify-icon icon="solar:bill-list-bold-duotone" width="28" class="text-white"></iconify-icon>
      <span class="text-xl font-bold font-heading tracking-tight text-background">Ardoise</span>
    </a>

    <div class="mb-auto">
      <h2 class="text-4xl font-bold font-heading text-background leading-tight tracking-tight">
        Facturation.<br />Paiement.
      </h2>
      <p class="mt-4 text-sm text-background/50 max-w-xs leading-relaxed">
        Plateforme de facturation et de paiement pour Facile Studio.
      </p>
    </div>

    <p class="text-xs text-background/30">
      © {new Date().getFullYear()} Ardoise par Facile.
    </p>
  </div>

  <div class="flex w-full lg:w-1/2 flex-col items-center justify-center px-8 py-12 bg-background">
    <div class="w-full max-w-sm">
      <div class="mb-8">
        <h1 class="text-2xl font-bold font-heading tracking-tight text-foreground">
          Bienvenue
        </h1>
        <p class="mt-1.5 text-sm text-muted-foreground">
          Connectez-vous à votre espace client.
        </p>
      </div>

      {#if oidcLoading}
        <div class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <iconify-icon icon="svg-spinners:ring-resize" width="16"></iconify-icon>
          Connexion en cours…
        </div>
      {:else}
        {#if !ssoOnly}
          <form
            onsubmit={(e) => { e.preventDefault(); handleLogin(); }}
            class="space-y-4"
          >
            <div class="space-y-1.5">
              <label for="email" class="text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                bind:value={email}
                placeholder="vous@exemple.com"
                required
                class="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none focus:ring-2 focus:ring-ring/50 focus:border-foreground"
              />
            </div>

            <div class="space-y-1.5">
              <label for="password" class="text-sm font-medium">Mot de passe</label>
              <input
                id="password"
                type="password"
                bind:value={password}
                placeholder="••••••••"
                required
                class="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none focus:ring-2 focus:ring-ring/50 focus:border-foreground"
              />
            </div>

            {#if error}
              <p class="text-sm text-destructive">{error}</p>
            {/if}

            <button
              type="submit"
              disabled={loading || !email || !password}
              class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              {#if loading}
                <iconify-icon icon="svg-spinners:ring-resize" width="16"></iconify-icon>
              {/if}
              Se connecter
            </button>
          </form>
        {/if}

        {#if ssoOnly && error}
          <p class="text-sm text-destructive mb-4">{error}</p>
        {/if}

        {#if oidcEnabled && !ssoOnly}
          <div class="relative my-4">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t"></span>
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>
        {/if}

        {#if oidcEnabled}
          <a
            href="{apiUrl}/auth/oidc?redirect={encodeURIComponent(window.location.origin + '/login')}"
            class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <iconify-icon icon="solar:shield-keyhole-bold" width="16"></iconify-icon>
            Connexion SSO
          </a>
        {/if}
      {/if}
    </div>
  </div>
</div>
