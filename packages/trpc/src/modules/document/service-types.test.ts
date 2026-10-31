import { describe, expect, it } from 'bun:test';
import { generateDocument, type DocumentData } from './service';

const hostile = 'A "quoted" \\ back #set page(width: 1pt) $x$ @ref\nline two <b> `tick`';

const base = {
  invoice_number: 'F-2026-001',
  invoice_date: '2026-01-01',
  due_date: '2026-02-01',
  clientId: 'client-1',
  providerId: 'provider-1',
  client_name: 'Client SARL',
  client_address: '1 rue de la Paix',
  client_city: 'Paris',
  client_country: 'France',
  client_siret: '12345678900011',
  provider_name: 'Prestataire',
  provider_address: '2 avenue Foch',
  provider_city: 'Lyon',
  provider_siret: '98765432100022',
  provider_email: 'pro@example.com',
  provider_phone: '0102030405',
  bank_name: 'Banque',
  iban: 'FR7612345678901234567890123',
  bic: 'ABCDFRPP',
  items: [{ description: 'Prestation', quantity: 2, unit: 'h', price: 50 }],
  tva_rate: 20,
};

const specific: Record<string, Record<string, string>> = {
  prestation_barman: {
    event_date: '2026-03-01',
    event_time: '19:00',
    event_location: 'Salle',
    service_duration: '4h',
    bar_setup_type: 'Bar mobile',
  },
  prestation_design: {
    project_name: 'Logo',
    project_type: 'Identite',
    delivery_date: '2026-03-01',
  },
  prestation_dev: {
    project_name: 'App',
    tech_stack: 'Svelte, Go',
    delivery_date: '2026-03-01',
  },
  prestation_photo: {
    shoot_date: '2026-03-01',
    shoot_time: '10:00',
    shoot_location: 'Studio',
    shoot_duration: '2h',
    shoot_type: 'Portrait',
  },
  prestation_video: {
    shoot_date: '2026-03-01',
    shoot_time: '10:00',
    shoot_location: 'Studio',
    shoot_duration: '2h',
    video_type: 'Clip',
  },
  prestation_formation: {
    training_date: '2026-03-01',
    training_time: '09:00',
    training_location: 'Salle',
    training_duration: '7h',
    training_topic: 'TypeScript',
  },
  prestation_btp: {
    site_address: '3 rue du Chantier',
    site_name: 'Maison',
    work_start_date: '2026-03-01',
    work_type: 'Renovation',
  },
};

const isPdf = (buffer: Buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-';

describe('generateDocument service types', () => {
  for (const [type, fields] of Object.entries(specific)) {
    it(`${type} renders a PDF with realistic values`, async () => {
      const pdf = await generateDocument({ ...base, ...fields, type } as unknown as DocumentData);
      expect(isPdf(pdf)).toBe(true);
    });

    it(`${type} renders a PDF with hostile values`, async () => {
      const hostileFields = Object.fromEntries(Object.keys(fields).map((key) => [key, hostile]));
      const pdf = await generateDocument({
        ...base,
        ...fields,
        ...hostileFields,
        client_name: hostile,
        client_address: hostile,
        provider_name: hostile,
        items: [{ description: hostile, quantity: 1, unit: hostile, price: 10 }],
        type,
      } as unknown as DocumentData);
      expect(isPdf(pdf)).toBe(true);
    });
  }

  it('rejects an unknown type', async () => {
    await expect(generateDocument({ ...base, type: 'nope' } as unknown as DocumentData)).rejects.toThrow(
      'Unknown document type'
    );
  });
});
