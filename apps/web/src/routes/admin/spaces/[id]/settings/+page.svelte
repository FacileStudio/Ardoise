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
        SecretField,
        Section,
        Spinner,
        Switch,
        Textarea,
        toast,
    } from '@facile/muse';
    import { icons } from '$lib/icons';
    import { platformStaff } from '$lib/platform-staff.svelte';

    let space: any = $state(null);
    let loading = $state(true);
    let saving = $state(false);

    let name = $state('');
    let description = $state('');

    let showDeleteDialog = $state(false);
    let deleting = $state(false);

    let config: any = $state(null);
    let webhookSecret = $state('');
    let webhookEventsText = $state('');
    let savingConfig = $state(false);
    let savingWebhook = $state(false);
    let savingStudio = $state(false);

    const formatHelp = 'Variables : {{year}}, {{month}} et {{number}} (obligatoire, une seule fois).';
    const spaceId = $derived($page.params.id as string);

    function applyConfig(next: any) {
        config = {
            ...next,
            vatExemptionMention: next.vatExemptionMention ?? '',
            legalMentions: next.legalMentions ?? '',
            webhookUrl: next.webhookUrl ?? '',
        };
        webhookEventsText = next.webhookEvents.join('\n');
        webhookSecret = '';
    }

    onMount(async () => {
        void platformStaff.load();
        try {
            space = await trpc.space.get.query({ id: spaceId });
            name = space.name;
            description = space.description || '';
            if (space.role === 'OWNER' || space.role === 'ADMIN') {
                applyConfig(await trpc.space.getSettings.query({ id: spaceId }));
            }
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

    async function saveConfig() {
        savingConfig = true;
        try {
            applyConfig(
                await trpc.space.updateSettings.mutate({
                    id: spaceId,
                    invoiceNumberFormat: config.invoiceNumberFormat,
                    quoteNumberFormat: config.quoteNumberFormat,
                    paymentTermsDays: Number(config.paymentTermsDays),
                    recoveryFeeAmount: Number(config.recoveryFeeAmount),
                    lateFeeRate: config.lateFeeRate,
                    vatExemptionMention: config.vatExemptionMention.trim() || null,
                    legalMentions: config.legalMentions.trim() || null,
                })
            );
            toast.success($i18n.t('admin.settings.actions.saved'));
        } catch (err: any) {
            logger.error({ err }, 'Failed to save space settings');
            toast.danger(err?.message || $i18n.t('common.actions.error'));
        } finally {
            savingConfig = false;
        }
    }

    async function saveWebhook(clear = false) {
        savingWebhook = true;
        try {
            const url = config.webhookUrl.trim();
            applyConfig(
                await trpc.space.updateSettings.mutate({
                    id: spaceId,
                    webhookUrl: clear || !url ? null : url,
                    ...(clear ? {} : { webhookEvents: webhookEventsText.split(/[\n,]/).map((e) => e.trim()).filter(Boolean) }),
                    ...(!clear && url && webhookSecret ? { webhookSecret } : {}),
                })
            );
            toast.success($i18n.t('admin.settings.actions.saved'));
        } catch (err: any) {
            logger.error({ err }, 'Failed to save space webhook');
            toast.danger(err?.message || $i18n.t('common.actions.error'));
        } finally {
            savingWebhook = false;
        }
    }

    async function setPlatformStudio(platformStudio: boolean) {
        savingStudio = true;
        try {
            const updated = await trpc.space.setPlatformStudio.mutate({ id: spaceId, platformStudio });
            space = { ...space, platformStudio: updated.platformStudio };
            toast.success($i18n.t('admin.settings.actions.saved'));
        } catch (err: any) {
            logger.error({ err }, 'Failed to set platform studio');
            toast.danger(err?.message || $i18n.t('common.actions.error'));
        } finally {
            savingStudio = false;
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
        <EmptyState icon={icons.space} title="Espace introuvable">
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

        {#if canManage && config}
            <Section title="Numérotation des documents" card>
                <p class="text-fc-sm text-fc-fg-muted">
                    Les numéros de factures et de devis sont continus, sans trou ni réutilisation, séparément pour chaque espace.
                </p>
                <Field label="Format des factures" helper={formatHelp}>
                    <Input bind:value={config.invoiceNumberFormat} class="font-fc-mono" />
                </Field>
                <Field label="Format des devis" helper={formatHelp}>
                    <Input bind:value={config.quoteNumberFormat} class="font-fc-mono" />
                </Field>
            </Section>

            <Section title="Paiement et mentions légales" card>
                <div class="grid gap-4 sm:grid-cols-2">
                    <Field label="Délai de paiement (jours)">
                        <Input bind:value={config.paymentTermsDays} type="number" />
                    </Field>
                    <Field label="Indemnité de recouvrement (€)">
                        <Input bind:value={config.recoveryFeeAmount} type="number" step="0.01" />
                    </Field>
                </div>
                <Field label="Pénalités de retard">
                    <Input bind:value={config.lateFeeRate} />
                </Field>
                <Field label="Mention de TVA" helper="Exemple : TVA non applicable, article 293 B du CGI">
                    <Input bind:value={config.vatExemptionMention} />
                </Field>
                <Field label="Autres mentions légales" helper="Ajoutées en pied des factures, devis et contrats.">
                    <Textarea bind:value={config.legalMentions} rows={3} />
                </Field>
                <div>
                    <Button icon={icons.check} onclick={saveConfig} disabled={savingConfig}>
                        {savingConfig ? $i18n.t('spaces.saving') : $i18n.t('spaces.save')}
                    </Button>
                </div>
            </Section>

            <Section title="Webhook sortant" card>
                <p class="text-fc-sm text-fc-fg-muted">
                    Ardoise envoie les événements de cet espace à votre URL, signés en HMAC SHA-256 (en-tête x-ardoise-signature-256). https uniquement, jamais d'adresse privée.
                </p>
                <Field label="URL">
                    <Input bind:value={config.webhookUrl} type="url" placeholder="https://" class="font-fc-mono" />
                </Field>
                <Field label="Secret de signature" helper={config.webhookSecretSet ? 'Un secret est défini. Laissez vide pour le conserver.' : '16 caractères au minimum.'}>
                    <SecretField bind:value={webhookSecret} editable placeholder="Nouveau secret" />
                </Field>
                <Field label="Événements" helper="Un par ligne ; vide pour tous. Exemple : payment.*">
                    <Textarea bind:value={webhookEventsText} rows={3} class="font-fc-mono" />
                </Field>
                <div class="flex gap-2">
                    <Button icon={icons.check} onclick={() => saveWebhook()} disabled={savingWebhook}>
                        {savingWebhook ? $i18n.t('spaces.saving') : $i18n.t('spaces.save')}
                    </Button>
                    {#if config.webhookUrl}
                        <Button variant="ghost" icon={icons.remove} onclick={() => saveWebhook(true)} disabled={savingWebhook}>
                            Supprimer le webhook
                        </Button>
                    {/if}
                </div>
            </Section>
        {/if}

        {#if platformStaff.staff}
            <Section title="Studio de la plateforme" card>
                <p class="text-fc-sm text-fc-fg-muted">
                    Seul un espace marqué ainsi peut utiliser le Stripe, le SMTP, Plume, Nuage et le webhook de la plateforme, ainsi que les prestataires partagés. Réservé à l'équipe Facile Studio.
                </p>
                <Switch
                    label="Espace du studio de la plateforme"
                    checked={space.platformStudio === true}
                    disabled={savingStudio}
                    onchange={(event: Event) => setPlatformStudio((event.currentTarget as HTMLInputElement).checked)}
                />
            </Section>
        {/if}

        {#if space.manageUrl}
            <div>
                <Button href={space.manageUrl} variant="ghost" icon={icons.space}>
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
