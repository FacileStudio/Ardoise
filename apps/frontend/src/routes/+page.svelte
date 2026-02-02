<script lang="ts">
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';

  let email = '';
  let firstName = '';
  let lastName = '';
  let loading = false;
  let message = '';

  async function handleSubmit() {
    loading = true;
    message = '';
    try {
      await trpc.contact.create.mutate({ email, firstName, lastName });
      message = 'Thank you for submitting your information!';
      email = firstName = lastName = '';
    } catch (error: any) {
      console.error(error);
      if (error.shape) {
        message = `Error: ${error.shape.message}`;
      } else {
        message = 'Error submitting form. Please try again.';
      }
    }
    loading = false;
  }
</script>

<div class="min-h-screen flex flex-col">
  <section class="h-screen relative flex flex-col">
    <nav class="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-6 z-10">
      <div class="text-2xl font-bold text-black">Monorepo Template</div>

      {#if !$authStore.session}
        <div class="flex gap-4">
          <a
            href="/login"
            class="px-6 py-2 text-black border border-gray-300 rounded-lg hover:bg-black hover:text-white transition flex items-center gap-2"
          >
            <iconify-icon icon="solar:login-3-bold-duotone" width="20" height="20"></iconify-icon>
            Login
          </a>
          <a
            href="/register"
            class="px-6 py-2 bg-black text-white rounded-lg hover:bg-white hover:text-black hover:border hover:border-black transition flex items-center gap-2"
          >
            <iconify-icon icon="solar:user-plus-bold-duotone" width="20" height="20"></iconify-icon>
            Register
          </a>
        </div>
      {:else}
        <a
          href="/app/profile"
          class="px-6 py-2 bg-black text-white rounded-lg hover:bg-white hover:text-black hover:border hover:border-black transition flex items-center gap-2"
        >
          <iconify-icon icon="solar:user-bold-duotone" width="20" height="20"></iconify-icon>
          Profile
        </a>
      {/if}
    </nav>

    <div class="flex-1 flex items-center justify-center bg-white">
      <div class="text-center text-black">
        <h1 class="text-6xl md:text-8xl font-bold mb-4">Monorepo Template</h1>
        <p class="text-xl md:text-2xl text-black">Build faster with a modern full-stack starter</p>
      </div>
    </div>
  </section>

  <section id="contact" class="flex justify-center bg-neutral-100 px-4 py-16">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
      <div class="text-center">
        <h2 class="text-4xl font-bold text-black">Get in Touch</h2>
        <p class="mt-2 text-black">We'd love to hear from you</p>
      </div>

      <form on:submit|preventDefault={handleSubmit} class="mt-8 space-y-4">
        <input
          type="text"
          bind:value={firstName}
          placeholder="First Name"
          required
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
        />

        <input
          type="text"
          bind:value={lastName}
          placeholder="Last Name"
          required
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
        />

        <input
          type="email"
          bind:value={email}
          placeholder="Email"
          required
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
        />

        <button
          type="submit"
          disabled={loading}
          class="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-white hover:text-black hover:border hover:border-black disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-2"
        >
          <iconify-icon icon="solar:letter-bold-duotone" width="20" height="20"></iconify-icon>
          {loading ? 'Submitting...' : 'Submit'}
        </button>

        {#if message}
          <p class="text-center text-sm" class:text-green-600={message.includes('Thank you')} class:text-red-600={message.includes('Error')}>
            {message}
          </p>
        {/if}
      </form>
    </div>
  </section>

  <footer class="bg-black text-white py-12 px-8">
    <div class="max-w-6xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 class="text-xl font-bold mb-4">Monorepo Template</h3>
          <p class="text-gray-300">A modern full-stack monorepo template with SvelteKit and tRPC.</p>
        </div>

        <div>
          <h4 class="text-lg font-semibold mb-4">Quick Links</h4>
          <ul class="space-y-2">
            <li><a href="/" class="text-gray-300 hover:opacity-70 transition">Home</a></li>
            <li><a href="#contact" class="text-gray-300 hover:opacity-70 transition">Contact</a></li>
            <li><a href="/login" class="text-gray-300 hover:opacity-70 transition">Login</a></li>
            <li><a href="/register" class="text-gray-300 hover:opacity-70 transition">Register</a></li>
          </ul>
        </div>

        <div>
          <h4 class="text-lg font-semibold mb-4">Resources</h4>
          <ul class="space-y-2">
            <li><a href="https://kit.svelte.dev" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:opacity-70 transition">SvelteKit</a></li>
            <li><a href="https://trpc.io" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:opacity-70 transition">tRPC</a></li>
            <li><a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:opacity-70 transition">Tailwind CSS</a></li>
          </ul>
        </div>
      </div>

      <div class="mt-8 pt-8 border-t border-gray-300 text-center text-gray-300">
        <p>&copy; {new Date().getFullYear()} Monorepo Template. All rights reserved.</p>
      </div>
    </div>
  </footer>
</div>
