<script lang="ts">
  import authStore from '$lib/auth-store';
  import { page } from '$app/stores';
  import 'iconify-icon';

  const menuItems = [
    { label: 'Mes factures', icon: 'solar:wallet-bold', href: '/app' },
    { label: 'Profil', icon: 'solar:user-bold', href: '/app/profile' },
  ];

  $: userInitials = $authStore.user?.firstName?.[0] || 'U';
  $: userName = $authStore.user?.firstName || 'Utilisateur';
</script>

<div class="flex min-h-screen bg-[#FAF7F5]">
  <aside class="w-72 bg-[#FAF7F5] border-r border-[#291334]/10 flex flex-col sticky top-0 h-screen p-8">
    <div class="mb-12 px-2">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 flex-shrink-0">
          <img src="/logo.svg" alt="Charles" class="w-full h-full object-contain" />
        </div>
        <h1 class="text-2xl font-black tracking-tight leading-none text-[#291334]">
          Charles
        </h1>
      </div>
    </div>

    <nav class="flex-1 space-y-2">
      {#each menuItems as item (item.href)}
        <a
          href={item.href}
          class="group relative flex items-center gap-4 px-6 py-3.5 rounded-full transition-all duration-200
          {$page.url.pathname === item.href
            ? 'bg-[#291334] text-white shadow-lg shadow-[#291334]/20'
            : 'text-[#291334]/70 hover:bg-[#291334]/5 hover:text-[#291334]'}"
        >
          <iconify-icon
            icon={item.icon}
            width="22"
            class="transition-all group-hover:scale-110 {$page.url.pathname === item.href ? 'text-[#FEC129]' : ''}"
          ></iconify-icon>

          <span class="font-bold tracking-tight text-[13px]">
            {item.label}
          </span>
        </a>
      {/each}
    </nav>

    <div class="mt-auto pt-6 border-t border-[#291334]/10 space-y-3">
      <div class="relative p-4 bg-white/50 rounded-[20px] border border-[#291334]/10 transition-all duration-300 hover:border-[#FEC129] hover:bg-white/80">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-[#291334] flex items-center justify-center text-white font-black flex-shrink-0 text-xs">
            {userInitials}
          </div>
          <div class="overflow-hidden flex-1">
            <p class="text-[13px] font-black text-[#291334] truncate leading-tight">
              {userName}
            </p>
            <p class="text-[11px] font-bold text-[#291334]/50 uppercase tracking-wide">Client</p>
          </div>
        </div>
      </div>
      <a
        href="/app/settings"
        class="w-full px-4 py-3 bg-[#291334] hover:bg-[#291334]/90 text-white rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2"
      >
        <iconify-icon icon="solar:settings-bold" width="18"></iconify-icon>
        Paramètres
      </a>
    </div>
  </aside>

  <main class="flex-1 h-screen overflow-y-auto selection:bg-[#FEC129] selection:text-[#291334]">
    <slot />
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>
