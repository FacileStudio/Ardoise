import { applyTheme, isTheme, readTheme, type Theme } from '@facile/muse';

const STORAGE_KEY = 'ardoise.theme';

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

class ThemeState {
  preference = $state<Theme>('system');

  restore() {
    this.preference = stored() ?? readTheme();
  }

  set = (next: Theme) => {
    this.preference = next;
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
  };
}

export const theme = new ThemeState();
