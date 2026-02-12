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
    class="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-end"
    transition:fade={{ duration: 200 }}
    onclick={handleBackdropClick}
    role="presentation"
  >
    <div
      class="w-full bg-white rounded-t-[40px] shadow-2xl h-[50vh] flex flex-col"
      transition:fly={{ y: '100%', duration: 300 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div class="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-300 mt-4 mb-2"></div>

      <header class="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
        <h2 id="drawer-title" class="font-bold uppercase tracking-tighter text-xl text-slate-900">
          {title}
        </h2>
        <button
          onclick={close}
          type="button"
          class="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
          aria-label="Close drawer"
        >
          <iconify-icon icon="solar:close-circle-bold" width="28"></iconify-icon>
        </button>
      </header>

      <div class="flex-1 overflow-y-auto px-6 py-6 bg-white">
        {#if children}
          {@render children()}
        {/if}
      </div>
    </div>
  </div>
{/if}
