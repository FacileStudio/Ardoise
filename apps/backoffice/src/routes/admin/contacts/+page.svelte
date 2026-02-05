<script lang="ts">
    import { trpc } from '$lib/trpc';
    import authStore from '$lib/auth-store';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { Spinner, EmptyState, Button, Card } from '@repo/ui';
    import { toast } from '@repo/utils';
    import 'iconify-icon';

    let pageLoading = true;
    let error = '';
    let contacts: any[] = [];

    $: if (!$authStore.loading && !$authStore.session) {
        authStore.logout();
    }

    onMount(async () => {
        try {
            contacts = await trpc.contact.list.query();
        } catch (err: any) {
            error = 'Impossible de récupérer les messages.';
            toast.push('Impossible de récupérer les messages.', 'error');
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
            <Spinner size="xl" />
            <p class="mt-4 text-slate-400 font-medium">Chargement des leads...</p>
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
                                        class="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-primary hover:text-white transition-all flex items-center justify-center"
                                        aria-label="Répondre par email à {user.name}"
                                    >
                                        <iconify-icon icon="solar:letter-bold" width="20"></iconify-icon>
                                    </a>
                                    <button
                                        class="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-danger hover:text-white transition-all flex items-center justify-center"
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
        <EmptyState
            icon="solar:mailbox-empty-bold-duotone"
            title="Aucun message pour le moment"
            description="Les demandes envoyées via votre formulaire de contact apparaîtront ici automatiquement."
        >
            <Button onclick={() => window.location.reload()}>
                Actualiser la liste
            </Button>
        </EmptyState>
    {/if}
</div>
