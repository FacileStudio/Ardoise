<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { fade, scale } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  let mode: 'mp' | 'group' = 'mp';
  let email = "";
  let groupName = "";
  let loading = false;
  let serverError = ""; // Pour stocker l'erreur Zod ou autre

  // Validation réactive
  $: isGroupNameValid = groupName.trim().length >= 3;
  $: isEmailValid = /^\S+@\S+\.\S+$/.test(email);
  $: canSubmit = mode === 'mp' ? isEmailValid : isGroupNameValid;

  async function handleSubmit() {
    if (!canSubmit || loading) return;

    loading = true;
    serverError = "";

    try {
      if (mode === 'mp') {
        const room = await trpc.chat.startPrivateMessage.mutate({ email });
        dispatch('created', room.id);
      } else {
        const room = await trpc.chat.createGroup.mutate({ name: groupName });
        dispatch('created', room.id);
      }
    } catch (e: any) {
      // Extraction du message d'erreur de Zod ou du serveur
      if (e.data?.zodError) {
        serverError = "Le nom doit contenir au moins 3 caractères.";
      } else {
        serverError = e.message || "Une erreur est survenue.";
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" transition:fade>
  <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" transition:scale>
    <div class="p-6 border-b border-slate-50 flex justify-between items-center">
      <h3 class="text-xl font-black tracking-tight text-slate-800">Nouvelle discussion</h3>
      <button on:click={() => dispatch('close')} class="text-slate-400 hover:text-red-500 transition-colors" aria-label="Fermer">
        <iconify-icon icon="solar:close-circle-bold" width="24"></iconify-icon>
      </button>
    </div>

    <div class="p-6 space-y-6">
      <div class="flex bg-slate-100 p-1.5 rounded-2xl">
        <button
          class="flex-1 py-2.5 rounded-xl text-sm font-black transition-all {mode === 'mp' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}"
          on:click={() => { mode = 'mp'; serverError = ""; }}>Direct</button>
        <button
          class="flex-1 py-2.5 rounded-xl text-sm font-black transition-all {mode === 'group' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}"
          on:click={() => { mode = 'group'; serverError = ""; }}>Groupe</button>
      </div>

      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        {#if mode === 'mp'}
          <div class="space-y-1">
            <label for="email" class="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Email du contact</label>
            <input
              id="email"
              bind:value={email}
              type="email"
              placeholder="ex: michel@design.fr"
              class="w-full bg-slate-50 border-2 {email && !isEmailValid ? 'border-orange-200' : 'border-transparent'} rounded-2xl px-4 py-3.5 text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all"
            />
          </div>
        {:else}
          <div class="space-y-1">
            <label for="groupName" class="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nom du groupe</label>
            <input
              id="groupName"
              bind:value={groupName}
              type="text"
              placeholder="ex: Projet Alpha"
              class="w-full bg-slate-50 border-2 {groupName && !isGroupNameValid ? 'border-orange-200' : 'border-transparent'} rounded-2xl px-4 py-3.5 text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all"
            />
            <div class="flex justify-between px-1">
                <p class="text-[10px] font-bold {groupName.length < 3 ? 'text-slate-400' : 'text-green-500'}">
                    Min. 3 caractères
                </p>
                <p class="text-[10px] font-bold text-slate-400">{groupName.length}/30</p>
            </div>
          </div>
        {/if}

        {#if serverError}
          <div in:fade class="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600">
            <iconify-icon icon="solar:danger-triangle-bold" width="20"></iconify-icon>
            <p class="text-xs font-bold">{serverError}</p>
          </div>
        {/if}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          class="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale disabled:pointer-events-none"
        >
          {#if loading}
            <iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
            <span>Création...</span>
          {:else}
            <iconify-icon icon="solar:magic-stick-3-bold" width="20"></iconify-icon>
            <span>Lancer la discussion</span>
          {/if}
        </button>
      </form>
    </div>
  </div>
</div>
