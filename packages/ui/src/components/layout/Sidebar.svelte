<script lang="ts">
  import 'iconify-icon';
  export let items: { label: string; icon: string; href: string }[] = [];
  export let activeHref = '/';
</script>

<aside
  class="w-72 h-screen sticky top-0 bg-white border-r-2 border-neutral-100 p-8 flex flex-col selection:bg-black selection:text-white"
>
  <div class="mb-12 px-2">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
        <div class="w-3.5 h-3.5 bg-white rotate-45"></div>
      </div>
      <h1 class="text-xl font-black tracking-tight uppercase leading-none text-black">
        Mono<span class="text-neutral-400">Repo</span>
      </h1>
    </div>
  </div>

  <nav class="flex-1 space-y-2">
    {#each items as item (item.href)}
      <a
        href={item.href}
        data-sveltekit-reload
        class="group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200
        {activeHref === item.href
          ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-200'
          : 'text-neutral-600 hover:bg-neutral-50 hover:text-black'}"
      >
        <iconify-icon icon={item.icon} width="24" class="transition-transform group-hover:scale-110"
        ></iconify-icon>

        <span class="font-bold tracking-tight text-[13px]">
          {item.label}
        </span>
      </a>
    {/each}
  </nav>

  <div class="mt-auto pt-6 border-t border-neutral-50">
    <div
      class="relative p-4 bg-neutral-50 rounded-[24px] border border-neutral-100 transition-all duration-300 hover:border-black group"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-11 h-11 rounded-xl bg-white border border-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm"
        >
          <slot name="user-avatar" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-black text-black truncate leading-tight">
            <slot name="user-name" />
          </p>
          <p class="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">Operator</p>
        </div>

        <div class="text-neutral-300 group-hover:text-black transition-colors">
          <iconify-icon icon="solar:alt-arrow-right-bold" width="18"></iconify-icon>
        </div>
      </div>

      <a href="/app/profile" data-sveltekit-reload class="absolute inset-0 z-10" aria-label="View Profile"></a>
    </div>
  </div>
</aside>

<style>
  :global(body) {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>
