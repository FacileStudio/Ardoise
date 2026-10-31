<script lang="ts">
  import { resolve } from '$app/paths';
  import authStore from '$lib/auth-store';
  import { page } from '$app/stores';
  import 'iconify-icon';

  const menuItems = [
    { label: 'Mes factures', icon: 'solar:wallet-linear', href: '/app' },
    { label: 'Profil', icon: 'solar:user-linear', href: '/app/profile' },
  ] as const;

  $: userInitials = $authStore.user?.firstName?.[0] || 'U';
  $: userName = $authStore.user?.firstName || 'Utilisateur';
</script>

<div class="flex h-screen w-full overflow-hidden">
  <aside class="sticky top-0 flex h-screen w-60 flex-col border-r border-border bg-background">
    <div class="flex items-center gap-3 px-5 pt-8 pb-6">
      <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center">
        <iconify-icon icon="solar:bill-list-bold-duotone" width="28" class="text-foreground"></iconify-icon>
      </div>
      <h1 class="text-2xl font-bold font-heading tracking-tight text-foreground">
        Ardoise
      </h1>
    </div>

    <nav class="flex-1 space-y-1 px-3">
      {#each menuItems as item (item.href)}
        <a
          href={resolve(item.href)}
          class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors
          {$page.url.pathname === item.href
            ? 'bg-foreground text-background font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
        >
          <iconify-icon icon={item.icon} width="20"></iconify-icon>
          <span>{item.label}</span>
        </a>
      {/each}
    </nav>

    <div class="mt-auto border-t border-border px-3 py-4 space-y-3">
      <div class="flex items-center gap-3 px-2">
        {#if $authStore.user?.avatarUrl}
          <img
            src={$authStore.user.avatarUrl}
            alt={userName}
            class="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        {:else}
          <div class="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background text-xs font-medium flex-shrink-0">
            {userInitials}
          </div>
        {/if}
        <div class="overflow-hidden flex-1">
          <p class="text-sm font-medium text-foreground truncate">
            {userName}
          </p>
          <p class="text-xs text-muted-foreground">Client</p>
        </div>
      </div>
      <a
        href={resolve('/app/settings')}
        class="w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-2"
      >
        <iconify-icon icon="solar:settings-linear" width="16"></iconify-icon>
        Paramètres
      </a>
    </div>
  </aside>

  <main class="flex-1 overflow-auto">
    <slot />
  </main>
</div>
