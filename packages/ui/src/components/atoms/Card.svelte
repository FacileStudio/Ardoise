<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';
    import { cn } from '@repo/utils';

    const cardClass = cva(
        "bg-white border transition-all",
        {
            variants: {
                padding: {
                    none: "p-0",
                    sm: "p-4",
                    md: "p-6",
                    lg: "p-8",
                },
                rounded: {
                    sm: "rounded-xl",
                    md: "rounded-2xl",
                    lg: "rounded-[32px]",
                    xl: "rounded-[40px]",
                },
                shadow: {
                    none: "shadow-none border-slate-100",
                    sm: "shadow-sm shadow-slate-100 border-slate-100",
                    md: "shadow-lg shadow-slate-200/50 border-slate-100",
                    lg: "shadow-xl shadow-slate-200/50 border-slate-100",
                },
                hover: {
                    none: "",
                    lift: "hover:shadow-2xl hover:-translate-y-1",
                    scale: "hover:scale-[1.02]",
                },
            },
            defaultVariants: {
                padding: "md",
                rounded: "lg",
                shadow: "md",
                hover: "none",
            }
        }
    );

    export let padding: VariantProps<typeof cardClass>['padding'] = 'md';
    export let rounded: VariantProps<typeof cardClass>['rounded'] = 'lg';
    export let shadow: VariantProps<typeof cardClass>['shadow'] = 'md';
    export let hover: VariantProps<typeof cardClass>['hover'] = 'none';
    let className = "";
    export { className as class };
</script>

<div class={cardClass({ padding, rounded, shadow, hover, class: className })}>
    <slot />
</div>
