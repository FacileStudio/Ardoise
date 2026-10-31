<script lang="ts">
  import { Table } from '@facile/muse';
  import { resolve } from '$app/paths';
</script>

<div class="min-h-screen bg-fc-bg text-fc-fg">
  <nav class="fixed top-0 w-full flex items-center justify-between px-6 py-4 z-[100] bg-fc-bg/80 backdrop-blur-md">
    <a href={resolve('/')} class="text-xl font-semibold tracking-tight">Ardoise</a>
    <a href={resolve('/')} class="text-sm font-medium text-fc-fg-muted hover:text-fc-fg transition">← Retour</a>
  </nav>

  <main class="pt-24 pb-16 px-6 max-w-3xl mx-auto">
    <h1 class="text-3xl font-semibold tracking-tight">Cookie Policy</h1>
    <p class="mt-2 text-sm text-fc-fg-muted">Last updated: February 5, 2026</p>

    <div class="mt-12 space-y-8">
      <section>
        <h2 class="text-xl font-semibold">What are cookies?</h2>
        <p class="mt-3 text-sm text-fc-fg-muted leading-relaxed">
          Cookies are small text files used to store small pieces of information. They are stored on
          your device when the website is loaded on your browser.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold">How we use them</h2>
        <p class="mt-3 text-sm text-fc-fg-muted leading-relaxed">
          We use first-party and third-party cookies for several purposes. First-party cookies are
          mostly necessary for the website to function the right way, such as maintaining your
          authentication session.
        </p>
      </section>

      <Table>
        <thead>
          <tr>
            <th scope="col">Cookie</th>
            <th scope="col">Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-medium">auth_session</td>
            <td class="text-fc-fg-muted">Keeps you logged in (Essential)</td>
          </tr>
          <tr>
            <td class="font-medium">_ga</td>
            <td class="text-fc-fg-muted">Analytics tracking (Optional)</td>
          </tr>
        </tbody>
      </Table>
    </div>
  </main>
</div>
