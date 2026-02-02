<script>
    import '../app.css';
    import { onMount } from 'svelte';
    import authStore from '$lib/auth-store';

    onMount(async () => {
        if (!$authStore.user || !$authStore.session) authStore.logout(() => goto('/'));
    });
</script>

<slot />
