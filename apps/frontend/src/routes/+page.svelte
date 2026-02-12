<script lang="ts">
  import { resolve } from '$app/paths';
  import authStore from '$lib/auth-store';
  import 'iconify-icon';
</script>

<div class="min-h-screen bg-[#FAF7F5] text-[#291334] font-sans selection:bg-[#FEC129] selection:text-[#291334]">
  <nav
    class="fixed top-0 w-full flex items-center justify-between px-8 py-6 z-[100] bg-[#FAF7F5]/80 backdrop-blur-md border-b border-[#291334]/10"
  >
    <div class="flex items-center gap-4">
      <img src="/logo.svg" alt="Charles" class="h-14" />
      <span class="text-4xl font-black tracking-tighter text-[#291334]">Charles</span>
    </div>

    <div class="flex items-center gap-6">
      {#if !$authStore.session}
        <a
          href={resolve('/login')}
          class="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-[#291334] px-8 py-4 hover:opacity-60 transition active:scale-95"
        >
          <iconify-icon icon="solar:login-2-bold-duotone" width="24"></iconify-icon>
          Connexion
        </a>
      {:else}
        <a
          href={resolve('/app')}
          class="flex items-center gap-3 font-black text-sm tracking-widest text-[#291334] px-8 py-4 hover:opacity-60 transition active:scale-95"
        >
          <iconify-icon icon="solar:wallet-bold" width="24"></iconify-icon>
          {$authStore.user?.role === 'ADMIN' ? 'Administration' : 'Mes factures'}
        </a>
      {/if}
    </div>
  </nav>

  <section class="relative pt-48 pb-24 px-6 flex flex-col items-center text-center">
    <span
      class="inline-block px-4 py-1.5 mb-8 text-[10px] font-black uppercase tracking-[0.2em] bg-[#FEC129]/20 text-[#291334] rounded-full"
      >Portail client</span
    >
    <h1
      class="text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] mb-10 text-balance"
    >
      <span class="text-[#FEC129]">Charles.</span>
    </h1>
    <p class="max-w-xl text-lg md:text-xl text-[#291334]/70 font-medium leading-relaxed mb-12">
      Plateforme de facturation et de paiement.
      Accédez à vos factures, effectuez vos paiements en ligne.
    </p>

    <div class="flex flex-col md:flex-row gap-4">
      {#if !$authStore.session}
        <a
          href={resolve('/login')}
          class="group px-10 py-5 bg-[#291334] text-[#FAF7F5] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-[#291334]/10"
        >
          <iconify-icon icon="solar:login-3-bold" width="22"></iconify-icon>
          Connexion
        </a>
      {:else}
        <a
          href={resolve($authStore.user?.role === 'ADMIN' ? '/admin' : '/app')}
          class="group px-10 py-5 bg-[#291334] text-[#FAF7F5] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-[#291334]/10"
        >
          <iconify-icon icon="solar:bolt-bold" width="22"></iconify-icon>
          {$authStore.user?.role === 'ADMIN' ? 'Accéder à l\'admin' : 'Mes factures'}
        </a>
      {/if}
    </div>
  </section>

  <section id="features" class="py-32 bg-[#291334] px-6 scroll-mt-24">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-16 text-center text-[#FAF7F5]">
        Fonctionnalités
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        {#each [
          {
            icon: 'solar:wallet-bold',
            title: 'Vos factures',
            desc: 'Consultez toutes vos factures en un seul endroit. Accès rapide et sécurisé.'
          },
          {
            icon: 'solar:card-bold',
            title: 'Paiement en ligne',
            desc: 'Payez vos factures en ligne avec Stripe. Rapide, simple et sécurisé.'
          },
          {
            icon: 'solar:chart-bold',
            title: 'Suivi en temps réel',
            desc: 'Suivez l\'état de vos paiements : en attente, payées, expirées.'
          }
        ] as feature (feature.title)}
          <div
            class="p-10 bg-[#FAF7F5] rounded-[40px] border border-[#FEC129]/20 shadow-sm hover:shadow-xl hover:border-[#FEC129] transition-all group"
          >
            <div
              class="w-14 h-14 bg-[#FEC129] text-[#291334] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"
            >
              <iconify-icon icon={feature.icon} width="28"></iconify-icon>
            </div>
            <h3 class="text-xl font-black mb-4 uppercase tracking-tight text-[#291334]">{feature.title}</h3>
            <p class="text-[#291334]/70 leading-relaxed font-medium">{feature.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <footer class="bg-[#FAF7F5] pt-24 pb-12 px-10">
    <div
      class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start border-t border-[#291334]/10 pt-16 gap-16"
    >
      <div class="max-w-xs">
        <div class="text-2xl font-black tracking-tighter mb-6 text-[#291334]">Charles</div>
        <p class="text-sm text-[#291334]/60 font-bold leading-relaxed">
          Plateforme de facturation et de paiement.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-16 md:gap-32">
        <div class="flex flex-col gap-5">
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#291334]/40"
            >Légal</span
          >
          <a href={resolve('/legal/privacy')} class="text-xs font-black uppercase hover:opacity-50 transition text-[#291334]"
            >Confidentialité</a
          >
          <a href={resolve('/legal/terms')} class="text-xs font-black uppercase hover:opacity-50 transition text-[#291334]"
            >Conditions</a
          >
          <a href={resolve('/legal/cookies')} class="text-xs font-black uppercase hover:opacity-50 transition text-[#291334]"
            >Cookies</a
          >
        </div>
        <div class="flex flex-col gap-5">
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#291334]/40"
            >Contact</span
          >
          <a
            href="mailto:contact@charles.app"
            class="text-xs font-black uppercase hover:opacity-50 transition text-[#291334]">Email</a
          >
        </div>
      </div>
    </div>
    <div
      class="mt-24 text-center text-[10px] font-black uppercase tracking-[0.4em] text-[#291334]/40"
    >
      &copy; {new Date().getFullYear()} Charles. Tous droits réservés.
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
