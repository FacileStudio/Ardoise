<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { spaceContext } from '$lib/space-context.svelte';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import 'iconify-icon';

    let spaces: any[] = $state([]);
    let loading = $state(true);

    onMount(async () => {
        try {
            spaces = await trpc.space.list.query();
        } catch (err) {
            logger.error({ err }, 'Failed to fetch spaces');
        } finally {
            loading = false;
        }
    });

    function getRoleBadgeClass(role: string) {
        switch (role) {
            case 'OWNER': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            case 'ADMIN': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
    }

    function handleSwitch(space: any) {
        spaceContext.switchToSpace(space.id, space.name, space.role);
    }
</script>

{#if loading}
    <div class="flex flex-col items-center justify-center h-screen space-y-4">
        <iconify-icon icon="svg-spinners:blocks-shuffle-3" width="40" class="text-foreground"></iconify-icon>
        <p class="text-sm text-muted-foreground">{$i18n.t('common.actions.loading')}</p>
    </div>
{:else}
    <div class="p-8 max-w-[1000px] mx-auto space-y-6">
        <header class="flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">{$i18n.t('spaces.title')}</h1>
                <p class="text-sm text-muted-foreground mt-1">{$i18n.t('spaces.subtitle')}</p>
            </div>
            <button
                onclick={() => goto(resolve('/admin/spaces/new'))}
                class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
            >
                <iconify-icon icon="mdi:plus" width="18"></iconify-icon>
                {$i18n.t('spaces.createSpace')}
            </button>
        </header>

        <button
            type="button"
            onclick={spaceContext.switchToPersonal.bind(spaceContext)}
            class="flex w-full items-center gap-4 rounded-xl border border-border p-4 cursor-pointer transition-colors text-left {spaceContext.isPersonal
                ? 'border-foreground bg-muted/50'
                : 'hover:bg-muted/30'}"
        >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <iconify-icon icon="solar:user-circle-bold" width="22" class="text-foreground"></iconify-icon>
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-medium text-foreground">{$i18n.t('spaces.personal')}</div>
                <div class="text-sm text-muted-foreground">{$i18n.t('spaces.personalDescription')}</div>
            </div>
            {#if spaceContext.isPersonal}
                <iconify-icon icon="solar:check-circle-bold" width="20" class="text-foreground"></iconify-icon>
            {/if}
        </button>

        {#if spaces.length > 0}
            <div class="space-y-3">
                {#each spaces as space (space.id)}
                    <div class="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors {spaceContext.spaceId === space.id
                        ? 'border-foreground bg-muted/50'
                        : 'hover:bg-muted/30'}">
                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <iconify-icon icon="solar:users-group-rounded-bold" width="22" class="text-foreground"></iconify-icon>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="font-medium text-foreground">{space.name}</span>
                                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {getRoleBadgeClass(space.role)}">
                                    {$i18n.t(`spaces.roles.${space.role}`)}
                                </span>
                            </div>
                            <div class="text-sm text-muted-foreground">
                                {space.memberCount} {space.memberCount === 1 ? $i18n.t('spaces.member') : $i18n.t('spaces.members').toLowerCase()}
                                {#if space.description}
                                    &middot; {space.description}
                                {/if}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button
                                onclick={() => handleSwitch(space)}
                                class="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title={$i18n.t('spaces.switchTo')}
                            >
                                <iconify-icon icon="solar:transfer-horizontal-linear" width="16"></iconify-icon>
                            </button>
                            <button
                                onclick={() => goto(resolve(`/admin/spaces/${space.id}`))}
                                class="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title={$i18n.t('spaces.dashboard')}
                            >
                                <iconify-icon icon="solar:arrow-right-linear" width="16"></iconify-icon>
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="text-center py-16">
                <div class="flex flex-col items-center gap-4">
                    <div class="w-16 h-16 rounded-xl border border-border flex items-center justify-center text-muted-foreground">
                        <iconify-icon icon="solar:planet-bold" width="32"></iconify-icon>
                    </div>
                    <h3 class="text-lg font-semibold text-foreground">{$i18n.t('spaces.noSpaces')}</h3>
                    <p class="text-sm text-muted-foreground max-w-md">{$i18n.t('spaces.noSpacesDescription')}</p>
                    <button
                        onclick={() => goto(resolve('/admin/spaces/new'))}
                        class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity mt-2"
                    >
                        <iconify-icon icon="mdi:plus" width="18"></iconify-icon>
                        {$i18n.t('spaces.createSpace')}
                    </button>
                </div>
            </div>
        {/if}
    </div>
{/if}
