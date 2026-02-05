<script lang="ts">
  import authStore from '$lib/auth-store';
  import { goto } from '$app/navigation';
  import { scale } from 'svelte/transition';
  import type { User } from '@repo/types';
  import { trpc } from '$lib/trpc';
  import { Button, Input, Alert } from '@repo/ui';

  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  async function handleLogin() {
    if (!email || !password || loading) return;

    loading = true;
    error = '';

    try {
      const { token, user } = await trpc.auth.login.mutate({
        email,
        password,
      });

      authStore.setAuth({ token }, user as User);

      await goto('/app/profile');
    } catch (err: any) {
      error = err.message || "Une erreur technique est survenue.";
      loading = false;
    }
  }</script>

<main class="min-h-screen flex items-center justify-center bg-white text-slate-900 px-4">
    <div in:scale={{ duration: 400, start: 0.95 }} class="max-w-md w-full">
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
          <Input
            id="email"
            type="email"
            bind:value={email}
            autocomplete="email"
            placeholder="nom@exemple.com"
            required
          />
        </div>

        <div class="space-y-1">
          <label for="password" class="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mot de passe</label>
          <Input
            id="password"
            type="password"
            bind:value={password}
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        {#if error}
          <Alert variant="danger">{error}</Alert>
        {/if}

        <Button
          type="submit"
          disabled={loading}
          class="w-full"
        >
          {#if loading}
            <iconify-icon icon="svg-spinners:18-dots-revolve" width="20"></iconify-icon>
            Vérification...
          {:else}
            <iconify-icon icon="solar:login-3-bold" width="20"></iconify-icon>
            Se connecter
          {/if}
        </Button>

        <div class="pt-4 text-center">
          <p class="text-sm text-slate-500 font-medium">
            Pas encore de compte ?
            <a href="/register" class="text-indigo-600 font-bold hover:underline underline-offset-4 ml-1">Créer un compte</a>
          </p>
        </div>
      </form>
    </div>
</main>
