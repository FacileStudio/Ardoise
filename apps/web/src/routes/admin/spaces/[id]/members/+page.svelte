<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import { Alert, ConfirmDialog } from '@repo/ui';
    import authStore from '$lib/auth-store';
    import 'iconify-icon';

    let members: any[] = $state([]);
    let space: any = $state(null);
    let loading = $state(true);
    let error = $state('');

    let showAddForm = $state(false);
    let addEmail = $state('');
    let addRole = $state('MEMBER');
    let addLoading = $state(false);

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

    async function handleAddMember(e: Event) {
        e.preventDefault();
        if (!addEmail.trim()) return;

        addLoading = true;
        error = '';
        try {
            await trpc.space.addMember.mutate({
                spaceId,
                email: addEmail.trim(),
                role: addRole as any,
            });
            addEmail = '';
            addRole = 'MEMBER';
            showAddForm = false;
            await fetchData();
        } catch (err: any) {
            logger.error({ err }, 'Failed to add member');
            error = err?.message || $i18n.t('common.actions.error');
            setTimeout(() => { error = ''; }, 5000);
        } finally {
            addLoading = false;
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

    async function handleRoleChange(userId: string, newRole: string) {
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
    <div class="p-8 max-w-[900px] mx-auto space-y-6">
        {#if error}
            <Alert variant="danger" dismissible>{error}</Alert>
        {/if}

        <header>
            <div class="flex items-center gap-2 mb-4">
                <button
                    onclick={() => goto(resolve(`/admin/spaces/${spaceId}`))}
                    class="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon>
                </button>
            </div>
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold tracking-tight text-foreground">{$i18n.t('spaces.membersTitle')}</h1>
                    <p class="text-sm text-muted-foreground mt-1">{space.name} &middot; {members.length} {members.length === 1 ? $i18n.t('spaces.member') : $i18n.t('spaces.members').toLowerCase()}</p>
                </div>
                <div class="flex gap-2">
                    {#if !isOwner}
                        <button
                            onclick={() => { showLeaveDialog = true; }}
                            class="rounded-md px-4 h-9 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                        >
                            <iconify-icon icon="solar:logout-2-linear" width="16"></iconify-icon>
                            {$i18n.t('spaces.leaveSpace')}
                        </button>
                    {/if}
                    {#if canManage}
                        <button
                            onclick={() => { showAddForm = !showAddForm; }}
                            class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
                        >
                            <iconify-icon icon="mdi:plus" width="18"></iconify-icon>
                            {$i18n.t('spaces.addMember')}
                        </button>
                    {/if}
                </div>
            </div>
        </header>

        {#if showAddForm && canManage}
            <form onsubmit={handleAddMember} class="rounded-xl border border-border p-4 space-y-3">
                <p class="text-sm text-muted-foreground">{$i18n.t('spaces.addMemberDescription')}</p>
                <div class="flex gap-3">
                    <input
                        type="email"
                        bind:value={addEmail}
                        placeholder={$i18n.t('spaces.emailPlaceholder')}
                        required
                        class="h-9 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground transition-colors"
                    />
                    <select
                        bind:value={addRole}
                        class="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground transition-colors"
                    >
                        <option value="MEMBER">{$i18n.t('spaces.roles.MEMBER')}</option>
                        <option value="ADMIN">{$i18n.t('spaces.roles.ADMIN')}</option>
                    </select>
                    <button
                        type="submit"
                        disabled={addLoading || !addEmail.trim()}
                        class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {#if addLoading}
                            <iconify-icon icon="svg-spinners:ring-resize" width="16"></iconify-icon>
                            {$i18n.t('spaces.adding')}
                        {:else}
                            {$i18n.t('spaces.addMember')}
                        {/if}
                    </button>
                </div>
            </form>
        {/if}

        <div class="rounded-xl border border-border overflow-hidden">
            <table class="w-full">
                <thead class="border-b border-border">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{$i18n.t('spaces.role')}</th>
                        {#if canManage}
                            <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        {/if}
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each members as m (m.id)}
                        {@const isCurrentUser = m.userId === $authStore.user?.id}
                        <tr class="hover:bg-muted/50 transition-colors">
                            <td class="px-4 py-3">
                                <div class="font-medium text-foreground">
                                    {m.user.firstName} {m.user.lastName}
                                    {#if isCurrentUser}
                                        <span class="text-xs text-muted-foreground ml-1">(you)</span>
                                    {/if}
                                </div>
                                <div class="text-sm text-muted-foreground">{m.user.email}</div>
                            </td>
                            <td class="px-4 py-3">
                                {#if isOwner && m.role !== 'OWNER' && !isCurrentUser}
                                    <select
                                        value={m.role}
                                        onchange={(e) => handleRoleChange(m.userId, (e.target as HTMLSelectElement).value)}
                                        class="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-foreground transition-colors"
                                    >
                                        <option value="MEMBER">{$i18n.t('spaces.roles.MEMBER')}</option>
                                        <option value="ADMIN">{$i18n.t('spaces.roles.ADMIN')}</option>
                                    </select>
                                {:else}
                                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {getRoleBadgeClass(m.role)}">
                                        {$i18n.t(`spaces.roles.${m.role}`)}
                                    </span>
                                {/if}
                            </td>
                            {#if canManage}
                                <td class="px-4 py-3">
                                    <div class="flex items-center justify-end">
                                        {#if m.role !== 'OWNER' && !isCurrentUser}
                                            <button
                                                onclick={() => { confirmRemove = m; showRemoveDialog = true; }}
                                                class="p-2 text-muted-foreground hover:text-red-600 hover:bg-muted rounded-md transition-colors"
                                                title={$i18n.t('spaces.removeMember')}
                                            >
                                                <iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
                                            </button>
                                        {/if}
                                    </div>
                                </td>
                            {/if}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
{/if}

<ConfirmDialog
    bind:isOpen={showRemoveDialog}
    title={$i18n.t('spaces.removeMember')}
    description={$i18n.t('spaces.removeConfirm', { name: confirmRemove ? `${confirmRemove.user.firstName} ${confirmRemove.user.lastName}` : '' })}
    confirmText={$i18n.t('spaces.removeMember')}
    cancelText={$i18n.t('common.buttons.cancel')}
    variant="danger"
    onConfirm={handleRemoveMember}
    onCancel={() => { confirmRemove = null; showRemoveDialog = false; }}
/>

<ConfirmDialog
    bind:isOpen={showLeaveDialog}
    title={$i18n.t('spaces.leaveSpace')}
    description={$i18n.t('spaces.leaveConfirm')}
    confirmText={$i18n.t('spaces.leaveSpace')}
    cancelText={$i18n.t('common.buttons.cancel')}
    variant="danger"
    onConfirm={handleLeave}
    onCancel={() => { showLeaveDialog = false; }}
/>
