<script lang="ts">
    import { fly } from 'svelte/transition';
    import { isAdmin } from '@repo/auth-shared';
    import { Badge } from '@repo/ui';
    import UserMenu from './UserMenu.svelte';
    import type { User } from '$lib/types';
    import 'iconify-icon';


    export let user: User;
    export let onDelete: (id: string, name: string) => void;
    export let onChangeRole: (id: string, role: string) => void;
    export let onViewDetails: (id: string) => void;

    function getStatusColor(status: string) {
        switch (status) {
            case 'ACTIVE': return 'emerald';
            case 'PENDING': return 'slate';
            default: return 'slate';
        }
    }
</script>

<div
    in:fly={{ y: 20, duration: 400 }}
    class="bg-white rounded-[35px] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group relative"
>
    <div class="flex items-center gap-4 mb-4">
        <div class="relative flex-shrink-0">
            {#if user.avatar?.url}
                <img src={user.avatar.url} alt={user.firstName} class="w-16 h-16 rounded-[22px] object-cover" />
            {:else}
                <div class="w-16 h-16 rounded-[22px] bg-slate-50 flex items-center justify-center text-slate-400 font-black text-2xl border border-slate-200">
                    {user.firstName[0]}
                </div>
            {/if}

            {#if isAdmin(user)}
                <div class="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full shadow-lg border-2 border-white flex items-center justify-center z-10">
                    <iconify-icon icon="solar:crown-bold" width="16"></iconify-icon>
                </div>
            {/if}
        </div>

        <div class="overflow-hidden flex-1">
            <div class="flex items-center gap-2 mb-1">
                <h3 class="font-black text-slate-800 truncate text-lg tracking-tight">{user.firstName}</h3>
                <Badge variant={getStatusColor(user.status || 'ACTIVE')} class="text-[8px]">
                    {user.status || 'ACTIVE'}
                </Badge>
            </div>
            <p class="text-xs text-slate-400 truncate font-bold">{user.email}</p>
        </div>
    </div>

    <div class="flex gap-2">
        <button
            on:click={() => onViewDetails(user.id)}
            class="flex-1 bg-slate-50 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors group/btn"
        >
            <iconify-icon icon="solar:eye-bold" class="text-slate-300 group-hover/btn:text-indigo-500"></iconify-icon>
            <span class="font-black text-slate-700 text-sm group-hover/btn:text-indigo-700">View</span>
        </button>

        <UserMenu
            {user}
            onDelete={() => onDelete(user.id, user.name)}
            onChangeRole={(role) => onChangeRole(user.id, role)}
        />
    </div>
</div>
