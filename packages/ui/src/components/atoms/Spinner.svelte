<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';

    const spinnerClass = cva(
        "animate-spin rounded-full border-foreground/20 border-t-foreground",
        {
            variants: {
                size: {
                    sm: "h-4 w-4 border-2",
                    md: "h-6 w-6 border-2",
                    lg: "h-10 w-10 border-[3px]",
                    xl: "h-16 w-16 border-4",
                },
            },
            defaultVariants: {
                size: "md",
            }
        }
    );

    export let size: VariantProps<typeof spinnerClass>['size'] = 'md';
    let className = "";
    export { className as class };
</script>

<div class={spinnerClass({ size, class: className })} role="status">
    <span class="sr-only">Loading...</span>
</div>
