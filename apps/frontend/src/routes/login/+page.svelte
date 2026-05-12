<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import 'iconify-icon';

  let loading = $state(false);
  let error = $state('');
  let email = $state('');
  let password = $state('');

  async function handleLogin() {
    loading = true;
    error = '';
    try {
      const { token, user } = await trpc.auth.login.mutate({ email, password });
      authStore.setAuth({ token }, user);
      await goto(resolve('/app/profile'));
    } catch (err) {
      error = err instanceof Error ? err.message : "Échec de l'authentification.";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Connexion — Charles</title>
</svelte:head>

<div class="flex min-h-screen">
  <div class="hidden lg:flex lg:w-1/2 flex-col bg-foreground px-12 py-10">
    <a href={resolve('/')} class="flex items-center gap-3 mb-auto">
      <img class="w-7 invert" src="/logo.svg" alt="Charles" />
      <span class="text-xl font-bold font-heading tracking-tight text-background">Charles</span>
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
      © {new Date().getFullYear()} Charles par Facile.
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
    </div>
  </div>
</div>
