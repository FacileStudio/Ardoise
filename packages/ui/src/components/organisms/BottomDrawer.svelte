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
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
  ></div>

  <div
    transition:fly={{ y: 500, duration: 400 }}
    class="fixed bottom-0 left-0 right-0 bg-background z-[101] rounded-t-xl border-t border-border shadow-lg max-h-[90vh] overflow-y-auto"
  >
    <div class="w-12 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2"></div>

    <div class="p-6 pt-4">
      {#if title}
        <h3 class="font-semibold text-lg mb-6 text-foreground">{title}</h3>
      {/if}
      <slot />
    </div>
  </div>
{/if}
