import { trpc } from '$lib/trpc';

let staff = $state(false);
let loaded: Promise<void> | null = null;

/**
 * Whether the signed-in user is platform staff (PLATFORM_STAFF_SUBS on the
 * server). Only hides what the server refuses anyway; any failure answers
 * false.
 */
export const platformStaff = {
  get staff(): boolean {
    return staff;
  },

  load(): Promise<void> {
    loaded ??= trpc.billing.access
      .query()
      .then((access) => {
        staff = access.staff === true;
      })
      .catch(() => {
        staff = false;
        loaded = null;
      });
    return loaded;
  },
};
