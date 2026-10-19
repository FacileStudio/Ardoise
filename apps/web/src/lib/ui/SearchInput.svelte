<script lang="ts">
    import { cn } from '@repo/utils';
    import 'iconify-icon';

    let {
        value = $bindable(''),
        placeholder = 'Search...',
        class: className = '',
        oninput
    }: {
        value?: string;
        placeholder?: string;
        class?: string;
        oninput?: () => void;
    } = $props();
</script>

<div class={cn("relative", className)}>
    <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
        <iconify-icon icon="solar:magnifer-linear" width="16"></iconify-icon>
    </div>
    <input
        type="text"
        bind:value
        {placeholder}
        {oninput}
        class="h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
    />
</div>
