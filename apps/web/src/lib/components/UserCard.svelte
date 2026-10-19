<script lang="ts">
    import { isAdmin } from '@repo/auth-shared';
    import { Badge } from '@facile/muse';
    import UserMenu from './UserMenu.svelte';
    import type { User } from '$lib/types';
    import 'iconify-icon';


    export let user: User;
    export let onDelete: (id: string, name: string) => void;
    export let onChangeRole: (id: string, role: string) => void;
    export let onViewDetails: (id: string) => void;

    function getStatusColor(status: string): 'success' | 'neutral' {
        switch (status) {
            case 'ACTIVE': return 'success';
            case 'PENDING': return 'neutral';
            default: return 'neutral';
        }
    }
</script>

<div
    class="rounded-xl border border-border bg-background p-4 hover:bg-muted/50 transition-colors group relative"
>
    <div class="flex items-center gap-3 mb-3">
        <div class="relative flex-shrink-0">
            {#if user.avatar?.url}
                <img src={user.avatar.url} alt={user.firstName} class="w-12 h-12 rounded-lg object-cover" />
            {:else}
                <div class="w-12 h-12 rounded-lg bg-foreground text-background flex items-center justify-center font-medium text-lg">
                    {user.firstName[0]}
                </div>
            {/if}

            {#if isAdmin(user as any)}
                <div class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <iconify-icon icon="solar:crown-bold" width="12"></iconify-icon>
                </div>
            {/if}
        </div>

        <div class="overflow-hidden flex-1">
            <div class="flex items-center gap-2 mb-0.5">
                <h3 class="font-medium text-sm text-foreground truncate">{user.firstName}</h3>
                <Badge tone={getStatusColor(user.status || 'ACTIVE')}>
                    {user.status || 'ACTIVE'}
                </Badge>
            </div>
            <p class="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
    </div>

    <div class="flex gap-2">
        <button
            on:click={() => onViewDetails(user.id)}
            class="flex-1 bg-muted px-3 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors text-sm"
        >
            <iconify-icon icon="solar:eye-bold" class="text-muted-foreground"></iconify-icon>
            <span class="font-medium text-foreground text-sm">View</span>
        </button>

        <UserMenu
            user={{ role: user.role }}
            onDelete={() => onDelete(user.id, user.firstName)}
            onChangeRole={(role) => onChangeRole(user.id, role)}
        />
    </div>
</div>
