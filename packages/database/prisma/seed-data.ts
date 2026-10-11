export const PASSWORD = 'seed-password-1';

export const ADMIN = { email: 'admin@seed.test', firstName: 'Camille', lastName: 'Seed' };

export const SETTINGS = {
  companyName: 'Facile Studio',
  companyLegal: 'Facile Studio SAS',
  companyAddress: '12 rue des Tanneurs',
  companyCity: 'Lyon',
  companyCountry: 'France',
  companySiret: '85231467900014',
  companyEmail: 'contact@facile.test',
  companyPhone: '0472000000',
  companyLegalForm: 'SAS',
  companyShareCapital: 5000,
  companyRcsCity: 'Lyon',
  companyApeCode: '6201Z',
  companyTvaIntracom: 'FR12852314679',
  bankName: 'Banque Populaire',
  iban: 'FR7612345678901234567890123',
  bic: 'CCBPFRPPLYO',
  tvaRate: 20,
  defaultPaymentTermsDays: 30,
  defaultVatExemptionMention: null,
  nextInvoiceNumber: 1,
  nextQuoteNumber: 1,
  nextContractNumber: 1,
};

export const PROVIDERS = {
  facile: {
    name: 'Facile Studio',
    legalName: 'Facile Studio SAS',
    legalForm: 'SAS',
    address: '12 rue des Tanneurs',
    postalCode: '69002',
    city: 'Lyon',
    siret: '85231467900014',
    tvaIntracom: 'FR12852314679',
    email: 'contact@facile.test',
    phone: '0472000000',
    bankName: 'Banque Populaire',
    iban: 'FR7612345678901234567890123',
    bic: 'CCBPFRPPLYO',
  },
  marc: {
    name: 'Marc Lefèvre',
    legalName: 'Marc Lefèvre EI',
    legalForm: 'EI',
    address: '8 quai de la Fosse',
    postalCode: '44000',
    city: 'Nantes',
    siret: '48120357700029',
    email: 'marc@lefevre.test',
    phone: '0607080910',
    bankName: 'Crédit Agricole',
    iban: 'FR7698765432109876543210987',
    bic: 'AGRIFRPP',
  },
  lumiere: {
    name: 'Studio Lumière',
    legalName: 'Studio Lumière SARL',
    legalForm: 'SARL',
    address: '3 cours Victor Hugo',
    postalCode: '33000',
    city: 'Bordeaux',
    siret: '51876203400017',
    email: 'hello@lumiere.test',
    phone: '0556000000',
    bankName: 'Société Générale',
    iban: 'FR7611223344556677889900112',
    bic: 'SOGEFRPP',
  },
  nord: {
    name: 'Atelier Nord Conseil',
    legalName: 'Atelier Nord Conseil SAS',
    legalForm: 'SAS',
    address: '45 rue Nationale',
    postalCode: '59800',
    city: 'Lille',
    siret: '77412589600033',
    email: 'bonjour@atelier-nord.test',
    phone: '0320000000',
    bankName: 'BNP Paribas',
    iban: 'FR7630004000031234567890143',
    bic: 'BNPAFRPP',
  },
};

export const CLIENTS = {
  acme: {
    companyName: 'Acme Studio',
    contactFirstName: 'Ada',
    contactLastName: 'Lovelace',
    contactEmail: 'ada@acme.test',
    billingAddress: '1 place Bellecour',
    billingPostalCode: '69002',
    billingCity: 'Lyon',
    billingCountry: 'France',
    siret: '40123456700011',
    tvaIntracom: 'FR40401234567',
    credentialEmail: 'client@seed.test',
  },
  dupont: {
    companyName: 'Boulangerie Dupont',
    contactFirstName: 'Jean',
    contactLastName: 'Dupont',
    contactEmail: 'jean@dupont.test',
    billingAddress: '17 rue du Four',
    billingPostalCode: '35000',
    billingCity: 'Rennes',
    billingCountry: 'France',
    siret: '30456789100022',
  },
  martin: {
    companyName: 'Cabinet Martin & Associés',
    contactFirstName: 'Claire',
    contactLastName: 'Martin',
    contactEmail: 'claire@martin-associes.test',
    billingAddress: '90 avenue Foch',
    billingPostalCode: '75116',
    billingCity: 'Paris',
    billingCountry: 'France',
    siret: '52987654300045',
    tvaIntracom: 'FR52529876543',
  },
  jardins: {
    companyName: 'Les Jardins de Loire',
    contactFirstName: 'Hugo',
    contactLastName: 'Bernard',
    contactEmail: 'hugo@jardins-loire.test',
    billingAddress: '2 chemin des Roses',
    billingPostalCode: '37000',
    billingCity: 'Tours',
    billingCountry: 'France',
    siret: '61234598700056',
  },
  nord: {
    companyName: 'Brasserie du Nord',
    contactFirstName: 'Lucie',
    contactLastName: 'Vasseur',
    contactEmail: 'lucie@brasserie-nord.test',
    billingAddress: '5 rue de Béthune',
    billingPostalCode: '59000',
    billingCity: 'Lille',
    billingCountry: 'France',
    siret: '70987123400067',
  },
};

export type Step =
  | 'quote'
  | 'accept'
  | 'deposit'
  | 'invoice'
  | 'pay'
  | 'paid'
  | 'edit'
  | 'cancel';

