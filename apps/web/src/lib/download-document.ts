import { trpc } from '$lib/trpc';
import { toast } from '@repo/utils';
import { logger } from '@repo/logger';

export async function downloadDocument(documentId: string) {
	try {
		const result = await trpc.document.download.mutate({ id: documentId });
		const bytes = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0));
		const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
		const link = document.createElement('a');

		link.href = url;
		link.download = result.fileName;
		link.click();
		URL.revokeObjectURL(url);
	} catch (err) {
		logger.error({ err }, 'Failed to download document');
		toast.push('Erreur lors du téléchargement', 'error');
	}
}
