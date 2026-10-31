import { trpc } from '$lib/trpc';

export const SIGNABLE_TYPES = ['contrat_prestation', 'contrat_maintenance', 'back_contractuel'];

let pending: Promise<boolean> | null = null;

export function loadSignatureEnabled(): Promise<boolean> {
	pending ??= trpc.document.signatureEnabled
		.query()
		.then((result) => result.enabled)
		.catch(() => {
			pending = null;

			return false;
		});

	return pending;
}
