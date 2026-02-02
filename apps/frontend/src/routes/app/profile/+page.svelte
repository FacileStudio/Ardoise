<script lang="ts">
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';
  import { onMount } from 'svelte';
  import { fade, scale, slide } from 'svelte/transition';

  let loading = true;
  let actionLoading: 'avatar' | 'cover' | 'removeAvatar' | 'removeCover' | ''  = "";
  let user: any = null;
  let isPremiumUser = false;
  let error = '';

  let avatarInput: HTMLInputElement;
  let coverInput: HTMLInputElement;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      user = await trpc.user.me.query();
      const subscription = await trpc.stripe.getSubscription.query();
      isPremiumUser = subscription.isPremium;
    } catch (err) {
      error = 'Erreur de synchronisation avec le serveur';
    } finally {
      loading = false;
    }
  }

  async function handleFileUpload(event: Event, type: 'avatar' | 'cover') {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    actionLoading = type;
    error = "";

    try {
      const { uploadUrl, publicUrl, fileKey } = await trpc.media.getUploadUrl.mutate({
        fileName: file.name,
        fileType: file.type
      });

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      if (type === 'avatar') {
        await trpc.media.updateAvatar.mutate({ url: publicUrl, key: fileKey, size: file.size });
      } else {
        await trpc.media.updateCover.mutate({ url: publicUrl, key: fileKey, size: file.size });
      }

      await loadData();
    } catch (err: any) {
      error = "Impossible d'enregistrer l'image. Vérifiez votre connexion.";
    } finally {
      actionLoading = "";
      target.value = "";
    }
  }

  async function handleRemoveMedia(type: 'avatar' | 'cover') {
    if (!confirm(`Supprimer définitivement ce média ?`)) return;
    actionLoading = type === 'avatar' ? "removeAvatar" : "removeCover";
    try {
      if (type === 'avatar') await trpc.media.removeAvatar.mutate();
      else await trpc.media.removeCover.mutate();
      await loadData();
    } catch (err) {
      error = "Erreur lors de la suppression";
    } finally {
      actionLoading = "";
    }
  }
</script>

