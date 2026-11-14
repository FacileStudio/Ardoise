import { en, type EnTranslations } from './en';

export const es: EnTranslations = {
  ...en,
  landing: {
    title: 'Ardoise: del presupuesto al pago, sin papeleo',
    description:
      'Envía presupuestos, conviértelos en facturas conformes y sigue cada pago. El contrato se firma en Plume.',
    nav: {
      features: 'Funciones',
      pricing: 'Precios',
    },
    hero: {
      line1: 'Del presupuesto al pago,',
      line2: 'sin papeleo.',
      body: 'Envía presupuestos, conviértelos en facturas conformes y sigue cada pago. El contrato se firma en Plume.',
      signIn: 'Iniciar sesión',
      admin: 'Abrir el panel',
      portal: 'Abrir mis facturas',
      offers: 'Ver los planes',
      soon: 'Ardoise abre pronto a todas las cuentas de Facile. ¿Ya tienes invitación? Inicia sesión.',
    },
    cards: {
      title: 'Lo que Ardoise hace por ti',
      vat: {
        title: 'Facturas conformes desde el principio',
        body: 'Tus menciones legales, y la mención 293 B si estás exento de IVA en Francia, ya están en cada factura.',
        seller: 'Marie Martin EI · SIRET 123 456 789 00012',
      },
      deposit: {
        title: 'Anticipo o factura total en un clic',
        body: 'El presupuesto aceptado se convierte en una factura de anticipo o en una factura total. La factura final descuenta el anticipo.',
        deposit: 'Factura de anticipo',
        total: 'Factura total',
        share: 'Anticipo del 30 %',
      },
      sign: {
        title: 'Firmado en Plume, archivado en Nuage',
        body: 'El contrato sale a firmar en Plume y vuelve firmado solo. Una copia se guarda en tu Nuage.',
        doc: 'Contrato de servicios',
        sent: 'Enviado a Plume',
        signed: 'Firmado',
      },
    },
    features: {
      title: 'Cada proyecto, seguido hasta el final',
      line: 'Cada proyecto guarda su presupuesto, su contrato, sus facturas y sus pagos.',
      missions: {
        title: 'Un proyecto, un solo lugar',
        body: 'Presupuestos, contratos, facturas y pagos quedan unidos a su proyecto.',
      },
      payments: {
        title: 'Cada pago, al día',
        body: 'Ve lo que está pagado y lo que falta. Marca una transferencia recibida en un clic.',
      },
      pdf: {
        title: 'PDF limpios',
        body: 'Presupuestos, facturas y contratos salen en PDF, listos para enviar.',
      },
      numbering: {
        title: 'La numeración, resuelta',
        body: 'Cada presupuesto y cada factura recibe el número siguiente, en orden.',
      },
      clients: {
        title: 'Tus clientes en una lista',
        body: 'Los datos de contacto y todos los proyectos de cada cliente.',
      },
    },
    with: {
      line: 'Ardoise pasa tus documentos a las demás apps de Facile.',
      plume: 'El contrato sale a firmar y vuelve firmado.',
      nuage: 'Tus contratos se archivan en tu Nuage.',
      glouton: 'Tus contactos ganados pasan a ser clientes.',
    },
    pricing: {
      title: 'Precios',
      note: 'Incluido en todos los planes, también el gratuito.',
      soon: 'Incluido en todos los planes, también el gratuito, en cuanto Ardoise abra a todos.',
    },
    cta: {
      title: 'Tus presupuestos y facturas, por fin en un solo lugar',
      open: 'Crea tu cuenta gratuita de Facile y envía tu primer presupuesto.',
      soon: 'Ardoise abre pronto a todas las cuentas de Facile. ¿Ya tienes invitación? Inicia sesión.',
      client: '¿Eres cliente de un autónomo? Encuentra tus facturas',
    },
    tagline: 'Presupuestos, facturas conformes y pagos al día, sin papeleo.',
    footer: {
      product: 'Producto',
      clients: 'Tus facturas (clientes)',
    },
    demo: {
      label:
        'Un presupuesto aceptado se convierte en factura y luego la transferencia se marca como recibida.',
      missions: 'Proyectos',
      mission: 'Rediseño de la web',
      client: 'Atelier Brun',
      quotes: 'Presupuestos',
      quote: 'Presupuesto v1',
      accept: 'Marcar el presupuesto como aceptado',
      invoices: 'Facturas y pagos',
      invoiceTotal: 'Factura total',
      noInvoice: 'Todavía no hay facturas.',
      invoice: 'Factura',
      due: 'vence el 14/12/2026',
      vat: 'TVA non applicable, art. 293 B du CGI',
      status: {
        quoted: 'Presupuesto enviado',
        accepted: 'Presupuesto aceptado',
        invoiced: 'Facturado',
        paid: 'Pagado',
      },
      quoteState: {
        pending: 'Pendiente',
        accepted: 'Aceptado',
      },
      payment: {
        pending: 'Pendiente',
        paid: 'Pagado',
      },
      markPaid: 'Marcar como pagado',
      received: 'Transferencia recibida',
    },
  },
};
