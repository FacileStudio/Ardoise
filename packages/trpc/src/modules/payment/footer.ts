import type { PrismaClient } from '@repo/database';
import { getSpaceSettings, DEFAULT_VAT_EXEMPTION_MENTION } from '../space/settings';
import { providersOfSpace } from '../space/studio';

const MAX_FOOTER_LENGTH = 500;

export interface SellerIdentity {
  name: string;
  siret: string | null;
  tvaIntracom: string | null;
}

export interface SellerRegime {
  vatExempt: boolean;
  vatExemptionMention: string | null;
}

/**
 * The Stripe invoice footer of a seller: provider name and SIRET, then the VAT
 * exemption mention for a VAT-exempt space or the VAT number for the others.
 * Empty parts are skipped; returns null when the seller has no name.
 */
export function sellerFooter(seller: SellerIdentity | null, regime: SellerRegime): string | null {
  const name = seller?.name.trim();
  if (!seller || !name) return null;
  const parts = [name];
  const siret = seller.siret?.trim();
  if (siret) parts.push(`SIRET ${siret}`);
  if (regime.vatExempt) {
    parts.push(regime.vatExemptionMention?.trim() || DEFAULT_VAT_EXEMPTION_MENTION);
  } else {
    const vat = seller.tvaIntracom?.trim();
    if (vat) parts.push(`TVA ${vat}`);
  }
  return parts.join(' · ').slice(0, MAX_FOOTER_LENGTH);
}

/**
 * The footer for a payment's space. The seller is the lead provider of the
 * payment's mission when it has one, else the oldest provider the space may use.
 */
export async function paymentFooter(
  db: PrismaClient,
  payment: { spaceId: string; missionId?: string | null }
): Promise<string | null> {
  const fromMission = payment.missionId
    ? (
        await db.missionProvider.findFirst({
          where: { missionId: payment.missionId },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
          select: { provider: { select: { name: true, siret: true, tvaIntracom: true } } },
        })
      )?.provider
    : null;
  const seller =
    fromMission ??
    (await db.provider.findFirst({
      where: await providersOfSpace(db, payment.spaceId),
      orderBy: [{ spaceId: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      select: { name: true, siret: true, tvaIntracom: true },
    }));
  return sellerFooter(seller, await getSpaceSettings(db, payment.spaceId));
}
