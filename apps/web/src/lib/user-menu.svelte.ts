import type { UserMenuOptions } from '@facile/muse';
import authStore from '$lib/auth-store';
import { theme } from '$lib/theme.svelte';

export const HELP_URL = 'https://facile.studio/docs/ardoise';

export function userMenuOptions(area: 'admin' | 'client'): UserMenuOptions {
  return {
    accountHref: area === 'admin' ? undefined : null,
    helpHref: HELP_URL,
    onSignOut: () => void authStore.logout(),
    showLanguage: false,
    theme: theme.preference,
    onThemeChange: theme.set,
  };
}
