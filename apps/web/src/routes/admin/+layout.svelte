<script lang="ts">
    import authStore from '$lib/auth-store';
    import { page } from '$app/stores';
    import { resolve } from '$app/paths';
    import { Button } from '@repo/ui';
    import { i18n } from '@repo/i18n/svelte';
    import 'iconify-icon';

    const menuItems = [
        { label: $i18n.t('nav.clients'), icon: 'solar:users-group-rounded-linear', href: '/admin/clients' },
        { label: $i18n.t('nav.payments'), icon: 'solar:wallet-linear', href: '/admin/payments' },
        { label: $i18n.t('nav.documents'), icon: 'solar:document-text-linear', href: '/admin/documents' },
        { label: 'Prestataires', icon: 'solar:buildings-2-linear', href: '/admin/prestataires' },
        { label: $i18n.t('nav.statistics'), icon: 'solar:chart-linear', href: '/admin/statistics' },
        { label: $i18n.t('nav.users'), icon: 'solar:user-linear', href: '/admin/users' },
        { label: 'Paramètres', icon: 'solar:settings-linear', href: '/admin/settings' },
    ];

    function getInitials(name: string | undefined) {
        if (!name) return 'A';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }
</script>

<div class="flex h-screen w-full overflow-hidden">
    <aside class="sticky top-0 flex h-screen w-60 flex-col border-r border-border bg-background">
        <div class="flex items-center gap-3 px-5 pt-8 pb-6">
            <iconify-icon icon="solar:bill-list-bold-duotone" width="28" class="text-foreground"></iconify-icon>
            <span class="text-2xl font-bold font-heading tracking-tight">Ardoise</span>
        </div>

        <nav class="flex flex-1 flex-col gap-1 px-3">
            {#each menuItems as item (item.href)}
                {@const active = $page.url.pathname === item.href}
                <a
                    href={resolve(item.href as any)}
                    class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors {active
                        ? 'bg-foreground text-background font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
                >
                    <iconify-icon icon={item.icon} width="16" class="shrink-0"></iconify-icon>
                    {item.label}
                </a>
            {/each}
        </nav>

        <div class="h-px bg-border"></div>

        <div class="flex flex-col gap-2 p-4">
            <div
                class="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-2.5"
            >
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-foreground text-sm font-semibold text-background">
                    {getInitials($authStore.user?.firstName)}
                </div>
                <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{$authStore.user?.firstName || 'Admin'}</p>
                    <p class="truncate text-xs text-muted-foreground">{$i18n.t('admin.sidebar.admin')}</p>
                </div>
            </div>
            <Button
                intent="ghost"
                size="sm"
                onclick={() => authStore.logout()}
                class="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
                <iconify-icon icon="solar:logout-2-linear" width="16"></iconify-icon>
                {$i18n.t('admin.sidebar.logout')}
            </Button>
        </div>
    </aside>

    <main class="flex-1 overflow-auto">
        <slot />
    </main>
</div>
