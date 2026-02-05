<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import 'iconify-icon';

  $: status = $page.status;
  $: message = $page.error?.message || 'Unauthorized Action';

  const goDashboard = () => goto('/admin/contacts');
  const goBack = () => window.history.back();
</script>

<div
  class="min-h-screen bg-white text-black font-sans flex items-center justify-center px-6 selection:bg-black selection:text-white"
>
  <div class="absolute top-12 left-12 flex items-center gap-2 opacity-20 pointer-events-none">
    <div class="w-2 h-2 bg-black rounded-full"></div>
    <span class="text-[10px] font-black uppercase tracking-[0.3em]">Admin Protocol</span>
  </div>

  <div class="max-w-4xl w-full relative">
    <div class="grid md:grid-cols-2 gap-12 items-center">
      <div class="text-center md:text-left">
        <div
          class="inline-flex items-center justify-center w-16 h-16 bg-black text-white rounded-2xl mb-8"
        >
          <iconify-icon icon="solar:shield-warning-bold" width="32"></iconify-icon>
        </div>

        <h1
          class="text-8xl md:text-[10rem] font-black italic uppercase tracking-tighter leading-none mb-4"
        >
          {status}.
        </h1>

        <h2 class="text-2xl font-black uppercase tracking-tight mb-6">
          {#if status === 404}
            Resource Missing.
          {:else if status === 403}
            Access Restricted.
          {:else}
            System Failure.
          {/if}
        </h2>
      </div>

      <div class="bg-neutral-50 rounded-[40px] p-8 md:p-12 border border-neutral-100">
        <p class="text-neutral-500 font-medium text-lg leading-relaxed mb-10">
          {#if status === 404}
            The admin resource you are trying to reach doesn't exist or has been moved. Check the
            terminal logs or return to base.
          {:else if status === 403}
            Your current security clearance does not allow access to this sector. Contact your root
            administrator for elevation.
          {:else}
            {message}
          {/if}
        </p>

        <div class="flex flex-col gap-4">
          <button
            on:click={goDashboard}
            class="w-full px-8 py-5 bg-black text-white font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-800 transition active:scale-95 flex items-center justify-center gap-3"
          >
            <iconify-icon icon="solar:widget-4-bold" width="20"></iconify-icon>
            Dashboard
          </button>

          <button
            on:click={goBack}
            class="w-full px-8 py-5 bg-white text-black border border-neutral-200 font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-50 transition active:scale-95 flex items-center justify-center gap-3"
          >
            <iconify-icon icon="solar:undo-left-round-bold" width="20"></iconify-icon>
            Previous
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    class="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300"
  >
    <span>Status: {status}</span>
    <span class="w-1 h-1 bg-neutral-200 rounded-full"></span>
    <span>Backoffice Panel 2.0</span>
  </div>
</div>
