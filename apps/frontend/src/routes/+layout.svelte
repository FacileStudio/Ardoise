<script>
    import '../app.css';
    import { onMount } from 'svelte';
    import { auth } from '$lib/stores/auth';

    onMount(async () => {
        if (!$auth.user || !$auth.session) auth.logout(() => goto('/'));
    });
</script>

<slot />
