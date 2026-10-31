<script lang="ts">
  import { OptionCards, SettingsRow, SettingsSection } from '@facile/muse';
  import { locale, setLocale } from '@repo/i18n/svelte';
  import type { Locale } from '@repo/i18n';
  import { icons } from '$lib/icons';

  const options = [
    { value: 'fr', label: 'Français', icon: icons.globe },
    { value: 'en', label: 'English', icon: icons.globe },
  ];
</script>

<SettingsSection title="Langue" description="Langue de l'interface, appliquée à ce navigateur.">
  <SettingsRow label="Langue d'affichage" stacked>
    <OptionCards
      {options}
      value={$locale}
      label="Langue d'affichage"
      onSelect={(value) => setLocale(value as Locale)}
    />
  </SettingsRow>
</SettingsSection>
