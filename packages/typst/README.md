# @repo/typst

Package pour générer des PDFs de reçus avec Typst.

## Installation

Ce package nécessite que la CLI Typst soit installée sur votre système :

```bash
brew install typst
```

Ou téléchargez depuis https://github.com/typst/typst

## Usage

### Génération simple

```typescript
import { generateReceipt } from '@repo/typst';

const receiptData = {
  receiptNumber: 'REC-2024-001',
  receiptDate: '12 février 2024',
  paymentMethod: 'Carte bancaire',
  clientName: 'Client SARL',
  clientAddress: '123 Rue Example',
  clientCity: '75001 Paris',
  clientCountry: 'France',
  clientSiret: '12345678900001',
  providerName: 'Mon Entreprise',
  providerAddress: '456 Avenue Provider',
  providerCity: '75002 Paris',
  providerSiret: '98765432100001',
  providerEmail: 'contact@provider.com',
  providerPhone: '+33 1 23 45 67 89',
  items: [
    {
      description: 'Développement site web',
      quantity: 1,
      unit: 'forfait',
      price: 5000,
    },
  ],
  tvaRate: 20,
};

const pdfBuffer = generateReceipt(receiptData);
```

### Avec logo personnalisé

```typescript
import { generateReceipt } from '@repo/typst';

const pdfBuffer = generateReceipt(receiptData, '/path/to/logo.png');
```

### Utilisation avancée

```typescript
import { TypstGenerator, receipt } from '@repo/typst';

const generator = new TypstGenerator(receipt, '/path/to/logo.png');
const pdfBuffer = generator.generate(receiptData);
```

## API

### `generateReceipt(data, logoPath?)`

Génère un PDF de reçu.

**Paramètres:**
- `data: ReceiptData` - Données du reçu (voir type ci-dessous)
- `logoPath?: string` - Chemin optionnel vers un logo PNG

**Retourne:** `Buffer` - Le PDF généré

### Type `ReceiptData`

```typescript
type ReceiptData = {
  receiptNumber: string;          // Numéro du reçu
  receiptDate: string;             // Date du paiement
  paymentMethod: string;           // Méthode de paiement (default: "Carte bancaire")
  clientName: string;              // Nom du client
  clientAddress: string;           // Adresse du client
  clientCity: string;              // Ville du client
  clientCountry: string;           // Pays du client
  clientSiret?: string;            // SIRET du client (optionnel)
  providerName: string;            // Nom du prestataire
  providerAddress: string;         // Adresse du prestataire
  providerCity: string;            // Ville du prestataire
  providerSiret: string;           // SIRET du prestataire
  providerEmail: string;           // Email du prestataire
  providerPhone: string;           // Téléphone du prestataire
  items: ReceiptItem[];            // Liste des prestations
  tvaRate?: number;                // Taux de TVA (default: 20)
};

type ReceiptItem = {
  description: string;             // Description de la prestation
  quantity: number;                // Quantité (> 0)
  unit: string;                    // Unité (ex: "jour", "forfait")
  price: number;                   // Prix unitaire HT (>= 0)
};
```

## Template

Le template de reçu est basé sur celui de Charles (prestation.ts) avec les modifications suivantes :

- Titre "REÇU" au lieu de "FACTURE"
- Affichage de la date de paiement au lieu de la date d'échéance
- Encadré vert "Paiement reçu" au lieu de l'encadré orange avec informations bancaires
- Même style visuel : couleur orange #F97316, polices Satoshi/Poppins
- Logo placeholder SVG généré automatiquement si aucun logo fourni

## Développement

```bash
bun run typecheck    # Vérifier les types
```
