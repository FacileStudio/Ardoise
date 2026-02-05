<script lang="ts">
  import authStore from '$lib/auth-store';
  import { goto } from '$app/navigation';
  import { fly, fade } from 'svelte/transition';
  import type { User } from '@repo/types';
  import { trpc } from '$lib/trpc';
  import 'iconify-icon';

  let step = 1;
  let email = '',
    password = '',
    confirmPassword = '',
    firstName = '',
    lastName = '';
  let loading = false;
  let error = '';

  const nextStep = () => {
    if (step === 1 && firstName && lastName) step = 2;
    else if (step === 2 && email) step = 3;
  };

  const prevStep = () => (step > 1 ? step-- : goto('/login'));

  async function handleRegister() {
    if (password !== confirmPassword) {
      error = 'Passwords do not match.';
      return;
    }
    loading = true;
    error = '';
    try {
      const { token, user } = await trpc.auth.register.mutate({
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
      });
      authStore.setAuth({ token }, user as User);
      await goto('/app/profile');
    } catch (err: any) {
      error = err.message || 'Initialization failed.';
      loading = false;
    }
  }

  const inputClass =
    'text-3xl md:text-5xl font-bold bg-transparent border-b-4 border-neutral-300 outline-none py-6 transition-all focus:border-black placeholder:text-neutral-300 focus:placeholder:text-neutral-200 w-full';
  const btnClass =
    'mt-16 px-12 py-6 bg-black text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-black/10 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:scale-105 hover:enabled:bg-neutral-800 active:enabled:scale-95';
</script>

<main
  class="h-screen w-full bg-white text-black font-sans overflow-hidden flex flex-col selection:bg-black selection:text-white"
>
  <div class="fixed top-0 left-0 w-full h-1.5 bg-neutral-200 z-[100]">
    <div
      class="h-full bg-black transition-all duration-700 ease-in-out"
      style="width: {(step / 3) * 100}%"
    ></div>
  </div>

  <nav class="p-8 flex justify-between items-center relative z-10">
    <button
      on:click={prevStep}
      class="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-50 transition"
    >
      <iconify-icon
        icon="solar:arrow-left-bold"
        width="16"
        class="group-hover:-translate-x-1 transition-transform"
      ></iconify-icon>
      {step === 1 ? 'Back to Login' : 'Previous'}
    </button>
    <div class="text-xl font-black uppercase tracking-tighter">Monorepo.</div>
  </nav>

  <div class="flex-1 flex items-center justify-center px-6 relative">
    {#if step === 1}
      <form
        on:submit|preventDefault={nextStep}
        in:fly={{ x: 40, duration: 600 }}
        out:fly={{ x: -40, duration: 400 }}
        class="max-w-2xl w-full"
      >
        <span
          class="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-4 block underline decoration-black underline-offset-4 decoration-2"
          >01 — Identity</span
        >
        <h2
          class="text-6xl md:text-[120px] font-black uppercase tracking-tighter leading-[0.85] mb-12"
        >
          Personal <br /> <span class="text-neutral-400">Information.</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <input
            bind:value={firstName}
            placeholder="First Name"
            class={inputClass}
            required
            autofocus
          />
          <input bind:value={lastName} placeholder="Last Name" class={inputClass} required />
        </div>
        <button type="submit" disabled={!firstName || !lastName} class={btnClass}>
          Continue
        </button>
      </form>
    {:else if step === 2}
      <form
        on:submit|preventDefault={nextStep}
        in:fly={{ x: 40, duration: 600 }}
        out:fly={{ x: -40, duration: 400 }}
        class="max-w-2xl w-full"
      >
        <span
          class="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-4 block underline decoration-black underline-offset-4 decoration-2"
          >02 — Contact</span
        >
        <h2
          class="text-6xl md:text-[120px] font-black uppercase tracking-tighter leading-[0.85] mb-12"
        >
          Email <br /> <span class="text-neutral-400">Address.</span>
        </h2>
        <input
          type="email"
          bind:value={email}
          placeholder="name@company.com"
          class={inputClass}
          required
          autofocus
        />
        <button type="submit" disabled={!email} class={btnClass}> Continue </button>
      </form>
    {:else if step === 3}
      <form
        on:submit|preventDefault={handleRegister}
        in:fly={{ x: 40, duration: 600 }}
        out:fly={{ x: -40, duration: 400 }}
        class="max-w-2xl w-full"
      >
        <span
          class="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-4 block underline decoration-black underline-offset-4 decoration-2"
          >03 — Security</span
        >
        <h2
          class="text-6xl md:text-[120px] font-black uppercase tracking-tighter leading-[0.85] mb-12"
        >
          Secure <br /> <span class="text-neutral-400">Password.</span>
        </h2>
        <div class="space-y-8">
          <input
            type="password"
            bind:value={password}
            placeholder="Password"
            class={inputClass}
            required
            autofocus
          />
          <input
            type="password"
            bind:value={confirmPassword}
            placeholder="Confirm Password"
            class={inputClass}
            required
          />
        </div>

        {#if error}
          <div
            class="mt-6 flex items-center gap-2 text-white font-black uppercase text-[10px] tracking-widest bg-black p-4 rounded-xl"
            in:fade
          >
            <iconify-icon icon="solar:danger-bold" width="16"></iconify-icon>
            {error}
          </div>
        {/if}

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          class="{btnClass} w-full md:w-auto flex items-center justify-center gap-4"
        >
          {#if loading}
            <iconify-icon icon="svg-spinners:18-dots-revolve" width="24"></iconify-icon>
            Processing...
          {:else}
            Create Account
          {/if}
        </button>
      </form>
    {/if}
  </div>

  <div
    class="fixed bottom-0 right-0 p-12 pointer-events-none opacity-[0.03] select-none hidden md:block"
  >
    <div class="text-[25vh] font-black uppercase tracking-tighter leading-none translate-y-1/3">
      JOIN.
    </div>
  </div>
</main>

<style>
  :global(body) {
    overflow: hidden;
    background: white;
  }
  input::placeholder {
    opacity: 1;
  }
</style>
