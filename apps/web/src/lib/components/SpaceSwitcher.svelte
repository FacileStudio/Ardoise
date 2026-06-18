<script lang="ts">
    import { trpc } from '$lib/trpc';
    import { spaceContext } from '$lib/space-context.svelte';
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

    function selectSpace(space: any) {
        spaceContext.switchToSpace(space.id, space.name, space.role);
        open = false;
    }

    function selectPersonal() {
        spaceContext.switchToPersonal();
        open = false;
    }

    function handleClickOutside(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (!target.closest('.space-switcher')) {
            open = false;
        }
    }

    $effect(() => {
        if (open) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    });
</script>

{#if !loading && spaces.length > 0}
    <div class="space-switcher relative px-3 pb-2">
        <button
            class="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
            onclick={() => open = !open}
        >
            <iconify-icon
                icon={spaceContext.isPersonal ? 'solar:user-circle-bold-duotone' : 'solar:users-group-rounded-bold-duotone'}
                width="18"
                class="shrink-0 text-muted-foreground"
            ></iconify-icon>
            <span class="min-w-0 flex-1 truncate font-medium">
                {spaceContext.isPersonal ? $i18n.t('spaces.personal') : spaceContext.spaceName}
            </span>
            <iconify-icon
                icon="solar:alt-arrow-down-linear"
                width="14"
                class="shrink-0 text-muted-foreground transition-transform {open ? 'rotate-180' : ''}"
            ></iconify-icon>
        </button>

        {#if open}
            <div class="absolute left-3 right-3 z-50 mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                <div class="max-h-64 overflow-auto p-1">
                    <button
                        class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors {spaceContext.isPersonal ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted'}"
                        onclick={selectPersonal}
                    >
                        <iconify-icon icon="solar:user-circle-bold-duotone" width="16" class="shrink-0"></iconify-icon>
                        {$i18n.t('spaces.personal')}
                    </button>

                    {#each spaces as space (space.id)}
                        <button
                            class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors {spaceContext.spaceId === space.id ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted'}"
                            onclick={() => selectSpace(space)}
                        >
                            <iconify-icon icon="solar:users-group-rounded-bold-duotone" width="16" class="shrink-0"></iconify-icon>
                            <span class="min-w-0 flex-1 truncate">{space.name}</span>
                            <span class="shrink-0 text-xs opacity-60">{$i18n.t(`spaces.roles.${space.role}`)}</span>
                        </button>
                    {/each}
                </div>

                <div class="border-t border-border p-1">
                    <a
                        href={resolve('/admin/spaces')}
                        class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onclick={() => open = false}
                    >
                        <iconify-icon icon="solar:settings-linear" width="16" class="shrink-0"></iconify-icon>
                        {$i18n.t('spaces.title')}
                    </a>
                </div>
            </div>
        {/if}
    </div>
{/if}
