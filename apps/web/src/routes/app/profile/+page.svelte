<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { toast } from '@facile/muse';
  import 'iconify-icon';

  interface UserData {
    firstName?: string;
    lastName?: string;
    email: string;
    createdAt: Date;
    role: string;
  }

  interface ClientData {
    id: string;
    companyName: string;
    billingAddress: string;
    billingCity: string;
    billingCountry: string;
    siret?: string;
    createdAt: Date;
  }

  let loading = true;
  let user: UserData | null = null;
  let client: ClientData | null = null;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      const [userData, clientData] = await Promise.all([
        trpc.user.me.query(),
        trpc.client.me.query(),
      ]);
      user = userData;
      client = clientData;
    } catch (err) {
      toast.danger('Erreur de chargement des données');
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
</script>

<div class="flex flex-col gap-6 p-6 max-w-4xl">
  {#if loading}
    <div class="flex items-center justify-center py-32">
      <iconify-icon icon="svg-spinners:ring-resize" width="24" class="text-muted-foreground"></iconify-icon>
    </div>
  {:else if user && client}
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">Informations client</h1>
      <p class="text-sm text-muted-foreground">
        Consultez les informations de votre société enregistrées dans Ardoise
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="rounded-xl border border-border p-6">
        <p class="text-xs font-medium text-muted-foreground mb-4">Entreprise</p>
        <div class="space-y-3">
          <div>
            <p class="text-xs font-medium text-muted-foreground mb-0.5">Nom de l'entreprise</p>
            <p class="text-base font-semibold text-foreground">{client.companyName}</p>
          </div>
          {#if client.siret}
            <div>
              <p class="text-xs font-medium text-muted-foreground mb-0.5">SIRET</p>
              <p class="text-sm font-medium text-foreground">{client.siret}</p>
            </div>
          {/if}
        </div>
      </div>

      <div class="rounded-xl border border-border p-6">
        <p class="text-xs font-medium text-muted-foreground mb-4">Adresse</p>
        <div class="space-y-3">
          <div>
            <p class="text-xs font-medium text-muted-foreground mb-0.5">Adresse de facturation</p>
            <p class="text-sm font-medium text-foreground">{client.billingAddress}</p>
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <p class="text-xs font-medium text-muted-foreground mb-0.5">Ville</p>
              <p class="text-sm font-medium text-foreground">{client.billingCity}</p>
            </div>
            <div class="flex-1">
              <p class="text-xs font-medium text-muted-foreground mb-0.5">Pays</p>
              <p class="text-sm font-medium text-foreground">{client.billingCountry}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-border p-6">
        <p class="text-xs font-medium text-muted-foreground mb-4">Contact</p>
        <div class="space-y-3">
          <div>
            <p class="text-xs font-medium text-muted-foreground mb-0.5">Contact principal</p>
            <p class="text-base font-semibold text-foreground">
              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Non renseigné'}
            </p>
          </div>
          <div>
            <p class="text-xs font-medium text-muted-foreground mb-0.5">Email</p>
            <p class="text-sm font-medium text-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl bg-foreground text-background p-6">
        <p class="text-xs font-medium text-background/60 mb-4">Compte</p>
        <div class="space-y-3">
          <div>
            <p class="text-xs font-medium text-background/60 mb-0.5">Client depuis</p>
            <p class="text-base font-semibold">{formatDate(client.createdAt)}</p>
          </div>
          <div class="flex items-center gap-2 pt-3 border-t border-background/10">
            <div class="w-2 h-2 rounded-full bg-fc-success"></div>
            <p class="text-sm text-background/80">Compte actif</p>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-border p-4">
      <div class="flex items-start gap-3">
        <iconify-icon icon="solar:info-circle-linear" width="18" class="text-muted-foreground mt-0.5"></iconify-icon>
        <div>
          <h3 class="text-sm font-medium text-foreground mb-0.5">
            Besoin de modifier vos informations ?
          </h3>
          <p class="text-sm text-muted-foreground">
            Pour toute modification de vos informations d'entreprise ou de facturation,
            veuillez nous contacter directement.
          </p>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center py-32">
      <div class="size-12 rounded-lg border border-border flex items-center justify-center mb-4">
        <iconify-icon icon="solar:user-linear" width="24" class="text-muted-foreground"></iconify-icon>
      </div>
      <h2 class="text-lg font-semibold text-foreground mb-1">Aucune donnée disponible</h2>
      <p class="text-sm text-muted-foreground">Impossible de charger vos informations</p>
    </div>
  {/if}
</div>
