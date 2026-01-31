<script lang="ts">
  import { trpc } from '$lib/trpc';
  import { onMount } from 'svelte';
  import 'iconify-icon';

  let isAuthenticated = false;
  let email = '';
  let password = '';
  let contacts= [];
  let loading = false;
  let error = '';

  onMount(() => {
    const token = localStorage.getItem('token');
    if (token) {
      isAuthenticated = true;
      loadContacts();
    }
  });

  async function handleLogin() {
    loading = true;
    error = '';
    try {
      const result = await trpc.auth.login.mutate({ email, password });
      localStorage.setItem('token', result.session.token);
      isAuthenticated = true;
      await loadContacts();
    } catch (err) {
      error = 'Invalid email or password';
    }
    loading = false;
  }

  async function loadContacts() {
    loading = true;
    try {
      contacts = await trpc.contact.list.query();
    } catch (err) {
      error = 'Failed to load contacts';
    }
    loading = false;
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this contact?'))
      return;
    try {
      await trpc.contact.delete.mutate({ id });
      await loadContacts();
    } catch (err) {
      error = 'Failed to delete contact';
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    isAuthenticated = false;
    contacts = [];
  }
</script>

<main class="min-h-screen bg-gray-50">
  {#if !isAuthenticated}
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-gray-900">Admin Login</h1>
          <p class="mt-2 text-gray-600">Enter admin credentials</p>
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
            class="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <iconify-icon icon="solar:login-2-bold" width="20" height="20"></iconify-icon>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {#if error}
            <p class="text-center text-sm text-red-600">{error}</p>
          {/if}
        </form>
      </div>
    </div>
  {:else}
    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900">Contact Submissions</h1>
        <div class="flex gap-3">
          <a
            href="/profile"
            class="bg-gray-100 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
          >
            <iconify-icon icon="solar:user-bold" width="20" height="20"></iconify-icon>
            Profile
          </a>
          <button
            on:click={handleLogout}
            class="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-400 transition cursor-pointer flex items-center gap-2"
          >
            <iconify-icon icon="solar:logout-2-bold" width="20" height="20"></iconify-icon>
            Logout
          </button>
        </div>
      </div>

      {#if loading}
        <p class="text-gray-600">Loading contacts...</p>
      {:else if contacts.length === 0}
        <p class="text-gray-600">No contacts yet.</p>
      {:else}
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each contacts as contact}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.firstName}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.lastName}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.email}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      on:click={() => handleDelete(contact.id)}
                      class="text-red-600 hover:text-red-800 transition cursor-pointer"
                      title="Delete contact"
                    >
                      <iconify-icon icon="solar:trash-bin-trash-bold" width="20" height="20"></iconify-icon>
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</main>
