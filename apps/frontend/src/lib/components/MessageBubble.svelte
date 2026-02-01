<script lang="ts">
  import { slide } from 'svelte/transition';
  export let msg: any;
  export let isMe: boolean;
</script>

<div class="flex {isMe ? 'justify-end' : 'justify-start'} mb-4 px-4" in:slide>
  <div class="max-w-[75%] flex flex-col {isMe ? 'items-end' : 'items-start'}">
    <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">
      {isMe ? 'Moi' : msg.user.name} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>

    <div class="p-3 rounded-2xl shadow-sm {isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}">
      {#if msg.text}
        <p class="text-sm font-medium leading-relaxed">{msg.text}</p>
      {/if}

      {#if msg.attachments?.length > 0}
        <div class="grid grid-cols-1 gap-2 {msg.text ? 'mt-3' : ''}">
          {#each msg.attachments as file}
            <a href={file.url} target="_blank" class="block overflow-hidden rounded-xl border border-white/20">
              <img src={file.url} alt="" class="max-h-64 w-full object-cover hover:scale-105 transition duration-500" />
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
