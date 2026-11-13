<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import {
        Avatar,
        Badge,
        Button,
        Card,
        ConfirmModal,
        EmptyState,
        Field,
        Input,
        Page,
        PageHeader,
        Section,
        Select,
        Spinner,
        Table,
        toast,
        Tooltip,
    } from '@facile/muse';
    import { icons } from '$lib/icons';
    import authStore from '$lib/auth-store';

    let members: any[] = $state([]);
    let space: any = $state(null);
    let loading = $state(true);

    let addUserId = $state('');
    let addRole = $state('MEMBER');
    let addError = $state('');
    let adding = $state(false);

    let confirmRemove: any = $state(null);
    let showRemoveDialog = $state(false);
    let removeLoading = $state(false);

    let showLeaveDialog = $state(false);
    let leaveLoading = $state(false);

    const spaceId = $derived($page.params.id as string);

    onMount(() => {
        fetchData();
    });

    async function fetchData() {
        loading = true;
        try {
            const [spaceData, membersData] = await Promise.all([
                trpc.space.get.query({ id: spaceId }),
                trpc.space.getMembers.query({ id: spaceId }),
            ]);
            space = spaceData;
            members = membersData;
        } catch (err) {
            logger.error({ err }, 'Failed to fetch space members');
        } finally {
            loading = false;
        }
    }

    const canManage = $derived(!space?.manageUrl && (space?.role === 'OWNER' || space?.role === 'ADMIN'));
    const isOwner = $derived(space?.role === 'OWNER');

    async function addMember() {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addUserId.trim())) {
            addError = $i18n.t('spaces.emailInvalid');
            return;
        }

        adding = true;
        addError = '';
        try {
            await trpc.space.addMember.mutate({
                spaceId,
                email: addUserId.trim(),
                role: addRole as any,
            });
            addUserId = '';
            addRole = 'MEMBER';
            const membersData = await trpc.space.getMembers.query({ id: spaceId });
            members = membersData;
        } catch (err: any) {
            logger.error({ err }, 'Failed to add member');
            if (err?.data?.code === 'NOT_FOUND') {
                addError = $i18n.t('spaces.noUserFound');
            } else {
                addError = err?.message || $i18n.t('common.actions.error');
            }
        } finally {
            adding = false;
        }
    }

    async function handleRemoveMember() {
        if (!confirmRemove) return;
        removeLoading = true;
        try {
            await trpc.space.removeMember.mutate({
                spaceId,
                userId: confirmRemove.userId,
            });
            confirmRemove = null;
            showRemoveDialog = false;
            await fetchData();
        } catch (err: any) {
            logger.error({ err }, 'Failed to remove member');
            toast.danger(err?.message || $i18n.t('common.actions.error'));
            confirmRemove = null;
            showRemoveDialog = false;

        } finally {
            removeLoading = false;
        }
    }

    async function updateRole(userId: string, newRole: string) {
        try {
            await trpc.space.updateMemberRole.mutate({
                spaceId,
                userId,
                role: newRole as any,
            });
            await fetchData();
        } catch (err: any) {
            logger.error({ err }, 'Failed to update member role');
            toast.danger(err?.message || $i18n.t('common.actions.error'));
        }
    }

    async function handleLeave() {
        leaveLoading = true;
        try {
            await trpc.space.leave.mutate({ spaceId });
            await goto(resolve('/admin/spaces'));
        } catch (err: any) {
            logger.error({ err }, 'Failed to leave space');
            toast.danger(err?.message || $i18n.t('common.actions.error'));
            showLeaveDialog = false;
        } finally {
            leaveLoading = false;
        }
    }

    function roleTone(role: string) {
        return role === 'OWNER' ? 'owner' : role === 'ADMIN' ? 'admin' : 'neutral';
    }
</script>

<svelte:head>
    <title>{$i18n.t('spaces.membersTitle')} - Ardoise</title>
</svelte:head>

