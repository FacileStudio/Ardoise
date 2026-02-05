<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';

    const avatarClass = cva(
        "rounded-full bg-gradient-to-br flex items-center justify-center font-black text-white overflow-hidden",
        {
            variants: {
                size: {
                    xs: "w-8 h-8 text-xs",
                    sm: "w-10 h-10 text-sm",
                    md: "w-12 h-12 text-base",
                    lg: "w-16 h-16 text-lg",
                    xl: "w-24 h-24 text-2xl",
                },
                color: {
                    blue: "from-blue-500 to-indigo-600",
                    purple: "from-purple-500 to-pink-600",
                    green: "from-green-500 to-teal-600",
                    orange: "from-orange-500 to-red-600",
                    slate: "from-slate-500 to-slate-700",
                }
            },
            defaultVariants: {
                size: "md",
                color: "blue",
            }
        }
    );

    export let src: string | null = null;
    export let alt = '';
    export let initials = '';
    export let size: VariantProps<typeof avatarClass>['size'] = 'md';
    export let color: VariantProps<typeof avatarClass>['color'] = 'blue';
    let className = "";
    export { className as class };
</script>

<div class={avatarClass({ size, color, class: className })}>
    {#if src}
        <img {src} {alt} class="w-full h-full object-cover" />
    {:else}
        <span>{initials}</span>
    {/if}
</div>
