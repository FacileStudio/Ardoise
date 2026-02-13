<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { toast } from '@repo/utils';
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
      toast.push('Erreur de chargement des données', 'error');
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

<main class="min-h-screen bg-[#FAF7F5] p-8">
  {#if loading}
    <div class="flex flex-col items-center justify-center h-[80vh] space-y-6" in:fade>
      <iconify-icon icon="svg-spinners:blocks-shuffle-3" width="48" class="text-[#291334]"></iconify-icon>
      <p class="text-xs font-black uppercase tracking-[0.3em] text-[#291334]/40">
        Chargement...
      </p>
    </div>
  {:else if user && client}
    <div class="max-w-5xl mx-auto space-y-8">
      <div in:fade>
        <h1 class="text-4xl font-black text-[#291334] tracking-tight mb-2">
          Informations client
        </h1>
        <p class="text-[#291334]/60 font-bold">
          Consultez les informations de votre société enregistrées dans Charles
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          in:fly={{ y: 20, delay: 100 }}
          class="p-8 bg-white border-2 border-[#291334]/10 rounded-3xl hover:border-[#FEC129] transition-all group shadow-sm"
        >
          <div class="flex items-center justify-between mb-6">
            <span class="text-xs font-black uppercase tracking-widest text-[#291334]/40">
              Entreprise
            </span>
            <iconify-icon icon="solar:buildings-2-bold" width="24" class="text-[#291334]/20"></iconify-icon>
          </div>
          <div class="space-y-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-[#291334]/50 mb-1">
                Nom de l'entreprise
              </p>
              <p class="text-2xl font-black text-[#291334] tracking-tight">
                {client.companyName}
              </p>
            </div>
            {#if client.siret}
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-[#291334]/50 mb-1">
                  SIRET
                </p>
                <p class="text-lg font-bold text-[#291334]">
                  {client.siret}
                </p>
              </div>
            {/if}
          </div>
        </div>

        <div
          in:fly={{ y: 20, delay: 200 }}
          class="p-8 bg-white border-2 border-[#291334]/10 rounded-3xl hover:border-[#FEC129] transition-all group shadow-sm"
        >
          <div class="flex items-center justify-between mb-6">
            <span class="text-xs font-black uppercase tracking-widest text-[#291334]/40">
              Adresse
            </span>
            <iconify-icon icon="solar:map-point-bold" width="24" class="text-[#291334]/20"></iconify-icon>
          </div>
          <div class="space-y-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-[#291334]/50 mb-1">
                Adresse de facturation
              </p>
              <p class="text-lg font-bold text-[#291334]">
                {client.billingAddress}
              </p>
            </div>
            <div class="flex gap-4">
              <div class="flex-1">
                <p class="text-xs font-bold uppercase tracking-wider text-[#291334]/50 mb-1">
                  Ville
                </p>
                <p class="text-lg font-bold text-[#291334]">
                  {client.billingCity}
                </p>
              </div>
              <div class="flex-1">
                <p class="text-xs font-bold uppercase tracking-wider text-[#291334]/50 mb-1">
                  Pays
                </p>
                <p class="text-lg font-bold text-[#291334]">
                  {client.billingCountry}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          in:fly={{ y: 20, delay: 300 }}
          class="p-8 bg-white border-2 border-[#291334]/10 rounded-3xl hover:border-[#FEC129] transition-all group shadow-sm"
        >
          <div class="flex items-center justify-between mb-6">
            <span class="text-xs font-black uppercase tracking-widest text-[#291334]/40">
              Contact
            </span>
            <iconify-icon icon="solar:user-bold" width="24" class="text-[#291334]/20"></iconify-icon>
          </div>
          <div class="space-y-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-[#291334]/50 mb-1">
                Contact principal
              </p>
              <p class="text-2xl font-black text-[#291334] tracking-tight">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Non renseigné'}
              </p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-[#291334]/50 mb-1">
                Email
              </p>
              <p class="text-lg font-bold text-[#291334]">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <div
          in:fly={{ y: 20, delay: 400 }}
          class="p-8 bg-[#291334] text-white rounded-3xl shadow-lg relative overflow-hidden group"
        >
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-6">
              <span class="text-xs font-black uppercase tracking-widest text-white/60">
                Compte
              </span>
              <iconify-icon icon="solar:calendar-bold" width="24" class="text-white/30"></iconify-icon>
            </div>
            <div class="space-y-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                  Client depuis
                </p>
                <p class="text-2xl font-black tracking-tight">
                  {formatDate(client.createdAt)}
                </p>
              </div>
              <div class="flex items-center gap-2 pt-4 border-t border-white/10">
                <div class="w-2 h-2 rounded-full bg-[#FEC129]"></div>
                <p class="text-sm font-bold text-white/80">
                  Compte actif
                </p>
              </div>
            </div>
          </div>
          <div class="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000">
            <iconify-icon icon="solar:verified-check-bold" width="160"></iconify-icon>
          </div>
        </div>
      </div>

      <div
        in:fly={{ y: 20, delay: 500 }}
        class="p-8 bg-white border-2 border-[#291334]/10 rounded-3xl shadow-sm"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-[#FEC129]/10 flex items-center justify-center flex-shrink-0">
            <iconify-icon icon="solar:info-circle-bold" width="24" class="text-[#FEC129]"></iconify-icon>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-black text-[#291334] mb-2">
              Besoin de modifier vos informations ?
            </h3>
            <p class="text-[#291334]/60 font-bold leading-relaxed">
              Pour toute modification de vos informations d'entreprise ou de facturation,
              veuillez nous contacter directement.
            </p>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center h-[80vh] space-y-6" in:fade>
      <iconify-icon icon="solar:sad-circle-bold" width="64" class="text-[#291334]/20"></iconify-icon>
      <div class="text-center">
        <h2 class="text-2xl font-black text-[#291334] mb-2">
          Aucune donnée disponible
        </h2>
        <p class="text-[#291334]/60 font-bold">
          Impossible de charger vos informations
        </p>
      </div>
    </div>
  {/if}
</main>
