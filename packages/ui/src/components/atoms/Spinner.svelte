<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';

    const spinnerClass = cva(
        "animate-spin rounded-full border-b-2",
        {
            variants: {
                size: {
                    sm: "h-4 w-4 border-2",
                    md: "h-6 w-6 border-2",
                    lg: "h-10 w-10 border-3",
                    xl: "h-16 w-16 border-4",
                },
                color: {
                    primary: "border-indigo-600",
                    white: "border-white",
                    slate: "border-slate-600",
                }
            },
            defaultVariants: {
                size: "md",
                color: "primary",
            }
        }
    );

    export let size: VariantProps<typeof spinnerClass>['size'] = 'md';
    export let color: VariantProps<typeof spinnerClass>['color'] = 'primary';
    let className = "";
    export { className as class };
</script>

<div class={spinnerClass({ size, color, class: className })} role="status">
    <span class="sr-only">Loading...</span>
</div>
