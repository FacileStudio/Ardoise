<script lang="ts">
  import { resolve } from '$app/paths';
  import authStore from '$lib/auth-store';
  import 'iconify-icon';
</script>

<div class="min-h-screen bg-background text-foreground">
  <header class="border-b border-border">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
      <div class="flex h-14 items-center gap-3">
        <iconify-icon icon="solar:bill-list-bold-duotone" width="28" class="text-foreground"></iconify-icon>
        <span class="text-2xl font-bold font-heading tracking-tight">Charles</span>
      </div>
      <div class="flex items-center gap-2">
        {#if !$authStore.session}
          <a
            href={resolve('/login')}
            class="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Connexion
          </a>
        {:else}
          <a
            href={resolve($authStore.user?.role === 'ADMIN' ? '/admin' : '/app')}
            class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {$authStore.user?.role === 'ADMIN' ? 'Administration' : 'Mes factures'}
          </a>
        {/if}
      </div>
    </div>
  </header>

  <main>
    <section class="mx-auto max-w-5xl px-6 py-24 text-center">
      <h1 class="text-5xl font-bold tracking-tight">
        Facturation.<br />Paiement.
      </h1>
      <p class="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
        Plateforme de facturation et de paiement pour Facile Studio.
        Accédez à vos factures, effectuez vos paiements en ligne.
      </p>
      <div class="mt-10 flex justify-center gap-3">
        {#if !$authStore.session}
          <a
            href={resolve('/login')}
            class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Se connecter
            <iconify-icon icon="solar:arrow-right-linear" width="16"></iconify-icon>
          </a>
        {:else}
          <a
            href={resolve($authStore.user?.role === 'ADMIN' ? '/admin' : '/app')}
            class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Accéder au portail
            <iconify-icon icon="solar:arrow-right-linear" width="16"></iconify-icon>
          </a>
        {/if}
      </div>
    </section>

    <div class="mx-auto max-w-5xl px-6"><div class="h-px bg-border"></div></div>

    <section class="mx-auto max-w-5xl px-6 py-20">
      <div class="grid gap-6 md:grid-cols-3">
        {#each [
          {
            icon: 'solar:wallet-linear',
            title: 'Vos factures',
            desc: 'Consultez toutes vos factures en un seul endroit. Accès rapide et sécurisé.'
          },
          {
            icon: 'solar:card-linear',
            title: 'Paiement en ligne',
            desc: 'Payez vos factures directement avec Stripe. Rapide, simple et sécurisé.'
          },
          {
            icon: 'solar:chart-linear',
            title: 'Suivi en temps réel',
            desc: "Suivez l'état de vos paiements : en attente, payées, expirées."
          }
        ] as feature (feature.title)}
          <div class="rounded-xl border border-border p-6">
            <div class="mb-3 flex size-10 items-center justify-center rounded-md border border-border">
              <iconify-icon icon={feature.icon} width="20"></iconify-icon>
            </div>
            <h3 class="text-base font-heading font-semibold">{feature.title}</h3>
            <p class="mt-1.5 text-sm text-muted-foreground">{feature.desc}</p>
          </div>
        {/each}
      </div>
    </section>

    <div class="mx-auto max-w-5xl px-6"><div class="h-px bg-border"></div></div>

    <section class="mx-auto max-w-5xl px-6 py-20 text-center">
      <h2 class="text-3xl font-bold tracking-tight">Prêt à commencer ?</h2>
      <p class="mt-4 text-muted-foreground">
        Connectez-vous pour accéder à vos factures et paiements.
      </p>
      {#if !$authStore.session}
        <a
          href={resolve('/login')}
          class="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Se connecter
        </a>
      {/if}
    </section>
  </main>

  <footer class="border-t border-border text-center">
    <div class="mx-auto max-w-5xl px-6 py-6 text-sm text-muted-foreground">
      © {new Date().getFullYear()} Charles par <a href="https://facile.studio" class="font-semibold underline hover:cursor-pointer">Facile.</a>
    </div>
  </footer>
</div>
