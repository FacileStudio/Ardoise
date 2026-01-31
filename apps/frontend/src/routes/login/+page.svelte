<script lang="ts">
  import { authClient } from '$lib/auth-client';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  async function handleLogin() {
    loading = true;
    error = '';
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.data) {
        auth.setAuth(result.data.session, result.data.user);
        goto('/profile');
      } else {
        error = result.error?.message || 'Login failed. Please try again.';
      }
    } catch (err: any) {
      error = err.message || 'Login failed. Please try again.';
    }
    loading = false;
  }
</script>

<main class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900">Login</h1>
      <p class="mt-2 text-gray-600">Sign in to your account</p>
    </div>

    <form on:submit|preventDefault={handleLogin} class="mt-8 space-y-4">
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
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
      />

      <button
        type="submit"
        disabled={loading}
        class="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-white hover:text-black hover:border hover:border-black disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-2"
      >
        <iconify-icon icon="solar:login-3-bold-duotone" width="20" height="20"></iconify-icon>
        {loading ? 'Logging in...' : 'Login'}
      </button>

      {#if error}
        <p class="text-center text-sm text-red-600">{error}</p>
      {/if}

      <p class="text-center text-sm text-gray-600">
        Don't have an account? <a href="/register" class="text-black font-semibold hover:underline">Register</a>
      </p>
    </form>
  </div>
</main>
