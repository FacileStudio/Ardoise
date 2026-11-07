import { legalLetDeclarations, legalInvoiceFooter } from './_legal';

export const appel_de_fonds: string = `#set document(
  title: "Appel de Fonds Global",
  author: "Collectif Web"
)

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  numbering: "1 / 1",
  number-align: right + bottom,
)

#set text(font: "Satoshi", size: 10pt, lang: "fr")
#set par(leading: 0.65em, spacing: 0.65em)

#let invoice_number = "{{global_invoice_ref}}"
#let invoice_date = "{{invoice_date}}"
#let due_date = "{{due_date}}"
#let project_name = "{{project_name}}"
#let project_step = "{{project_step}}"

#let providers = ({{payment_providers}})

#let client_name = "{{client_name}}"
#let total_appel = providers.map(p => p.amount_to_pay).sum()
#let fmt(n) = str(calc.round(n, digits: 2)) + "\\u{00A0}€"

#let provider_name = "{{provider_name}}"
#let provider_siret = "{{provider_siret}}"
${legalLetDeclarations}
#let vat_exempt = "{{vat_exempt}}" == "true"
#let ht = if vat_exempt { "" } else { " HT" }

// Header
#grid(
  columns: (1fr, auto),
  column-gutter: 3cm,
  [
    #text(size: 26pt, weight: "bold", font: "Satoshi")[Collectif Web]
    #v(0.7cm)
    #text(size: 9.5pt, fill: rgb("#555555"))[
      Document de synthèse de facturation \
      Projet: #project_name
    ]
  ],
  [
    #text(size: 28pt, weight: "bold", font: "Satoshi", fill: rgb("#1a1a1a"))[APPEL DE FONDS]
    #v(0.8cm)
    #table(
      columns: (auto, auto),
      stroke: none,
      align: (left, left),
      row-gutter: 0.35cm,
      column-gutter: 1.2cm,
      text(weight: "medium", fill: rgb("#666666"), size: 9pt)[RÉFÉRENCE],
      text(weight: "bold", size: 10pt)[#invoice_number],
      text(weight: "medium", fill: rgb("#666666"), size: 9pt)[DATE],
      text(size: 10pt)[#invoice_date],
      text(weight: "medium", fill: rgb("#666666"), size: 9pt)[ÉCHÉANCE],
      text(size: 10pt)[#due_date],
    )
  ]
)

#v(2cm)

// Client info
#rect(
  width: 100%,
  fill: rgb("#fafafa"),
  stroke: none,
  radius: 0pt,
  inset: (left: 1.2cm, right: 1.2cm, top: 0.8cm, bottom: 0.8cm)
)[
  #text(size: 8.5pt, weight: "bold", fill: rgb("#888888"), font: "Satoshi", tracking: 0.5pt)[CLIENT]
  #v(0.5cm)
  #text(size: 12pt, weight: "bold", font: "Satoshi")[#client_name]
]

#v(2cm)

// Description
#text(size: 12pt, weight: "bold", font: "Satoshi")[Objet: #project_step]
#v(0.7cm)
#text(size: 9.5pt, fill: rgb("#333333"))[
  Conformément au devis signé, nous vous prions de bien vouloir procéder au règlement de cette étape de mission.
  Pour faciliter votre gestion comptable, voici le récapitulatif des virements à effectuer séparément auprès de chaque intervenant.
]

#v(1.5cm)

// Payment providers table
#text(size: 11pt, weight: "bold", font: "Satoshi")[Tableau récapitulatif des règlements]
#v(0.8cm)

#table(
  columns: (1.2fr, 2.5fr, 1fr),
  stroke: (x, y) => {
    if y == 0 { (bottom: 2pt + rgb("#1a1a1a")) }
    else { none }
  },
  inset: (left: 0pt, right: 0pt, top: 0.6cm, bottom: 0.6cm),
  align: (left, left, left),

  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[BÉNÉFICIAIRE],
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[COORDONNÉES BANCAIRES],
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[MONTANT#ht],

  ..providers.map(p => (
    [#text(weight: "bold", size: 9.5pt)[#p.name]],
    [
      #text(weight: "medium", fill: rgb("#666666"), size: 8.5pt)[IBAN] #text(font: "Courier", size: 8.5pt)[#p.iban] \
      #text(weight: "medium", fill: rgb("#666666"), size: 8.5pt)[BIC] #text(font: "Courier", size: 8.5pt)[#p.bic]
    ],
    [#text(size: 9.5pt, weight: "medium")[#fmt(p.amount_to_pay)]]
  )).flatten()
)

#v(1.5cm)

// Totals
#grid(
  columns: (1fr, 10cm),
  column-gutter: 2cm,
  [],
  [
    #table(
      columns: (1fr, auto),
      stroke: none,
      row-gutter: 0.4cm,
      align: (left, left),
      inset: (left: 0pt, right: 0pt, top: 0pt, bottom: 0pt),
      [],
      [],
      table.hline(stroke: 2pt + rgb("#1a1a1a")),
      [],
      [],
      text(size: 13pt, weight: "bold", font: "Satoshi")[TOTAL DE L'APPEL DE FONDS#if not vat_exempt [ HT]],
      text(size: 14pt, weight: "bold", fill: rgb("#1a1a1a"), font: "Satoshi")[#fmt(total_appel)],
    )
  ]
)

#v(1fr)

// Note métier
#v(0.6cm)
#text(size: 8pt, fill: rgb("#888888"))[
  *Note comptable:* Ce document est une note de synthèse pour faciliter vos paiements.
  Chaque prestataire vous adressera individuellement sa facture acquittée correspondant au montant perçu.
]
${legalInvoiceFooter}
`;
