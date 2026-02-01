<script lang="ts">
  import { authClient } from '$lib/auth-client';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { fade, slide, scale } from 'svelte/transition';
  import type { User } from '@repo/types';

  let email = '';
  let password = '';
  let firstName = '';
  let lastName = '';
  let loading = false;
  let checkingAuth = true;
  let error = '';

  onMount(async () => {
    if ($auth.session) {
      goto('/profile');
    } else {
      checkingAuth = false;
    }
  });

  async function handleRegister() {
    if (!email || !password || !firstName) return;

    loading = true;
    error = '';

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
      });

      if (result.data) {
        auth.setAuth({ token: result.data.token }, result.data.user as User);
        setTimeout(() => goto('/profile'), 500);
      } else {
        error = result.error?.message || 'Une erreur est survenue lors de l\'inscription.';
        loading = false;
      }
    } catch (err: any) {
      error = "Impossible de créer le compte. Vérifiez vos informations.";
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
      class="max-w-md w-full py-12"
    >
      <div class="text-center mb-10">
        <div class="inline-flex p-4 rounded-2xl bg-indigo-50 mb-4">
          <iconify-icon icon="solar:user-plus-bold" width="40" class="text-indigo-600"></iconify-icon>
        </div>
        <h1 class="text-3xl font-black tracking-tight">Créer un compte</h1>
        <p class="text-slate-500 mt-2 font-medium">Rejoignez l'aventure en quelques secondes</p>
      </div>

      <form on:submit|preventDefault={handleRegister} class="space-y-5">

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="firstName" class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Prénom</label>
            <input
              id="firstName"
              type="text"
              bind:value={firstName}
              placeholder="Jean"
              required
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none"
            />
          </div>
          <div class="space-y-1">
            <label for="lastName" class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Nom</label>
            <input
              id="lastName"
              type="text"
              bind:value={lastName}
              placeholder="Dupont"
              required
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label for="email" class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="jean@exemple.com"
            required
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none"
          />
        </div>

        <div class="space-y-1">
          <label for="password" class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Mot de passe</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="••••••••"
            required
            minlength="6"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none"
          />
          <p class="text-[10px] text-slate-400 ml-1 italic">6 caractères minimum</p>
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
          class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-slate-100 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {#if loading}
            <iconify-icon icon="svg-spinners:18-dots-revolve" width="20"></iconify-icon>
            Création du compte...
          {:else}
            <iconify-icon icon="solar:user-plus-bold" width="20"></iconify-icon>
            S'inscrire
          {/if}
        </button>

        <div class="pt-4 text-center">
          <p class="text-sm text-slate-500 font-medium">
            Déjà un compte ?
            <a href="/login" class="text-indigo-600 font-bold hover:underline underline-offset-4 ml-1">Se connecter</a>
          </p>
        </div>
      </form>
    </div>
  {/if}
</main>
