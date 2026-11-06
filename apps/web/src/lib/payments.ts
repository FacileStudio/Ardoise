import { safeHttpUrl } from '$lib/safe-url';

export type { PayerView } from '@repo/trpc';

export interface Declaration {
  method: 'TRANSFER' | 'CHEQUE' | 'OTHER';
  reference?: string;
  paidOn?: string;
}

export async function redirectToHosted(fetchUrl: () => Promise<{ url: string }>): Promise<void> {
  const url = safeHttpUrl((await fetchUrl()).url);
  if (!url) throw new Error('Invalid redirect');
  window.location.href = url;
}
