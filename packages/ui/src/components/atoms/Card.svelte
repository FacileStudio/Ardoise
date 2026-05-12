<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';

    const cardClass = cva(
        "rounded-xl border border-border bg-card text-card-foreground transition-all",
        {
            variants: {
                padding: {
                    none: "p-0",
                    sm: "p-4",
                    md: "p-6",
                    lg: "p-8",
                },
                shadow: {
                    none: "",
                    sm: "shadow-sm",
                    md: "shadow-md",
                },
                hover: {
                    none: "",
                    lift: "hover:shadow-lg hover:-translate-y-1",
                    scale: "hover:scale-[1.02]",
                },
            },
            defaultVariants: {
                padding: "md",
                shadow: "none",
                hover: "none",
            }
        }
    );

    export let padding: VariantProps<typeof cardClass>['padding'] = 'md';
    export let shadow: VariantProps<typeof cardClass>['shadow'] = 'none';
    export let hover: VariantProps<typeof cardClass>['hover'] = 'none';
    let className = "";
    export { className as class };
</script>

<div class={cardClass({ padding, shadow, hover, class: className })}>
    <slot />
</div>
