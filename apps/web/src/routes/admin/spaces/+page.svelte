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

    function roleBadgeClass(role: string): string {
        switch (role) {
            case 'OWNER': return 'bg-fc-warning/10 text-fc-warning';
            case 'ADMIN': return 'bg-fc-info/10 text-fc-info';
            default: return 'bg-muted text-muted-foreground';
        }
    }
</script>

<div class="flex h-full flex-col">
    <div class="flex items-center justify-between border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div>
            <h1 class="text-lg font-semibold">{$i18n.t('spaces.title')}</h1>
            <p class="mt-1 text-sm text-muted-foreground">{$i18n.t('spaces.subtitle')}</p>
        </div>
        <a
            href={resolve('/admin/spaces/new')}
            class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
            <iconify-icon icon="solar:add-circle-linear" width="16"></iconify-icon>
            {$i18n.t('spaces.createSpace')}
        </a>
    </div>

    <div class="flex-1 overflow-auto px-4 py-6 md:px-8">
        {#if loading}
            <div class="flex items-center justify-center py-20">
                <div class="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent"></div>
            </div>
        {:else if spaces.length === 0}
            <div class="flex flex-col items-center justify-center py-20 text-center">
                <iconify-icon icon="solar:users-group-rounded-bold-duotone" width="48" class="text-muted-foreground/40"></iconify-icon>
                <p class="mt-4 text-sm font-medium text-muted-foreground">{$i18n.t('spaces.noSpaces')}</p>
                <p class="mt-1 text-sm text-muted-foreground/70">{$i18n.t('spaces.noSpacesDescription')}</p>
                <a
                    href={resolve('/admin/spaces/new')}
                    class="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    {$i18n.t('spaces.createSpace')}
                </a>
            </div>
        {:else}
            <div class="grid gap-3">
                {#each spaces as space (space.id)}
                    <a
                        href={resolve(`/admin/spaces/${space.id}`)}
                        class="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                    >
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <iconify-icon icon="solar:users-group-rounded-bold-duotone" width="20" class="text-primary"></iconify-icon>
                            </div>
                            <div>
                                <p class="text-sm font-medium">{space.name}</p>
                                {#if space.description}
                                    <p class="mt-0.5 text-xs text-muted-foreground line-clamp-1">{space.description}</p>
                                {:else}
                                    <p class="mt-0.5 text-xs text-muted-foreground">
                                        {space.memberCount} {space.memberCount === 1 ? $i18n.t('spaces.member') : $i18n.t('spaces.members').toLowerCase()}
                                    </p>
                                {/if}
                            </div>
                        </div>
                        <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {roleBadgeClass(space.role)}">
                            {$i18n.t(`spaces.roles.${space.role}`)}
                        </span>
                    </a>
                {/each}
            </div>
        {/if}
    </div>
</div>