export interface Line {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  provider?: keyof typeof PROVIDERS;
}

export interface MissionSeed {
  name: string;
  description: string;
  client: keyof typeof CLIENTS;
  providers: Array<[keyof typeof PROVIDERS, 'LEAD' | 'SUBCONTRACTOR']>;
  depositPercent?: number;
  lines: Line[];
  steps: Step[];
  editedLines?: Line[];
  space?: boolean;
}

// each mission stops at a different point of the flow, so every screen has something to show
export const MISSIONS: MissionSeed[] = [
  {
    name: 'Refonte du site vitrine',
    description: 'Nouveau site de présentation, responsive, avec formulaire de contact.',
    client: 'acme',
    providers: [['facile', 'LEAD'], ['marc', 'SUBCONTRACTOR']],
    depositPercent: 30,
    lines: [
      { description: 'Maquettes desktop et mobile', quantity: 4, unit: 'jour', unitPrice: 550 },
      { description: 'Intégration et développement', quantity: 6, unit: 'jour', unitPrice: 500, provider: 'marc' },
      { description: 'Recette et mise en ligne', quantity: 1, unit: 'forfait', unitPrice: 400 },
      { description: 'Hébergement', quantity: 12, unit: 'mois', unitPrice: 25 },
    ],
    steps: [],
  },
  {
    name: 'Identité visuelle',
    description: 'Logo, charte graphique et déclinaisons print.',
    client: 'dupont',
    providers: [['facile', 'LEAD']],
    lines: [
      { description: 'Recherche et pistes de logo', quantity: 3, unit: 'jour', unitPrice: 480 },
      { description: 'Charte graphique', quantity: 2, unit: 'jour', unitPrice: 480 },
      { description: 'Déclinaisons print (cartes, flyers)', quantity: 1, unit: 'forfait', unitPrice: 350 },
    ],
    steps: ['quote'],
  },
  {
    name: 'Application de réservation',
    description: "Prise de rendez-vous en ligne pour les clients du cabinet.",
    client: 'martin',
    providers: [['facile', 'LEAD'], ['marc', 'SUBCONTRACTOR']],
    depositPercent: 40,
    lines: [
      { description: 'Cadrage fonctionnel', quantity: 2, unit: 'jour', unitPrice: 600 },
      { description: 'Développement application', quantity: 12, unit: 'jour', unitPrice: 520, provider: 'marc' },
      { description: 'Tests et recette', quantity: 3, unit: 'jour', unitPrice: 450 },
    ],
    steps: ['quote', 'accept'],
  },
  {
    name: 'Shooting catalogue',
    description: 'Photos produits pour le catalogue de printemps.',
    client: 'jardins',
    providers: [['lumiere', 'LEAD']],
    depositPercent: 30,
    lines: [
      { description: 'Journée de prise de vue', quantity: 2, unit: 'jour', unitPrice: 750 },
      { description: 'Retouche des images', quantity: 40, unit: 'photo', unitPrice: 12 },
    ],
    steps: ['quote', 'accept', 'deposit', 'paid', 'invoice', 'pay'],
  },
  {
    name: 'Maintenance annuelle 2026',
    description: 'Mises à jour, sauvegardes et support.',
    client: 'acme',
    providers: [['facile', 'LEAD']],
    lines: [
      { description: 'Forfait maintenance mensuel', quantity: 12, unit: 'mois', unitPrice: 150 },
      { description: 'Support prioritaire', quantity: 1, unit: 'forfait', unitPrice: 300 },
    ],
    steps: ['quote', 'accept', 'invoice', 'paid'],
  },
  {
    name: 'Landing page promotion',
    description: "Page d'atterrissage pour la campagne de rentrée.",
    client: 'dupont',
    providers: [['facile', 'LEAD']],
    depositPercent: 30,
    lines: [
      { description: 'Conception de la page', quantity: 2, unit: 'jour', unitPrice: 500 },
      { description: 'Intégration', quantity: 1, unit: 'jour', unitPrice: 500 },
    ],
    steps: ['quote', 'accept', 'deposit', 'paid', 'edit'],
    editedLines: [
      { description: 'Conception de la page', quantity: 2, unit: 'jour', unitPrice: 500 },
      { description: 'Intégration', quantity: 1, unit: 'jour', unitPrice: 500 },
      { description: 'Version anglaise', quantity: 1, unit: 'jour', unitPrice: 450 },
    ],
  },
  {
    name: 'Site événementiel',
    description: 'Mission annulée par le client avant le démarrage.',
    client: 'martin',
    providers: [['facile', 'LEAD']],
    lines: [{ description: 'Site événementiel', quantity: 5, unit: 'jour', unitPrice: 500 }],
    steps: ['quote', 'cancel'],
  },
  {
    name: 'Refonte intranet',
    description: "Mission d'un autre espace, pour tester le changement d'espace.",
    client: 'nord',
    providers: [['nord', 'LEAD']],
    lines: [
      { description: 'Audit des usages', quantity: 3, unit: 'jour', unitPrice: 700 },
      { description: 'Maquettes', quantity: 5, unit: 'jour', unitPrice: 650 },
    ],
    steps: ['quote', 'accept'],
    space: true,
  },
];
