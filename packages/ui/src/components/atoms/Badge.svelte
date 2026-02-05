<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';

    const badgeClass = cva(
        "inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border min-w-[70px]",
        {
            variants: {
                variant: {
                    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
                    rose: "bg-rose-50 text-rose-600 border-rose-100",
                    amber: "bg-amber-50 text-amber-600 border-amber-100",
                    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
                    slate: "bg-slate-50 text-slate-500 border-slate-100"
                }
            },
            defaultVariants: {
                variant: "slate"
            }
        }
    );

    let { variant = 'slate' }: { variant?: VariantProps<typeof badgeClass>['variant'] } = $props();
</script>

<span class={badgeClass({ variant })}>
    <slot />
</span>
