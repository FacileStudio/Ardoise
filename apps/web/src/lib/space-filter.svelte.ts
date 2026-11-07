import { browser } from '$app/environment';

export type SpaceOption = { id: string; name: string; role?: string };

const STORAGE_KEY = 'ardoise:space-filter';

function load(): string | null {
  if (!browser) return null;
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function save(id: string | null) {
  if (!browser) return;
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

let spaces = $state<SpaceOption[]>([]);
let selected = $state<string | null>(load());

/**
 * The admin lists show every space the user belongs to. This narrows them to one
 * space, or widens them back to all of them with null. It never decides where a
 * new record goes: that is the client's space.
 */
export const spaceFilter = {
  get spaces(): SpaceOption[] {
    return spaces;
  },

  get adminSpaces(): SpaceOption[] {
    return spaces.filter((space) => space.role === 'ADMIN' || space.role === 'OWNER');
  },

  get adminSpaceId(): string | undefined {
    return this.adminSpaces.some((space) => space.id === selected)
      ? (selected ?? undefined)
      : undefined;
  },

  get spaceId(): string | undefined {
    return selected ?? undefined;
  },

  setSpaces(list: SpaceOption[]) {
    spaces = list;
    if (selected && !list.some((space) => space.id === selected)) this.select(null);
  },

  select(id: string | null) {
    selected = id;
    save(id);
  },
};
