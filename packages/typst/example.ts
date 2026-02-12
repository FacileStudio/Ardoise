import { generateReceipt } from './src/index';
import { writeFileSync } from 'fs';

const receiptData = {
  receiptNumber: 'REC-2024-001',
  receiptDate: '12 février 2024',
  paymentMethod: 'Carte bancaire',
  clientName: 'Client SARL',
  clientAddress: '123 Rue Example',
  clientCity: '75001 Paris',
  clientCountry: 'France',
  clientSiret: '12345678900001',
  providerName: 'Saravenpi',
  providerAddress: '456 Avenue Provider',
  providerCity: '75002 Paris',
  providerSiret: '98765432100001',
  providerEmail: 'contact@provider.com',
  providerPhone: '+33 1 23 45 67 89',
  items: [
    {
      description: 'Développement site web responsive',
      quantity: 5,
      unit: 'jour',
      price: 600,
    },
    {
      description: 'Intégration API tiers',
      quantity: 2,
      unit: 'jour',
      price: 650,
    },
    {
      description: 'Formation client',
      quantity: 1,
      unit: 'forfait',
      price: 800,
    },
  ],
  tvaRate: 20,
};

try {
  console.log('Generating receipt...');
  const pdfBuffer = generateReceipt(receiptData);

  const outputPath = './example-receipt.pdf';
  writeFileSync(outputPath, pdfBuffer);

  console.log(`Receipt generated successfully: ${outputPath}`);
  console.log(`File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error('Error generating receipt:', error);
  process.exit(1);
}