<main class="min-h-screen bg-white text-slate-900 pb-12">
  {#if loading}
    <div class="flex flex-col items-center justify-center h-screen space-y-4" in:fade>
      <iconify-icon icon="svg-spinners:ring-resize" width="40" class="text-indigo-600"></iconify-icon>
      <p class="text-sm font-medium text-slate-400 uppercase tracking-widest">Initialisation</p>
    </div>
  {:else if user}
    <div class="relative h-48 md:h-72 w-full bg-slate-100 border-b border-slate-200 overflow-hidden">
      {#if user.coverImage?.url && actionLoading !== 'cover'}
        <img
          src={user.coverImage.url}
          alt="Bannière"
          class="w-full h-full object-cover"
          in:fade={{ duration: 400 }}
        />
      {:else if actionLoading === 'cover' || actionLoading === 'removeCover'}
        <div class="w-full h-full flex items-center justify-center bg-slate-200 animate-pulse">
           <iconify-icon icon="svg-spinners:90-ring-with-bg" width="32" class="text-slate-400"></iconify-icon>
        </div>
      {/if}

      <div class="absolute bottom-4 right-4 flex gap-2 z-10">
        <button
          on:click={() => coverInput.click()}
          class="bg-white/90 backdrop-blur border border-slate-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white transition shadow-sm flex items-center gap-2"
          disabled={actionLoading !== ""}
        >
          <iconify-icon icon="solar:camera-add-bold" width="18"></iconify-icon>
          Modifier
        </button>
        {#if user.coverImage}
          <button
            on:click={() => handleRemoveMedia('cover')}
            class="bg-white/90 backdrop-blur border border-red-100 text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
            aria-label="Supprimer la bannière"
          >
            <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
          </button>
        {/if}
      </div>
      <input type="file" bind:this={coverInput} on:change={(e) => handleFileUpload(e, 'cover')} class="hidden" accept="image/*" />
    </div>

    <div class="max-w-5xl mx-auto px-6">
      <div class="relative -mt-20 flex flex-col md:flex-row items-center md:items-end gap-8">

        <div class="relative group">
          <div class="w-36 h-36 md:w-44 md:h-44 rounded-full border-[6px] border-white bg-slate-200 overflow-hidden shadow-xl relative">
            {#if user.avatar?.url && actionLoading !== 'avatar'}
              <img
                src={user.avatar.url}
                alt="Profil"
                class="w-full h-full object-cover"
                in:scale={{ start: 0.9, duration: 400 }}
              />
            {:else if actionLoading === 'avatar' || actionLoading === 'removeAvatar'}
              <div class="w-full h-full flex items-center justify-center bg-slate-300 animate-pulse">
                <iconify-icon icon="svg-spinners:ring-resize" width="32" class="text-indigo-600"></iconify-icon>
              </div>
            {:else}
              <div class="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                <iconify-icon icon="solar:user-bold" width="80"></iconify-icon>
              </div>
            {/if}
          </div>

          <button
            on:click={() => avatarInput.click()}
            class="absolute bottom-2 right-2 bg-indigo-600 text-white w-12 h-12 rounded-full border-4 border-white hover:bg-indigo-700 transition flex items-center justify-center shadow-lg active:scale-95"
            aria-label="Changer la photo"
            disabled={actionLoading !== ""}
          >
            <iconify-icon icon="solar:camera-bold" width="24"></iconify-icon>
          </button>

          {#if user.avatar}
            <button
              on:click={() => handleRemoveMedia('avatar')}
              class="absolute top-2 right-2 bg-white text-red-600 w-8 h-8 rounded-full border border-slate-200 hover:bg-red-50 transition flex items-center justify-center shadow-md"
              aria-label="Supprimer la photo"
            >
              <iconify-icon icon="solar:close-circle-bold" width="18"></iconify-icon>
            </button>
          {/if}

          <input type="file" bind:this={avatarInput} on:change={(e) => handleFileUpload(e, 'avatar')} class="hidden" accept="image/*" />
        </div>

        <div class="flex-1 text-center md:text-left pt-4">
          <div class="flex flex-col md:flex-row items-center gap-3">
            <h1 class="text-3xl font-black tracking-tight">{user.name || 'Utilisateur'}</h1>
            {#if isPremiumUser}
              <div in:scale class="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest flex items-center gap-1 shadow-md">
                <iconify-icon icon="solar:crown-minimalistic-bold"></iconify-icon>
                Membre Premium
              </div>
            {:else}
              <div class="bg-slate-100 text-slate-500 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">
                Compte Gratuit
              </div>
            {/if}
          </div>
          <p class="text-slate-500 font-medium text-lg mt-1">{user.email}</p>
        </div>

        <div class="flex items-center gap-3">
          {#if isPremiumUser}
            <a href="/premium" class="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition flex items-center gap-2">
              <iconify-icon icon="solar:settings-minimalistic-bold" width="18"></iconify-icon>
              Gérer l'abonnement
            </a>
          {:else}
            <a href="/premium" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg">
              <iconify-icon icon="solar:star-fall-bold" width="18"></iconify-icon>
              Devenir Premium
            </a>
          {/if}
          <button on:click={() => authStore.logout()} class="p-2.5 text-slate-400 hover:text-red-600 transition" title="Déconnexion">
            <iconify-icon icon="solar:logout-3-bold" width="28"></iconify-icon>
          </button>
        </div>
      </div>

      {#if error}
        <div class="mt-8 p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl text-sm font-medium flex items-center gap-3" in:slide>
          <iconify-icon icon="solar:danger-triangle-bold" width="20"></iconify-icon>
          {error}
        </div>
      {/if}

      <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl transition hover:border-indigo-100">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Privilèges</p>
          <p class="text-xl font-bold capitalize text-slate-800">{user.role}</p>
        </div>
        <div class="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl transition hover:border-indigo-100">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Ancienneté</p>
          <p class="text-xl font-bold text-slate-800">
            {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div class="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between group transition hover:border-indigo-200">
          <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Expérience</p>
            <p class="text-xl font-bold text-slate-800">{isPremiumUser ? 'Élite' : 'Explorateur'}</p>
          </div>
          <div class="p-3 rounded-xl {isPremiumUser ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}">
            <iconify-icon icon={isPremiumUser ? "solar:crown-bold" : "solar:star-bold"} width="24"></iconify-icon>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>

