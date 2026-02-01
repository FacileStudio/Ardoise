<script lang="ts">
  import { fly } from 'svelte/transition';
  import MessageBubble from './MessageBubble.svelte';

  export let messages: any[] = [];
  export let currentUserId: string = "";
  export let scrollContainer: HTMLElement | undefined = undefined;
</script>

<div bind:this={scrollContainer} class="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-hide">
  {#each messages as msg (msg.id)}
    <div in:fly={{ y: 10, duration: 200 }}>
      <MessageBubble {msg} isMe={msg.userId === currentUserId} />
    </div>
  {/each}
</div>

<style>
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
