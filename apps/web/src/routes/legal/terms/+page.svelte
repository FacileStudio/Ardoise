<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<div class="min-h-screen bg-fc-bg text-fc-fg">
  <nav class="fixed top-0 w-full flex items-center justify-between px-6 py-4 z-[100] bg-fc-bg/80 backdrop-blur-md">
    <a href={resolve('/')} class="text-xl font-semibold tracking-tight">Ardoise</a>
    <a href={resolve('/')} class="text-sm font-medium text-fc-fg-muted hover:text-fc-fg transition">← Retour</a>
  </nav>

  <main class="pt-24 pb-16 px-6 max-w-3xl mx-auto">
    <h1 class="text-3xl font-semibold tracking-tight">Terms of Service</h1>
    <p class="mt-2 text-sm text-fc-fg-muted">Effective Date: February 5, 2026</p>

    <div class="mt-12 space-y-8">
      <section>
        <h2 class="text-xl font-semibold">1. Agreement to Terms</h2>
        <p class="mt-3 text-sm text-fc-fg-muted leading-relaxed">
          By accessing Ardoise Template, you agree to be bound by these Terms of Service and all
          applicable laws and regulations.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold">2. Use License</h2>
        <p class="mt-3 text-sm text-fc-fg-muted leading-relaxed">
          Permission is granted to temporarily download one copy of the materials for personal,
          non-commercial transitory viewing only. This is the grant of a license, not a transfer of
          title.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold">3. Disclaimer</h2>
        <p class="mt-3 text-sm text-fc-fg-muted leading-relaxed">
          The materials on Ardoise Template are provided on an 'as is' basis. We make no
          warranties, expressed or implied, and hereby disclaim and negate all other warranties
          including, without limitation, implied warranties or conditions of merchantability.
        </p>
      </section>
    </div>
  </main>
</div>
