<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import { ConfirmModal } from '@facile/muse';
    import authStore from '$lib/auth-store';
    import 'iconify-icon';

    let members: any[] = $state([]);
    let space: any = $state(null);
    let loading = $state(true);
    let error = $state('');

    let addUserId = $state('');
    let addRole = $state('MEMBER');
    let addError = $state('');
    let adding = $state(false);

    let confirmRemove: any = $state(null);
    let showRemoveDialog = $state(false);
    let removeLoading = $state(false);

    let showLeaveDialog = $state(false);
    let leaveLoading = $state(false);

    const spaceId = $derived($page.params.id);

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

    const canManage = $derived(space?.role === 'OWNER' || space?.role === 'ADMIN');
    const isOwner = $derived(space?.role === 'OWNER');

    async function addMember() {
        if (!addUserId.trim()) {
            addError = $i18n.t('spaces.emailPlaceholder');
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
            addError = err?.message || $i18n.t('common.actions.error');
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
            error = err?.message || $i18n.t('common.actions.error');
            confirmRemove = null;
            showRemoveDialog = false;
            setTimeout(() => { error = ''; }, 5000);
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
            error = err?.message || $i18n.t('common.actions.error');
            setTimeout(() => { error = ''; }, 5000);
        }
    }

    async function handleLeave() {
        leaveLoading = true;
        try {
            await trpc.space.leave.mutate({ spaceId });
            await goto(resolve('/admin/spaces'));
        } catch (err: any) {
            logger.error({ err }, 'Failed to leave space');
            error = err?.message || $i18n.t('common.actions.error');
            showLeaveDialog = false;
            setTimeout(() => { error = ''; }, 5000);
        } finally {
            leaveLoading = false;
        }
    }

    function roleBadgeClass(role: string): string {
        switch (role) {
            case 'OWNER': return 'bg-fc-warning/10 text-fc-warning';
            case 'ADMIN': return 'bg-fc-info/10 text-fc-info';
            default: return 'bg-muted text-muted-foreground';
        }
    }
</script>

<div class="flex h-full flex-col">
    <div class="border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div class="flex items-center gap-3">
            <a href={resolve(`/admin/spaces/${spaceId}`)} class="text-muted-foreground transition-colors hover:text-foreground" aria-label="Back to space">
                <iconify-icon icon="solar:arrow-left-linear" width="20"></iconify-icon>
            </a>
            <div>
                <h1 class="text-lg font-semibold">{$i18n.t('spaces.membersTitle')}</h1>
                {#if space}
                    <p class="mt-0.5 text-sm text-muted-foreground">{space.name}</p>
                {/if}
            </div>
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
            </div>
        {:else}
            <div class="max-w-2xl space-y-8">
                {#if canManage}
                    <div class="space-y-3">
                        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{$i18n.t('spaces.addMember')}</h2>
                        <div class="flex items-end gap-2">
                            <div class="flex-1">
                                <label for="user-email" class="mb-1.5 block text-sm font-medium">{$i18n.t('spaces.emailPlaceholder')}</label>
                                <input
                                    id="user-email"
                                    type="email"
                                    bind:value={addUserId}
                                    placeholder={$i18n.t('spaces.emailPlaceholder')}
                                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <div class="w-32">
                                <label for="add-role" class="mb-1.5 block text-sm font-medium">{$i18n.t('spaces.role')}</label>
                                <select
                                    id="add-role"
                                    bind:value={addRole}
                                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="MEMBER">{$i18n.t('spaces.roles.MEMBER')}</option>
                                    <option value="ADMIN">{$i18n.t('spaces.roles.ADMIN')}</option>
                                </select>
                            </div>
                            <button
                                class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                onclick={addMember}
                                disabled={adding}
                            >
                                {adding ? $i18n.t('spaces.adding') : $i18n.t('spaces.addMember')}
                            </button>
                        </div>
                        {#if addError}
                            <p class="text-sm text-destructive">{addError}</p>
                        {/if}
                    </div>
                {/if}

                {#if error}
                    <p class="text-sm text-destructive">{error}</p>
                {/if}

                <div class="space-y-3">
                    <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        {members.length} {members.length === 1 ? $i18n.t('spaces.member') : $i18n.t('spaces.members').toLowerCase()}
                    </h2>

                    {#each members as m (m.id)}
                        {@const isCurrentUser = m.userId === $authStore.user?.id}
                        <div class="flex items-center justify-between rounded-lg border border-border p-3">
                            <div class="flex items-center gap-3">
                                <div
                                    class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold"
                                >
                                    {(m.user?.firstName || m.user?.email || '?').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p class="text-sm font-medium">
                                        {m.user.firstName} {m.user.lastName}
                                        {#if isCurrentUser}
                                            <span class="text-xs text-muted-foreground ml-1">(you)</span>
                                        {/if}
                                    </p>
                                    <p class="text-xs text-muted-foreground">{m.user.email}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                {#if m.role === 'OWNER'}
                                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {roleBadgeClass('OWNER')}">
                                        {$i18n.t('spaces.roles.OWNER')}
                                    </span>
                                {:else if canManage && !isCurrentUser}
                                    <select
                                        value={m.role}
                                        onchange={(e) => updateRole(m.userId, (e.target as HTMLSelectElement).value)}
                                        class="h-8 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="MEMBER">{$i18n.t('spaces.roles.MEMBER')}</option>
                                        <option value="ADMIN">{$i18n.t('spaces.roles.ADMIN')}</option>
                                    </select>
                                    <button
                                        class="inline-flex h-8 items-center rounded-md px-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                                        onclick={() => { confirmRemove = m; showRemoveDialog = true; }}
                                        aria-label={$i18n.t('spaces.removeMember')}
                                    >
                                        <iconify-icon icon="solar:trash-bin-2-linear" width="14"></iconify-icon>
                                    </button>
                                {:else}
                                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {roleBadgeClass(m.role)}">
                                        {$i18n.t(`spaces.roles.${m.role}`)}
                                    </span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>

                {#if !isOwner}
                    <div class="space-y-4 border-t border-border pt-8">
                        <h2 class="text-sm font-semibold uppercase tracking-wider text-destructive">{$i18n.t('spaces.leaveSpace')}</h2>
                        <button
                            class="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                            onclick={() => { showLeaveDialog = true; }}
                        >
                            <iconify-icon icon="solar:logout-2-linear" width="16"></iconify-icon>
                            {$i18n.t('spaces.leaveSpace')}
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

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
