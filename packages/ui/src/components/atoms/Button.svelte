<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';
    import { cn } from '@repo/utils';

    const buttonClass = cva(
        "inline-flex items-center justify-center gap-2 transition-all font-black uppercase tracking-tight active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        {
            variants: {
                intent: {
                    primary: "bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-200",
                    secondary: "bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-100 hover:text-indigo-600",
                    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200",
                    ghost: "bg-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                },
                size: {
                    sm: "px-4 py-2 text-[10px] rounded-xl",
                    md: "px-6 py-3 text-xs rounded-2xl",
                    lg: "px-8 py-4 text-sm rounded-[24px]"
                }
            },
            defaultVariants: {
                intent: "primary",
                size: "md"
            }
        }
    );

    let {
        intent = 'primary',
        size = 'md',
        type = 'button',
        disabled = false,
        class: className = '',
        onclick,
        ...restProps
    }: {
        intent?: VariantProps<typeof buttonClass>['intent'];
        size?: VariantProps<typeof buttonClass>['size'];
        type?: "button" | "submit";
        disabled?: boolean;
        class?: string;
        onclick?: (event: MouseEvent) => void;
        [key: string]: any;
    } = $props();
</script>

<button
    {type}
    {disabled}
    class={buttonClass({ intent, size, class: className })}
    {onclick}
    {...restProps}
>
    <slot />
</button>
