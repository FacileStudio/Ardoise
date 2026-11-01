import { uploadFile } from '@repo/storage-client';
import { trpc } from '$lib/trpc';
import { SIGNABLE_TYPES } from '$lib/signature';

export const PDF_MAX_BYTES = 20 * 1024 * 1024;

export const IMPORT_TYPES = [
	'devis',
	'facture_prestation',
	'appel_de_fonds',
	'contrat_prestation',
	'contrat_maintenance',
	'back_contractuel',
	'maintenance',
] as const;

export type ImportType = (typeof IMPORT_TYPES)[number];

export const SIGNATURE_STATUSES = ['none', 'signed', 'declined'] as const;

export type SignatureStatusValue = (typeof SIGNATURE_STATUSES)[number];

export function asImportType(value: string): ImportType {
	return (IMPORT_TYPES as readonly string[]).includes(value) ? (value as ImportType) : 'devis';
}

export function isInvoiceType(type: string): boolean {
	return type === 'facture_prestation';
}

export function isSignableType(type: string): boolean {
	return type === 'devis' || SIGNABLE_TYPES.includes(type);
}

export function todayInput(): string {
	return new Date().toISOString().slice(0, 10);
}

export function toDateInput(value: Date | string | null | undefined): string {
	return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export function titleFromFileName(name: string): string {
	return name
		.replace(/\.pdf$/i, '')
		.replace(/[_]+/g, ' ')
		.trim();
}

export async function uploadPdf(file: File, onProgress: (percent: number) => void): Promise<string> {
	const { uploadUrl, fileKey } = await trpc.media.getUploadUrl.mutate({
		fileName: file.name,
		fileType: 'application/pdf',
	});

	await uploadFile(file, uploadUrl, { onProgress });

	return fileKey;
}

export function base64ToPdfUrl(base64: string): string {
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

	return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}
