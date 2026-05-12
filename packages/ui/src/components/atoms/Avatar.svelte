<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';

    const avatarClass = cva(
        "rounded-full border border-border bg-muted flex items-center justify-center font-semibold text-muted-foreground overflow-hidden",
        {
            variants: {
                size: {
                    xs: "w-8 h-8 text-xs",
                    sm: "w-10 h-10 text-sm",
                    md: "w-12 h-12 text-base",
                    lg: "w-16 h-16 text-lg",
                    xl: "w-24 h-24 text-2xl",
                },
            },
            defaultVariants: {
                size: "md",
            }
        }
    );

    export let src: string | null = null;
    export let alt = '';
    export let initials = '';
    export let size: VariantProps<typeof avatarClass>['size'] = 'md';
    let className = "";
    export { className as class };
</script>

<div class={avatarClass({ size, class: className })}>
    {#if src}
        <img {src} {alt} class="w-full h-full object-cover" />
    {:else}
        <span>{initials}</span>
    {/if}
</div>
