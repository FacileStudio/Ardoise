<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { fly, fade } from 'svelte/transition';
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import 'iconify-icon';

  let loading = false;
  let error = '';
  let email = '';
  let password = '';

  async function handleLogin() {
    loading = true;
    error = '';
    try {
      const { token, user } = await trpc.auth.login.mutate({ email, password });
      authStore.setAuth({ token }, user);
      await goto(resolve('/app/profile'));
    } catch (err) {
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
  <nav class="p-8 flex justify-between items-center relative z-10">
    <a
      href={resolve('/')}
      class="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-50 transition"
    >
      <iconify-icon
        icon="solar:arrow-left-bold"
        width="16"
        class="group-hover:-translate-x-1 transition-transform"
      ></iconify-icon>
      Retour
    </a>
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
        class="inline-block px-4 py-1.5 mb-8 text-[10px] font-black uppercase tracking-[0.2em] bg-[#FEC129]/20 text-[#291334] rounded-full"
        >Espace de connexion</span
      >

      <h2 class="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-12">
        Connexion <br /> <span class="text-[#FEC129]">client.</span>
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
            <iconify-icon icon="solar:login-3-bold" width="22"></iconify-icon>
            Se connecter
          {/if}
        </button>
      </div>
    </form>
  </div>

  <div class="fixed bottom-0 right-0 p-12 pointer-events-none overflow-hidden hidden md:block">
    <div
      class="text-[20vh] font-black uppercase tracking-tighter leading-none opacity-[0.03] select-none translate-y-1/4 text-[#291334]"
    >
      Login.
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
