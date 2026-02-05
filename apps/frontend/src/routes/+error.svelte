<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import 'iconify-icon';

  $: status = $page.status;
  $: message = $page.error?.message || 'Something went wrong';

  function goHome() {
    goto('/');
  }

  function goBack() {
    window.history.back();
  }
</script>

<div class="min-h-screen bg-white flex items-center justify-center px-4">
  <div class="max-w-2xl w-full text-center">
    <div class="mb-8 relative">
      <div class="absolute inset-0 flex items-center justify-center opacity-10">
        <iconify-icon icon="solar:danger-triangle-bold" width="400" class="text-primary"
        ></iconify-icon>
      </div>

      <div class="relative z-10">
        <h1 class="text-9xl font-bold text-primary mb-4 animate-pulse">
          {status}
        </h1>

        <div class="flex items-center justify-center gap-3 mb-6">
          <div class="h-1 w-16 bg-primary rounded-full"></div>
          <iconify-icon icon="solar:danger-circle-bold" width="32" class="text-primary"
          ></iconify-icon>
          <div class="h-1 w-16 bg-primary rounded-full"></div>
        </div>

        <h2 class="text-3xl font-bold text-gray-800 mb-4">
          {#if status === 404}
            Page Not Found
          {:else if status === 500}
            Internal Server Error
          {:else}
            Oops! Something went wrong
          {/if}
        </h2>

        <p class="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          {#if status === 404}
            The page you're looking for seems to have wandered off into the digital void. Let's get
            you back on track.
          {:else if status === 500}
            Our servers are having a moment. We're on it! Please try again in a few moments.
          {:else}
            {message}
          {/if}
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            on:click={goHome}
            class="group relative px-8 py-3 bg-primary text-white font-semibold rounded-lg shadow-lg hover:bg-primary-hover transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <iconify-icon icon="solar:home-2-bold" width="20"></iconify-icon>
            <span>Go Home</span>
            <iconify-icon
              icon="solar:arrow-right-bold"
              width="20"
              class="group-hover:translate-x-1 transition-transform"
            ></iconify-icon>
          </button>

          <button
            on:click={goBack}
            class="px-8 py-3 bg-white text-primary font-semibold rounded-lg shadow-md hover:shadow-lg border-2 border-primary transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <iconify-icon icon="solar:arrow-left-bold" width="20"></iconify-icon>
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
