<script lang="ts">
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import { logger } from '@repo/logger';
  import { Map } from '@repo/ui';
  import 'iconify-icon';

  let email = '',
    firstName = '',
    lastName = '',
    loading = false,
    message = '';

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  async function handleSubmit() {
    loading = true;
    try {
      await trpc.contact.create.mutate({ email, firstName, lastName });
      message = 'Thank you for submitting your information!';
      email = firstName = lastName = '';
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to submit contact form');
      message = 'Error submitting form. Please try again.';
    }
    loading = false;
  }
</script>

<div class="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
  <nav
    class="fixed top-0 w-full flex items-center justify-between px-8 py-6 z-[100] bg-white/80 backdrop-blur-md border-b border-neutral-100"
  >
    <div class="text-xl font-black uppercase tracking-tighter">Monorepo.</div>

    <div class="flex items-center gap-6">
      {#if !$authStore.session}
        <a
          href="/login"
          class="text-xs font-black uppercase tracking-widest hover:opacity-50 transition">Login</a
        >
        <a
          href="/register"
          class="group flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-black text-white px-6 py-3 rounded-full hover:scale-105 transition active:scale-95"
        >
          <iconify-icon icon="solar:user-plus-bold" width="16"></iconify-icon>
          Register
        </a>
      {:else}
        <a
          href="/app/profile"
          class="flex items-center gap-2 font-black text-xs uppercase tracking-widest bg-black text-white px-6 py-3 rounded-full hover:scale-105 transition"
        >
          <iconify-icon icon="solar:user-bold" width="16"></iconify-icon>
          Dashboard
        </a>
      {/if}
    </div>
  </nav>

  <section class="relative pt-48 pb-24 px-6 flex flex-col items-center text-center">
    <span
      class="inline-block px-4 py-1.5 mb-8 text-[10px] font-black uppercase tracking-[0.2em] bg-neutral-100 rounded-full"
      >V2.0 — Production Ready</span
    >
    <h1
      class="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.85] mb-10 text-balance"
    >
      Build <br /> <span class="text-neutral-300">Fast.</span> Scale <br /> Better.
    </h1>
    <p class="max-w-xl text-lg md:text-xl text-neutral-500 font-medium leading-relaxed mb-12">
      The ultimate SvelteKit + tRPC monorepo boilerplate. Designed for developers who don't want to
      waste time on configuration.
    </p>

    <div class="flex flex-col md:flex-row gap-4">
      <a
        href="/register"
        class="group px-10 py-5 bg-black text-white font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-black/10"
      >
        <iconify-icon icon="solar:bolt-bold" width="22"></iconify-icon>
        Get Started
      </a>
      <button
        on:click={() => scrollTo('features')}
        class="group px-10 py-5 bg-white text-black border border-neutral-200 font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-50 hover:border-black transition flex items-center justify-center gap-3"
      >
        <iconify-icon icon="solar:star-bold" width="22"></iconify-icon>
        Features
      </button>
    </div>
  </section>

  <section id="features" class="py-32 bg-neutral-50 px-6 scroll-mt-24">
    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      {#each [{ icon: 'solar:rocket-bold', title: 'Turbocharged', desc: 'Pre-configured Bun, Turborepo and tRPC for maximum performance.' }, { icon: 'solar:shield-keyhole-bold', title: 'Type Safety', desc: 'End-to-end type safety with Prisma and TypeScript architecture.' }, { icon: 'solar:box-bold', title: 'Shared UI', desc: 'Modular Svelte components shared across all your workspace apps.' }] as feature}
        <div
          class="p-10 bg-white rounded-[40px] border border-neutral-200/50 shadow-sm hover:shadow-xl transition-all group"
        >
          <div
            class="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"
          >
            <iconify-icon icon={feature.icon} width="28"></iconify-icon>
          </div>
          <h3 class="text-xl font-black mb-4 uppercase tracking-tight">{feature.title}</h3>
          <p class="text-neutral-500 leading-relaxed font-medium">{feature.desc}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="py-32 px-6 max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
      <div class="max-w-2xl">
        <h2 class="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6">
          Global Reach.
        </h2>
        <p class="text-neutral-500 text-xl font-medium">
          Your data, served everywhere, instantly. Powered by our distributed edge network.
        </p>
      </div>
    </div>
    <div class="rounded-[48px] overflow-hidden border-8 border-white shadow-2xl bg-neutral-100">
      <Map lat={48.8566} lon={2.3522} zoom={4} height="650px" />
    </div>
  </section>

  <section
    id="contact"
    class="py-24 px-6 bg-black text-white rounded-[48px] mx-4 mb-4 scroll-mt-12"
  >
    <div class="max-w-5xl mx-auto flex flex-col md:flex-row gap-20 items-center">
      <div class="flex-1 text-center md:text-left">
        <h2 class="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 text-balance">
          Let's <br /> Talk.
        </h2>
        <p class="text-neutral-400 text-xl font-medium">
          Ready to skip the boilerplate? Join the beta and start building today.
        </p>
      </div>

      <form on:submit|preventDefault={handleSubmit} class="w-full md:w-[450px] space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <input
            bind:value={firstName}
            placeholder="First Name"
            required
            class="w-full px-8 py-5 bg-white/10 border border-white/10 rounded-2xl focus:border-white outline-none transition placeholder:text-neutral-500 font-bold"
          />
          <input
            bind:value={lastName}
            placeholder="Last Name"
            required
            class="w-full px-8 py-5 bg-white/10 border border-white/10 rounded-2xl focus:border-white outline-none transition placeholder:text-neutral-500 font-bold"
          />
        </div>
        <input
          type="email"
          bind:value={email}
          placeholder="Email Address"
          required
          class="w-full px-8 py-5 bg-white/10 border border-white/10 rounded-2xl focus:border-white outline-none transition placeholder:text-neutral-500 font-bold"
        />
        <button
          disabled={loading}
          class="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-200 transition disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {#if loading}
            <iconify-icon icon="svg-spinners:18-dots-revolve" width="24"></iconify-icon>
            Processing...
          {:else}
            <iconify-icon icon="solar:letter-bold" width="22"></iconify-icon>
            Join the club
          {/if}
        </button>
        {#if message}
          <div
            class="mt-4 text-center text-sm font-black uppercase tracking-widest {message.includes(
              'Error'
            )
              ? 'text-red-400'
              : 'text-green-400'}"
          >
            {message}
          </div>
        {/if}
      </form>
    </div>
  </section>

  <footer class="bg-white pt-24 pb-12 px-10">
    <div
      class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start border-t border-neutral-100 pt-16 gap-16"
    >
      <div class="max-w-xs">
        <div class="text-2xl font-black uppercase tracking-tighter mb-6">Monorepo.</div>
        <p class="text-sm text-neutral-400 font-bold leading-relaxed">
          Making full-stack development as fast as it should be. Built for scale.
        </p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-16 md:gap-32">
        <div class="flex flex-col gap-5">
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300"
            >Product</span
          >
          <button
            on:click={() => scrollTo('features')}
            class="text-left text-xs font-black uppercase hover:opacity-50 transition"
            >Features</button
          >
          <a href="/pricing" class="text-xs font-black uppercase hover:opacity-50 transition"
            >Pricing</a
          >
        </div>
        <div class="flex flex-col gap-5">
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300"
            >Legal</span
          >
          <a href="/legal/privacy" class="text-xs font-black uppercase hover:opacity-50 transition"
            >Privacy</a
          >
          <a href="/legal/terms" class="text-xs font-black uppercase hover:opacity-50 transition"
            >Terms</a
          >
        </div>
        <div class="flex flex-col gap-5">
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300"
            >Social</span
          >
          <a
            href="https://github.com"
            target="_blank"
            class="text-xs font-black uppercase hover:opacity-50 transition">GitHub</a
          >
        </div>
      </div>
    </div>
    <div
      class="mt-24 text-center text-[10px] font-black uppercase tracking-[0.4em] text-neutral-300"
    >
      &copy; {new Date().getFullYear()} Monorepo Core.
    </div>
  </footer>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
    overflow-y: auto !important;
  }
  :global(body) {
    overflow: auto !important;
    height: auto !important;
  }
</style>
