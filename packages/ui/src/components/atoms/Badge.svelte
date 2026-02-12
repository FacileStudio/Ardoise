<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';
    import type { Snippet } from 'svelte';

    const badgeClass = cva(
        "inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide",
        {
            variants: {
                variant: {
                    indigo: "bg-indigo-100 text-indigo-700",
                    rose: "bg-rose-100 text-rose-700",
                    amber: "bg-amber-100 text-amber-800",
                    emerald: "bg-emerald-100 text-emerald-800",
                    slate: "bg-slate-100 text-slate-700",
                    warning: "bg-amber-100 text-amber-800",
                    success: "bg-emerald-100 text-emerald-800",
                    error: "bg-rose-100 text-rose-700",
                    default: "bg-slate-100 text-slate-700"
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
