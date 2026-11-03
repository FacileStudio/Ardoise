<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { onMount } from 'svelte';
    import { resolve } from '$app/paths';
    import { Badge, Button, Card, EmptyState, Page, PageHeader, Spinner } from '@facile/muse';
    import { icons } from '$lib/icons';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';

    let spaces: any[] = $state([]);
    let loading = $state(true);
    let registreUrl: string | null = $state(null);

    onMount(async () => {
        try {
            [spaces, { spacesUrl: registreUrl }] = await Promise.all([
                trpc.space.list.query(),
                trpc.space.directory.query(),
            ]);
        } catch (err) {
            logger.error({ err }, 'Failed to fetch spaces');
        } finally {
            loading = false;
        }
    });

    function roleTone(role: string) {
        return role === 'OWNER' ? 'owner' : role === 'ADMIN' ? 'admin' : 'neutral';
    }
</script>

<svelte:head>
    <title>{$i18n.t('spaces.title')} - Ardoise</title>
</svelte:head>

<Page width="lg">
    <PageHeader title={$i18n.t('spaces.title')} description={$i18n.t('spaces.subtitle')}>
        {#snippet actions()}
            {#if registreUrl}
                <Button href={registreUrl} icon={icons.arrow}>{$i18n.t('spaces.manageInRegistre')}</Button>
            {:else}
                <Button href={resolve('/admin/spaces/new')} icon={icons.plus}>
                    {$i18n.t('spaces.createSpace')}
                </Button>
            {/if}
        {/snippet}
    </PageHeader>

    {#if loading}
        <div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
    {:else if spaces.length === 0}
        <EmptyState
            icon={icons.space}
            title={$i18n.t('spaces.noSpaces')}
            description={$i18n.t('spaces.noSpacesDescription')}
        >
            {#if registreUrl}
                <Button href={registreUrl} icon={icons.arrow}>{$i18n.t('spaces.manageInRegistre')}</Button>
            {:else}
                <Button href={resolve('/admin/spaces/new')} icon={icons.plus}>
                    {$i18n.t('spaces.createSpace')}
                </Button>
            {/if}
        </EmptyState>
    {:else}
        <div class="grid gap-3">
            {#each spaces as space (space.id)}
                <Card href={resolve(`/admin/spaces/${space.id}`)} class="flex items-center justify-between gap-4">
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <p class="text-fc-sm font-medium text-fc-fg">{space.name}</p>
                        <p class="line-clamp-1 text-fc-xs text-fc-fg-muted">
                            {#if space.description}
                                {space.description}
                            {:else}
                                {space.memberCount}
                                {space.memberCount === 1 ? $i18n.t('spaces.member') : $i18n.t('spaces.members').toLowerCase()}
                            {/if}
                        </p>
                    </div>
                    <Badge tone={roleTone(space.role)}>{$i18n.t(`spaces.roles.${space.role}`)}</Badge>
                </Card>
            {/each}
        </div>
    {/if}
</Page>
