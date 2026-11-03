<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';
    import {
        Button,
        ConfirmModal,
        EmptyState,
        Field,
        Input,
        Page,
        PageHeader,
        Section,
        Spinner,
        Textarea,
        toast,
    } from '@facile/muse';
    import { icons } from '$lib/icons';

    let space: any = $state(null);
    let loading = $state(true);
    let saving = $state(false);

    let name = $state('');
    let description = $state('');

    let showDeleteDialog = $state(false);
    let deleting = $state(false);

    const spaceId = $derived($page.params.id as string);

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
        try {
            await trpc.space.update.mutate({
                id: spaceId,
                name: name.trim(),
                description: description.trim() || null,
            });
            toast.success($i18n.t('admin.settings.actions.saved'));
        } catch (err: any) {
            logger.error({ err }, 'Failed to update space');
            toast.danger(err?.message || $i18n.t('common.actions.error'));
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
            toast.danger(err?.message || $i18n.t('common.actions.error'));
            showDeleteDialog = false;
        } finally {
            deleting = false;
        }
    }
</script>

<svelte:head>
    <title>{$i18n.t('spaces.settings')} - Ardoise</title>
</svelte:head>

<Page width="md">
    {#if loading}
        <div class="flex min-h-[40dvh] items-center justify-center"><Spinner size="lg" /></div>
    {:else if !space}
        <EmptyState icon={icons.usersGroup} title="Espace introuvable">
            <Button href={resolve('/admin/spaces')} variant="ghost">{$i18n.t('spaces.title')}</Button>
        </EmptyState>
    {:else}
        <PageHeader
            title={$i18n.t('spaces.settings')}
            description={space.name}
            back={{ href: `/admin/spaces/${spaceId}`, label: space.name }}
        />

        {#if canManage}
            <Section title="Général" card>
                <Field label={$i18n.t('spaces.name')} helper={space.manageUrl ? $i18n.t('spaces.managedHint') : undefined}>
                    <Input bind:value={name} disabled={!!space.manageUrl} />
                </Field>
                <Field label={$i18n.t('spaces.description')}>
                    <Textarea bind:value={description} rows={3} placeholder={$i18n.t('spaces.descriptionPlaceholder')} />
                </Field>
                <div>
                    <Button icon={icons.check} onclick={saveSettings} disabled={saving || !name.trim()}>
                        {saving ? $i18n.t('spaces.saving') : $i18n.t('spaces.save')}
                    </Button>
                </div>
            </Section>
        {/if}

        {#if space.manageUrl}
            <div>
                <Button href={space.manageUrl} variant="ghost" icon={icons.usersGroup}>
                    {$i18n.t('spaces.manageInRegistre')}
                </Button>
            </div>
        {:else if isOwner}
            <Section title={$i18n.t('spaces.deleteSpace')} card>
                <p class="text-fc-sm text-fc-fg-muted">
                    {$i18n.t('spaces.deleteConfirm', { name: space.name })}
                </p>
                <div>
                    <Button
                        variant="danger"
                        icon={icons.remove}
                        onclick={() => { showDeleteDialog = true; }}
                        disabled={deleting}
                    >
                        {$i18n.t('spaces.deleteSpace')}
                    </Button>
                </div>
            </Section>
        {/if}
    {/if}
</Page>

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
