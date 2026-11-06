export type MissionStatus = 'DRAFT' | 'QUOTED' | 'ACCEPTED' | 'INVOICED' | 'PAID' | 'CANCELLED';

export const STATUS_LABELS: Record<MissionStatus, string> = {
	DRAFT: 'Brouillon',
	QUOTED: 'Devis envoyé',
	ACCEPTED: 'Devis accepté',
	INVOICED: 'Facturée',
	PAID: 'Payée',
	CANCELLED: 'Annulée',
};

export const STATUS_VARIANTS: Record<MissionStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
	DRAFT: 'neutral',
	QUOTED: 'info',
	ACCEPTED: 'info',
	INVOICED: 'warning',
	PAID: 'success',
	CANCELLED: 'danger',
};

export const ROLE_LABELS: Record<string, string> = {
	LEAD: 'Principal',
	SUBCONTRACTOR: 'Sous-traitant',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
	devis: 'Devis',
	facture_prestation: 'Facture',
	maintenance: 'Devis maintenance',
	contrat_prestation: 'Contrat de prestation',
	contrat_maintenance: 'Contrat de maintenance',
	back_contractuel: 'Back contractuel',
	appel_de_fonds: 'Appel de fonds',
	prestation_barman: 'Prestation de barman',
	prestation_design: 'Design graphique',
	prestation_dev: 'Développement logiciel',
	prestation_photo: 'Photographie',
	prestation_video: 'Vidéographie',
	prestation_formation: 'Formation',
	prestation_btp: 'BTP/Construction',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
	PENDING: 'En attente',
	PAID: 'Payé',
	PAST_DUE: 'En retard',
	FAILED: 'Échoué',
	EXPIRED: 'Expiré',
	CANCELLED: 'Annulé',
	PROCESSING: 'En cours de traitement',
	AWAITING_CONFIRMATION: 'À confirmer',
};

export const PAYMENT_STATUS_VARIANTS: Record<string, 'neutral' | 'warning' | 'success' | 'danger'> = {
	PENDING: 'warning',
	PAID: 'success',
	PAST_DUE: 'danger',
	FAILED: 'danger',
	EXPIRED: 'neutral',
	CANCELLED: 'neutral',
	PROCESSING: 'warning',
	AWAITING_CONFIRMATION: 'warning',
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

export const INVOICE_KIND_LABELS: Record<string, string> = {
	FULL: 'Facture',
	DEPOSIT: "Facture d'acompte",
	BALANCE: 'Facture de solde',
};

export const CONTRACT_TYPES = [
	'contrat_prestation',
	'contrat_maintenance',
	'back_contractuel',
	'appel_de_fonds',
];

export const LIVE_PAYMENT_STATUSES = ['PENDING', 'PAID', 'PAST_DUE'];
