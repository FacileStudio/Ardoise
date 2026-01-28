<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let loading = true;
  let user: any = null;
  let error = '';

  onMount(async () => {
    if (!$auth.token) {
      goto('/login');
      return;
    }

    try {
      user = await trpc.auth.me.query();
      loading = false;
    } catch (err: any) {
      error = 'Failed to load profile';
      loading = false;
      if (err.shape?.code === 'UNAUTHORIZED') {
        auth.logout();
        goto('/login');
      }
    }
  });

  function handleLogout() {
    auth.logout();
    goto('/login');
  }
</script>

<main class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900">Profile</h1>
      <p class="mt-2 text-gray-600">Your account information</p>
    </div>

    {#if loading}
      <div class="text-center py-8">
        <p class="text-gray-600">Loading...</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-600 text-center">{error}</p>
      </div>
    {:else if user}
      <div class="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label class="text-sm font-semibold text-gray-600">Name</label>
          <p class="text-lg text-gray-900">{user.firstName} {user.lastName}</p>
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-600">Email</label>
          <p class="text-lg text-gray-900">{user.email}</p>
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-600">Role</label>
          <p class="text-lg text-gray-900 capitalize">{user.role}</p>
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-600">Account Status</label>
          <p class="text-lg text-gray-900">{user.isActive ? 'Active' : 'Inactive'}</p>
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-600">Member Since</label>
          <p class="text-lg text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>

        <div class="pt-4 space-y-2">
          <button
            on:click={handleLogout}
            class="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <iconify-icon icon="solar:logout-bold-duotone" width="20" height="20"></iconify-icon>
            Logout
          </button>

          <a
            href="/"
            class="block w-full text-center bg-black text-white py-2 px-4 rounded-lg hover:bg-white hover:text-black hover:border hover:border-black transition flex items-center justify-center gap-2"
          >
            <iconify-icon icon="solar:home-bold-duotone" width="20" height="20"></iconify-icon>
            Back to Home
          </a>
        </div>
      </div>
    {/if}
  </div>
</main>
