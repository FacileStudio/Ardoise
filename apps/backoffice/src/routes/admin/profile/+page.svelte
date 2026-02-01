<script lang="ts">
    import { goto } from '$app/navigation';
    import { authClient } from '$lib/auth-client';
  import { auth } from '$lib/stores/auth';
  import 'iconify-icon';

  $: if (!$auth.loading && !$auth.user) {
      auth.logout();
  }
</script>

<main class="min-h-screen bg-slate-50">
  <div class="max-w-4xl mx-auto px-6 py-12">

    <div class="mb-10 flex items-center justify-between">
      <div>
        <button
          on:click={() => history.back()}
          class="text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-4 font-bold transition-colors group"
        >
          <iconify-icon icon="solar:alt-arrow-left-bold" class="group-hover:-translate-x-1 transition-transform"></iconify-icon>
          Retour au Dashboard
        </button>
        <h1 class="text-4xl font-black text-slate-900 tracking-tighter">Mon Profil</h1>
      </div>

      <div class="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600">
        <iconify-icon icon="solar:user-circle-bold" width="40"></iconify-icon>
      </div>
    </div>

    {#if $auth.loading}
      <div class="bg-white rounded-[32px] shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center">
        <iconify-icon icon="line-md:loading-twotone-loop" width="48" class="text-indigo-500 mb-4"></iconify-icon>
        <p class="text-slate-400 font-bold">Chargement de votre compte...</p>
      </div>
    {:else if $auth.user}
      <div class="space-y-6">
        <div class="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 md:p-12 space-y-10">

          <div class="grid md:grid-cols-2 gap-10">
            <div class="space-y-1">
              <div class="text-xs font-black text-slate-300 uppercase tracking-widest ml-1">Prénom</div>
              <div class="bg-slate-50 px-6 py-4 rounded-2xl text-slate-700 font-bold border border-transparent focus-within:border-indigo-100 transition-all">
                {$auth.user.name}
              </div>
            </div>

            <div class="space-y-1 md:col-span-2">
              <div class="text-xs font-black text-slate-300 uppercase tracking-widest ml-1">Adresse Email</div>
              <div class="bg-slate-50 px-6 py-4 rounded-2xl text-slate-700 font-bold border border-transparent flex items-center gap-3">
                <iconify-icon icon="solar:letter-bold" class="text-slate-400"></iconify-icon>
                {$auth.user.email}
              </div>
            </div>

            <div class="space-y-1">
              <div class="text-xs font-black text-slate-300 uppercase tracking-widest ml-1">Rôle</div>
              <div class="flex">
                <span class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 border border-indigo-100">
                  <iconify-icon icon="solar:medal-star-bold"></iconify-icon>
                  {$auth.user.role}
                </span>
              </div>
            </div>

            <div class="space-y-1">
              <div class="text-xs font-black text-slate-300 uppercase tracking-widest ml-1">Membre depuis</div>
              <p class="px-1 text-slate-500 font-medium">
                {new Date($auth.user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div class="h-px bg-slate-50"></div>

          <div class="flex flex-col md:flex-row gap-4">
            <button
            on:click={() => auth.logout(() => goto('/'))}
              class="bg-red-50 text-red-600 py-4 px-8 rounded-2xl hover:bg-red-600 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-black shadow-sm active:scale-95"
            >
              <iconify-icon icon="solar:logout-2-bold" width="20"></iconify-icon>
              Déconnexion
            </button>

            <button
              class="bg-slate-900 text-white py-4 px-8 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2 font-black shadow-lg active:scale-95"
            >
              <iconify-icon icon="solar:pen-new-square-bold" width="20"></iconify-icon>
              Modifier mes informations
            </button>
          </div>
        </div>

        <div class="bg-indigo-900 rounded-[32px] p-8 text-white flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-200">
              <iconify-icon icon="solar:lock-password-bold" width="24"></iconify-icon>
            </div>
            <div>
              <h4 class="font-bold">Sécurité du compte</h4>
              <p class="text-indigo-200 text-sm">Votre mot de passe a été mis à jour pour la dernière fois il y a 3 mois.</p>
            </div>
          </div>
          <button class="text-sm font-black bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors">
            Changer
          </button>
        </div>
      </div>
    {/if}
  </div>
</main>
