<script lang="ts">
  import { PreferencesSection } from '@facile/muse';
  import { rememberLocale } from '$lib/locale';
  import { theme } from '$lib/theme.svelte';

  let { subscriptionHref }: { subscriptionHref?: string } = $props();
</script>

<PreferencesSection
  subscription={subscriptionHref ? { href: subscriptionHref } : undefined}
  locales={['fr', 'en']}
  theme={theme.preference}
  onThemeChange={theme.set}
  onLocaleChange={rememberLocale}
/>
