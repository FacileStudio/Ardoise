import { legalLetDeclarations, legalContractFooter } from './_legal';

export const devis: string = `#set document(
  title: "Devis",
  author: "{{provider_name}}"
)

#set text(font: "Satoshi", size: 10pt, lang: "fr")
#set par(leading: 0.65em, spacing: 0.65em)

#let fmt(n) = str(calc.round(n, digits: 2)) + "\\u{00A0}€"

#let quote_number = "{{quote_number}}"
#let quote_date = "{{quote_date}}"
#let validity_date = "{{validity_date}}"
#let project_name = "{{project_name}}"
#let deposit_percent = "{{deposit_percent}}"

#let client_name = "{{client_name}}"
#let client_address = "{{client_address}}"
#let client_city = "{{client_city}}"
#let client_country = "{{client_country}}"
#let client_siret = "{{client_siret}}"

#let provider_name = "{{provider_name}}"
#let provider_address = "{{provider_address}}"
#let provider_city = "{{provider_city}}"
#let provider_siret = "{{provider_siret}}"
#let provider_email = "{{provider_email}}"
#let provider_phone = "{{provider_phone}}"

#let items = ({{items}})
#let tva_rate = {{tva_rate}}
#let vat_exempt = "{{vat_exempt}}" == "true"
#let ht = if vat_exempt { "" } else { " HT" }
${legalLetDeclarations}

#set page(
  paper: "a4",
  margin: (top: 1.8cm, bottom: 3.2cm, left: 2.5cm, right: 2.5cm),
  footer-descent: 0.3cm,
  footer: context [
    ${legalContractFooter}
    #align(right)[#text(size: 8pt, fill: rgb("#888888"))[#counter(page).display("1 / 1", both: true)]]
  ],
)

// Header
#grid(
  columns: (1fr, auto),
  column-gutter: 3cm,
  [
    #box(height: 28pt, baseline: 20%, image("logo.png", height: 28pt))
    #h(0.4cm)
    #text(size: 26pt, weight: "bold", font: "Satoshi")[#provider_name]
    #v(0.4cm)
    #text(size: 9.5pt, fill: rgb("#555555"))[
      #provider_address \\
      #if provider_postal_code != "" [#provider_postal_code #h(0.2cm)]#provider_city \\
      SIRET: #provider_siret #if provider_ape_code != "" [\\u{00A0}\\u{00B7}\\u{00A0}APE: #provider_ape_code] \\
      #if provider_tva_intracom != "" [TVA intracom: #provider_tva_intracom \\ ]
    ]
    #v(0.3cm)
    #text(size: 9.5pt, fill: rgb("#555555"))[
      #provider_email \\
      #provider_phone
    ]
  ],
  [
    #text(size: 28pt, weight: "bold", font: "Satoshi", fill: rgb("#1a1a1a"))[DEVIS]
    #v(0.5cm)
    #table(
      columns: (auto, auto),
      stroke: none,
      align: (left, left),
      row-gutter: 0.35cm,
      column-gutter: 1.2cm,
      text(weight: "medium", fill: rgb("#666666"), size: 9pt)[NUMÉRO],
      text(weight: "bold", size: 10pt)[#quote_number],
      text(weight: "medium", fill: rgb("#666666"), size: 9pt)[DATE],
      text(size: 10pt)[#quote_date],
      text(weight: "medium", fill: rgb("#666666"), size: 9pt)[VALABLE JUSQU'AU],
      text(size: 10pt)[#validity_date],
    )
  ]
)

#v(0.8cm)

// Client info
#rect(
  width: 100%,
  fill: rgb("#fafafa"),
  stroke: none,
  radius: 0pt,
  inset: (left: 1.2cm, right: 1.2cm, top: 0.5cm, bottom: 0.5cm)
)[
  #text(size: 8.5pt, weight: "bold", fill: rgb("#888888"), font: "Satoshi")[DEVIS ADRESSÉ À]
  #v(0.5cm)
  #text(size: 12pt, weight: "bold", font: "Satoshi")[#client_name]
  #v(0.3cm)
  #text(size: 9.5pt, fill: rgb("#333333"))[
    #client_address \\
    #if client_postal_code != "" [#client_postal_code #h(0.2cm)]#client_city \\
    #client_country \\
    #if client_siret != "" and client_siret != "0" [SIRET: #client_siret \\ ]
    #if client_tva_intracom != "" [TVA intracom: #client_tva_intracom]
  ]
]

#if project_name != "" [
  #v(0.5cm)
  #text(size: 8.5pt, weight: "bold", fill: rgb("#888888"), font: "Satoshi")[OBJET]
  #v(0.2cm)
  #text(size: 12pt, weight: "bold", font: "Satoshi")[#project_name]
]

#v(0.6cm)

// Items table
#let subtotal = if items.len() > 0 { items.map(item => item.quantity * item.price).sum() } else { 0 }
#let tva_amount = subtotal * tva_rate / 100
#let total = subtotal + tva_amount

#table(
  columns: (1fr, 0.12fr, 0.12fr, 0.18fr, 0.18fr),
  stroke: (x, y) => {
    if y == 0 { (bottom: 2pt + rgb("#1a1a1a")) }
    else { none }
  },
  inset: (left: 0pt, right: 0pt, top: 0.3cm, bottom: 0.3cm),
  align: (left, left, left, left, left),
  text(weight: "bold", font: "Satoshi", size: 9.5pt)[DESCRIPTION],
  text(weight: "bold", font: "Satoshi", size: 9.5pt)[QTÉ],
  text(weight: "bold", font: "Satoshi", size: 9.5pt)[UNITÉ],
  text(weight: "bold", font: "Satoshi", size: 9.5pt)[P.U.#ht],
  text(weight: "bold", font: "Satoshi", size: 9.5pt)[TOTAL#ht],
  ..items.map(item => (
    [#text(size: 9.5pt)[#item.description]],
    [#text(size: 9.5pt)[#str(item.quantity)]],
    [#text(size: 9.5pt)[#item.unit]],
    [#text(size: 9.5pt)[#fmt(item.price)]],
    [#text(size: 9.5pt, weight: "medium")[#fmt(item.quantity * item.price)]]
  )).flatten()
)

#v(0.5cm)

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
      ..if vat_exempt { () } else { (
        [#text(size: 10pt)[Sous-total HT]],
        [#text(weight: "medium", font: "Satoshi", size: 10pt)[#fmt(subtotal)]],
        [#text(size: 10pt)[TVA (#tva_rate%)]],
        [#text(font: "Satoshi", size: 10pt)[#fmt(tva_amount)]],
      ) },
      [],
      [],
      table.hline(stroke: 2pt + rgb("#1a1a1a")),
      [],
      [],
      text(size: 13pt, weight: "bold", font: "Satoshi")[TOTAL#if not vat_exempt [ TTC]],
      text(size: 14pt, weight: "bold", fill: rgb("#1a1a1a"), font: "Satoshi")[#fmt(total)],
    )
  ]
)

#v(0.6cm)

// Conditions
#rect(
  width: 100%,
  fill: rgb("#fafafa"),
  stroke: (left: 3pt + rgb("#1a1a1a")),
  radius: 0pt,
  inset: (left: 1.2cm, right: 1.2cm, top: 0.6cm, bottom: 0.6cm)
)[
  #text(size: 11pt, weight: "bold", font: "Satoshi")[Conditions]
  #v(0.4cm)
  #text(size: 9.5pt)[
    Devis valable jusqu'au #validity_date. \\
    #if deposit_percent != "" [Un acompte de #deposit_percent\\u{00A0}% du montant#ht est dû à la commande. \\ ]
    Délai de paiement : #payment_terms_days jours à compter de la date de facture.
  ]
]

#v(0.5cm)

// Acceptance
#grid(
  columns: (1fr, 1fr),
  column-gutter: 2cm,
  [
    #text(size: 9pt, fill: rgb("#666666"))[Le prestataire] \\
    #v(0.8cm)
    #line(length: 100%, stroke: 0.5pt + rgb("#999999"))
  ],
  [
    #text(size: 9pt, fill: rgb("#666666"))[Bon pour accord, date et signature du client] \\
    #v(0.8cm)
    #line(length: 100%, stroke: 0.5pt + rgb("#999999"))
  ],
)

`;
