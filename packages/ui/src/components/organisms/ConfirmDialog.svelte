<script lang="ts">
    import { cn } from '@repo/utils';
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
    let className = "";
    export { className as class };

    const handleConfirm = () => {
        onConfirm();
        isOpen = false;
    };

    const handleCancel = () => {
        onCancel();
        isOpen = false;
    };
</script>

<Modal bind:isOpen class={className}>
    <div class="text-center space-y-6">
        <div class="w-16 h-16 rounded-2xl bg-{variant === 'danger' ? 'rose' : 'indigo'}-50 flex items-center justify-center mx-auto">
            <iconify-icon
                icon={variant === 'danger' ? 'solar:danger-triangle-bold' : 'solar:question-circle-bold'}
                width="32"
                class="text-{variant === 'danger' ? 'rose' : 'indigo'}-600"
            ></iconify-icon>
        </div>

        <div>
            <h2 class="text-2xl font-black text-slate-900 mb-2">{title}</h2>
            <p class="text-slate-500 font-medium">{description}</p>
        </div>

        <div class="flex gap-3">
            <Button intent="secondary" class="flex-1" on:click={handleCancel}>
                {cancelText}
            </Button>
            <Button intent={variant} class="flex-1" on:click={handleConfirm}>
                {confirmText}
            </Button>
        </div>
    </div>
</Modal>
