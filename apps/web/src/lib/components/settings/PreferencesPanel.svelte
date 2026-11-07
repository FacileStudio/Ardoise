<script lang="ts">
  import { PreferencesSection } from '@facile/muse';
  import { theme } from '$lib/theme.svelte';
</script>

<PreferencesSection showLanguage={false} theme={theme.preference} onThemeChange={theme.set} />
