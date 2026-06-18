<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import { Alert } from '@repo/ui';
    import 'iconify-icon';

    let name = $state('');
    let description = $state('');
    let loading = $state(false);
    let error = $state('');

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!name.trim()) return;

        loading = true;
        error = '';
        try {
            const space = await trpc.space.create.mutate({
                name: name.trim(),
                description: description.trim() || undefined,
            });
            await goto(resolve(`/admin/spaces/${space.id}`));
        } catch (err: any) {
            logger.error({ err }, 'Failed to create space');
            error = err?.message || $i18n.t('common.actions.error');
        } finally {
            loading = false;
        }
    }
</script>

<div class="p-8 max-w-[600px] mx-auto space-y-6">
    <header>
        <div class="flex items-center gap-2 mb-4">
            <button
                onclick={() => goto(resolve('/admin/spaces'))}
                class="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
                <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon>
            </button>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">{$i18n.t('spaces.newSpace')}</h1>
    </header>

    {#if error}
        <Alert variant="danger" dismissible>{error}</Alert>
    {/if}

    <form onsubmit={handleSubmit} class="space-y-4">
        <div>
            <label for="name" class="block text-sm font-medium text-foreground mb-1.5">
                {$i18n.t('spaces.name')}
            </label>
            <input
                id="name"
                type="text"
                bind:value={name}
                placeholder={$i18n.t('spaces.namePlaceholder')}
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
                type="button"
                onclick={() => goto(resolve('/admin/spaces'))}
                class="rounded-md px-4 h-9 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
                {$i18n.t('common.buttons.cancel')}
            </button>
            <button
                type="submit"
                disabled={loading || !name.trim()}
                class="bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {#if loading}
                    <iconify-icon icon="svg-spinners:ring-resize" width="16"></iconify-icon>
                    {$i18n.t('spaces.creating')}
                {:else}
                    {$i18n.t('spaces.createSpace')}
                {/if}
            </button>
        </div>
    </form>
</div>
