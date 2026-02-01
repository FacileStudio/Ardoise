<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { auth } from '$lib/stores/auth';
    import { onMount } from 'svelte';
    import { fly, fade } from 'svelte/transition';
    import 'iconify-icon';

    let pageLoading = true;
    let users: any[] = [];
    let searchQuery = '';
    let filterStatus: 'all' | 'admin' | 'premium' | 'unverified' = 'all';

    onMount(fetchUsers);

    async function fetchUsers() {
        pageLoading = true;
        try {
            users = await trpc.user.list.query();
        } catch (err) {
            console.error("Erreur de récupération", err);
        } finally {
            pageLoading = false;
        }
    }

    $: filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             user.email.toLowerCase().includes(searchQuery.toLowerCase());

        if (filterStatus === 'admin') return matchesSearch && user.role === 'admin';
        if (filterStatus === 'premium') return matchesSearch && user.isPremium;
        if (filterStatus === 'unverified') return matchesSearch && !user.emailVerified;
        return matchesSearch;
    });

    async function togglePremium(id: string, current: boolean) {
        await trpc.user.update.mutate({ id, isPremium: !current });
        await fetchUsers();
    }
</script>

<div class="p-8 max-w-7xl mx-auto space-y-6">
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                <iconify-icon icon="solar:shield-check-bold" class="text-indigo-600"></iconify-icon>
                Modération
            </h1>
            <p class="text-slate-500 font-medium">Gestion globale des comptes utilisateurs et permissions</p>
        </div>

        <div class="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
                on:click={() => filterStatus = 'all'}
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all {filterStatus === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}">
                Tous
            </button>
            <button
                on:click={() => filterStatus = 'premium'}
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all {filterStatus === 'premium' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}">
                Premium
            </button>
            <button
                on:click={() => filterStatus = 'admin'}
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all {filterStatus === 'admin' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}">
                Admins
            </button>
        </div>
    </header>

    <div class="relative group">
        <iconify-icon icon="solar:magnifer-linear" class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" width="20"></iconify-icon>
        <input
            type="text"
            bind:value={searchQuery}
            placeholder="Rechercher un nom, un email ou un ID..."
            class="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
        />
    </div>

    {#if pageLoading}
        <div class="py-20 flex justify-center">
            <iconify-icon icon="line-md:loading-twotone-loop" width="48" class="text-indigo-600"></iconify-icon>
        </div>
    {:else if filteredUsers.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredUsers as user (user.id)}
                <div
                    in:fly={{ y: 20, duration: 400 }}
                    class="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
                >
                    <div class="absolute top-4 right-4">
                        {#if user.role === 'admin'}
                            <span class="bg-rose-50 text-rose-600 text-[10px] font-black px-2 py-1 rounded-lg border border-rose-100 uppercase">Admin</span>
                        {:else if user.isPremium}
                            <span class="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-lg border border-indigo-100 uppercase tracking-tighter">Premium</span>
                        {/if}
                    </div>

                    <div class="flex items-center gap-4 mb-6">
                        {#if user.avatar?.url}
                            <img src={user.avatar.url} alt={user.name} class="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                        {:else}
                            <div class="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xl border border-slate-100">
                                {user.name[0].toUpperCase()}
                            </div>
                        {/if}
                        <div class="overflow-hidden">
                            <h3 class="font-black text-slate-800 truncate leading-tight">{user.name}</h3>
                            <p class="text-xs text-slate-400 truncate font-medium">{user.email}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 mb-6 text-center">
                        <div class="bg-slate-50 p-3 rounded-2xl">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Messages</p>
                            <p class="font-black text-slate-700">{user.messages?.length || 0}</p>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-2xl">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Salons</p>
                            <p class="font-black text-slate-700">{user.rooms?.length || 0}</p>
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <button
                            on:click={() => togglePremium(user.id, user.isPremium)}
                            aria-label="Changer statut premium"
                            class="flex-1 py-3 rounded-xl font-bold text-xs transition-all {user.isPremium ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}">
                            {user.isPremium ? 'Downgrade' : 'Make Premium'}
                        </button>
                        <button
                            aria-label="Plus d'options"
                            class="w-12 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all flex items-center justify-center">
                            <iconify-icon icon="solar:menu-dots-bold" width="20"></iconify-icon>
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-200" in:fade>
            <iconify-icon icon="solar:ghost-bold" width="64" class="text-slate-200 mb-4"></iconify-icon>
            <h3 class="text-xl font-black text-slate-800">Aucun résultat</h3>
            <p class="text-slate-400 font-medium">Votre recherche "{searchQuery}" n'a retourné aucun membre.</p>
        </div>
    {/if}
</div>
