<script lang="ts">
  import 'iconify-icon';
  export let items: { label: string; icon: string; href: string }[] = [];
  export let activeHref = '/';
  export let resolvePath: (path: string) => string = (path) => path;
  export let logoPath = '/logo.svg';
  export let showLogo = true;
</script>

<aside
  class="w-60 h-screen sticky top-0 bg-background border-r border-border p-6 flex flex-col"
>
  <div class="mb-10 px-2">
    <div class="flex items-center gap-2">
      {#if showLogo}
        <div class="w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] max-w-[2.5rem] max-h-[2.5rem] flex-shrink-0 overflow-hidden">
          <img src={logoPath} alt="Charles Logo" class="w-full h-full object-contain" />
        </div>
      {/if}
      <h1 class="text-2xl font-bold tracking-tight leading-none text-foreground">
        Charles
      </h1>
    </div>
  </div>

  <nav class="flex-1 space-y-1">
    {#each items as item (item.href)}
      <!-- eslint-disable svelte/no-navigation-without-resolve -->
      <a
        href={resolvePath(item.href)}
        data-sveltekit-reload
        class="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
        {activeHref === item.href
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
      >
        <iconify-icon
          icon={item.icon}
          width="20"
          class="transition-all"
        ></iconify-icon>

        <span class="font-medium text-sm">
          {item.label}
        </span>
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    {/each}
  </nav>

  <div class="mt-auto pt-6 border-t border-border">
    <div
      class="relative p-3 bg-muted rounded-lg border border-border transition-all duration-300 hover:bg-accent group"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-background border border-border overflow-hidden flex-shrink-0 flex items-center justify-center"
        >
          <slot name="user-avatar" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-foreground truncate leading-tight">
            <slot name="user-name" />
          </p>
          <p class="text-xs text-muted-foreground">Admin</p>
        </div>

        <div class="text-muted-foreground group-hover:text-foreground transition-colors">
          <iconify-icon icon="solar:alt-arrow-right-bold" width="18"></iconify-icon>
        </div>
      </div>

      <!-- eslint-disable svelte/no-navigation-without-resolve -->
      <a href={resolvePath('/app/profile')} data-sveltekit-reload class="absolute inset-0 z-10" aria-label="View Profile"></a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    </div>
  </div>
</aside>
