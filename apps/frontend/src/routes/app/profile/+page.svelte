<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { fade, scale, fly } from 'svelte/transition';
  import { uploadFileSimple } from '@repo/storage-client';
  import { t, locale } from '@repo/i18n/svelte';
  import { Button, Spinner } from '@repo/ui';
  import { toast } from '@repo/utils';
  import 'iconify-icon';

  let loading = true;
  let actionLoading: 'avatar' | 'cover' | 'removeAvatar' | 'removeCover' | '' = '';
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
      error = 'Server synchronization error';
      toast.push('Server synchronization error', 'error');
    } finally {
      loading = false;
    }
  }

  async function handleFileUpload(event: Event, type: 'avatar' | 'cover') {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    actionLoading = type;
    try {
      const { uploadUrl, publicUrl, fileKey } = await trpc.media.getUploadUrl.mutate({
        fileName: file.name,
        fileType: file.type,
      });

      await uploadFileSimple(file, uploadUrl);

      if (type === 'avatar') {
        await trpc.media.updateAvatar.mutate({ url: publicUrl, key: fileKey, size: file.size });
      } else {
        await trpc.media.updateCover.mutate({ url: publicUrl, key: fileKey, size: file.size });
      }

      await loadData();
      toast.push(`${type === 'avatar' ? 'Avatar' : 'Cover'} updated!`, 'success');
    } catch (err: any) {
      toast.push('Upload failed. Try again.', 'error');
    } finally {
      actionLoading = '';
      target.value = '';
    }
  }

  async function handleRemoveMedia(type: 'avatar' | 'cover') {
    if (!confirm(`Delete this media?`)) return;
    actionLoading = type === 'avatar' ? 'removeAvatar' : 'removeCover';
    try {
      if (type === 'avatar') await trpc.media.removeAvatar.mutate();
      else await trpc.media.removeCover.mutate();
      await loadData();
      toast.push('Media removed', 'success');
    } catch (err) {
      toast.push('Error during deletion', 'error');
    } finally {
      actionLoading = '';
    }
  }
</script>

