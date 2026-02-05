# @repo/i18n

Universal internationalization (i18n) package for web and mobile applications.

## Features

- **Type-safe**: Full TypeScript support with autocomplete for translation keys
- **Universal**: Works in SvelteKit, React, and React Native
- **Lightweight**: No heavy dependencies, just pure JavaScript
- **Nested keys**: Support for nested translation objects (`common.buttons.save`)
- **Interpolation**: Dynamic values with `{{variable}}` syntax
- **Auto-detection**: Automatic browser locale detection
- **Persistent**: Saves locale preference to localStorage

## Supported Locales

- `en` - English
- `fr` - French

## Usage

### SvelteKit

```svelte
<script lang="ts">
  import { i18n } from '@repo/i18n/svelte';

  function changeLanguage(locale: 'en' | 'fr') {
    i18n.setLocale(locale);
  }
</script>

<div>
  <h1>{$i18n.t('auth.login.title')}</h1>
  <p>{$i18n.t('auth.login.subtitle')}</p>

  <button on:click={() => changeLanguage('en')}>English</button>
  <button on:click={() => changeLanguage('fr')}>Français</button>
</div>

<!-- Alternative: use translate function directly -->
<p>{i18n.translate('common.buttons.save')}</p>
```

### React / React Native

```tsx
import { useI18n, useTranslation } from '@repo/i18n/react';

export function MyComponent() {
  const { t, locale, setLocale } = useI18n();

  return (
    <div>
      <h1>{t('auth.login.title')}</h1>
      <p>{t('auth.login.subtitle')}</p>

      <button onClick={() => setLocale('en')}>English</button>
      <button onClick={() => setLocale('fr')}>Français</button>

      <p>Current locale: {locale}</p>
    </div>
  );
}

// Or use useTranslation for simpler needs
export function SimpleComponent() {
  const { t } = useTranslation();

  return <h1>{t('common.buttons.save')}</h1>;
}
```

### With Interpolation

```typescript
// Template: "Hello {{name}}, you have {{count}} messages"
t('messages.greeting', { name: 'John', count: 5 })
// Output: "Hello John, you have 5 messages"
```

## Translation Keys

All translation keys are type-safe. Here are the main namespaces:

- `common.*` - Common UI elements (buttons, actions, validation)
- `auth.*` - Authentication (login, register, logout)
- `profile.*` - User profile
- `contact.*` - Contact form
- `errors.*` - Error messages
- `nav.*` - Navigation items

Examples:
```typescript
t('common.buttons.save')        // "Save" / "Enregistrer"
t('auth.login.title')           // "Log In" / "Connexion"
t('profile.subscription.free')  // "Free Account" / "Compte Gratuit"
t('errors.notFound')            // "Page not found" / "Page non trouvée"
```

## Adding New Translations

### 1. Add to English (source of truth)

Edit `src/locales/en.ts`:

```typescript
export const en = {
  // ...existing translations
  myFeature: {
    title: 'My Feature',
    description: 'This is my feature',
  },
} as const;
```

### 2. Add to French

Edit `src/locales/fr.ts`:

```typescript
export const fr: EnTranslations = {
  // ...existing translations
  myFeature: {
    title: 'Ma Fonctionnalité',
    description: 'Ceci est ma fonctionnalité',
  },
};
```

The `EnTranslations` type ensures all locales have the same structure!

## Adding New Locales

### 1. Update types

Edit `src/types.ts`:

```typescript
export type Locale = 'en' | 'fr' | 'es'; // Add 'es'
```

### 2. Create translation file

Create `src/locales/es.ts`:

```typescript
import type { EnTranslations } from './en';

export const es: EnTranslations = {
  // Copy structure from en.ts and translate
};
```

### 3. Register locale

Edit `src/index.ts`:

```typescript
export const locales = {
  en: () => import('./locales/en').then((m) => m.en),
  fr: () => import('./locales/fr').then((m) => m.fr),
  es: () => import('./locales/es').then((m) => m.es),
};

export const supportedLocales = ['en', 'fr', 'es'] as const;
```

### 4. Add to React hook

Edit `src/react.ts`:

```typescript
import { es } from './locales/es';

const translationsMap: Record<Locale, Translations> = {
  en,
  fr,
  es,
};
```

### 5. Add to Svelte store

Edit `src/svelte.ts`:

```typescript
import { es } from './locales/es';

const translationsMap: Record<Locale, Translations> = {
  en,
  fr,
  es,
};
```

## API Reference

### Svelte

```typescript
i18n.locale          // Readable<Locale> - Current locale
i18n.translations    // Readable<Translations> - Current translations object
i18n.t               // Readable<TranslatorFn> - Translator function (reactive)
i18n.setLocale(locale)     // Change locale
i18n.translate(key, params?) // Translate without reactivity
```

### React

```typescript
const { locale, t, setLocale, supportedLocales } = useI18n();
// locale: Current locale
// t: Translator function
// setLocale: Change locale
// supportedLocales: Array of supported locales

const { t, locale } = useTranslation();
// Simpler hook for just translation
```

## Best Practices

1. **Always add to English first** - It's the source of truth
2. **Keep keys descriptive** - `auth.login.title` is better than `l1`
3. **Group by feature** - Use namespaces like `profile.*`, `settings.*`
4. **Avoid deeply nested keys** - Max 3-4 levels deep
5. **Use interpolation sparingly** - Keep templates simple
6. **Test all locales** - Ensure translations exist for all keys

## Performance

- Translations are bundled at build time (no runtime loading)
- Locale switching is instant (no network requests)
- Only active locale is loaded in memory
- localStorage caching prevents re-detection

## Migration Guide

If you're adding i18n to existing components:

### Before
```svelte
<h1>Log In</h1>
<button>Save</button>
```

### After
```svelte
<script lang="ts">
  import { i18n } from '@repo/i18n/svelte';
</script>

<h1>{$i18n.t('auth.login.title')}</h1>
<button>{$i18n.t('common.buttons.save')}</button>
```

## Troubleshooting

**Missing translation warning in console:**
```
[i18n] Missing translation for key: "foo.bar"
```
Solution: Add the key to all locale files.

**Locale not persisting:**
- Check localStorage is available
- Ensure you're calling `setLocale()`, not mutating the store directly

**Types not working:**
- Run `bun install` to update workspace dependencies
- Restart TypeScript server in your editor
