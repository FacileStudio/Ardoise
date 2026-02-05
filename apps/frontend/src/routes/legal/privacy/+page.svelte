<script lang="ts">
  const lastUpdated = 'February 5, 2026';
</script>

<div class="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
  <nav
    class="fixed top-0 w-full flex items-center justify-between px-6 py-4 z-[100] bg-white/80 backdrop-blur-md border-b border-gray-100"
  >
    <a href="/" class="text-xl font-black uppercase tracking-tighter">Monorepo.</a>
    <a href="/" class="text-sm font-bold hover:opacity-50 transition flex items-center gap-2">
      <iconify-icon icon="solar:arrow-left-bold" width="16"></iconify-icon> Back Home
    </a>
  </nav>

  <main class="pt-40 pb-24 px-6 max-w-3xl mx-auto">
    <span class="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400"
      >Legal Document</span
    >
    <h1 class="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">
      Privacy <br /> Policy.
    </h1>
    <p class="text-neutral-500 font-medium mb-12 text-sm">Last updated: {lastUpdated}</p>

    <div class="space-y-12 text-neutral-800 leading-relaxed">
      <section>
        <h2 class="text-2xl font-black uppercase tracking-tight mb-4">1. Information we collect</h2>
        <p>
          We collect information you provide directly to us when you create an account, such as your
          name, email address, and password. We also collect data automatically via cookies to
          improve your experience.
        </p>
      </section>

      <section>
        <h2 class="text-2xl font-black uppercase tracking-tight mb-4">2. How we use your data</h2>
        <p>
          Your data is used to provide, maintain, and improve our services. We do not sell your
          personal data to third parties. We use tRPC and PostgreSQL to ensure your data is handled
          securely and efficiently.
        </p>
      </section>

      <section>
        <h2 class="text-2xl font-black uppercase tracking-tight mb-4">3. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your information. However, no
          method of transmission over the Internet is 100% secure.
        </p>
      </section>
    </div>
  </main>
</div>
