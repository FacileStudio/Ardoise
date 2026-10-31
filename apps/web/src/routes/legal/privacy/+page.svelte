<script lang="ts">
  import { resolve } from '$app/paths';
  const lastUpdated = 'February 5, 2026';
</script>

<div class="min-h-screen bg-fc-bg text-fc-fg">
  <nav class="fixed top-0 w-full flex items-center justify-between px-6 py-4 z-[100] bg-fc-bg/80 backdrop-blur-md">
    <a href={resolve('/')} class="text-xl font-semibold tracking-tight">Ardoise</a>
    <a href={resolve('/')} class="text-sm font-medium text-fc-fg-muted hover:text-fc-fg transition">← Retour</a>
  </nav>

  <main class="pt-24 pb-16 px-6 max-w-3xl mx-auto">
    <h1 class="text-3xl font-semibold tracking-tight">Politique de confidentialité</h1>
    <p class="mt-2 text-sm text-fc-fg-muted">Dernière mise à jour : {lastUpdated}</p>

    <div class="mt-12 space-y-8">
      <section>
        <h2 class="text-xl font-semibold">1. Information we collect</h2>
        <p class="mt-3 text-sm text-fc-fg-muted leading-relaxed">
          We collect information you provide directly to us when you create an account, such as your
          name, email address, and password. We also collect data automatically via cookies to
          improve your experience.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold">2. How we use your data</h2>
        <p class="mt-3 text-sm text-fc-fg-muted leading-relaxed">
          Your data is used to provide, maintain, and improve our services. We do not sell your
          personal data to third parties. We use tRPC and PostgreSQL to ensure your data is handled
          securely and efficiently.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold">3. Data Security</h2>
        <p class="mt-3 text-sm text-fc-fg-muted leading-relaxed">
          We implement industry-standard security measures to protect your information. However, no
          method of transmission over the Internet is 100% secure.
        </p>
      </section>
    </div>
  </main>
</div>
