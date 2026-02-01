<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let loading = true;
  let user: any = null;
  let error = '';
  let isPremiumUser: boolean | null = null; // New state for premium status

  onMount(async () => {
    if (!$auth.session) {
      goto('/login');
      return;
    }

    try {
      user = await trpc.user.me.query();
      // Fetch premium status
      const subscriptionStatus = await trpc.stripe.getSubscription.query();
      isPremiumUser = subscriptionStatus.isPremium;

      loading = false;
    } catch (err: any) {
      error = 'Failed to load profile';
      console.error('Error loading profile or subscription status:', err);
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
          <div class="text-sm font-semibold text-gray-600">Name</div>
          <p class="text-lg text-gray-900">{user.firstName} {user.lastName}</p>
        </div>

        <div>
          <div class="text-sm font-semibold text-gray-600">Email</div>
          <p class="text-lg text-gray-900">{user.email}</p>
        </div>

        <div>
          <div class="text-sm font-semibold text-gray-600">Role</div>
          <p class="text-lg text-gray-900 capitalize">{user.role}</p>
        </div>

        <!-- Display Premium Status -->
        {#if isPremiumUser !== null}
          <div>
            <div class="text-sm font-semibold text-gray-600">Membership</div>
            <p class="text-lg text-gray-900">
              {#if isPremiumUser}
                <span class="text-green-600 font-bold">Premium</span>
              {:else}
                <span class="text-blue-600">Standard</span>
                (<a href="/premium" class="text-indigo-600 hover:underline">Upgrade</a>)
              {/if}
            </p>
          </div>
        {/if}

        <div>
          <div class="text-sm font-semibold text-gray-600">Member Since</div>
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