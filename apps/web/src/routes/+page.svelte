<script lang="ts">
  import { resolve } from '$app/paths';
  import authStore from '$lib/auth-store';
  import { isMember } from '@repo/auth-shared';
  import { i18n } from '@repo/i18n/svelte';
  import { Button, LandingFooter, LandingHeader, TextElevate } from '@facile/muse';
  import { ardoise } from '$lib/icons';
  import { rememberLocale } from '$lib/locale';
  import QuoteToInvoiceDemo from '$lib/components/landing/QuoteToInvoiceDemo.svelte';
  import 'iconify-icon';

  const t = $derived($i18n.t);
  const user = $derived($authStore.session ? $authStore.user : null);
  const target = $derived(
    user
      ? isMember(user)
        ? { href: resolve('/admin'), label: t('landing.hero.admin') }
        : { href: resolve('/app'), label: t('landing.hero.portal') }
      : { href: resolve('/login'), label: t('landing.hero.signIn') }
  );

  const features = $derived([
    { icon: ardoise.mission, key: 'missions' },
    { icon: ardoise.invoice, key: 'invoice' },
    { icon: ardoise.payment, key: 'payment' },
    { icon: ardoise.client, key: 'portal' },
  ]);

  const links = $derived([{ href: '#features', label: t('landing.nav.features') }]);
  const columns = $derived([
    {
      title: t('landing.footer.product'),
      links: [
        { href: '#features', label: t('landing.nav.features') },
        { href: resolve('/login'), label: t('landing.hero.signIn') },
      ],
    },
  ]);
</script>

<svelte:head>
  <title>{t('landing.title')}</title>
  <meta name="description" content={t('landing.description')} />
</svelte:head>

<div class="min-h-dvh overflow-x-clip bg-fc-page text-fc-fg">
  <LandingHeader appName="Ardoise" icon={ardoise.brand} {links} skipHref="#main">
    {#snippet actions()}
      <Button href={target.href}>{target.label}</Button>
    {/snippet}
  </LandingHeader>

  <main id="main">
    <section class="mx-auto max-w-5xl px-4 pt-20 pb-12 text-center sm:px-6 sm:pt-24">
      <h1 class="font-fc-title text-fc-3xl font-bold tracking-tight sm:text-5xl">
        <span class="block"><TextElevate text={t('landing.hero.line1')} delay={0.1} /></span>
        <span class="block"><TextElevate text={t('landing.hero.line2')} delay={0.25} /></span>
      </h1>
      <p class="mx-auto mt-6 max-w-xl text-fc-md text-fc-fg-muted">{t('landing.hero.body')}</p>
      <div class="mt-10 flex justify-center">
        <Button href={target.href} size="lg" icon="solar:arrow-right-linear">{target.label}</Button>
      </div>
    </section>

    <section class="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
      <QuoteToInvoiceDemo />
    </section>

    <section id="features" class="mx-auto max-w-5xl scroll-mt-20 px-4 py-12 sm:px-6">
      <ul class="grid gap-4 sm:grid-cols-2">
        {#each features as feature (feature.key)}
          <li class="rounded-fc-lg bg-fc-component p-6">
            <div class="mb-4 flex size-10 items-center justify-center rounded-fc-md bg-fc-surface">
              <iconify-icon icon={feature.icon} width="20" height="20" class="block shrink-0"
              ></iconify-icon>
            </div>
            <h2 class="text-fc-lg font-bold">{t(`landing.features.${feature.key}.title`)}</h2>
            <p class="mt-1.5 text-fc-sm text-fc-fg-muted">
              {t(`landing.features.${feature.key}.body`)}
            </p>
          </li>
        {/each}
      </ul>
    </section>

    <section class="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
      <h2 class="font-fc-title text-fc-2xl font-bold tracking-tight">{t('landing.cta.title')}</h2>
      <p class="mt-4 text-fc-sm text-fc-fg-muted">{t('landing.cta.body')}</p>
      <div class="mt-8 flex justify-center">
        <Button href={target.href} size="lg">{target.label}</Button>
      </div>
    </section>
  </main>

  <LandingFooter
    appName="Ardoise"
    icon={ardoise.brand}
    tagline={t('landing.tagline')}
    {columns}
    legal={{ privacy: '/legal/privacy', cgu: '/legal/terms', onLocaleChange: rememberLocale }}
  />
</div>
