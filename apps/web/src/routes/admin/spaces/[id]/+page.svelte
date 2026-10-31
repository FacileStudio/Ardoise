<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { spaceContext } from '$lib/space-context.svelte';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import 'iconify-icon';

    let space: any = $state(null);
    let members: any[] = $state([]);
    let loading = $state(true);

    const spaceId = $derived($page.params.id as string);

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        try {
            const [spaceData, membersData] = await Promise.all([
                trpc.space.get.query({ id: spaceId }),
                trpc.space.getMembers.query({ id: spaceId }),
            ]);
            space = spaceData;
            members = membersData;
        } catch (err) {
            logger.error({ err }, 'Failed to fetch space');
            space = null;
            members = [];
        } finally {
            loading = false;
        }
    }

    function switchToSpace() {
        if (space) {
            spaceContext.switchToSpace(space.id, space.name, space.role);
        }
    }

    function roleBadgeClass(role: string): string {
        switch (role) {
            case 'OWNER': return 'bg-fc-warning/10 text-fc-warning';
            case 'ADMIN': return 'bg-fc-info/10 text-fc-info';
            default: return 'bg-muted text-muted-foreground';
        }
    }

    const isOwnerOrAdmin = $derived(space?.role === 'OWNER' || space?.role === 'ADMIN');
</script>

<div class="flex h-full flex-col">
    <div class="border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div class="flex items-center gap-3">
            <a href={resolve('/admin/spaces')} class="text-muted-foreground transition-colors hover:text-foreground" aria-label="Back to spaces">
                <iconify-icon icon="solar:arrow-left-linear" width="20"></iconify-icon>
            </a>
            <div class="flex-1">
                {#if space}
                    <h1 class="text-lg font-semibold">{space.name}</h1>
                    {#if space.description}
                        <p class="mt-0.5 text-sm text-muted-foreground">{space.description}</p>
                    {/if}
                {:else}
                    <h1 class="text-lg font-semibold">Space</h1>
                {/if}
            </div>
            {#if space}
                <div class="flex items-center gap-2">
                    <button
                        class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        onclick={switchToSpace}
                    >
                        <iconify-icon icon="solar:login-3-linear" width="16"></iconify-icon>
                        {$i18n.t('spaces.switchTo')}
                    </button>
                    {#if isOwnerOrAdmin}
                        <a
                            href={resolve(`/admin/spaces/${spaceId}/settings`)}
                            class="inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
                        >
                            <iconify-icon icon="solar:settings-linear" width="16"></iconify-icon>
                            {$i18n.t('spaces.settings')}
                        </a>
                    {/if}
                </div>
            {/if}
        </div>
    </div>

    <div class="flex-1 overflow-auto px-4 py-6 md:px-8">
        {#if loading}
            <div class="flex items-center justify-center py-20">
                <div class="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent"></div>
            </div>
        {:else if !space}
            <div class="flex flex-col items-center justify-center py-20 text-center">
                <p class="text-sm text-muted-foreground">Space not found</p>
                <a href={resolve('/admin/spaces')} class="mt-3 text-sm text-primary hover:underline">{$i18n.t('spaces.title')}</a>
            </div>
        {:else}
            <div class="max-w-2xl space-y-8">
                <div>
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{$i18n.t('spaces.members')}</h2>
                        {#if isOwnerOrAdmin}
                            <a
                                href={resolve(`/admin/spaces/${spaceId}/members`)}
                                class="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:underline"
                            >
                                <iconify-icon icon="solar:user-plus-linear" width="16"></iconify-icon>
                                {$i18n.t('spaces.membersTitle')}
                            </a>
                        {/if}
                    </div>

                    <div class="mt-4 space-y-2">
                        {#each members as member (member.id)}
                            <div class="flex items-center justify-between rounded-lg border border-border p-3">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold"
                                    >
                                        {(member.user?.firstName || member.user?.email || '?').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium">{member.user.firstName} {member.user.lastName}</p>
                                        <p class="text-xs text-muted-foreground">{member.user.email}</p>
                                    </div>
                                </div>
                                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {roleBadgeClass(member.role)}">
                                    {$i18n.t(`spaces.roles.${member.role}`)}
                                </span>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
