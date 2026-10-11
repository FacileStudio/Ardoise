export type PrestationStatus = 'DRAFT' | 'QUOTED' | 'ACCEPTED' | 'INVOICED' | 'PAID' | 'CANCELLED';

export const STATUS_LABELS: Record<PrestationStatus, string> = {
	DRAFT: 'Brouillon',
	QUOTED: 'Devis envoyé',
	ACCEPTED: 'Devis accepté',
	INVOICED: 'Facturée',
	PAID: 'Payée',
	CANCELLED: 'Annulée',
};

export const STATUS_VARIANTS: Record<PrestationStatus, 'slate' | 'indigo' | 'amber' | 'emerald' | 'rose'> = {
	DRAFT: 'slate',
	QUOTED: 'indigo',
	ACCEPTED: 'indigo',
	INVOICED: 'amber',
	PAID: 'emerald',
	CANCELLED: 'rose',
};

// the server owns the transition map, this one only decides which buttons to show
export const NEXT_STATUSES: Record<PrestationStatus, Array<{ status: PrestationStatus; label: string }>> = {
	DRAFT: [{ status: 'QUOTED', label: 'Devis envoyé' }],
	QUOTED: [
		{ status: 'ACCEPTED', label: 'Devis accepté' },
		{ status: 'DRAFT', label: 'Repasser en brouillon' },
	],
	ACCEPTED: [{ status: 'INVOICED', label: 'Marquer comme facturée' }],
	INVOICED: [{ status: 'PAID', label: 'Marquer comme payée' }],
	PAID: [],
	CANCELLED: [],
};

export const ROLE_LABELS: Record<string, string> = {
	LEAD: 'Principal',
	SUBCONTRACTOR: 'Sous-traitant',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
	facture_prestation: 'Facture',
	maintenance: 'Devis maintenance',
	contrat_prestation: 'Contrat de prestation',
	contrat_maintenance: 'Contrat de maintenance',
	back_contractuel: 'Back contractuel',
	appel_de_fonds: 'Appel de fonds',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
	PENDING: 'En attente',
	PAID: 'Payé',
	PAST_DUE: 'En retard',
	FAILED: 'Échoué',
	EXPIRED: 'Expiré',
	CANCELLED: 'Annulé',
};

export const PAYMENT_STATUS_VARIANTS: Record<string, 'slate' | 'amber' | 'emerald' | 'rose'> = {
	PENDING: 'amber',
	PAID: 'emerald',
	PAST_DUE: 'rose',
	FAILED: 'rose',
	EXPIRED: 'slate',
	CANCELLED: 'slate',
};

export function formatEuro(amount: number | string | null | undefined) {
	return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
		Number(amount ?? 0)
	);
}

export function formatDate(date: Date | string | null | undefined) {
	if (!date) return '-';

	return new Date(date).toLocaleDateString('fr-FR');
}

export function documentNumber(doc: { invoiceNumber?: string | null; quoteNumber?: string | null; contractRef?: string | null }) {
	return doc.invoiceNumber || doc.quoteNumber || doc.contractRef || '';
}
