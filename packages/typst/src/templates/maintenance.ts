import { legalLetDeclarations, legalContractFooter } from './_legal';

export const maintenance: string = `#set document(
  title: "Devis – Maintenance applicative",
  author: "{{provider_name}}"
)

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  numbering: "1 / 1",
  number-align: right + bottom,
)

#set text(font: "Satoshi", size: 10pt, lang: "fr")
#set par(leading: 0.65em, spacing: 0.65em)

#let fmt(n) = str(calc.round(n, digits: 2)) + "\u{00A0}€"

#let quote_number = "{{quote_number}}"
#let quote_date = "{{quote_date}}"
#let validity_date = "{{validity_date}}"
#let maintenance_period = "{{maintenance_period}}"

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

#let bank_name = "{{bank_name}}"
#let iban = "{{iban}}"
#let bic = "{{bic}}"

#let railway_estimate = {{railway_estimate}}
#let items = ({{items}})
#let tva_rate = {{tva_rate}}
#let vat_exempt = "{{vat_exempt}}" == "true"
#let ht = if vat_exempt { "" } else { " HT" }
${legalLetDeclarations}

// Header
#grid(
  columns: (1fr, auto),
  column-gutter: 3cm,
  [
    #box(height: 28pt, baseline: 20%, image("logo.png", height: 28pt))
    #h(0.4cm)
    #text(size: 26pt, weight: "bold", font: "Satoshi")[#provider_name]
    #v(0.7cm)
    #text(size: 9.5pt, fill: rgb("#555555"))[
      #provider_address \
      #provider_city \
      SIRET: #provider_siret
    ]
    #v(0.3cm)
    #text(size: 9.5pt, fill: rgb("#555555"))[
      #provider_email \
      #provider_phone
    ]
  ],
  [
    #text(size: 28pt, weight: "bold", font: "Satoshi", fill: rgb("#1a1a1a"))[DEVIS]
    #v(0.8cm)
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

#v(2cm)

// Client info
#rect(
  width: 100%,
  fill: rgb("#fafafa"),
  stroke: none,
  radius: 0pt,
  inset: (left: 1.2cm, right: 1.2cm, top: 0.8cm, bottom: 0.8cm)
)[
  #text(size: 8.5pt, weight: "bold", fill: rgb("#888888"), font: "Satoshi", tracking: 0.5pt)[DEVIS ADRESSÉ À]
  #v(0.5cm)
  #text(size: 12pt, weight: "bold", font: "Satoshi")[#client_name]
  #v(0.3cm)
  #text(size: 9.5pt, fill: rgb("#333333"))[
    #client_address \
    #client_city \
    #client_country \
    #if client_siret != "" and client_siret != "0" [SIRET: #client_siret]
  ]
]

#v(2cm)

// Items table
#let subtotal = if items.len() > 0 { items.map(item => item.quantity * item.price).sum() } else { 0 }
#let subtotal_with_railway = subtotal + railway_estimate
#let tva_amount = subtotal_with_railway * tva_rate / 100
#let total = subtotal_with_railway + tva_amount

#table(
  columns: (1fr, 0.12fr, 0.12fr, 0.18fr, 0.18fr),
  stroke: (x, y) => {
    if y == 0 { (bottom: 2pt + rgb("#1a1a1a")) }
    else if y == items.len() + 1 { none }
    else { none }
  },
  inset: (left: 0pt, right: 0pt, top: 0.6cm, bottom: 0.6cm),
  align: (left, left, left, left, left),
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[DESCRIPTION],
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[QTÉ],
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[UNITÉ],
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[P.U.#ht],
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[TOTAL#ht],
  ..items.map(item => (
    [#text(size: 9.5pt)[#item.description]],
    [#text(size: 9.5pt)[#str(item.quantity)]],
    [#text(size: 9.5pt)[#item.unit]],
    [#text(size: 9.5pt)[#fmt(item.price)]],
    [#text(size: 9.5pt, weight: "medium")[#fmt(item.quantity * item.price)]]
  )).flatten(),
  [#text(size: 9.5pt)[Hébergement Railway #text(size: 8pt, fill: rgb("#888888"))[(estimé)]]],
  [#text(size: 9.5pt)[1]],
  [#text(size: 9.5pt)[mois]],
  [#text(size: 9.5pt)[~#fmt(railway_estimate)]],
  [#text(size: 9.5pt, weight: "medium")[~#fmt(railway_estimate)]]
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
      ..if vat_exempt { () } else { (
        [#text(size: 10pt)[Sous-total HT]],
        [#text(weight: "medium", font: "Satoshi", size: 10pt)[#fmt(subtotal_with_railway)]],
        [#text(size: 10pt)[TVA (#tva_rate%)]],
        [#text(font: "Satoshi", size: 10pt)[#fmt(tva_amount)]],
      ) },
      [],
      [],
      table.hline(stroke: 2pt + rgb("#1a1a1a")),
      [],
      [],
      text(size: 13pt, weight: "bold", font: "Satoshi")[TOTAL ESTIMÉ#if not vat_exempt [ TTC] (mensuel)],
      text(size: 14pt, weight: "bold", fill: rgb("#1a1a1a"), font: "Satoshi")[#fmt(total)],
    )
  ]
)

#v(2cm)

// Payment info
#rect(
  width: 100%,
  fill: rgb("#fafafa"),
  stroke: (left: 3pt + rgb("#1a1a1a")),
  radius: 0pt,
  inset: (left: 1.2cm, right: 1.2cm, top: 1cm, bottom: 1cm)
)[
  #text(size: 11pt, weight: "bold", font: "Satoshi")[Informations de paiement]
  #v(0.6cm)
  #grid(
    columns: (auto, 1fr),
    column-gutter: 1.5cm,
    row-gutter: 0.35cm,
    text(weight: "medium", fill: rgb("#666666"), size: 9.5pt)[Banque],
    text(size: 9.5pt)[#bank_name],
    text(weight: "medium", fill: rgb("#666666"), size: 9.5pt)[IBAN],
    text(font: "Courier", size: 9pt)[#iban],
    text(weight: "medium", fill: rgb("#666666"), size: 9.5pt)[BIC],
    text(font: "Courier", size: 9pt)[#bic],
  )
  #v(0.5cm)
  #text(size: 9pt, style: "italic", fill: rgb("#666666"))[
    Paiement mensuel par virement
  ]
]

#v(1.5cm)

// Railway estimate note
#rect(
  width: 100%,
  fill: rgb("#fafafa"),
  stroke: (left: 3pt + rgb("#888888")),
  radius: 0pt,
  inset: (left: 1.2cm, right: 1.2cm, top: 1cm, bottom: 1cm)
)[
  #text(size: 11pt, weight: "bold", font: "Satoshi")[Note importante sur l'hébergement]
  #v(0.6cm)
  #text(size: 9.5pt, fill: rgb("#333333"))[
    Les frais d'hébergement Railway sont #text(weight: "bold")[refacturés mensuellement au coût réel] (variable selon la consommation de ressources, stockage et trafic). Le montant indiqué dans ce devis (#fmt(railway_estimate)) est une #text(weight: "bold")[estimation] basée sur l'usage actuel. Aucune marge n'est appliquée sur ces frais.
  ]
]

#v(1.5cm)

// Signatures
#grid(
  columns: (1fr, 1fr),
  column-gutter: 3cm,
  [
    #text(weight: "bold", font: "Satoshi", size: 10pt)[Le Prestataire] \
    #v(1.5cm)
    Signature :
  ],
  [
    #text(weight: "bold", font: "Satoshi", size: 10pt)[Le Client] \
    #v(1.5cm)
    Signature :
  ]
)

#v(1fr)

${legalContractFooter}
`;
