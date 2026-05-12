<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  $: status = $page.status;
  $: message = $page.error?.message || 'Something went wrong';
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-6">
  <div class="w-full max-w-sm text-center">
    <p class="text-6xl font-bold text-foreground">{status}</p>
    <h2 class="mt-4 text-lg font-semibold text-foreground">
      {#if status === 404}Page introuvable{:else if status === 500}Erreur serveur{:else}Erreur{/if}
    </h2>
    <p class="mt-2 text-sm text-muted-foreground">
      {#if status === 404}La page demandée n'existe pas.{:else if status === 500}Une erreur interne est survenue.{:else}{message}{/if}
    </p>
    <div class="mt-8 flex justify-center gap-3">
      <button onclick={() => goto(resolve('/'))} class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Accueil</button>
      <button onclick={() => window.history.back()} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent">Retour</button>
    </div>
  </div>
</div>
