<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Alert, Button } from '@facile/muse';
  import { i18n } from '@repo/i18n/svelte';
  import type { SessionUser } from '@repo/auth-shared';
  import { trpc } from '$lib/trpc';
  import authStore from '$lib/auth-store';

  let token = $state('');
  let submitting = $state(false);
  let failed = $state(false);

  onMount(() => {
    token = new URLSearchParams(window.location.search).get('token') ?? '';
    window.history.replaceState({}, '', window.location.pathname);
    if (!token) failed = true;
  });

  async function confirm() {
    submitting = true;
    try {
      const { user } = await trpc.magicLink.consume.mutate({ token });
      authStore.setAuth(user as SessionUser);
      token = '';
      await goto(resolve('/app'));
    } catch {
      failed = true;
      token = '';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Connexion — Ardoise</title>
  <meta name="referrer" content="no-referrer" />
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-8 py-12">
  <div class="w-full max-w-sm">
    <a href={resolve('/')} class="mb-10 inline-flex min-h-11 items-center text-xl font-bold font-heading">
      Ardoise
    </a>

    {#if failed}
      <h1 class="text-2xl font-bold font-heading text-foreground">
        {$i18n.t('auth.magicLink.invalidTitle')}
      </h1>
      <Alert tone="danger" class="mt-4">{$i18n.t('auth.magicLink.invalidBody')}</Alert>
      <Button href={resolve('/login')} variant="outline" size="lg" class="mt-6 w-full">
        {$i18n.t('auth.magicLink.backToLogin')}
      </Button>
    {:else}
      <h1 class="text-2xl font-bold font-heading text-foreground">
        {$i18n.t('auth.magicLink.verifyTitle')}
      </h1>
      <p class="mt-1.5 text-sm text-muted-foreground">{$i18n.t('auth.magicLink.verifyBody')}</p>
      <Button class="mt-8 w-full" size="lg" disabled={submitting || !token} onclick={confirm}>
        {submitting
          ? $i18n.t('auth.magicLink.verifySubmitting')
          : $i18n.t('auth.magicLink.verifySubmit')}
      </Button>
    {/if}
  </div>
</div>