<main class="min-h-screen bg-white text-black pb-20 selection:bg-black selection:text-white">
  {#if loading}
    <div class="flex flex-col items-center justify-center h-screen space-y-6" in:fade>
      <iconify-icon icon="svg-spinners:blocks-shuffle-3" width="48"></iconify-icon>
      <p class="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">
        Loading Profile...
      </p>
    </div>
  {:else if user}
    <section
      class="relative h-[35vh] min-h-[300px] w-full bg-neutral-100 group overflow-hidden border-b-2 border-neutral-100"
    >
      {#if user.coverImage?.url && actionLoading !== 'cover'}
        <img
          src={user.coverImage.url}
          alt="Banner"
          class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          in:fade
        />
      {:else if actionLoading === 'cover' || actionLoading === 'removeCover'}
        <div class="absolute inset-0 flex items-center justify-center bg-neutral-200">
          <iconify-icon icon="svg-spinners:90-ring-with-bg" width="40"></iconify-icon>
        </div>
      {/if}

      <div
        class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20"
      >
        <button
          on:click={() => coverInput.click()}
          class="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition shadow-2xl flex items-center gap-2"
        >
          <iconify-icon icon="solar:camera-add-bold" width="18"></iconify-icon>
          Change Cover
        </button>
        {#if user.coverImage}
          <button
            on:click={() => handleRemoveMedia('cover')}
            class="bg-white text-red-600 p-3 rounded-2xl hover:bg-red-600 hover:text-white transition shadow-2xl"
          >
            <iconify-icon icon="solar:trash-bin-trash-bold" width="22"></iconify-icon>
          </button>
        {/if}
      </div>
      <input
        type="file"
        bind:this={coverInput}
        on:change={(e) => handleFileUpload(e, 'cover')}
        class="hidden"
        accept="image/*"
      />
    </section>

    <div class="max-w-7xl mx-auto px-6">
      <div class="relative -mt-24 flex flex-col md:flex-row items-start gap-12">
        <aside class="w-full md:w-80 flex flex-col items-center md:items-start z-30">
          <div class="relative group mb-10">
            <div
              class="w-56 h-56 rounded-[48px] border-[10px] border-white bg-neutral-100 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative transition-all duration-500 group-hover:rounded-[32px]"
            >
              {#if user.avatar?.url && actionLoading !== 'avatar'}
                <img
                  src={user.avatar.url}
                  alt="Profile"
                  class="w-full h-full object-cover"
                  in:scale
                />
              {:else if actionLoading === 'avatar' || actionLoading === 'removeAvatar'}
                <div
                  class="w-full h-full flex items-center justify-center bg-neutral-200 animate-pulse"
                >
                  <iconify-icon icon="svg-spinners:ring-resize" width="40" class="text-black"
                  ></iconify-icon>
                </div>
              {:else}
                <div
                  class="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-50"
                >
                  <iconify-icon icon="solar:user-bold" width="80"></iconify-icon>
                </div>
              {/if}
            </div>

            <button
              on:click={() => avatarInput.click()}
              class="absolute -bottom-2 -right-2 bg-black text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition active:scale-90 border-4 border-white"
              disabled={actionLoading !== ''}
            >
              <iconify-icon icon="solar:camera-bold" width="24"></iconify-icon>
            </button>
            <input
              type="file"
              bind:this={avatarInput}
              on:change={(e) => handleFileUpload(e, 'avatar')}
              class="hidden"
              accept="image/*"
            />
          </div>

          <div class="text-center md:text-left space-y-6 w-full">
            <div>
              <h1 class="text-4xl font-black uppercase tracking-tighter leading-none mb-3">
                {`${user.firstName} ${user.lastName}` || 'Anonymous'}
              </h1>
              <p class="text-neutral-400 font-bold tracking-tight text-lg">{user.email}</p>
            </div>

            <div class="flex flex-wrap gap-2 justify-center md:justify-start">
              {#if isPremiumUser}
                <span
                  class="bg-black text-white text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <iconify-icon icon="solar:crown-minimalistic-bold" class="text-yellow-400"
                  ></iconify-icon>
                  Premium
                </span>
              {:else}
                <span
                  class="bg-neutral-100 text-neutral-500 text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest"
                >
                  Free Plan
                </span>
              {/if}
              <span
                class="bg-neutral-100 text-neutral-800 text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest"
              >
                {user.role}
              </span>
            </div>

            <div class="pt-4">
              <a
                href="/app/premium"
                class="block w-full text-center py-4 {isPremiumUser
                  ? 'bg-neutral-100 text-black'
                  : 'bg-black text-white'} rounded-2xl font-black uppercase tracking-widest text-[13px] hover:scale-[1.02] transition active:scale-[0.98]"
              >
                {isPremiumUser ? 'Manage Subscription' : 'Upgrade to Pro'}
              </a>
            </div>
          </div>
        </aside>

        <div class="flex-1 w-full pt-6 md:pt-32">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              in:fly={{ y: 20, delay: 100 }}
              class="p-10 bg-white border-2 border-neutral-100 rounded-[40px] hover:border-black transition-all group shadow-sm"
            >
              <div class="flex items-center justify-between mb-8">
                <span
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300 group-hover:text-black transition-colors"
                  >Timeline</span
                >
                <iconify-icon icon="solar:history-bold" width="20" class="text-neutral-200"
                ></iconify-icon>
              </div>
              <p class="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                Member Since
              </p>
              <p class="text-3xl font-black uppercase tracking-tighter">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div
              in:fly={{ y: 20, delay: 200 }}
              class="p-10 bg-neutral-900 text-white rounded-[40px] shadow-2xl shadow-neutral-200 group relative overflow-hidden"
            >
              <div class="relative z-10">
                <p
                  class="text-xs font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2"
                >
                  Current Status
                </p>
                <p class="text-3xl font-black uppercase tracking-tighter">
                  {isPremiumUser ? 'Elite User' : 'Standard Member'}
                </p>
              </div>
              <div
                class="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000"
              >
                <iconify-icon icon="solar:medal-ribbon-bold" width="180"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    background-color: white;
    overflow-x: hidden;
  }
</style>
