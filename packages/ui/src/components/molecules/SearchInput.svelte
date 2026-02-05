<script lang="ts">
    import { cn } from '@repo/utils';

    let {
        value = $bindable(''),
        placeholder = 'Search...',
        icon = 'solar:magnifer-linear',
        class: className = '',
        oninput
    }: {
        value?: string;
        placeholder?: string;
        icon?: string;
        class?: string;
        oninput?: (event: Event) => void;
    } = $props();
</script>

<div class={cn("relative", className)}>
    <input
        type="text"
        bind:value
        {placeholder}
        {oninput}
        class="w-full px-6 py-3 bg-white border-2 border-slate-100 rounded-[24px] focus:border-indigo-500 outline-none transition-all font-medium text-sm"
    />
</div>
