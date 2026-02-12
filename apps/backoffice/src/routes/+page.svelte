<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { fly, fade } from 'svelte/transition';
  import authStore from '$lib/auth-store';
  import { trpc } from '$lib/trpc';
  import { isAdmin, loginSchema, type SessionUser } from '@repo/auth-shared';
  import { logger } from '@repo/logger';
  import 'iconify-icon';

  let loading = false;
  let error = '';
  let email = '';
  let password = '';

  async function handleLogin() {
    loading = true;
    error = '';

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      error = validation.error.issues[0].message;
      loading = false;
      return;
    }

    try {
      const { token, user } = await trpc.auth.login.mutate({ email, password });

      if (!isAdmin(user as SessionUser)) {
        error = "Accès refusé : espace réservé aux administrateurs.";
        loading = false;
        return;
      }

      authStore.setAuth({ token }, user as SessionUser);
      await goto(resolve('/admin/contacts'));
    } catch (err) {
      logger.error({ err }, 'Login error');
      error = err instanceof Error ? err.message : 'Échec de l\'authentification.';
      loading = false;
    }
  }

  const inputClass =
    'text-xl md:text-2xl font-bold bg-transparent border-b-2 border-[#291334]/20 focus:border-[#FEC129] outline-none py-4 transition-all placeholder:text-[#291334]/30 focus:placeholder:text-[#291334]/20 w-full text-[#291334]';
  const btnClass =
    'px-12 py-5 bg-[#291334] text-[#FAF7F5] font-black uppercase tracking-widest rounded-2xl disabled:opacity-20 transition-all hover:enabled:scale-105 active:enabled:scale-95 shadow-xl shadow-[#291334]/10 flex items-center justify-center gap-3';
</script>

<main
  class="min-h-screen w-full bg-[#FAF7F5] text-[#291334] font-sans flex flex-col selection:bg-[#FEC129] selection:text-[#291334]"
>
  <nav class="p-8 flex justify-center items-center relative z-10">
    <div class="flex items-center gap-3">
      <img src="/logo.svg" alt="Charles" class="h-6" />
      <span class="text-xl font-black tracking-tighter text-[#291334]">Charles</span>
    </div>
  </nav>

  <div class="flex-1 flex items-center justify-center px-6 py-12 relative">
    <form
      on:submit|preventDefault={handleLogin}
      in:fly={{ y: 20, duration: 600 }}
      class="max-w-xl w-full"
    >
      <span
        class="inline-block px-4 py-1.5 mb-8 text-[10px] font-black uppercase tracking-[0.2em] bg-[#291334]/10 text-[#291334] rounded-full"
        >Espace administrateur</span
      >

      <h2 class="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-12">
        Connexion <br /> <span class="text-[#291334]">admin.</span>
      </h2>

      <div class="space-y-8">
        <input
          type="email"
          bind:value={email}
          placeholder="Adresse email"
          class={inputClass}
          required
        />
        <input
          type="password"
          bind:value={password}
          placeholder="Mot de passe"
          class={inputClass}
          required
        />
      </div>

      {#if error}
        <div class="mt-6 p-4 bg-[#291334] text-[#FAF7F5] rounded-xl flex items-center gap-3" in:fade>
          <iconify-icon icon="solar:danger-triangle-bold" width="20"></iconify-icon>
          <span class="text-[10px] font-black uppercase tracking-widest">{error}</span>
        </div>
      {/if}

      <div class="flex flex-col md:flex-row items-center gap-6 mt-12">
        <button type="submit" disabled={loading || !email || !password} class={btnClass}>
          {#if loading}
            <iconify-icon icon="svg-spinners:18-dots-revolve" width="24"></iconify-icon>
            Connexion...
          {:else}
            <iconify-icon icon="solar:shield-keyhole-bold" width="22"></iconify-icon>
            Accès admin
          {/if}
        </button>
      </div>
    </form>
  </div>

  <div class="fixed bottom-0 right-0 p-12 pointer-events-none overflow-hidden hidden md:block">
    <div
      class="text-[20vh] font-black uppercase tracking-tighter leading-none opacity-[0.03] select-none translate-y-1/4 text-[#291334]"
    >
      Admin.
    </div>
  </div>
</main>

<style>
  :global(html) {
    scroll-behavior: smooth;
    overflow-y: auto !important;
  }
  :global(body) {
    overflow: auto !important;
    height: auto !important;
  }
  input::placeholder {
    opacity: 1;
  }
</style>
