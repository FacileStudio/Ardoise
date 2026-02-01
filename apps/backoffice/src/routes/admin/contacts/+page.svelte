<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { auth } from '$lib/stores/auth';
    import { onMount } from 'svelte';
    import { fly, fade } from 'svelte/transition';
    import 'iconify-icon';

    let pageLoading = true;
    let error = '';
    let contacts: any[] = [];

    $: if (!$auth.loading && !$auth.session) {
        auth.logout();
    }

    onMount(async () => {
        try {
            // On récupère les soumissions du formulaire de contact
            contacts = await trpc.contact.list.query();
        } catch (err: any) {
            error = 'Impossible de récupérer les messages.';
            if (err.data?.code === 'UNAUTHORIZED') auth.logout();
        } finally {
            pageLoading = false;
        }
    });

    const formatDate = (date: Date) => new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
    }).format(new Date(date));
</script>

<div class="p-8 max-w-7xl mx-auto space-y-8">
    <header class="flex justify-between items-center">
        <div>
            <h1 class="text-4xl font-black text-slate-900 tracking-tighter">Messages reçus</h1>
            <p class="text-slate-500 font-medium italic">Leads générés depuis la landing page</p>
        </div>

        {#if contacts.length > 0}
            <div class="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl font-bold text-sm border border-indigo-100">
                {contacts.length} demande{contacts.length > 1 ? 's' : ''}
            </div>
        {/if}
    </header>

    {#if pageLoading}
        <div class="flex flex-col items-center justify-center py-20" in:fade>
            <iconify-icon icon="line-md:loading-twotone-loop" width="48" class="text-indigo-600"></iconify-icon>
            <p class="mt-4 text-slate-400 font-medium">Chargement des leads...</p>
        </div>
    {:else if error}
        <div class="bg-rose-50 text-rose-600 p-6 rounded-[30px] border border-rose-100 font-bold flex items-center gap-3">
            <iconify-icon icon="solar:danger-bold" width="24"></iconify-icon>
            {error}
        </div>
    {:else if contacts.length > 0}
        <div class="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden shadow-slate-200/50">
            <table class="w-full text-left">
                <thead>
                    <tr class="bg-slate-50/50 border-b border-slate-100">
                        <th class="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Expéditeur</th>
                        <th class="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                        <th class="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date de réception</th>
                        <th class="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    {#each contacts as user (user.id)}
                        <tr class="hover:bg-slate-50/50 transition-colors group">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-4">
                                    <div class="relative">
                                        {#if user.avatar?.url}
                                            <img
                                                src={user.avatar.url}
                                                alt={user.name}
                                                class="w-12 h-12 rounded-[18px] object-cover ring-2 ring-white shadow-sm"
                                            />
                                        {:else}
                                            <div class="w-12 h-12 rounded-[18px] bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                        {/if}
                                    </div>

                                    <div>
                                        <div class="font-bold text-slate-800">{user.name}</div>
                                        <div class="text-xs text-slate-400 font-medium">{user.email}</div>
                                    </div>
                                </div>
                            </td>

                            <td class="px-6 py-4 text-center">
                                {#if user.isPremium}
                                    <span class="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border border-indigo-100">
                                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                                        Client Pro
                                    </span>
                                {:else}
                                    <span class="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight">
                                        Prospect
                                    </span>
                                {/if}
                            </td>

                            <td class="px-6 py-4 text-sm text-slate-500 font-medium">
                                <div class="flex items-center gap-2">
                                    <iconify-icon icon="solar:calendar-minimalistic-bold" class="text-slate-300"></iconify-icon>
                                    {formatDate(user.createdAt)}
                                </div>
                            </td>

                            <td class="px-6 py-4 text-right">
                                <div class="flex justify-end gap-2">
                                    <a
                                        href="mailto:{user.email}"
                                        class="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                        aria-label="Répondre par email à {user.name}"
                                    >
                                        <iconify-icon icon="solar:letter-bold" width="20"></iconify-icon>
                                    </a>
                                    <button
                                        class="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                        aria-label="Supprimer le contact {user.name}"
                                    >
                                        <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else}
        <div
            class="bg-white border-2 border-dashed border-slate-200 rounded-[40px] p-20 flex flex-col items-center justify-center text-center space-y-6"
            in:fade
        >
            <div class="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200">
                <iconify-icon icon="solar:mailbox-empty-bold-duotone" width="64"></iconify-icon>
            </div>
            <div>
                <h3 class="text-2xl font-black text-slate-800">Aucun message pour le moment</h3>
                <p class="text-slate-400 max-w-xs mx-auto mt-2 font-medium">
                    Les demandes envoyées via votre formulaire de contact apparaîtront ici automatiquement.
                </p>
            </div>
            <button
                on:click={() => window.location.reload()}
                class="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95"
            >
                Actualiser la liste
            </button>
        </div>
    {/if}
</div>
