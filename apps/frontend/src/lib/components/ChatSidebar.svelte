<script lang="ts">
  export let rooms: any[] = [];
  export let activeRoomId: string;
  export let onRoomSelect: (id: string) => void;
  export let onNewChat: () => void; // Ajout de la prop manquante
</script>

<aside class="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
  <div class="p-6 flex items-center justify-between">
    <h2 class="text-xl font-black tracking-tight text-slate-800">Messages</h2>
    <button
      on:click={onNewChat}
      class="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:scale-110 active:scale-95 transition-all"
      aria-label="Nouvelle discussion"
      title="Nouvelle discussion"
    >
      <iconify-icon icon="solar:pen-new-square-bold" width="20"></iconify-icon>
    </button>
  </div>

  <div class="flex-1 overflow-y-auto space-y-2 px-3">
    {#each rooms as room}
      <button
        on:click={() => onRoomSelect(room.id)}
        class="w-full p-4 flex items-center gap-4 rounded-[24px] transition-all {activeRoomId === room.id ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'hover:bg-white/60'}"
      >
        <div class="relative">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-inner">
                {room.name?.charAt(0) || 'P'}
            </div>
            {#if room.isOnline} <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white rounded-full"></div>
            {/if}
        </div>
        <div class="text-left overflow-hidden flex-1">
          <p class="text-sm font-black text-slate-800 truncate">{room.name || 'Discussion Privée'}</p>
          <p class="text-[11px] text-slate-400 font-medium truncate italic">
            {room.messages[0]?.text || 'Aucun message'}
          </p>
        </div>
      </button>
    {:else}
      <div class="text-center p-8 opacity-40">
        <p class="text-xs font-bold uppercase tracking-widest">Vide</p>
      </div>
    {/each}
  </div>
</aside>