{#snippet roleCell(m: any, isCurrentUser: boolean)}
    {#if m.role === 'OWNER' || !canManage || isCurrentUser}
        <Badge tone={roleTone(m.role)}>{$i18n.t(`spaces.roles.${m.role}`)}</Badge>
    {:else}
        <Select
            value={m.role}
            aria-label={$i18n.t('spaces.role')}
            class="h-9 w-36"
            onchange={(e) => updateRole(m.userId, (e.target as HTMLSelectElement).value)}
        >
            <option value="MEMBER">{$i18n.t('spaces.roles.MEMBER')}</option>
            <option value="ADMIN">{$i18n.t('spaces.roles.ADMIN')}</option>
        </Select>
    {/if}
{/snippet}

<Page width="lg">
    {#if loading}
        <div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
    {:else if !space}
        <EmptyState icon={icons.space} title="Espace introuvable">
            <Button href={resolve('/admin/spaces')} variant="ghost">{$i18n.t('spaces.title')}</Button>
        </EmptyState>
    {:else}
        <PageHeader
            title={$i18n.t('spaces.membersTitle')}
            description={space.name}
            back={{ href: `/admin/spaces/${spaceId}`, label: space.name }}
        />

        {#if space.manageUrl}
            <Section card>
                <p class="text-fc-sm text-fc-fg-muted">{$i18n.t('spaces.managedHint')}</p>
                <div>
                    <Button href={space.manageUrl} icon={icons.space}>{$i18n.t('spaces.manageInRegistre')}</Button>
                </div>
            </Section>
        {/if}

        {#if canManage}
            <Section title={$i18n.t('spaces.addMember')} card>
                <div class="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                    <Field label={$i18n.t('spaces.emailPlaceholder')} error={addError}>
                        <Input
                            type="email"
                            bind:value={addUserId}
                            placeholder={$i18n.t('spaces.emailPlaceholder')}
                            oninput={() => { addError = ''; }}
                            onkeydown={(e) => { if (e.key === 'Enter' && !adding) addMember(); }}
                        />
                    </Field>
                    <Field label={$i18n.t('spaces.role')}>
                        <Select bind:value={addRole}>
                            <option value="MEMBER">{$i18n.t('spaces.roles.MEMBER')}</option>
                            <option value="ADMIN">{$i18n.t('spaces.roles.ADMIN')}</option>
                        </Select>
                    </Field>
                    <Button size="lg" icon={icons.plus} onclick={addMember} disabled={adding}>
                        {adding ? $i18n.t('spaces.adding') : $i18n.t('spaces.addMember')}
                    </Button>
                </div>
            </Section>
        {/if}

        <Section
            title={`${members.length} ${members.length === 1 ? $i18n.t('spaces.member') : $i18n.t('spaces.members').toLowerCase()}`}
        >
            <Table class="hidden md:block">
                <thead>
                    <tr>
                        <th scope="col">Membre</th>
                        <th scope="col">{$i18n.t('spaces.role')}</th>
                        <th scope="col" class="text-right"><span class="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    {#each members as m (m.id)}
                        {@const isCurrentUser = m.userId === $authStore.user?.id}
                        <tr>
                            <td>
                                <div class="flex items-center gap-3">
                                    <Avatar name={`${m.user.firstName} ${m.user.lastName}`} size="sm" />
                                    <div class="flex min-w-0 flex-col">
                                        <span class="font-medium text-fc-fg">
                                            {m.user.firstName} {m.user.lastName}
                                            {#if isCurrentUser}
                                                <span class="ml-1 text-fc-xs text-fc-fg-muted">(vous)</span>
                                            {/if}
                                        </span>
                                        <span class="text-fc-xs text-fc-fg-muted">{m.user.email}</span>
                                    </div>
                                </div>
                            </td>
                            <td>{@render roleCell(m, isCurrentUser)}</td>
                            <td class="text-right">
                                {#if canManage && !isCurrentUser && m.role !== 'OWNER'}
                                    <Tooltip text={$i18n.t('spaces.removeMember')} describe={false} class="contents">
                                      <Button
                                          variant="ghost-danger"
                                          size="sm"
                                          icon={icons.remove}
                                          aria-label={$i18n.t('spaces.removeMember')}
                                          onclick={() => { confirmRemove = m; showRemoveDialog = true; }}
                                      />
                                    </Tooltip>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </Table>

            <div class="flex flex-col gap-3 md:hidden">
                {#each members as m (m.id)}
                    {@const isCurrentUser = m.userId === $authStore.user?.id}
                    <Card class="flex flex-col gap-3 p-4">
                        <div class="flex items-center gap-3">
                            <Avatar name={`${m.user.firstName} ${m.user.lastName}`} size="sm" />
                            <div class="flex min-w-0 flex-1 flex-col">
                                <span class="truncate text-fc-sm font-medium text-fc-fg">
                                    {m.user.firstName} {m.user.lastName}
                                </span>
                                <span class="truncate text-fc-xs text-fc-fg-muted">{m.user.email}</span>
                            </div>
                            {#if canManage && !isCurrentUser && m.role !== 'OWNER'}
                                <Tooltip text={$i18n.t('spaces.removeMember')} describe={false} class="contents">
                                  <Button
                                      variant="ghost-danger"
                                      size="sm"
                                      icon={icons.remove}
                                      aria-label={$i18n.t('spaces.removeMember')}
                                      onclick={() => { confirmRemove = m; showRemoveDialog = true; }}
                                  />
                                </Tooltip>
                            {/if}
                        </div>
                        {@render roleCell(m, isCurrentUser)}
                    </Card>
                {/each}
            </div>
        </Section>

        {#if !isOwner && !space.manageUrl}
            <Section title={$i18n.t('spaces.leaveSpace')} card>
                <div>
                    <Button
                        variant="ghost-danger"
                        icon={icons.logout}
                        onclick={() => { showLeaveDialog = true; }}
                    >
                        {$i18n.t('spaces.leaveSpace')}
                    </Button>
                </div>
            </Section>
        {/if}
    {/if}
</Page>

<ConfirmModal
    bind:open={showRemoveDialog}
    title={$i18n.t('spaces.removeMember')}
    description={$i18n.t('spaces.removeConfirm', { name: confirmRemove ? `${confirmRemove.user.firstName} ${confirmRemove.user.lastName}` : '' })}
    confirmLabel={$i18n.t('spaces.removeMember')}
    cancelLabel={$i18n.t('common.buttons.cancel')}
    tone="danger"
    onConfirm={handleRemoveMember}
    onCancel={() => { confirmRemove = null; showRemoveDialog = false; }}
/>

<ConfirmModal
    bind:open={showLeaveDialog}
    title={$i18n.t('spaces.leaveSpace')}
    description={$i18n.t('spaces.leaveConfirm')}
    confirmLabel={$i18n.t('spaces.leaveSpace')}
    cancelLabel={$i18n.t('common.buttons.cancel')}
    tone="danger"
    onConfirm={handleLeave}
    onCancel={() => { showLeaveDialog = false; }}
/>
