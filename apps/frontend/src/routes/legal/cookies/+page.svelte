<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<div class="min-h-screen bg-background text-foreground">
  <nav class="fixed top-0 w-full flex items-center justify-between px-6 py-4 z-[100] bg-background/80 backdrop-blur-md border-b border-border">
    <a href={resolve('/')} class="text-xl font-bold tracking-tight">Ardoise</a>
    <a href={resolve('/')} class="text-sm font-medium text-muted-foreground hover:text-foreground transition">← Retour</a>
  </nav>

  <main class="pt-24 pb-16 px-6 max-w-3xl mx-auto">
    <h1 class="text-3xl font-bold tracking-tight">Cookie Policy</h1>
    <p class="mt-2 text-sm text-muted-foreground">Last updated: February 5, 2026</p>

    <div class="mt-12 space-y-8">
      <section>
        <h2 class="text-xl font-semibold">What are cookies?</h2>
        <p class="mt-3 text-sm text-muted-foreground leading-relaxed">
          Cookies are small text files used to store small pieces of information. They are stored on
          your device when the website is loaded on your browser.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold">How we use them</h2>
        <p class="mt-3 text-sm text-muted-foreground leading-relaxed">
          We use first-party and third-party cookies for several purposes. First-party cookies are
          mostly necessary for the website to function the right way, such as maintaining your
          authentication session.
        </p>
      </section>

      <table class="w-full text-left border-collapse mt-4">
        <thead>
          <tr class="border-b border-border">
            <th class="py-3 text-xs font-semibold text-muted-foreground">Cookie</th>
            <th class="py-3 text-xs font-semibold text-muted-foreground">Purpose</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr class="border-b border-border/50">
            <td class="py-3 font-medium">auth_session</td>
            <td class="py-3 text-muted-foreground">Keeps you logged in (Essential)</td>
          </tr>
          <tr class="border-b border-border/50">
            <td class="py-3 font-medium">_ga</td>
            <td class="py-3 text-muted-foreground">Analytics tracking (Optional)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</div>
