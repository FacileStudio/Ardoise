<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import { ConfirmModal } from '@facile/muse';
    import 'iconify-icon';

    let space: any = $state(null);
    let loading = $state(true);
    let saving = $state(false);
    let message = $state('');

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

    async function saveSettings() {
        if (!name.trim()) return;

        saving = true;
        message = '';
        try {
            await trpc.space.update.mutate({
                id: spaceId,
                name: name.trim(),
                description: description.trim() || null,
            });
            message = $i18n.t('admin.settings.actions.saved');
            setTimeout(() => { message = ''; }, 3000);
        } catch (err: any) {
            logger.error({ err }, 'Failed to update space');
            message = err?.message || $i18n.t('common.actions.error');
            setTimeout(() => { message = ''; }, 5000);
        } finally {
            saving = false;
        }
    }

    async function confirmDelete() {
        deleting = true;
        try {
            await trpc.space.delete.mutate({ id: spaceId });
            await goto(resolve('/admin/spaces'));
        } catch (err: any) {
            logger.error({ err }, 'Failed to delete space');
            message = err?.message || $i18n.t('common.actions.error');
            showDeleteDialog = false;
            setTimeout(() => { message = ''; }, 5000);
        } finally {
            deleting = false;
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
                <h1 class="text-lg font-semibold">{$i18n.t('spaces.settings')}</h1>
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
            <div class="max-w-xl space-y-8">
                {#if canManage}
                    <div class="space-y-4">
                        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">General</h2>
                        <div>
                            <label for="space-name" class="mb-1.5 block text-sm font-medium">
                                {$i18n.t('spaces.name')}
                            </label>
                            <input
                                id="space-name"
                                type="text"
                                bind:value={name}
                                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        <div>
                            <label for="space-desc" class="mb-1.5 block text-sm font-medium">
                                {$i18n.t('spaces.description')}
                            </label>
                            <textarea
                                id="space-desc"
                                bind:value={description}
                                placeholder={$i18n.t('spaces.descriptionPlaceholder')}
                                rows="3"
                                class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            ></textarea>
                        </div>
                        <div class="flex items-center gap-3">
                            <button
                                class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                onclick={saveSettings}
                                disabled={saving}
                            >
                                {saving ? $i18n.t('spaces.saving') : $i18n.t('spaces.save')}
                            </button>
                            {#if message}
                                <span class="text-sm text-muted-foreground">{message}</span>
                            {/if}
                        </div>
                    </div>
                {/if}

                {#if isOwner}
                    <div class="space-y-4 border-t border-border pt-8">
                        <h2 class="text-sm font-semibold uppercase tracking-wider text-destructive">{$i18n.t('spaces.deleteSpace')}</h2>
                        <p class="text-sm text-muted-foreground">
                            {$i18n.t('spaces.deleteConfirm', { name: space.name })}
                        </p>
                        <button
                            class="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                            onclick={() => { showDeleteDialog = true; }}
                            disabled={deleting}
                        >
                            <iconify-icon icon="solar:trash-bin-2-linear" width="16"></iconify-icon>
                            {$i18n.t('spaces.deleteSpace')}
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<ConfirmModal
    bind:open={showDeleteDialog}
    title={$i18n.t('spaces.deleteSpace')}
    description={$i18n.t('spaces.deleteConfirm', { name: space?.name || '' })}
    confirmLabel={$i18n.t('spaces.deleteSpace')}
    cancelLabel={$i18n.t('common.buttons.cancel')}
    tone="danger"
    onConfirm={confirmDelete}
    onCancel={() => { showDeleteDialog = false; }}
/>
