import { TypstGenerator } from './generator';
import { receipt } from './templates/receipt';
import type { ReceiptData, ReceiptItem } from './generator';
import { prestation, maintenance, contrat_prestation, contrat_maintenance } from './templates';

export { TypstGenerator, type ReceiptData, type ReceiptItem };
export { prestation, maintenance, contrat_prestation, contrat_maintenance };

export function generateReceipt(data: ReceiptData, logoPath?: string): Buffer {
  const generator = new TypstGenerator(receipt, logoPath);
  return generator.generate(data);
}

export { receipt };
