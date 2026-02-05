<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';

    const alertClass = cva(
        "p-4 rounded-2xl font-medium flex items-start gap-3 border",
        {
            variants: {
                variant: {
                    info: "bg-blue-50 text-blue-700 border-blue-100",
                    success: "bg-green-50 text-green-700 border-green-100",
                    warning: "bg-amber-50 text-amber-700 border-amber-100",
                    danger: "bg-rose-50 text-rose-700 border-rose-100",
                }
            },
            defaultVariants: {
                variant: "info",
            }
        }
    );

    export let variant: VariantProps<typeof alertClass>['variant'] = 'info';
    export let dismissible = false;
    let className = "";
    export { className as class };

    let visible = true;

    const icons = {
        info: 'solar:info-circle-bold',
        success: 'solar:check-circle-bold',
        warning: 'solar:danger-triangle-bold',
        danger: 'solar:close-circle-bold',
    };
</script>

{#if visible}
    <div class={alertClass({ variant, class: className })}>
        <iconify-icon icon={icons[variant || 'info']} width="20" class="flex-shrink-0 mt-0.5"></iconify-icon>
        <div class="flex-1">
            <slot />
        </div>
        {#if dismissible}
            <button
                on:click={() => visible = false}
                class="flex-shrink-0 hover:opacity-70 transition-opacity"
                aria-label="Dismiss"
            >
                <iconify-icon icon="solar:close-circle-line-duotone" width="20"></iconify-icon>
            </button>
        {/if}
    </div>
{/if}
