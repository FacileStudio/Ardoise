<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { resolve } from '$app/paths';
    import { spaceContext } from '$lib/space-context.svelte';
    import { Avatar, Badge, Button, Card, EmptyState, Page, PageHeader, Section, Spinner } from '@facile/muse';
    import { icons } from '$lib/icons';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';

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

    function roleTone(role: string) {
        return role === 'OWNER' ? 'owner' : role === 'ADMIN' ? 'admin' : 'neutral';
    }

    const isOwnerOrAdmin = $derived(space?.role === 'OWNER' || space?.role === 'ADMIN');
</script>

<svelte:head>
    <title>{space?.name ?? $i18n.t('spaces.title')} - Ardoise</title>
</svelte:head>

<Page width="lg">
    {#if loading}
        <div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
    {:else if !space}
        <EmptyState icon={icons.usersGroup} title="Espace introuvable">
            <Button href={resolve('/admin/spaces')} variant="ghost">{$i18n.t('spaces.title')}</Button>
        </EmptyState>
    {:else}
        <PageHeader
            title={space.name}
            description={space.description ?? undefined}
            back={{ href: '/admin/spaces', label: $i18n.t('spaces.title') }}
        >
            {#snippet actions()}
                <Button icon={icons.arrow} onclick={switchToSpace}>{$i18n.t('spaces.switchTo')}</Button>
                {#if isOwnerOrAdmin}
                    <Button href={resolve(`/admin/spaces/${spaceId}/settings`)} variant="ghost" icon={icons.settings}>
                        {$i18n.t('spaces.settings')}
                    </Button>
                {/if}
            {/snippet}
        </PageHeader>

        <Section title={$i18n.t('spaces.members')}>
            {#snippet actions()}
                {#if isOwnerOrAdmin}
                    <Button href={resolve(`/admin/spaces/${spaceId}/members`)} variant="ghost" size="sm" icon={icons.plus}>
                        {$i18n.t('spaces.membersTitle')}
                    </Button>
                {/if}
            {/snippet}

            <div class="flex flex-col gap-2">
                {#each members as member (member.id)}
                    <Card class="flex items-center justify-between gap-4 p-4">
                        <div class="flex min-w-0 items-center gap-3">
                            <Avatar
                                name={`${member.user.firstName} ${member.user.lastName}`}
                                size="sm"
                            />
                            <div class="flex min-w-0 flex-col">
                                <p class="truncate text-fc-sm font-medium text-fc-fg">
                                    {member.user.firstName} {member.user.lastName}
                                </p>
                                <p class="truncate text-fc-xs text-fc-fg-muted">{member.user.email}</p>
                            </div>
                        </div>
                        <Badge tone={roleTone(member.role)}>{$i18n.t(`spaces.roles.${member.role}`)}</Badge>
                    </Card>
                {/each}
            </div>
        </Section>
    {/if}
</Page>
