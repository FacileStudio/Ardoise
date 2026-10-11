<script lang="ts">
    import { page } from '$app/stores';
    import { resolve } from '$app/paths';
    import authStore from '$lib/auth-store';
    import 'iconify-icon';

    let avatarFailed = $state(false);

    $effect(() => {
        void $authStore.user?.avatarUrl;
        avatarFailed = false;
    });

    function getInitials(name: string | undefined) {
        if (!name) return 'A';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }

    function isActive(href: string) {
        return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
    }

    const items = [
        { href: '/admin/prestations', label: 'Prestations', icon: 'solar:case-round-linear' },
        { href: '/admin/documents', label: 'Documents', icon: 'solar:document-linear' },
        { href: '/admin/clients', label: 'Clients', icon: 'solar:users-group-two-rounded-linear' },
        { href: '/admin/payments', label: 'Payments', icon: 'solar:wallet-linear' },
        { href: '/admin/prestataires', label: 'Prestataires', icon: 'solar:buildings-linear' },
    ];

    const settingsActive = $derived(isActive('/admin/settings'));
</script>

<nav
    class="fixed inset-x-0 z-50 flex justify-center px-4 md:hidden"
    style="bottom: max(0.75rem, env(safe-area-inset-bottom))"
>
    <div
        class="flex items-center gap-1 rounded-full border border-border/40 bg-background/55 p-1.5 shadow-lg shadow-black/10 ring-1 ring-white/10 backdrop-blur-2xl backdrop-saturate-150"
    >
        {#each items as item (item.href)}
            {@const active = isActive(item.href)}
            <a
                href={resolve(item.href as any)}
                aria-label={item.label}
                title={item.label}
                class="flex items-center justify-center rounded-full px-3.5 py-2 transition-all duration-200 {active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
            >
                <iconify-icon icon={item.icon} width="22"></iconify-icon>
            </a>
        {/each}

        <a
            href={resolve('/admin/settings' as any)}
            aria-label="Settings"
            title="Settings"
            class="flex items-center justify-center rounded-full px-2.5 py-1.5 transition-all duration-200 {settingsActive
                ? 'bg-foreground shadow-sm'
                : 'hover:bg-muted/60'}"
        >
            {#if $authStore.user?.avatarUrl && !avatarFailed}
                <img
                    src={$authStore.user.avatarUrl}
                    alt={$authStore.user?.firstName || 'Admin'}
                    class="h-7 w-7 rounded-full border border-border object-cover"
                    onerror={() => (avatarFailed = true)}
                />
            {:else}
                <span
                    class="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-foreground text-[10px] font-semibold text-background"
                >
                    {getInitials($authStore.user?.firstName)}
                </span>
            {/if}
        </a>
    </div>
</nav>
