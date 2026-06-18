<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { spaceContext } from '$lib/space-context.svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { onMount } from 'svelte';
    import { i18n } from '@repo/i18n/svelte';
    import 'iconify-icon';

    let spaces: any[] = $state([]);
    let open = $state(false);
    let loading = $state(true);

    onMount(async () => {
        try {
            spaces = await trpc.space.list.query();
        } catch {
            spaces = [];
        } finally {
            loading = false;
        }
    });

    function handleSelect(space: any) {
        spaceContext.switchToSpace(space.id, space.name, space.role);
        open = false;
    }

    function handlePersonal() {
        spaceContext.switchToPersonal();
        open = false;
    }

    function handleClickOutside(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-space-switcher]')) {
            open = false;
        }
    }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" data-space-switcher>
    <button
        onclick={() => { open = !open; }}
        class="flex w-full items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
    >
        <iconify-icon
            icon={spaceContext.isPersonal ? 'solar:user-circle-linear' : 'solar:users-group-rounded-linear'}
            width="16"
            class="shrink-0 text-muted-foreground"
        ></iconify-icon>
        <span class="flex-1 truncate font-medium">
            {spaceContext.isPersonal ? $i18n.t('spaces.personal') : spaceContext.spaceName}
        </span>
        <iconify-icon
            icon="solar:alt-arrow-down-linear"
            width="14"
            class="shrink-0 text-muted-foreground transition-transform {open ? 'rotate-180' : ''}"
        ></iconify-icon>
    </button>

    {#if open}
        <div class="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-background shadow-lg">
            <div class="p-1">
                <button
                    onclick={handlePersonal}
                    class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors {spaceContext.isPersonal
                        ? 'bg-foreground text-background font-medium'
                        : 'text-foreground hover:bg-muted'}"
                >
                    <iconify-icon icon="solar:user-circle-linear" width="16" class="shrink-0"></iconify-icon>
                    <span class="flex-1 truncate">{$i18n.t('spaces.personal')}</span>
                    {#if spaceContext.isPersonal}
                        <iconify-icon icon="solar:check-circle-bold" width="14" class="shrink-0"></iconify-icon>
                    {/if}
                </button>

                {#if spaces.length > 0}
                    <div class="my-1 h-px bg-border"></div>
                {/if}

                {#each spaces as space (space.id)}
                    <button
                        onclick={() => handleSelect(space)}
                        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors {spaceContext.spaceId === space.id
                            ? 'bg-foreground text-background font-medium'
                            : 'text-foreground hover:bg-muted'}"
                    >
                        <iconify-icon icon="solar:users-group-rounded-linear" width="16" class="shrink-0"></iconify-icon>
                        <span class="flex-1 truncate">{space.name}</span>
                        {#if spaceContext.spaceId === space.id}
                            <iconify-icon icon="solar:check-circle-bold" width="14" class="shrink-0"></iconify-icon>
                        {/if}
                    </button>
                {/each}

                <div class="my-1 h-px bg-border"></div>

                <button
                    onclick={() => { open = false; goto(resolve('/admin/spaces')); }}
                    class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <iconify-icon icon="solar:settings-linear" width="16" class="shrink-0"></iconify-icon>
                    <span>{$i18n.t('spaces.title')}</span>
                </button>

                <button
                    onclick={() => { open = false; goto(resolve('/admin/spaces/new')); }}
                    class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <iconify-icon icon="mdi:plus" width="16" class="shrink-0"></iconify-icon>
                    <span>{$i18n.t('spaces.createSpace')}</span>
                </button>
            </div>
        </div>
    {/if}
</div>
