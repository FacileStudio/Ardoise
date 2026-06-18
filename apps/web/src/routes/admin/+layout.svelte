<script lang="ts">
    import authStore from '$lib/auth-store';
    import { page } from '$app/stores';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import SpaceSwitcher from '$lib/components/SpaceSwitcher.svelte';
    import MobileNav from '$lib/components/MobileNav.svelte';
    import 'iconify-icon';

    const navLinks = [
        { label: $i18n.t('nav.documents'), icon: 'solar:document-linear', href: '/admin/documents' },
        { label: $i18n.t('nav.clients'), icon: 'solar:users-group-two-rounded-linear', href: '/admin/clients' },
        { label: $i18n.t('nav.payments'), icon: 'solar:wallet-linear', href: '/admin/payments' },
        { label: 'Prestataires', icon: 'solar:buildings-linear', href: '/admin/prestataires' },
        { label: $i18n.t('nav.spaces'), icon: 'solar:users-group-rounded-linear', href: '/admin/spaces' },
        { label: 'Paramètres', icon: 'solar:settings-linear', href: '/admin/settings' },
    ];

    function isActive(href: string) {
        return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
    }

    function getInitials(name: string | undefined) {
        if (!name) return 'A';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }
</script>

<div class="flex h-[100dvh] w-full overflow-hidden">
    <aside class="sticky top-0 hidden h-[100dvh] w-60 flex-col border-r bg-background md:flex">
        <div class="flex items-center gap-3 px-5 pt-8 pb-4">
            <iconify-icon icon="solar:document-bold-duotone" width="28" class="text-foreground"></iconify-icon>
            <span class="text-2xl font-bold font-heading tracking-tight">Ardoise</span>
        </div>

        <SpaceSwitcher />

        <nav class="flex flex-1 flex-col gap-1 px-3">
            {#each navLinks as link (link.href)}
                {@const active = isActive(link.href)}
                <a
                    href={resolve(link.href as any)}
                    class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors {active
                        ? 'bg-foreground text-background font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
                >
                    <iconify-icon icon={link.icon} width="16" class="shrink-0"></iconify-icon>
                    {link.label}
                </a>
            {/each}
        </nav>

        <div class="h-px bg-border"></div>

        <div class="flex flex-col gap-2 p-4">
            <div class="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-2.5">
                {#if $authStore.user?.avatarUrl}
                    <img
                        src={$authStore.user.avatarUrl}
                        alt={$authStore.user?.firstName || 'Admin'}
                        class="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                    />
                {:else}
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-foreground text-xs font-semibold text-background">
                        {getInitials($authStore.user?.firstName)}
                    </div>
                {/if}
                <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{$authStore.user?.firstName || 'Admin'}</p>
                    <p class="truncate text-xs text-muted-foreground">{$i18n.t('admin.sidebar.admin')}</p>
                </div>
            </div>
            <button
                onclick={() => authStore.logout()}
                class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
            >
                <iconify-icon icon="solar:logout-2-linear" width="16"></iconify-icon>
                {$i18n.t('admin.sidebar.logout')}
            </button>
        </div>
    </aside>

    <main class="flex-1 overflow-auto pb-24 md:pb-0">
        <slot />
    </main>

    <MobileNav />
</div>
