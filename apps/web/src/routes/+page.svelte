<script lang="ts">
  import { resolve } from '$app/paths';
  import authStore from '$lib/auth-store';
  import { i18n } from '@repo/i18n/svelte';
  import {
    Button,
    FeatureSplit,
    LANDING_HEADING,
    LandingFooter,
    LandingHeader,
    PricingPlans,
    TextElevate,
    WorksWith,
    type FeatureItem,
    type WorksWithApp,
  } from '@facile/muse';
  import { ardoise } from '$lib/icons';
  import { rememberLocale } from '$lib/locale';
  import QuoteToInvoiceDemo from '$lib/components/landing/QuoteToInvoiceDemo.svelte';
  import LandingCards from '$lib/components/landing/LandingCards.svelte';
  import LandingActions, {
    OPEN_TO_NEW_ACCOUNTS,
    SUITE_PRICING,
  } from '$lib/components/landing/LandingActions.svelte';

  const t = $derived($i18n.t);
  const signedIn = $derived(Boolean($authStore.session && $authStore.user));

  const features: FeatureItem[] = $derived([
    {
      icon: ardoise.mission,
      title: t('landing.features.missions.title'),
      text: t('landing.features.missions.body'),
    },
    {
      icon: ardoise.payment,
      title: t('landing.features.payments.title'),
      text: t('landing.features.payments.body'),
    },
    {
      icon: ardoise.pdf,
      title: t('landing.features.pdf.title'),
      text: t('landing.features.pdf.body'),
    },
    {
      icon: ardoise.numbering,
      title: t('landing.features.numbering.title'),
      text: t('landing.features.numbering.body'),
    },
    {
      icon: ardoise.client,
      title: t('landing.features.clients.title'),
      text: t('landing.features.clients.body'),
    },
  ]);

  const apps: WorksWithApp[] = $derived([
    {
      name: 'Plume',
      icon: ardoise.plume,
      line: t('landing.with.plume'),
      href: 'https://plume.facile.studio',
    },
    {
      name: 'Nuage',
      icon: ardoise.nuage,
      line: t('landing.with.nuage'),
      href: 'https://nuage.facile.studio',
    },
    {
      name: 'Glouton',
      icon: ardoise.glouton,
      line: t('landing.with.glouton'),
      href: 'https://glouton.facile.studio',
    },
  ]);

  const links = $derived([
    { href: '#features', label: t('landing.nav.features') },
    { href: '#pricing', label: t('landing.nav.pricing') },
  ]);
  const columns = $derived([
    {
      title: t('landing.footer.product'),
      links: [
        { href: '#features', label: t('landing.nav.features') },
        { href: '#pricing', label: t('landing.nav.pricing') },
        { href: resolve('/login'), label: t('landing.footer.clients') },
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
      {#if !signedIn}
        <Button href={resolve('/login')} variant="secondary">{t('landing.hero.signIn')}</Button>
      {/if}
    {/snippet}
  </LandingHeader>

  <main id="main">
    <section class="mx-auto max-w-5xl px-4 pt-20 pb-12 text-center sm:px-6 sm:pt-24">
      <h1 class="font-fc-title text-fc-3xl font-bold tracking-tight sm:text-5xl">
        <span class="block"><TextElevate text={t('landing.hero.line1')} delay={0.1} /></span>
        <span class="block"><TextElevate text={t('landing.hero.line2')} delay={0.25} /></span>
      </h1>
      <p class="mx-auto mt-6 max-w-xl text-fc-md text-fc-fg-muted">{t('landing.hero.body')}</p>
      <div class="mt-10">
        <LandingActions />
      </div>
      {#if !OPEN_TO_NEW_ACCOUNTS && !signedIn}
        <p class="mt-4 text-fc-sm text-fc-fg-muted">{t('landing.hero.soon')}</p>
      {/if}
    </section>

    <section class="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
      <QuoteToInvoiceDemo />
    </section>

    <LandingCards />

    <FeatureSplit
      id="features"
      class="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-12 sm:px-6"
      title={t('landing.features.title')}
      description={t('landing.features.line')}
      {features}
    />

    <WorksWith
      class="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6"
      {apps}
      description={t('landing.with.line')}
    />

    <section class="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
      <h2 class="font-fc-title text-fc-2xl font-bold tracking-tight">{t('landing.cta.title')}</h2>
      {#if !signedIn}
        <p class="mt-4 text-fc-sm text-fc-fg-muted">
          {OPEN_TO_NEW_ACCOUNTS ? t('landing.cta.open') : t('landing.cta.soon')}
        </p>
      {/if}
      <div class="mt-8">
        <LandingActions />
      </div>
      <a href={resolve('/login')} class="mt-6 inline-block text-fc-sm text-fc-fg-muted underline">
        {t('landing.cta.client')}
      </a>
    </section>
    <PricingPlans
      id="pricing"
      class="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-12 sm:px-6"
      title={t('landing.pricing.title')}
      headingClass={LANDING_HEADING}
      highlightOnly
      notes={{ '*': t(OPEN_TO_NEW_ACCOUNTS ? 'landing.pricing.note' : 'landing.pricing.soon') }}
      recommended="pro"
      suiteHref={SUITE_PRICING}
      ctaHref={OPEN_TO_NEW_ACCOUNTS ? undefined : SUITE_PRICING}
      freeLabel={OPEN_TO_NEW_ACCOUNTS ? undefined : t('landing.hero.offers')}
      freeHref={OPEN_TO_NEW_ACCOUNTS ? undefined : SUITE_PRICING}
    />
  </main>

  <LandingFooter
    appName="Ardoise"
    icon={ardoise.brand}
    tagline={t('landing.tagline')}
    {columns}
    legal={{ privacy: '/legal/privacy', cgu: '/legal/terms', onLocaleChange: rememberLocale }}
  />
</div>
