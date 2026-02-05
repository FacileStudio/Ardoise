<script lang="ts">
  import { goto } from '$app/navigation';
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
      await goto('/app/profile');
    } catch (err: any) {
      error = err.message || 'Authentication failed.';
      loading = false;
    }
  }

  const inputClass =
    'text-2xl md:text-4xl font-bold bg-transparent border-b-2 border-neutral-300 focus:border-black outline-none py-4 transition-all placeholder:text-neutral-300 focus:placeholder:text-neutral-200 w-full';
  const btnClass =
    'px-12 py-5 bg-black text-white font-black uppercase tracking-widest rounded-2xl disabled:opacity-20 transition-all hover:enabled:scale-105 active:enabled:scale-95 shadow-xl shadow-black/5 flex items-center justify-center gap-3';
</script>

<main
  class="h-screen w-full bg-white text-black font-sans overflow-hidden flex flex-col selection:bg-black selection:text-white"
>
  <nav class="p-8 flex justify-between items-center relative z-10">
    <a
      href="/"
      class="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-50 transition"
    >
      <iconify-icon
        icon="solar:arrow-left-bold"
        width="16"
        class="group-hover:-translate-x-1 transition-transform"
      ></iconify-icon>
      Home
    </a>
    <div class="text-xl font-black uppercase tracking-tighter">Monorepo.</div>
  </nav>

  <div class="flex-1 flex items-center justify-center px-6 relative">
    <form
      on:submit|preventDefault={handleLogin}
      in:fly={{ y: 20, duration: 600 }}
      class="max-w-xl w-full"
    >
      <span
        class="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-4 block underline underline-offset-8 decoration-2"
        >Access Portal</span
      >

      <h2 class="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-12">
        Welcome <br /> <span class="text-neutral-300">Back.</span>
      </h2>

      <div class="space-y-8">
        <input
          type="email"
          bind:value={email}
          placeholder="Email Address"
          class={inputClass}
          required
          autofocus
        />
        <input
          type="password"
          bind:value={password}
          placeholder="Password"
          class={inputClass}
          required
        />
      </div>

      {#if error}
        <div class="mt-6 p-4 bg-black text-white rounded-xl flex items-center gap-3" in:fade>
          <iconify-icon icon="solar:danger-triangle-bold" width="20"></iconify-icon>
          <span class="text-[10px] font-black uppercase tracking-widest">{error}</span>
        </div>
      {/if}

      <div class="flex flex-col md:flex-row items-center gap-10 mt-12">
        <button type="submit" disabled={loading || !email || !password} class={btnClass}>
          {#if loading}
            <iconify-icon icon="svg-spinners:18-dots-revolve" width="24"></iconify-icon>
            Verifying...
          {:else}
            <iconify-icon icon="solar:login-3-bold" width="22"></iconify-icon>
            Sign In
          {/if}
        </button>

        <a
          href="/register"
          class="text-xs font-black uppercase tracking-[0.2em] hover:underline underline-offset-8 decoration-2 transition-all"
        >
          Create Account
        </a>
      </div>
    </form>
  </div>

  <div class="fixed bottom-0 right-0 p-12 pointer-events-none overflow-hidden hidden md:block">
    <div
      class="text-[20vh] font-black uppercase tracking-tighter leading-none opacity-[0.03] select-none translate-y-1/4"
    >
      Login.
    </div>
  </div>
</main>

<style>
  :global(body) {
    overflow: hidden;
  }
  input::placeholder {
    opacity: 1;
  }
</style>
