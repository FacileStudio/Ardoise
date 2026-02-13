<script lang="ts">
  import 'iconify-icon';
  export let items: { label: string; icon: string; href: string }[] = [];
  export let activeHref = '/';
  export let resolvePath: (path: string) => string = (path) => path;
  export let logoPath = '/logo.svg';
  export let showLogo = true;
</script>

<aside
  class="w-72 h-screen sticky top-0 bg-[#FAF7F5] border-r border-[#291334]/10 p-8 flex flex-col"
>
  <div class="mb-12 px-2">
    <div class="flex items-center gap-2">
      {#if showLogo}
        <div class="w-12 h-12 min-w-[2.75rem] min-h-[2.75rem] max-w-[2.75rem] max-h-[2.75rem] flex-shrink-0 overflow-hidden">
          <img src={logoPath} alt="Charles Logo" class="w-full h-full object-contain" />
        </div>
      {/if}
      <h1 class="text-4xl font-black tracking-tight leading-none text-[#291334]">
        Charles
      </h1>
    </div>
  </div>

  <nav class="flex-1 space-y-2">
    {#each items as item (item.href)}
      <!-- eslint-disable svelte/no-navigation-without-resolve -->
      <a
        href={resolvePath(item.href)}
        data-sveltekit-reload
        class="group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200
        {activeHref === item.href
          ? 'bg-[#291334] text-white shadow-lg shadow-[#291334]/20'
          : 'text-[#291334]/70 hover:bg-[#291334]/5 hover:text-[#291334]'}"
      >
        <iconify-icon
          icon={item.icon}
          width="22"
          class="transition-all group-hover:scale-110 {activeHref === item.href ? 'text-[#FEC129]' : ''}"
        ></iconify-icon>

        <span class="font-bold tracking-tight text-[13px]">
          {item.label}
        </span>

        {#if activeHref === item.href}
          <div class="ml-auto w-1.5 h-1.5 rounded-full bg-[#FEC129]"></div>
        {/if}
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    {/each}
  </nav>

  <div class="mt-auto pt-6 border-t border-[#291334]/10">
    <div
      class="relative p-4 bg-white/50 rounded-[20px] border border-[#291334]/10 transition-all duration-300 hover:border-[#FEC129] hover:bg-white/80 group"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-11 h-11 rounded-xl bg-white border border-[#291334]/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm"
        >
          <slot name="user-avatar" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-black text-[#291334] truncate leading-tight">
            <slot name="user-name" />
          </p>
          <p class="text-[11px] font-bold text-[#291334]/50 uppercase tracking-wide">Admin</p>
        </div>

        <div class="text-[#291334]/30 group-hover:text-[#FEC129] transition-colors">
          <iconify-icon icon="solar:alt-arrow-right-bold" width="18"></iconify-icon>
        </div>
      </div>

      <!-- eslint-disable svelte/no-navigation-without-resolve -->
      <a href={resolvePath('/app/profile')} data-sveltekit-reload class="absolute inset-0 z-10" aria-label="View Profile"></a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    </div>
  </div>
</aside>

<style>
  :global(body) {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>
