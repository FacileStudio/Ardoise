<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import env from '$lib/env';
  import { isAdmin, type SessionUser } from '@repo/auth-shared';
  import { Alert, Button, Field, Input } from '@facile/muse';
  import { i18n } from '@repo/i18n/svelte';
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
  let configLoaded = $state(false);
  let passwordLogin = $state(true);
  let clientMagicLink = $state(true);
  let audience = $state<'client' | 'staff'>('client');
  let linkSending = $state(false);
  let linkSent = $state(false);
  let linkError = $state('');

  const ssoErrors: Record<string, string> = {
    oidc_failed: "Échec de l'authentification SSO.",
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
      passwordLogin = config.password_login ?? true;
      clientMagicLink = config.client_magic_link ?? true;
    } catch { /* noop */ }

    if (!clientMagicLink || ssoError) audience = 'staff';
    configLoaded = true;
  });

  async function requestLink() {
    linkSending = true;
    linkError = '';
    try {
      await trpc.magicLink.request.mutate({ email: email.trim() });
      linkSent = true;
    } catch (err) {
      const limited = (err as { meta?: { response?: { status?: number } } })?.meta?.response?.status === 429;
      linkError = $i18n.t(limited ? 'auth.magicLink.rateLimited' : 'auth.magicLink.requestFailed');
    } finally {
      linkSending = false;
    }
  }

  function showAudience(next: 'client' | 'staff') {
    audience = next;
    error = '';
    linkError = '';
    linkSent = false;
  }

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

        {#if audience === 'client'}
          {#if linkSent}
            <div class="space-y-4">
              <h2 class="text-lg font-semibold font-heading text-foreground">
                {$i18n.t('auth.magicLink.sentTitle')}
              </h2>
              <p class="text-sm text-muted-foreground">
                {$i18n.t('auth.magicLink.sentBody', { email: email.trim() })}
              </p>
              <Button variant="ghost" size="lg" onclick={() => (linkSent = false)}>
                {$i18n.t('auth.magicLink.sentRetry')}
              </Button>
            </div>
          {:else}
            <form
              onsubmit={(e) => { e.preventDefault(); requestLink(); }}
              class="space-y-4"
            >
              <p class="text-sm text-muted-foreground">{$i18n.t('auth.magicLink.clientHint')}</p>
              {#if linkError}
                <Alert tone="danger">{linkError}</Alert>
              {/if}
              <Field label={$i18n.t('auth.magicLink.emailLabel')}>
                <Input
                  type="email"
                  bind:value={email}
                  placeholder="vous@exemple.com"
                  autocomplete="email"
                  required
                  disabled={linkSending}
                />
              </Field>
              <Button type="submit" size="lg" class="w-full" disabled={linkSending || !email.trim()}>
                {linkSending ? $i18n.t('auth.magicLink.sending') : $i18n.t('auth.magicLink.submit')}
              </Button>
            </form>
          {/if}
        {:else}
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
            {#if passwordLogin}
              <div class="my-6 flex items-center gap-3">
                <span class="h-px flex-1 bg-border"></span>
                <span class="text-xs text-muted-foreground">ou</span>
                <span class="h-px flex-1 bg-border"></span>
              </div>
            {/if}
          {/if}

          {#if passwordLogin}
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
        {/if}

        {#if clientMagicLink && (oidcEnabled || passwordLogin)}
          <p class="mt-8 text-center text-sm text-muted-foreground">
            {#if audience === 'client'}
              <button type="button" class="inline-flex min-h-11 items-center px-3 font-medium underline" onclick={() => showAudience('staff')}>
                {$i18n.t('auth.magicLink.staffLink')}
              </button>
            {:else}
              <button type="button" class="inline-flex min-h-11 items-center px-3 font-medium underline" onclick={() => showAudience('client')}>
                {$i18n.t('auth.magicLink.clientLink')}
              </button>
            {/if}
          </p>
        {/if}
      {/if}
    </div>
  </div>
</div>
