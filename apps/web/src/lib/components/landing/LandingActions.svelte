<script module lang="ts">
  export const OPEN_TO_NEW_ACCOUNTS = false;

  export const SUITE_PRICING = 'https://suite.facile.studio/#tarifs';
</script>

<script lang="ts">
  import { resolve } from '$app/paths';
  import { Button, LandingCta, SignInWithFacile } from '@facile/muse';
  import { isMember } from '@repo/auth-shared';
  import { i18n } from '@repo/i18n/svelte';
  import authStore from '$lib/auth-store';

  interface Props {
    align?: 'start' | 'center';
  }

  let { align = 'center' }: Props = $props();

  const t = $derived($i18n.t);
  const user = $derived($authStore.session ? $authStore.user : null);
  const signInHref = resolve('/login');
  const home = $derived(
    user && isMember(user)
      ? { href: resolve('/admin'), label: t('landing.hero.admin') }
      : { href: resolve('/app'), label: t('landing.hero.portal') }
  );
</script>

{#if user}
  <div class="flex" class:justify-center={align === 'center'}>
    <Button href={home.href} size="lg" icon="solar:arrow-right-linear">{home.label}</Button>
  </div>
{:else if OPEN_TO_NEW_ACCOUNTS}
  <LandingCta {signInHref} {align} />
{:else}
  <div
    class={[
      'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
      align === 'center' && 'sm:justify-center',
    ]}
  >
    <Button href={SUITE_PRICING} size="lg" class="h-12 max-sm:w-full"
      >{t('landing.hero.offers')}</Button
    >
    <SignInWithFacile href={signInHref} size="lg" variant="secondary" class="max-sm:w-full" />
  </div>
{/if}
