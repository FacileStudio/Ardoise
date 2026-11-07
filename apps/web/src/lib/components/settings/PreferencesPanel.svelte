<script lang="ts">
  import { PreferencesSection } from '@facile/muse';
  import { rememberLocale } from '$lib/locale';
  import { theme } from '$lib/theme.svelte';
</script>

<PreferencesSection theme={theme.preference} onThemeChange={theme.set} onLocaleChange={rememberLocale} />
