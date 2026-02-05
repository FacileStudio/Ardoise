<script lang="ts">
    import { cn } from '@repo/utils';
    import type { Snippet } from 'svelte';

    let {
        width = $bindable(0),
        height = 300,
        class: className = '',
        children,
    }: {
        width?: number;
        height?: number;
        class?: string;
        children?: Snippet;
    } = $props();

    let container: HTMLDivElement;

    $effect(() => {
        if (container) {
            width = container.clientWidth;
        }
    });
</script>

<svelte:window onresize={() => {
    if (container)
        width = container.clientWidth;
}} />

<div bind:this={container} class={cn("w-full", className)} style="height: {height}px">
        {@render children?.()}
</div>
