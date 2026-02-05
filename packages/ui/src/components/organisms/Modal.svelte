<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
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
    class="bg-transparent backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm p-4 outline-none"
  >
    <div
      in:scale={{ start: 0.95, duration: 200 }}
      out:scale={{ start: 0.95, duration: 150 }}
      class="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
    >
      <header class="p-6 flex justify-between items-center border-b border-slate-50">
        <h3 class="font-black italic uppercase tracking-tighter text-xl text-slate-900">{title}</h3>
        <button on:click={close} class="text-slate-300 hover:text-rose-500 transition-colors" aria-label="Close modal">
          <iconify-icon icon="solar:close-circle-bold" width="28"></iconify-icon>
        </button>
      </header>

      <div class="p-8">
        <slot />
      </div>
    </div>
  </dialog>
{/if}

<style>
  dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    max-height: 90vh;
    max-width: 90vw;
  }

  dialog::backdrop {
    animation: fade 0.2s ease-out;
  }

  @keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
