<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import 'iconify-icon';

  $: status = $page.status;
  $: message = $page.error?.message || 'Something went wrong';

  function goDashboard() {
    goto('/admin/contacts');
  }

  function goBack() {
    window.history.back();
  }
</script>

<div class="min-h-screen bg-white flex items-center justify-center px-4">
  <div class="max-w-3xl w-full">
    <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-12">
      <div class="text-center">
        <div class="mb-6 flex justify-center">
          <div class="relative bg-primary rounded-2xl p-8 shadow-xl">
            <iconify-icon
              icon="solar:shield-warning-bold"
              width="80"
              class="text-white"
            ></iconify-icon>
          </div>
        </div>

        <h1 class="text-8xl font-black text-primary mb-6 tracking-tight">
          {status}
        </h1>

        <h2 class="text-3xl font-bold text-gray-800 mb-4">
          {#if status === 404}
            Admin Page Not Found
          {:else if status === 500}
            Server Error
          {:else if status === 403}
            Access Denied
          {:else}
            Error Occurred
          {/if}
        </h2>

        <div class="h-1 w-32 bg-primary rounded-full mx-auto mb-6"></div>

        <p class="text-lg text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
          {#if status === 404}
            This admin resource doesn't exist or has been moved. Please check the URL or navigate back to the dashboard.
          {:else if status === 500}
            An internal error occurred on the server. Our team has been notified and is working on a fix.
          {:else if status === 403}
            You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
          {:else}
            {message}
          {/if}
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            on:click={goDashboard}
            class="group relative px-8 py-4 bg-primary text-white font-semibold rounded-xl shadow-lg hover:bg-primary-hover transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <iconify-icon icon="solar:widget-4-bold" width="22"></iconify-icon>
            <span>Back to Dashboard</span>
            <iconify-icon
              icon="solar:arrow-right-bold"
              width="22"
              class="group-hover:translate-x-1 transition-transform"
            ></iconify-icon>
          </button>

          <button
            on:click={goBack}
            class="px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl shadow-lg hover:bg-gray-50 border border-gray-300 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <iconify-icon icon="solar:arrow-left-bold" width="22"></iconify-icon>
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>

    <div class="mt-6 text-center">
      <p class="text-sm text-gray-500">
        <iconify-icon icon="solar:info-circle-bold" width="16" class="inline-block"></iconify-icon>
        Error Code: {status} • Backoffice Admin Panel
      </p>
    </div>
  </div>
</div>
