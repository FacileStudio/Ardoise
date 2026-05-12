<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';
    import type { Snippet } from 'svelte';

    const buttonClass = cva(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
        {
            variants: {
                intent: {
                    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
                    secondary: "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                    danger: "bg-danger text-danger-foreground hover:bg-danger/90",
                    ghost: "text-muted-foreground hover:bg-accent hover:text-foreground"
                },
                size: {
                    sm: "h-8 px-3 text-xs",
                    md: "h-9 px-4",
                    lg: "h-10 px-6"
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
        children,
        ...restProps
    }: {
        intent?: VariantProps<typeof buttonClass>['intent'];
        size?: VariantProps<typeof buttonClass>['size'];
        type?: "button" | "submit";
        disabled?: boolean;
        class?: string;
        onclick?: () => void | Promise<void>;
        children?: Snippet;
        [key: string]: unknown;
    } = $props();
</script>

<button
    {type}
    {disabled}
    class={buttonClass({ intent, size, class: className })}
    {onclick}
    {...restProps}
>
    {@render children?.()}
</button>
