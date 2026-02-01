<script lang="ts">
    import { auth } from '$lib/stores/auth';
    import { page } from '$app/stores';
    import 'iconify-icon';

    // Menu de navigation
    const menuItems = [
        { name: 'Dashboard', icon: 'solar:widget-bold', href: '/admin' },
        { name: 'Membres', icon: 'solar:users-group-rounded-bold', href: '/admin/users' },
        { name: 'Messages', icon: 'solar:letter-bold', href: '/admin/contacts' },
    ];
</script>

<div class="flex min-h-screen bg-slate-50 font-sans text-slate-900">
    <aside class="w-72 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
        <div class="p-8">
            <div class="flex items-center gap-3 px-2">
                <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <iconify-icon icon="solar:shield-user-bold" width="24"></iconify-icon>
                </div>
                <span class="text-xl font-black tracking-tighter uppercase">Admin Panel</span>
            </div>
        </div>

        <nav class="flex-1 px-4 space-y-2">
            {#each menuItems as item}
                <a
                    href={item.href}
                    class="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all
                    {$page.url.pathname === item.href
                        ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}"
                >
                    <iconify-icon icon={item.icon} width="22"></iconify-icon>
                    {item.name}
                </a>
            {/each}
        </nav>

        <div class="p-6 mt-auto border-t border-slate-100">
            <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                    {$auth.user?.name?.[0] || 'A'}
                </div>
                <div class="overflow-hidden">
                    <p class="text-sm font-black truncate">{$auth.user?.name}</p>
                    <button
                        on:click={() => auth.logout()}
                        class="text-[10px] uppercase font-black tracking-widest text-rose-500 hover:text-rose-600"
                    >
                        Déconnexion
                    </button>
                </div>
            </div>
        </div>
    </aside>

    <main class="flex-1 overflow-y-auto">
        <slot />
    </main>
</div>
