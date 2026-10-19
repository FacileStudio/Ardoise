<script lang="ts">
    import { clickOutside } from '$lib/utils/clickOutside';
    import 'iconify-icon';

    interface User {
        role: string;
    }

    export let user: User;
    export let onDelete: () => void;
    export let onChangeRole: (newRole: string) => void;

    let isOpen = false;
</script>

<div class="relative inline-block" use:clickOutside={() => isOpen = false}>
    <button
        on:click={() => isOpen = !isOpen}
        class="w-9 h-9 bg-muted text-muted-foreground hover:bg-foreground hover:text-background rounded-lg transition-colors flex items-center justify-center"
        aria-label="Ouvrir le menu utilisateur"
    >
        <iconify-icon icon="solar:menu-dots-bold" width="18"></iconify-icon>
    </button>

    {#if isOpen}
        <div
            class="absolute right-0 top-11 w-56 rounded-lg border border-border bg-background shadow-lg p-1 z-50"
        >
            <div class="px-3 py-2 text-xs font-medium text-muted-foreground">Actions rapides</div>

            <button
                on:click={() => { onChangeRole(user.role === 'admin' ? 'user' : 'admin'); isOpen = false; }}
                class="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
                <iconify-icon icon="solar:crown-bold" class="text-foreground"></iconify-icon>
                {user.role === 'admin' ? 'Passer Utilisateur' : 'Passer Admin'}
            </button>

            <div class="h-px bg-border my-1"></div>

            <button
                on:click={() => { onDelete(); isOpen = false; }}
                class="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-fc-danger hover:bg-fc-danger/10 transition-colors"
            >
                <iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon>
                Supprimer définitivement
            </button>
        </div>
    {/if}
</div>
