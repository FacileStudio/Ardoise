<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { scale } from 'svelte/transition';
  import 'iconify-icon';

  export let open = false;
  export let title = "";
  export let onClose: (() => void) | undefined = undefined;

  const dispatch = createEventDispatcher();
  let dialog: HTMLDialogElement;

  $: if (dialog && open) dialog.showModal();
  $: if (dialog && !open) dialog.close();

  function close() {
    open = false;
    dispatch('close');
    if (onClose) onClose();
  }
</script>

{#if open}
  <dialog
    bind:this={dialog}
    on:close={close}
    on:click|self={close}
    class="w-full h-screen bg-transparent outline-none backdrop:bg-black/50 backdrop:backdrop-blur-sm p-4 flex items-center justify-center z-50" >
    <div
      in:scale={{ start: 0.95, duration: 200 }}
      out:scale={{ start: 0.95, duration: 150 }}
      class="rounded-xl border border-border bg-background p-6 shadow-lg w-full max-w-lg overflow-hidden"
    >
      <header class="flex justify-between items-center mb-4">
        <h3 class="font-semibold text-lg text-foreground">{title}</h3>
        <button on:click={close} class="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close modal">
          <iconify-icon icon="solar:close-circle-bold" width="24"></iconify-icon>
        </button>
      </header>

      <div>
        <slot />
      </div>
    </div>
  </dialog>
{/if}

<style>

  dialog::backdrop {
    animation: fade 0.2s ease-out;
  }

  @keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
