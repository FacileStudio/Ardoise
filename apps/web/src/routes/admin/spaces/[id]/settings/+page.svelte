<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import { Alert, ConfirmDialog } from '@repo/ui';
    import 'iconify-icon';

    let space: any = $state(null);
    let loading = $state(true);
    let saving = $state(false);
    let error = $state('');
    let success = $state('');

    let name = $state('');
    let description = $state('');

    let showDeleteDialog = $state(false);
    let deleting = $state(false);

    const spaceId = $derived($page.params.id);

    onMount(async () => {
        try {
            space = await trpc.space.get.query({ id: spaceId });
            name = space.name;
            description = space.description || '';
        } catch (err) {
            logger.error({ err }, 'Failed to fetch space');
        } finally {
            loading = false;
        }
    });

    const isOwner = $derived(space?.role === 'OWNER');
    const canManage = $derived(space?.role === 'OWNER' || space?.role === 'ADMIN');

    async function handleSave(e: Event) {
        e.preventDefault();
        if (!name.trim()) return;

        saving = true;
        error = '';
        success = '';
        try {
            await trpc.space.update.mutate({
                id: spaceId,
                name: name.trim(),
                description: description.trim() || null,
            });
            success = $i18n.t('admin.settings.actions.saved');
            setTimeout(() => { success = ''; }, 3000);
        } catch (err: any) {
            logger.error({ err }, 'Failed to update space');
            error = err?.message || $i18n.t('common.actions.error');
            setTimeout(() => { error = ''; }, 5000);
        } finally {
            saving = false;
        }
    }

    async function handleDelete() {
        deleting = true;
        try {
            await trpc.space.delete.mutate({ id: spaceId });
            await goto(resolve('/admin/spaces'));
        } catch (err: any) {
            logger.error({ err }, 'Failed to delete space');
            error = err?.message || $i18n.t('common.actions.error');
            showDeleteDialog = false;
            setTimeout(() => { error = ''; }, 5000);
        } finally {
            deleting = false;
        }
    }
</script>

{#if loading}
    <div class="flex flex-col items-center justify-center h-screen space-y-4">
        <iconify-icon icon="svg-spinners:blocks-shuffle-3" width="40" class="text-foreground"></iconify-icon>
        <p class="text-sm text-muted-foreground">{$i18n.t('common.actions.loading')}</p>
    </div>
{:else if space}
    <div class="p-8 max-w-[600px] mx-auto space-y-6">
        {#if error}
            <Alert variant="danger" dismissible>{error}</Alert>
        {/if}
        {#if success}
            <Alert variant="success" dismissible>{success}</Alert>
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
            <h1 class="text-2xl font-bold tracking-tight text-foreground">{$i18n.t('spaces.settings')}</h1>
            <p class="text-sm text-muted-foreground mt-1">{space.name}</p>
        </header>

        {#if canManage}
            <form onsubmit={handleSave} class="space-y-4">
                <div>
                    <label for="name" class="block text-sm font-medium text-foreground mb-1.5">
                        {$i18n.t('spaces.name')}
                    </label>
                    <input
                        id="name"
                        type="text"
                        bind:value={name}
                        required
                        class="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground transition-colors"
                    />
                </div>

                <div>
                    <label for="description" class="block text-sm font-medium text-foreground mb-1.5">
                        {$i18n.t('spaces.description')}
                    </label>
                    <textarea
                        id="description"
                        bind:value={description}
                        placeholder={$i18n.t('spaces.descriptionPlaceholder')}
                        rows="3"
                        class="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground transition-colors resize-none"
                    ></textarea>
                </div>

                <div class="flex justify-end gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={saving || !name.trim()}
                        class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {#if saving}
                            <iconify-icon icon="svg-spinners:ring-resize" width="16"></iconify-icon>
                            {$i18n.t('spaces.saving')}
                        {:else}
                            {$i18n.t('spaces.save')}
                        {/if}
                    </button>
                </div>
            </form>
        {/if}

        {#if isOwner}
            <div class="h-px bg-border"></div>

            <div class="rounded-xl border border-destructive/30 p-4 space-y-3">
                <h3 class="text-sm font-medium text-destructive">{$i18n.t('spaces.deleteSpace')}</h3>
                <p class="text-sm text-muted-foreground">
                    {$i18n.t('spaces.deleteConfirm', { name: space.name })}
                </p>
                <button
                    onclick={() => { showDeleteDialog = true; }}
                    class="rounded-md px-4 h-9 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors flex items-center gap-2"
                >
                    <iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
                    {$i18n.t('spaces.deleteSpace')}
                </button>
            </div>
        {/if}
    </div>
{/if}

<ConfirmDialog
    bind:isOpen={showDeleteDialog}
    title={$i18n.t('spaces.deleteSpace')}
    description={$i18n.t('spaces.deleteConfirm', { name: space?.name || '' })}
    confirmText={$i18n.t('spaces.deleteSpace')}
    cancelText={$i18n.t('common.buttons.cancel')}
    variant="danger"
    onConfirm={handleDelete}
    onCancel={() => { showDeleteDialog = false; }}
/>
