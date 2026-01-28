<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let firstName = '';
  let lastName = '';
  let loading = false;
  let error = '';

  async function handleRegister() {
    loading = true;
    error = '';
    try {
      const result = await trpc.auth.register.mutate({ email, password, firstName, lastName });
      auth.setAuth(result.token, result.user);
      goto('/profile');
    } catch (err: any) {
      error = err.shape?.message || 'Registration failed. Please try again.';
    }
    loading = false;
  }
</script>

<main class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900">Register</h1>
      <p class="mt-2 text-gray-600">Create a new account</p>
    </div>

    <form on:submit|preventDefault={handleRegister} class="mt-8 space-y-4">
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

      <input
        type="password"
        bind:value={password}
        placeholder="Password"
        required
        minlength="6"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
      />

      <button
        type="submit"
        disabled={loading}
        class="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-white hover:text-black hover:border hover:border-black disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-2"
      >
        <iconify-icon icon="solar:user-plus-bold-duotone" width="20" height="20"></iconify-icon>
        {loading ? 'Creating account...' : 'Register'}
      </button>

      {#if error}
        <p class="text-center text-sm text-red-600">{error}</p>
      {/if}

      <p class="text-center text-sm text-gray-600">
        Already have an account? <a href="/login" class="text-black font-semibold hover:underline">Login</a>
      </p>
    </form>
  </div>
</main>
