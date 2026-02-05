import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

const createToastStore = () => {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,
    push: (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = Math.floor(Math.random() * 1000000);
      update((all) => [{ id, type, message, duration }, ...all]);

      if (duration !== Infinity) {
        setTimeout(() => {
          update((all) => all.filter((t) => t.id !== id));
        }, duration);
      }
    },
    remove: (id: number) => update((all) => all.filter((t) => t.id !== id)),
  };
};

export const toast = createToastStore();
