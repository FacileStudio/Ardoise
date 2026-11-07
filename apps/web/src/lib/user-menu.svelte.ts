import type { UserMenuOptions } from '@facile/muse';
import authStore from '$lib/auth-store';
import { rememberLocale } from '$lib/locale';
import { theme } from '$lib/theme.svelte';

const SPACES_URL = 'https://sso.facile.studio/spaces';
export const HELP_URL = 'https://facile.studio/docs/ardoise';

export function userMenuOptions(area: 'admin' | 'client'): UserMenuOptions {
  return {
    accountHref: area === 'admin' ? undefined : null,
    subscription: area === 'admin' ? { href: SPACES_URL } : null,
    helpHref: HELP_URL,
    locales: ['fr', 'en'],
    onSignOut: () => void authStore.logout(),
    onLocaleChange: rememberLocale,
    theme: theme.preference,
    onThemeChange: theme.set,
  };
}
