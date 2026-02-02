<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { isAdmin } from '@repo/auth-shared';
    import UserCard from '$lib/components/UserCard.svelte';
    import 'iconify-icon';

    let pageLoading = true;
    let users: any[] = [];
    let searchQuery = '';
    let filterStatus: 'all' | 'admin' | 'premium' = 'all';

    onMount(fetchUsers);

    async function fetchUsers() {
        pageLoading = true;
        try { users = await trpc.user.list.query(); }
        catch (err) { console.error(err); }
        finally { pageLoading = false; }
    }

    // Handlers
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Supprimer ${name} ?`)) return;
        await trpc.user.delete.mutate({ id });
        users = users.filter(u => u.id !== id);
    };

    const handleTogglePremium = async (id: string, current: boolean) => {
        await trpc.user.update.mutate({ id, isPremium: !current });
        users = users.map(u => u.id === id ? { ...u, isPremium: !current } : u);
    };

    const handleChangeRole = async (id: string, role: string) => {
        await trpc.user.update.mutate({ id, role });
        users = users.map(u => u.id === id ? { ...u, role } : u);
    };

    // Filtrage
    $: searchTerm = searchQuery.toLowerCase().trim();
    $: filteredUsers = users.filter(user => {
        const matchStatus = filterStatus === 'all' || (filterStatus === 'admin' && isAdmin(user)) || (filterStatus === 'premium' && user.isPremium);
        if (!matchStatus) return false;
        if (!searchTerm) return true;
        const searchContent = `${user.name} ${user.email} ${user.id}`.toLowerCase();
        return searchTerm.split(' ').every(word => searchContent.includes(word));
    });
</script>

<div class="p-8 max-w-7xl mx-auto space-y-8">
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 class="text-4xl font-black text-slate-900 tracking-tighter italic">MODÉRATION</h1>

        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {#each ['all', 'premium', 'admin'] as status}
                <button
                    on:click={() => filterStatus = status as any}
                    class="px-5 py-2 rounded-xl text-xs font-black transition-all uppercase {filterStatus === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}">
                    {status}
                </button>
            {/each}
        </div>
    </header>

    <div class="relative">
        <iconify-icon icon="solar:magnifer-linear" class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" width="22"></iconify-icon>
        <input bind:value={searchQuery} placeholder="Rechercher..." class="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[28px] focus:border-indigo-500 outline-none transition-all font-bold" />
    </div>

    {#if pageLoading}
        <div class="py-20 flex justify-center"><iconify-icon icon="line-md:loading-twotone-loop" width="48" class="text-indigo-600"></iconify-icon></div>
    {:else if filteredUsers.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredUsers as user (user.id)}
                <UserCard
                    {user}
                    onDelete={handleDelete}
                    onTogglePremium={handleTogglePremium}
                    onChangeRole={handleChangeRole}
                />
            {/each}
        </div>
    {:else}
        <div class="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-200" in:fade>
            <p class="text-slate-400 font-black">Aucun utilisateur trouvé.</p>
        </div>
    {/if}
</div>
