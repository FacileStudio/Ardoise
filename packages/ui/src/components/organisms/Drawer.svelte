<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import 'iconify-icon';
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(false),
    title = "",
    onClose = undefined,
    children
  }: {
    open?: boolean;
    title?: string;
    onClose?: () => void;
    children?: Snippet;
  } = $props();

  const dispatch = createEventDispatcher();

  function close() {
    open = false;
    dispatch('close');
    if (onClose) onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex justify-end"
    transition:fade={{ duration: 200 }}
    onclick={handleBackdropClick}
    role="presentation"
  >
    <div
      class="w-full max-w-md border-l border-border bg-background shadow-lg h-full flex flex-col"
      transition:fly={{ x: '100%', duration: 300 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <header class="px-6 py-4 flex justify-between items-center border-b border-border">
        <h2 id="drawer-title" class="font-semibold text-lg text-foreground">
          {title}
        </h2>
        <button
          onclick={close}
          type="button"
          class="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close drawer"
        >
          <iconify-icon icon="solar:close-circle-bold" width="24"></iconify-icon>
        </button>
      </header>

      <div class="flex-1 overflow-y-auto px-6 py-6">
        {#if children}
          {@render children()}
        {/if}
      </div>
    </div>
  </div>
{/if}
