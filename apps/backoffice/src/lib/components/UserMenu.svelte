<script lang="ts">
    import { clickOutside } from '$lib/utils/clickOutside';
    import 'iconify-icon';

    export let user: any;
    export let onTogglePremium: () => void;
    export let onDelete: () => void;
    export let onChangeRole: (newRole: string) => void;

    let isOpen = false;
</script>

<div class="relative inline-block" use:clickOutside={() => isOpen = false}>
    <button
        on:click={() => isOpen = !isOpen}
        class="w-12 h-12 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl transition-all flex items-center justify-center"
        aria-label="Ouvrir le menu utilisateur"
    >
        <iconify-icon icon="solar:menu-dots-bold" width="20"></iconify-icon>
    </button>

    {#if isOpen}
        <div
            class="absolute right-0 top-14 w-56 bg-white border border-slate-100 shadow-2xl rounded-[24px] p-2 z-50"
        >
            <div class="p-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">Actions rapides</div>

            <button
                on:click={() => { onTogglePremium(); isOpen = false; }}
                class="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
            >
                <iconify-icon icon="solar:star-bold" class="text-amber-500"></iconify-icon>
                {user.isPremium ? 'Retirer Premium' : 'Passer Premium'}
            </button>

            <button
                on:click={() => { onChangeRole(user.role === 'admin' ? 'user' : 'admin'); isOpen = false; }}
                class="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
            >
                <iconify-icon icon="solar:crown-bold" class="text-rose-500"></iconify-icon>
                {user.role === 'admin' ? 'Passer Utilisateur' : 'Passer Admin'}
            </button>

            <div class="h-px bg-slate-50 my-1"></div>

            <button
                on:click={() => { onDelete(); isOpen = false; }}
                class="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
            >
                <iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon>
                Supprimer définitivement
            </button>
        </div>
    {/if}
</div>
