import type { UserMenuOptions } from '@facile/muse';
import authStore from '$lib/auth-store';

export const SPACES_URL = 'https://sso.facile.studio/spaces';
export const HELP_URL = 'https://facile.studio/docs/ardoise';

export function userMenuOptions(area: 'admin' | 'client'): UserMenuOptions {
  return {
    accountHref: area === 'admin' ? undefined : null,
    helpHref: HELP_URL,
    onSignOut: () => void authStore.logout(),
  };
}
