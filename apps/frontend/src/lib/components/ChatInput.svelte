<script lang="ts">
  import { slide } from 'svelte/transition';

  export let isSending: boolean = false;
  export let typingUsers: Map<string, string> = new Map();
  export let onSendMessage: (text: string) => void | Promise<void>;
  export let onTyping: () => void;

  let text = "";

  function handleSubmit() {
    if (!text.trim() || isSending) return;
    onSendMessage(text);
    text = "";
  }
</script>

<div class="p-6 pt-0">
  <div class="h-6 px-4">
    {#if typingUsers.size > 0}
      <div in:slide class="flex items-center gap-2 text-[11px] font-black text-indigo-500 uppercase italic tracking-tighter">
        <span class="flex gap-0.5">
          <span class="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
          <span class="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
        </span>
        {Array.from(typingUsers.values())[0]} écrit...
      </div>
    {/if}
  </div>

  <form on:submit|preventDefault={handleSubmit} class="bg-slate-100/80 backdrop-blur-sm p-2 rounded-[30px] flex items-center gap-2 border border-white shadow-inner focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
    <button type="button" class="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600" aria-label="Attacher">
      <iconify-icon icon="solar:paperclip-2-bold" width="24"></iconify-icon>
    </button>
    <input
      bind:value={text}
      on:input={onTyping}
      placeholder="Écrire un message..."
      disabled={isSending}
      class="flex-1 bg-transparent border-none px-2 py-3 text-sm outline-none text-slate-800 font-medium disabled:opacity-50"
    />
    <button type="submit" disabled={!text.trim() || isSending} class="bg-indigo-600 text-white w-11 h-11 rounded-[22px] shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-40" aria-label="Envoyer">
      <iconify-icon icon={isSending ? "line-md:loading-twotone-loop" : "solar:rocket-bold"} width="20"></iconify-icon>
    </button>
  </form>
</div>
