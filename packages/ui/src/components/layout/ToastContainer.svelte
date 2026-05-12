<script lang="ts">
    import { toast } from '@repo/utils';
    import { flip } from 'svelte/animate';
    import { fly } from 'svelte/transition';
    import 'iconify-icon';

    const icons = {
        success: 'solar:check-circle-bold',
        error: 'solar:danger-circle-bold',
        info: 'solar:info-circle-bold',
        warning: 'solar:bell-bold'
    };

    const colors = {
        success: 'text-green-600',
        error: 'text-red-600',
        info: 'text-foreground',
        warning: 'text-amber-600'
    };
</script>

<div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-[320px]">
    {#each $toast as t (t.id)}
        <div
            animate:flip={{ duration: 300 }}
            in:fly={{ x: 50, duration: 400 }}
            out:fly={{ x: 50, duration: 300 }}
            class="flex items-center gap-4 p-4 rounded-lg border border-border bg-card shadow-lg"
        >
            <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-muted {colors[t.type]}">
                <iconify-icon icon={icons[t.type]} width="24"></iconify-icon>
            </div>

            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-card-foreground leading-tight line-clamp-2">
                    {t.message}
                </p>
            </div>

            <button
                on:click={() => toast.remove(t.id)}
                class="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Close notification"
            >
                <iconify-icon icon="solar:close-circle-bold" width="18"></iconify-icon>
            </button>
        </div>
    {/each}
</div>
