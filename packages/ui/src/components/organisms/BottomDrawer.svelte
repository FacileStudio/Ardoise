<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  export let open = false;
  export let title = "";
</script>

{#if open}
  <div
    role="button"
    tabindex="0"
    transition:fade
    on:click={() => open = false}
    on:keydown={(e) => e.key === 'Escape' && (open = false)}
    class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
  ></div>

  <div
    transition:fly={{ y: 500, duration: 400 }}
    class="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[40px] shadow-2xl border-t border-slate-100 max-h-[90vh] overflow-y-auto"
  >
    <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mt-4 mb-2"></div>

    <div class="p-8 pt-4">
      {#if title}
        <h3 class="font-black italic uppercase tracking-tighter text-2xl mb-6 text-slate-900">{title}</h3>
      {/if}
      <slot />
    </div>
  </div>
{/if}
