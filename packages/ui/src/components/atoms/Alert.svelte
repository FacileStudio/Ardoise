<script lang="ts">
    import { cva, type VariantProps } from 'class-variance-authority';

    const alertClass = cva(
        "rounded-lg border p-4 text-sm flex items-start gap-3",
        {
            variants: {
                variant: {
                    info: "border-border bg-muted text-foreground",
                    success: "border-green-200 bg-green-50 text-green-800",
                    warning: "border-amber-200 bg-amber-50 text-amber-800",
                    danger: "border-red-200 bg-red-50 text-red-800",
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
