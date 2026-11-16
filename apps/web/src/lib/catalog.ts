export type CatalogBilling = 'ONE_TIME' | 'MONTHLY';

export type CatalogItem = {
	id: string;
	spaceId: string;
	category: string | null;
	pack: string | null;
	name: string;
	description: string | null;
	quantity: number | string;
	unit: string;
	unitPrice: number | string;
	billing: CatalogBilling;
	active: boolean;
	position: number;
};

export type CatalogDraft = {
	spaceId: string;
	category: string;
	pack: string;
	name: string;
	description: string;
	quantity: number | null;
	unit: string;
	unitPrice: number | null;
	billing: CatalogBilling;
};

export const BILLING_LABELS: Record<CatalogBilling, string> = { ONE_TIME: 'Ponctuel', MONTHLY: 'Mensuel' };

const NO_CATEGORY = 'Sans catégorie';

/** The items grouped by category, in the order the server sorted them; items with no category come last. */
export function groupByCategory<T extends { category: string | null }>(items: T[]): [string, T[]][] {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const key = item.category || NO_CATEGORY;
		groups.set(key, [...(groups.get(key) ?? []), item]);
	}
	const named = [...groups.entries()].filter(([key]) => key !== NO_CATEGORY);
	const rest = groups.get(NO_CATEGORY);
	return rest ? [...named, [NO_CATEGORY, rest]] : named;
}

/** The default line total of an item: its quantity times its unit price. */
export function itemTotal(item: Pick<CatalogItem, 'quantity' | 'unitPrice'>) {
	return Number(item.quantity) * Number(item.unitPrice);
}

/**
 * How far a negotiated unit price sits from the catalog price, in percent with
 * one decimal. Null when there is no catalog price or the two are equal.
 */
export function priceGap(unitPrice: number | null, listUnitPrice: number | null) {
	if (unitPrice == null || listUnitPrice == null || listUnitPrice === 0) return null;
	if (unitPrice === listUnitPrice) return null;
	return Math.round(((unitPrice - listUnitPrice) / listUnitPrice) * 1000) / 10;
}
