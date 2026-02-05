<script lang="ts">
    import { cn } from '@repo/utils';

    let {
        config = {},
        class: className = '',
    }: {
        config?: Record<string, { label: string; color: string; icon?: string }>;
        class?: string;
    } = $props();
</script>

<div class={cn("w-full", className)}>
    {@render children?.()}
</div>
