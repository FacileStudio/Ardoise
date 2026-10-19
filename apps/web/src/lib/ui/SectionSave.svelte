<script lang="ts">
  import { Button, Spinner } from '@facile/muse';
  import 'iconify-icon';

  let {
    dirty,
    status,
    onsave,
  }: { dirty: boolean; status: 'idle' | 'saving' | 'saved'; onsave: () => void } = $props();
</script>

{#if dirty || status !== 'idle'}
  <Button onclick={onsave} disabled={status !== 'idle'} class="bg-primary text-primary-foreground">
    {#if status === 'saving'}
      <Spinner size="sm" />
      Enregistrement
    {:else if status === 'saved'}
      <iconify-icon icon="solar:check-circle-bold" width="18"></iconify-icon>
      Enregistré
    {:else}
      <iconify-icon icon="solar:diskette-bold" width="18"></iconify-icon>
      Enregistrer
    {/if}
  </Button>
{/if}
