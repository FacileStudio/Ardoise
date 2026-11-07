import { browser } from '$app/environment';
import { LOCALE_COOKIE, isLocale, type Locale } from '@facile/muse';
import { setLocale } from '@repo/i18n/svelte';

export const DEFAULT_LOCALE: Locale = 'fr';

export function chosenLocale(): Locale | null {
  if (!browser) return null;
  const prefix = `${LOCALE_COOKIE}=`;
  const found = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  const value = found ? decodeURIComponent(found.slice(prefix.length)) : null;
  return isLocale(value) ? value : null;
}

export function applyLocale(locale: Locale) {
  setLocale(locale === 'fr' ? 'fr' : 'en');
}

export function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  applyLocale(locale);
}
