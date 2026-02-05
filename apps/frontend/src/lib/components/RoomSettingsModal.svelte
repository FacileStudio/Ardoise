<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { fade, scale } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';
  import { logger } from '@repo/logger';

  const dispatch = createEventDispatcher();
  export let room: any;
  export let currentUserId: string;

  let inviteEmail = "";
  let loading = false;

  $: participants = room?.participants || [];
  $: isAdmin = participants.find(p => p.userId === currentUserId)?.role === 'ADMIN' || room?.isGroup;

  async function inviteMember() {
    if (!inviteEmail) return;
    loading = true;
    try {
      await trpc.chat.inviteMember.mutate({ roomId: room.id, email: inviteEmail });
      inviteEmail = "";
      dispatch('refresh');
    } catch (e) { logger.error({ err: e }, 'Failed to invite member to room'); }
    finally { loading = false; }
  }

  async function leaveRoom() {
    if (!confirm("Quitter cette discussion ?")) return;
    try {
      await trpc.chat.leaveRoom.mutate({ roomId: room.id });
      dispatch('left');
    } catch (e) { logger.error({ err: e }, 'Failed to leave room'); }
  }

  async function deleteRoom() {
    if (!confirm("Permanently delete this group for everyone?")) return;
    try {
      await trpc.chat.deleteRoom.mutate({ roomId: room.id });
      dispatch('left');
    } catch (e) { logger.error({ err: e }, 'Failed to delete room'); }
  }

  async function kickMember(userId: string) {
    try {
      await trpc.chat.kickMember.mutate({ roomId: room.id, userId });
      dispatch('refresh');
    } catch (e) { logger.error({ err: e }, 'Failed to kick member from room'); }
  }
</script>

<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" transition:fade>
  <div class="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden" transition:scale>
    <div class="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
      <div>
        <h3 class="text-2xl font-black text-slate-800 tracking-tight">Settings</h3>
        <p class="text-sm text-slate-400 font-medium">{participants.length} active members</p>
      </div>
      <button on:click={() => dispatch('close')} class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm hover:text-red-500 transition-colors"
        aria-label="Close"
      >
        <iconify-icon icon="solar:close-circle-bold" width="28"></iconify-icon>
      </button>
    </div>

    <div class="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
      <section>
        <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Invite a member</h4>
        <div class="flex gap-2">
          <input bind:value={inviteEmail} type="email" placeholder="email@exemple.com"
            class="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
          <button on:click={inviteMember} disabled={loading} class="bg-indigo-600 text-white px-6 rounded-2xl font-bold text-sm disabled:opacity-50">
            {loading ? '...' : 'Add'}
          </button>
        </div>
      </section>

      <section>
        <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Members</h4>
        <div class="space-y-3">
          {#each participants as p}
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden font-bold flex items-center justify-center text-slate-500">
                    {p.user?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-800">{p.user?.name || 'User'} {p.userId === currentUserId ? '(Me)' : ''}</p>
                  <p class="text-[10px] text-slate-400 font-black uppercase">{p.role || 'Member'}</p>
                </div>
              </div>

              {#if isAdmin && p.userId !== currentUserId}
                <button on:click={() => kickMember(p.userId)} class="text-red-400 hover:text-red-600 p-2"
                aria-label="Remove member">
                  <iconify-icon icon="solar:user-minus-bold" width="20"></iconify-icon>
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </section>

      <section class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
        <button on:click={leaveRoom}
          class="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-red-500 bg-red-50 hover:bg-red-100 transition-all">
          <iconify-icon icon="solar:exit-bold"></iconify-icon>
          Leave
        </button>
        {#if isAdmin}
          <button on:click={deleteRoom}
            class="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-slate-500 border-2 border-slate-100 hover:border-red-500 hover:text-red-500 transition-all">
            <iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon>
            Delete
          </button>
        {/if}
      </section>
    </div>
  </div>
</div>
