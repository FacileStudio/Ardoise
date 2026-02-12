<script lang="ts">
    import authStore from '$lib/auth-store';
    import { page } from '$app/stores';
    import { resolve } from '$app/paths';
    import { Button } from '@repo/ui';
    import { i18n } from '@repo/i18n/svelte';
    import 'iconify-icon';

    const menuItems = [
        { label: $i18n.t('nav.clients'), icon: 'solar:users-group-rounded-bold', href: '/admin/clients' },
        { label: $i18n.t('nav.payments'), icon: 'solar:wallet-bold', href: '/admin/payments' },
        { label: $i18n.t('nav.documents'), icon: 'solar:document-text-bold', href: '/admin/documents' },
        { label: 'Signature', icon: 'solar:pen-new-square-bold-duotone', href: '/admin/sign' },
        { label: 'Prestataires', icon: 'solar:buildings-2-bold', href: '/admin/prestataires' },
        { label: $i18n.t('nav.statistics'), icon: 'solar:chart-bold', href: '/admin/statistics' },
        { label: $i18n.t('nav.users'), icon: 'solar:user-bold', href: '/admin/users' },
    ];

    const dashboardItem = { label: $i18n.t('nav.dashboard'), icon: 'solar:home-bold', href: '/admin' };
</script>

<div class="flex min-h-screen bg-[#FAF7F5] font-sans text-slate-900">
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
                    href={resolve(item.href)}
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
            <a
                href={resolve(dashboardItem.href)}
                class="group relative flex items-center gap-4 px-6 py-3.5 rounded-full transition-all duration-200
                {$page.url.pathname === dashboardItem.href
                    ? 'bg-[#291334] text-white shadow-lg shadow-[#291334]/20'
                    : 'text-[#291334]/70 hover:bg-[#291334]/5 hover:text-[#291334]'}"
            >
                <iconify-icon
                    icon={dashboardItem.icon}
                    width="22"
                    class="transition-all group-hover:scale-110 {$page.url.pathname === dashboardItem.href ? 'text-[#FEC129]' : ''}"
                ></iconify-icon>

                <span class="font-bold tracking-tight text-[13px]">
                    {dashboardItem.label}
                </span>
            </a>

            <div class="relative p-4 bg-white/50 rounded-[20px] border border-[#291334]/10 transition-all duration-300 hover:border-[#FEC129] hover:bg-white/80">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-[#291334] flex items-center justify-center text-white font-black flex-shrink-0">
                        {$authStore.user?.firstName?.[0] || 'A'}
                    </div>
                    <div class="overflow-hidden flex-1">
                        <p class="text-[13px] font-black text-[#291334] truncate leading-tight">
                            {$authStore.user?.firstName}
                        </p>
                        <p class="text-[11px] font-bold text-[#291334]/50 uppercase tracking-wide">{$i18n.t('backoffice.sidebar.admin')}</p>
                    </div>
                </div>
            </div>
            <Button intent="danger" onclick={() => authStore.logout()} class="w-full">
                <iconify-icon icon="solar:logout-2-bold" width="18"></iconify-icon>
                {$i18n.t('backoffice.sidebar.logout')}
            </Button>
        </div>
    </aside>

    <main class="flex-1 overflow-y-auto">
        <slot />
    </main>
</div>
