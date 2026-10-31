<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '@facile/muse';

  const status = $derived(page.status);
  const message = $derived(page.error?.message || 'Something went wrong');
</script>

<svelte:head><title>{status} - Ardoise</title></svelte:head>

<div class="flex min-h-dvh items-center justify-center bg-fc-page px-6">
  <div class="w-full max-w-sm text-center">
    <p class="text-6xl font-semibold text-fc-fg">{status}</p>
    <h2 class="mt-4 text-fc-lg font-semibold text-fc-fg">
      {#if status === 404}Page introuvable{:else if status === 403}Accès refusé{:else if status === 500}Erreur serveur{:else}Erreur{/if}
    </h2>
    <p class="mt-2 text-fc-sm text-fc-fg-muted">
      {#if status === 404}La page demandée n'existe pas.{:else if status === 403}Vous n'avez pas les permissions nécessaires.{:else if status === 500}Une erreur interne est survenue.{:else}{message}{/if}
    </p>
    <div class="mt-8 flex justify-center gap-3">
      <Button href="/">Accueil</Button>
      <Button variant="ghost" onclick={() => window.history.back()}>Retour</Button>
    </div>
  </div>
</div>
