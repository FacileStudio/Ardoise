<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import 'iconify-icon';

    let name = $state('');
    let description = $state('');
    let saving = $state(false);
    let error = $state('');

    async function handleSubmit() {
        if (!name.trim()) {
            error = $i18n.t('spaces.name') + ' is required';
            return;
        }

        saving = true;
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
            saving = false;
        }
    }
</script>

<div class="flex h-full flex-col">
    <div class="border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div class="flex items-center gap-3">
            <a href={resolve('/admin/spaces')} class="text-muted-foreground transition-colors hover:text-foreground" aria-label="Back to spaces">
                <iconify-icon icon="solar:arrow-left-linear" width="20"></iconify-icon>
            </a>
            <h1 class="text-lg font-semibold">{$i18n.t('spaces.newSpace')}</h1>
        </div>
    </div>

    <div class="flex-1 overflow-auto px-4 py-6 md:px-8">
        <div class="max-w-xl space-y-6">
            <div class="space-y-4">
                <div>
                    <label for="space-name" class="mb-1.5 block text-sm font-medium">
                        {$i18n.t('spaces.name')}
                    </label>
                    <input
                        id="space-name"
                        type="text"
                        bind:value={name}
                        placeholder={$i18n.t('spaces.namePlaceholder')}
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
                <div>
                    <label for="space-description" class="mb-1.5 block text-sm font-medium">
                        {$i18n.t('spaces.description')}
                    </label>
                    <textarea
                        id="space-description"
                        bind:value={description}
                        placeholder={$i18n.t('spaces.descriptionPlaceholder')}
                        rows="3"
                        class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    ></textarea>
                </div>
            </div>

            {#if error}
                <p class="text-sm text-destructive">{error}</p>
            {/if}

            <div class="flex items-center gap-3">
                <button
                    class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    onclick={handleSubmit}
                    disabled={saving}
                >
                    {saving ? $i18n.t('spaces.creating') : $i18n.t('spaces.createSpace')}
                </button>
                <a
                    href={resolve('/admin/spaces')}
                    class="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                    {$i18n.t('common.buttons.cancel')}
                </a>
            </div>
        </div>
    </div>
</div>
