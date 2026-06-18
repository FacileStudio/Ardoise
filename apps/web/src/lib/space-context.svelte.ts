import { browser } from '$app/environment';

export type SpaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type SpaceContext =
  | { type: 'personal' }
  | { type: 'space'; spaceId: string; name: string; role: SpaceRole };

const STORAGE_KEY = 'ardoise:active-space';

function loadFromStorage(): SpaceContext {
  if (!browser) return { type: 'personal' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { type: 'personal' };
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'space' && parsed.spaceId && parsed.name && parsed.role) {
      return parsed as SpaceContext;
    }
  } catch {
    // corrupted storage
  }
  return { type: 'personal' };
}

function saveToStorage(ctx: SpaceContext) {
  if (!browser) return;
  if (ctx.type === 'personal') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  }
}

let current: SpaceContext = $state(loadFromStorage());

export const spaceContext = {
  get value() {
    return current;
  },

  get isPersonal() {
    return current.type === 'personal';
  },

  get spaceId(): string | undefined {
    return current.type === 'space' ? current.spaceId : undefined;
  },

  get spaceName(): string | undefined {
    return current.type === 'space' ? current.name : undefined;
  },

  get role(): SpaceRole | undefined {
    return current.type === 'space' ? current.role : undefined;
  },

  get canManage(): boolean {
    if (current.type === 'personal') return true;
    return current.role === 'OWNER' || current.role === 'ADMIN';
  },

  switchToPersonal() {
    current = { type: 'personal' };
    saveToStorage(current);
  },

  switchToSpace(spaceId: string, name: string, role: SpaceRole) {
    current = { type: 'space', spaceId, name, role };
    saveToStorage(current);
  },

  reset() {
    current = { type: 'personal' };
    saveToStorage(current);
  },
};
