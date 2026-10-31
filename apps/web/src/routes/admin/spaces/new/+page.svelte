<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { Alert, Button, Field, Input, Page, PageHeader, Section, Textarea } from '@facile/muse';
    import { i18n } from '@repo/i18n/svelte';
    import { logger } from '@repo/logger';

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

<svelte:head>
    <title>{$i18n.t('spaces.newSpace')} - Ardoise</title>
</svelte:head>

<Page width="md">
    <PageHeader
        title={$i18n.t('spaces.newSpace')}
        back={{ href: '/admin/spaces', label: $i18n.t('spaces.title') }}
    />

    <Section card>
        <Field label={$i18n.t('spaces.name')}>
            <Input bind:value={name} placeholder={$i18n.t('spaces.namePlaceholder')} />
        </Field>
        <Field label={$i18n.t('spaces.description')}>
            <Textarea bind:value={description} rows={3} placeholder={$i18n.t('spaces.descriptionPlaceholder')} />
        </Field>
        {#if error}
            <Alert tone="danger">{error}</Alert>
        {/if}
    </Section>

    <div class="flex justify-end gap-3">
        <Button href={resolve('/admin/spaces')} variant="ghost">{$i18n.t('common.buttons.cancel')}</Button>
        <Button onclick={handleSubmit} disabled={saving}>
            {saving ? $i18n.t('spaces.creating') : $i18n.t('spaces.createSpace')}
        </Button>
    </div>
</Page>
