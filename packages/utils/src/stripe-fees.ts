export const STRIPE_FEE_PERCENTAGE = 0.014;
export const STRIPE_FIXED_FEE = 0.25;

export interface StripeFeeCalculation {
  amount: number;
  stripeFee: number;
  totalWithFees: number;
}

export function calculateStripeFees(amount: number): StripeFeeCalculation {
  const percentageFee = amount * STRIPE_FEE_PERCENTAGE;
  const stripeFee = percentageFee + STRIPE_FIXED_FEE;
  const totalWithFees = amount + stripeFee;

  return {
    amount: Math.round(amount * 100) / 100,
    stripeFee: Math.round(stripeFee * 100) / 100,
    totalWithFees: Math.round(totalWithFees * 100) / 100,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
