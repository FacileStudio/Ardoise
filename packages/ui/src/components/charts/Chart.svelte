<script lang="ts">
    import { cn } from '@repo/utils';

    let {
        width = $bindable(0),
        height = 300,
        class: className = '',
    }: {
        data?: any[];
        config?: Record<string, { label: string; color: string; icon?: string }>;
        padding?: { top: number; right: number; bottom: number; left: number };
        width?: number;
        height?: number;
        class?: string;
    } = $props();

    let container: HTMLDivElement;

    $effect(() => {
        if (container) {
            width = container.clientWidth;
        }
    });
</script>

<svelte:window on:resize={() => {
    if (container)
        width = container.clientWidth;
}} />

<div bind:this={container} class={cn("w-full", className)} style="height: {height}px">
        <slot />
</div>
