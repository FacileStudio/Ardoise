<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import 'iconify-icon';

    let space: any = $state(null);
    let loading = $state(true);

    $effect(() => {
        const id = $page.params.id;
        if (id) loadSpace(id);
    });

    async function loadSpace(id: string) {
        loading = true;
        try {
            space = await trpc.space.get.query({ id });
        } catch (err) {
            logger.error({ err }, 'Failed to fetch space');
        } finally {
            loading = false;
        }
    }

    function getRoleBadgeClass(role: string) {
        switch (role) {
            case 'OWNER': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            case 'ADMIN': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
    }
</script>

{#if loading}
    <div class="flex flex-col items-center justify-center h-screen space-y-4">
        <iconify-icon icon="svg-spinners:blocks-shuffle-3" width="40" class="text-foreground"></iconify-icon>
        <p class="text-sm text-muted-foreground">{$i18n.t('common.actions.loading')}</p>
    </div>
{:else if space}
    <div class="p-8 max-w-[1000px] mx-auto space-y-6">
        <header>
            <div class="flex items-center gap-2 mb-4">
                <button
                    onclick={() => goto(resolve('/admin/spaces'))}
                    class="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon>
                </button>
            </div>
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-bold tracking-tight text-foreground">{space.name}</h1>
                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {getRoleBadgeClass(space.role)}">
                            {$i18n.t(`spaces.roles.${space.role}`)}
                        </span>
                    </div>
                    {#if space.description}
                        <p class="text-sm text-muted-foreground mt-1">{space.description}</p>
                    {/if}
                </div>
            </div>
        </header>

        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div class="rounded-xl border border-border p-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-xs font-medium text-muted-foreground uppercase">{$i18n.t('spaces.members')}</div>
                    <iconify-icon icon="solar:users-group-rounded-bold" class="text-muted-foreground" width="18"></iconify-icon>
                </div>
                <div class="text-2xl font-bold text-foreground">{space._count.members}</div>
            </div>
            <div class="rounded-xl border border-border p-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-xs font-medium text-muted-foreground uppercase">{$i18n.t('nav.clients')}</div>
                    <iconify-icon icon="solar:buildings-2-bold" class="text-muted-foreground" width="18"></iconify-icon>
                </div>
                <div class="text-2xl font-bold text-foreground">{space._count.clients}</div>
            </div>
            <div class="rounded-xl border border-border p-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-xs font-medium text-muted-foreground uppercase">{$i18n.t('nav.documents')}</div>
                    <iconify-icon icon="solar:document-text-bold" class="text-muted-foreground" width="18"></iconify-icon>
                </div>
                <div class="text-2xl font-bold text-foreground">{space._count.documents}</div>
            </div>
            <div class="rounded-xl border border-border p-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-xs font-medium text-muted-foreground uppercase">{$i18n.t('nav.payments')}</div>
                    <iconify-icon icon="solar:wallet-bold" class="text-muted-foreground" width="18"></iconify-icon>
                </div>
                <div class="text-2xl font-bold text-foreground">{space._count.payments}</div>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <a
                href={resolve(`/admin/spaces/${space.id}/members`)}
                class="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-muted/30"
            >
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <iconify-icon icon="solar:users-group-rounded-linear" width="22" class="text-foreground"></iconify-icon>
                </div>
                <div>
                    <div class="font-medium text-foreground">{$i18n.t('spaces.membersTitle')}</div>
                    <div class="text-sm text-muted-foreground">{$i18n.t('spaces.membersSubtitle')}</div>
                </div>
                <iconify-icon icon="solar:arrow-right-linear" width="16" class="ml-auto text-muted-foreground"></iconify-icon>
            </a>

            {#if space.role === 'OWNER' || space.role === 'ADMIN'}
                <a
                    href={resolve(`/admin/spaces/${space.id}/settings`)}
                    class="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-muted/30"
                >
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <iconify-icon icon="solar:settings-linear" width="22" class="text-foreground"></iconify-icon>
                    </div>
                    <div>
                        <div class="font-medium text-foreground">{$i18n.t('spaces.settings')}</div>
                        <div class="text-sm text-muted-foreground">{$i18n.t('spaces.settingsSubtitle')}</div>
                    </div>
                    <iconify-icon icon="solar:arrow-right-linear" width="16" class="ml-auto text-muted-foreground"></iconify-icon>
                </a>
            {/if}
        </div>
    </div>
{:else}
    <div class="flex flex-col items-center justify-center h-screen space-y-4">
        <iconify-icon icon="solar:danger-triangle-bold" width="40" class="text-muted-foreground"></iconify-icon>
        <p class="text-sm text-muted-foreground">Space not found</p>
    </div>
{/if}
