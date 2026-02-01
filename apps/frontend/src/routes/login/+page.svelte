<script lang="ts">
  import { authClient } from '$lib/auth-client';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { fade, slide, scale } from 'svelte/transition';
  import type { User } from '@repo/types';

  let email = '';
  let password = '';
  let loading = false;
  let checkingAuth = true; // Pour éviter le flash du formulaire si déjà connecté
  let error = '';

  onMount(async () => {
    // 1. Check si une session existe déjà au montage
    if ($auth.session) {
      goto('/profile');
    } else {
      checkingAuth = false;
    }
  });

  async function handleLogin() {
    if (!email || !password) return;

    loading = true;
    error = '';

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.data) {
        // Mise à jour du store global
        auth.setAuth(result.data, result.data.user as User);

        // Petite pause pour laisser l'animation de succès (optionnel)
        setTimeout(() => goto('/profile'), 500);
      } else {
        error = result.error?.message || 'Identifiants incorrects.';
        loading = false;
      }
    } catch (err: any) {
      error = "Une erreur technique est survenue.";
      loading = false;
    }
  }
</script>

<main class="min-h-screen flex items-center justify-center bg-white text-slate-900 px-4">
  {#if checkingAuth}
    <div in:fade class="flex flex-col items-center gap-4">
      <iconify-icon icon="svg-spinners:ring-resize" width="32" class="text-indigo-600"></iconify-icon>
    </div>
  {:else}
    <div
      in:scale={{ duration: 400, start: 0.95 }}
      class="max-w-md w-full"
    >
      <div class="text-center mb-10">
        <div class="inline-flex p-4 rounded-2xl bg-slate-50 mb-4">
          <iconify-icon icon="solar:shield-user-bold" width="40" class="text-indigo-600"></iconify-icon>
        </div>
        <h1 class="text-3xl font-black tracking-tight">Ravi de vous revoir</h1>
        <p class="text-slate-500 mt-2 font-medium">Connectez-vous pour accéder à votre espace</p>
      </div>

      <form on:submit|preventDefault={handleLogin} class="space-y-5">
        <div class="space-y-1">
          <label for="email" class="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="nom@exemple.com"
            required
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:border-transparent transition-all outline-none"
          />
        </div>

        <div class="space-y-1">
          <label for="password" class="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mot de passe</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="••••••••"
            required
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:border-transparent transition-all outline-none"
          />
        </div>

        {#if error}
          <div in:slide={{ duration: 200 }} class="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2">
            <iconify-icon icon="solar:danger-triangle-bold" width="18"></iconify-icon>
            {error}
          </div>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {#if loading}
            <iconify-icon icon="svg-spinners:18-dots-revolve" width="20"></iconify-icon>
            Vérification...
          {:else}
            <iconify-icon icon="solar:login-3-bold" width="20"></iconify-icon>
            Se connecter
          {/if}
        </button>

        <div class="pt-4 text-center">
          <p class="text-sm text-slate-500 font-medium">
            Pas encore de compte ?
            <a href="/register" class="text-indigo-600 font-bold hover:underline underline-offset-4 ml-1">Créer un compte</a>
          </p>
        </div>
      </form>
    </div>
  {/if}
</main>
