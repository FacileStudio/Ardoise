import { en, type EnTranslations } from './en';

export const de: EnTranslations = {
  ...en,
  landing: {
    title: 'Ardoise: vom Angebot bis zur Zahlung, ohne Papierkram',
    description:
      'Senden Sie Angebote, machen Sie daraus korrekte Rechnungen und verfolgen Sie jede Zahlung. Der Vertrag wird in Plume unterschrieben.',
    nav: {
      features: 'Funktionen',
      pricing: 'Preise',
    },
    hero: {
      line1: 'Vom Angebot bis zur Zahlung,',
      line2: 'ohne Papierkram.',
      body: 'Senden Sie Angebote, machen Sie daraus korrekte Rechnungen und verfolgen Sie jede Zahlung. Der Vertrag wird in Plume unterschrieben.',
      signIn: 'Anmelden',
      admin: 'Dashboard öffnen',
      portal: 'Meine Rechnungen öffnen',
      offers: 'Tarife ansehen',
      soon: 'Ardoise öffnet bald für alle Facile-Konten. Schon eingeladen? Melden Sie sich an.',
    },
    cards: {
      title: 'Was Ardoise für Sie erledigt',
      vat: {
        title: 'Korrekte Rechnungen von Anfang an',
        body: 'Ihre Pflichtangaben und, bei französischer Kleinunternehmerregelung, der Vermerk 293 B stehen schon auf jeder Rechnung.',
        seller: 'Marie Martin EI · SIRET 123 456 789 00012',
      },
      deposit: {
        title: 'Anzahlung oder Gesamtrechnung mit einem Klick',
        body: 'Aus dem angenommenen Angebot wird eine Anzahlungs- oder eine Gesamtrechnung. Die Schlussrechnung zieht die Anzahlung ab.',
        deposit: 'Anzahlungsrechnung',
        total: 'Gesamtrechnung',
        share: '30 % Anzahlung',
      },
      sign: {
        title: 'In Plume unterschrieben, in Nuage abgelegt',
        body: 'Der Vertrag geht in Plume zur Unterschrift und kommt unterschrieben zurück. Eine Kopie liegt in Ihrem Nuage.',
        doc: 'Dienstleistungsvertrag',
        sent: 'An Plume gesendet',
        signed: 'Unterschrieben',
      },
    },
    features: {
      title: 'Jeder Auftrag bis zum Ende im Blick',
      line: 'Jeder Auftrag hält Angebot, Vertrag, Rechnungen und Zahlungen zusammen.',
      missions: {
        title: 'Ein Auftrag, ein Ort',
        body: 'Angebote, Verträge, Rechnungen und Zahlungen bleiben bei ihrem Auftrag.',
      },
      payments: {
        title: 'Jede Zahlung im Blick',
        body: 'Sehen Sie, was bezahlt ist und was noch offen ist. Eine eingegangene Überweisung markieren Sie mit einem Klick.',
      },
      pdf: {
        title: 'Saubere PDFs',
        body: 'Angebote, Rechnungen und Verträge kommen als PDF, bereit zum Versand.',
      },
      numbering: {
        title: 'Die Nummerierung läuft von selbst',
        body: 'Jedes Angebot und jede Rechnung bekommt die nächste Nummer, in der richtigen Reihenfolge.',
      },
      clients: {
        title: 'Ihre Kunden in einer Liste',
        body: 'Kontaktdaten und alle Aufträge jedes Kunden.',
      },
    },
    with: {
      line: 'Ardoise gibt Ihre Dokumente an die anderen Facile-Apps weiter.',
      plume: 'Der Vertrag geht zur Unterschrift und kommt unterschrieben zurück.',
      nuage: 'Ihre Verträge liegen in Ihrem Nuage.',
      glouton: 'Gewonnene Kontakte werden zu Kunden.',
    },
    pricing: {
      title: 'Preise',
      note: 'In jedem Tarif enthalten, auch im kostenlosen.',
      soon: 'In jedem Tarif enthalten, auch im kostenlosen, sobald Ardoise für alle öffnet.',
    },
    cta: {
      title: 'Ihre Angebote und Rechnungen, endlich an einem Ort',
      open: 'Erstellen Sie Ihr kostenloses Facile-Konto und senden Sie Ihr erstes Angebot.',
      soon: 'Ardoise öffnet bald für alle Facile-Konten. Schon eingeladen? Melden Sie sich an.',
      client: 'Kunde eines Selbstständigen? Hier finden Sie Ihre Rechnungen',
    },
    tagline: 'Angebote, korrekte Rechnungen und Zahlungen im Blick.',
    footer: {
      product: 'Produkt',
      clients: 'Ihre Rechnungen (Kunden)',
    },
    demo: {
      label:
        'Ein angenommenes Angebot wird zur Rechnung, dann wird die Überweisung als eingegangen markiert.',
      missions: 'Aufträge',
      mission: 'Website-Relaunch',
      client: 'Atelier Brun',
      quotes: 'Angebote',
      quote: 'Angebot v1',
      accept: 'Angebot als angenommen markieren',
      invoices: 'Rechnungen',
      invoiceTotal: 'Gesamtrechnung',
      noInvoice: 'Noch keine Rechnung.',
      invoice: 'Rechnung',
      due: 'fällig am 14.12.2026',
      vat: 'TVA non applicable, art. 293 B du CGI',
      status: {
        quoted: 'Angebot gesendet',
        accepted: 'Angebot angenommen',
        invoiced: 'Berechnet',
        paid: 'Bezahlt',
      },
      quoteState: {
        pending: 'Offen',
        accepted: 'Angenommen',
      },
      payment: {
        pending: 'Offen',
        paid: 'Bezahlt',
      },
      markPaid: 'Als bezahlt markieren',
      received: 'Überweisung eingegangen',
    },
  },
};
