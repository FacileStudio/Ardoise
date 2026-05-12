<script lang="ts">
import  authStore from '$lib/auth-store';
import 'iconify-icon';
</script>

<main class="bg-background">
  <div class="max-w-2xl mx-auto p-6 space-y-6">

    <div class="flex items-center justify-between">
      <div>
        <button
          on:click={() => history.back()}
          class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon>
          Retour au Dashboard
        </button>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Mon Profil</h1>
      </div>

      <div class="w-12 h-12 bg-muted rounded-xl border border-border flex items-center justify-center text-muted-foreground">
        <iconify-icon icon="solar:user-circle-bold" width="32"></iconify-icon>
      </div>
    </div>

    {#if $authStore.loading}
      <div class="rounded-xl border border-border p-12 flex flex-col items-center justify-center">
        <iconify-icon icon="line-md:loading-twotone-loop" width="32" class="text-muted-foreground mb-3"></iconify-icon>
        <p class="text-sm text-muted-foreground">Chargement de votre compte...</p>
      </div>
    {:else if $authStore.user}
      <div class="space-y-6">
        <div class="rounded-xl border border-border p-6 space-y-6">

          <div class="grid md:grid-cols-2 gap-6">
            <div class="space-y-1">
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prénom</div>
              <div class="bg-muted px-4 py-3 rounded-lg text-sm font-medium text-foreground">
                {$authStore.user.firstName}
              </div>
            </div>

            <div class="space-y-1">
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</div>
              <div class="bg-muted px-4 py-3 rounded-lg text-sm font-medium text-foreground">
                {$authStore.user.lastName}
              </div>
            </div>

            <div class="space-y-1 md:col-span-2">
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adresse Email</div>
              <div class="bg-muted px-4 py-3 rounded-lg text-sm font-medium text-foreground flex items-center gap-2">
                <iconify-icon icon="solar:letter-bold" class="text-muted-foreground" width="16"></iconify-icon>
                {$authStore.user.email}
              </div>
            </div>

            <div class="space-y-1">
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rôle</div>
              <div class="flex">
                <span class="bg-muted text-foreground px-2 py-1 rounded text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                  <iconify-icon icon="solar:medal-star-bold" width="14"></iconify-icon>
                  {$authStore.user.role}
                </span>
              </div>
            </div>
          </div>

          <div class="h-px bg-border"></div>

          <div class="flex flex-col md:flex-row gap-3">
            <button
            on:click={() => authStore.logout()}
              class="bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded-md hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm font-medium"
            >
              <iconify-icon icon="solar:logout-2-bold" width="16"></iconify-icon>
              Déconnexion
            </button>

            <button
              class="bg-primary text-primary-foreground py-2 px-4 rounded-md hover:opacity-90 transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm font-medium"
            >
              <iconify-icon icon="solar:pen-new-square-bold" width="16"></iconify-icon>
              Modifier mes informations
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-border p-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
              <iconify-icon icon="solar:lock-password-bold" width="20"></iconify-icon>
            </div>
            <div>
              <h4 class="text-sm font-medium text-foreground">Sécurité du compte</h4>
              <p class="text-xs text-muted-foreground">Votre mot de passe a été mis à jour pour la dernière fois il y a 3 mois.</p>
            </div>
          </div>
          <button class="text-sm font-medium border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
            Changer
          </button>
        </div>
      </div>
    {/if}
  </div>
</main>
