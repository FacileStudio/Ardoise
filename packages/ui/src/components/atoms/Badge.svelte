<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';
    import type { Snippet } from 'svelte';

    const badgeClass = cva(
        "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium",
        {
            variants: {
                variant: {
                    default: "border-transparent bg-primary text-primary-foreground",
                    secondary: "border-transparent bg-secondary text-secondary-foreground",
                    outline: "border-border text-foreground",
                    success: "border-transparent bg-success text-success-foreground",
                    warning: "border-transparent bg-warning text-warning-foreground",
                    error: "border-transparent bg-danger text-danger-foreground",
                    indigo: "border-transparent bg-primary text-primary-foreground",
                    rose: "border-transparent bg-danger text-danger-foreground",
                    amber: "border-transparent bg-warning text-warning-foreground",
                    emerald: "border-transparent bg-success text-success-foreground",
                    slate: "border-transparent bg-secondary text-secondary-foreground"
                }
            },
            defaultVariants: {
                variant: "default"
            }
        }
    );

    let { variant, children }: { variant?: VariantProps<typeof badgeClass>['variant']; children?: Snippet } = $props();
</script>

<span class={badgeClass({ variant })}>
    {@render children?.()}
</span>
