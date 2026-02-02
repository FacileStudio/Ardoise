<script lang="ts">
    import { fly } from 'svelte/transition';
    import { isAdmin } from '@repo/auth-shared';
    import UserMenu from './UserMenu.svelte';

    export let user: any;
    export let onTogglePremium: (id: string, current: boolean) => void;
    export let onDelete: (id: string, name: string) => void;
    export let onChangeRole: (id: string, role: string) => void;
</script>

<div
    in:fly={{ y: 20, duration: 400 }}
    class="bg-white rounded-[35px] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group relative border-b-4 {user.isPremium ? 'border-b-indigo-500' : 'border-b-transparent'}"
>
    <div class="flex items-center gap-4 mb-6">
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

        <div class="overflow-hidden">
            <h3 class="font-black text-slate-800 truncate text-lg tracking-tight">{user.firstName}</h3>
            <p class="text-xs text-slate-400 truncate font-bold">{user.email}</p>
        </div>
    </div>

    <div class="flex gap-2">
        <div class="flex-1 bg-slate-50 px-4 py-3 rounded-2xl flex items-center justify-center gap-2">
             <iconify-icon icon="solar:chat-line-bold" class="text-slate-300"></iconify-icon>
             <span class="font-black text-slate-700 text-sm">{user.messages?.length || 0}</span>
        </div>

        <UserMenu
            {user}
            onTogglePremium={() => onTogglePremium(user.id, user.isPremium)}
            onDelete={() => onDelete(user.id, user.name)}
            onChangeRole={(role) => onChangeRole(user.id, role)}
        />
    </div>
</div>
