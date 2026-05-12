<script lang="ts">
    import Button from '../atoms/Button.svelte';
    import Modal from './Modal.svelte';

    export let isOpen = false;
    export let title = 'Confirm Action';
    export let description = 'Are you sure you want to proceed?';
    export let confirmText = 'Confirm';
    export let cancelText = 'Cancel';
    export let variant: 'danger' | 'primary' = 'primary';
    export let onConfirm: () => void = () => {};
    export let onCancel: () => void = () => {};

    const handleConfirm = () => {
        onConfirm();
        isOpen = false;
    };

    const handleCancel = () => {
        onCancel();
        isOpen = false;
    };
</script>

<Modal bind:open={isOpen}>
    <div class="text-center space-y-6">
        <div class="w-14 h-14 rounded-xl {variant === 'danger' ? 'bg-red-50' : 'bg-muted'} flex items-center justify-center mx-auto">
            <iconify-icon
                icon={variant === 'danger' ? 'solar:danger-triangle-bold' : 'solar:question-circle-bold'}
                width="28"
                class={variant === 'danger' ? 'text-red-600' : 'text-muted-foreground'}
            ></iconify-icon>
        </div>

        <div>
            <h2 class="text-lg font-semibold text-foreground mb-2">{title}</h2>
            <p class="text-sm text-muted-foreground">{description}</p>
        </div>

        <div class="flex gap-3">
            <Button intent="secondary" class="flex-1" onclick={handleCancel}>
                {cancelText}
            </Button>
            <Button intent={variant} class="flex-1" onclick={handleConfirm}>
                {confirmText}
            </Button>
        </div>
    </div>
</Modal>
