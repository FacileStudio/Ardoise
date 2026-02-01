<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import 'iconify-icon';

  let loading = true;
  let user: any = null;
  let error = '';

  onMount(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      goto('/');
      return;
    }

    try {
      user = await trpc.auth.me.query();
      loading = false;
    } catch (err: any) {
      error = 'Failed to load profile';
      loading = false;
      localStorage.removeItem('token');
      goto('/');
    }
  });

  function handleLogout() {
    localStorage.removeItem('token');
    goto('/');
  }
</script>

<main class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
      <a href="/" class="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4">
        <iconify-icon icon="solar:arrow-left-bold" width="20" height="20"></iconify-icon>
        Back to Dashboard
      </a>
      <h1 class="text-4xl font-bold text-gray-900">My Profile</h1>
    </div>

    {#if loading}
      <div class="bg-white rounded-lg shadow p-6">
        <p class="text-gray-600">Loading profile...</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-6">
        <p class="text-red-600">{error}</p>
      </div>
    {:else if user}
      <div class="bg-white rounded-lg shadow p-6 space-y-6">
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <div class="text-sm font-semibold text-gray-600">First Name</div>
            <p class="text-lg text-gray-900">{user.firstName}</p>
          </div>

          <div>
            <div class="text-sm font-semibold text-gray-600">Last Name</div>
            <p class="text-lg text-gray-900">{user.lastName}</p>
          </div>

          <div>
            <div class="text-sm font-semibold text-gray-600">Email</div>
            <p class="text-lg text-gray-900">{user.email}</p>
          </div>

          <div>
            <div class="text-sm font-semibold text-gray-600">Role</div>
            <p class="text-lg text-gray-900 capitalize">{user.role}</p>
          </div>

          <div>
            <div class="text-sm font-semibold text-gray-600">Member Since</div>
            <p class="text-lg text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div class="pt-4">
          <button
            on:click={handleLogout}
            class="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition cursor-pointer flex items-center gap-2"
          >
            <iconify-icon icon="solar:logout-2-bold" width="20" height="20"></iconify-icon>
            Logout
          </button>
        </div>
      </div>
    {/if}
  </div>
</main>
