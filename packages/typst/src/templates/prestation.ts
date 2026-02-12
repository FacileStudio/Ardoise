export const prestation: string = `#set document(
  title: "Facture",
  author: "{{provider_name}}"
)

#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 2cm, right: 2cm),
  numbering: "1 / 1",
  number-align: right + bottom,
)

#set text(font: "Satoshi", size: 10pt, lang: "fr")

#let fmt(n) = str(calc.round(n, digits: 2)) + "\u{00A0}€"

#let invoice_number = "{{invoice_number}}"
#let invoice_date = "{{invoice_date}}"
#let due_date = "{{due_date}}"

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

#let bank_name = "{{bank_name}}"
#let iban = "{{iban}}"
#let bic = "{{bic}}"

#grid(
  columns: (1fr, 1fr),
  column-gutter: 2cm,
  align(left)[
    #box(height: 24pt, baseline: 20%, image("logo.png", height: 24pt))
    #h(0.3cm)
    #text(size: 24pt, weight: "bold", font: "Poppins")[#provider_name]
    #v(0.5cm)
    #text(size: 9pt, fill: rgb("#666666"))[
      #provider_address \
      #provider_city \
      SIRET: #provider_siret \
      #provider_email \
      #provider_phone
    ]
  ],
  align(right)[
    #text(size: 20pt, weight: "bold", font: "Poppins")[FACTURE]
    #v(0.3cm)
    #table(
      columns: (auto, auto),
      stroke: none,
      align: (left, right),
      row-gutter: 0.2cm,
      text(weight: "bold")[N°], text[#invoice_number],
      text(weight: "bold")[Date], text[#invoice_date],
      text(weight: "bold")[Échéance], text[#due_date],
    )
  ]
)

#v(1.5cm)

#rect(width: 100%, fill: rgb("#f8f9fa"), stroke: none, radius: 4pt, inset: 1cm)[
  #text(size: 9pt, weight: "bold", fill: rgb("#666666"), font: "Poppins")[FACTURER À]
  #v(0.3cm)
  #text(size: 11pt, weight: "bold", font: "Poppins")[#client_name]
  #v(0.2cm)
  #client_address \
  #client_city \
  #client_country \
  #if client_siret != "" and client_siret != "0" [SIRET: #client_siret]
]

#v(1.5cm)

#let subtotal = if items.len() > 0 { items.map(item => item.quantity * item.price).sum() } else { 0 }
#let tva_amount = subtotal * tva_rate / 100
#let total = subtotal + tva_amount

#table(
  columns: (1fr, 0.15fr, 0.15fr, 0.2fr, 0.2fr),
  stroke: (x, y) => {
    if y == 0 { (bottom: 1.5pt + rgb("#333333")) }
    else if y == items.len() { (bottom: 0.5pt + rgb("#cccccc")) }
    else { none }
  },
  inset: 0.5cm,
  align: (left, center, center, right, right),
  text(weight: "bold", font: "Poppins")[Description],
  text(weight: "bold", font: "Poppins")[Qté],
  text(weight: "bold", font: "Poppins")[Unité],
  text(weight: "bold", font: "Poppins")[P.U. HT],
  text(weight: "bold", font: "Poppins")[Total HT],
  ..items.map(item => (
    item.description,
    str(item.quantity),
    item.unit,
    fmt(item.price),
    fmt(item.quantity * item.price)
  )).flatten()
)

#v(0.5cm)

#align(right)[
  #table(
    columns: (3fr, 2fr),
    stroke: none,
    column-gutter: 1cm,
    row-gutter: 0.3cm,
    align: (right, right),
    [Sous-total HT], [#text(weight: "bold", font: "Poppins")[#fmt(subtotal)]],
    [TVA (#tva_rate%)], [#text(font: "Poppins")[#fmt(tva_amount)]],
    table.hline(stroke: 1.5pt + rgb("#333333")),
    text(size: 12pt, weight: "bold", font: "Poppins")[TOTAL TTC],
    text(size: 12pt, weight: "bold", fill: rgb("#F97316"), font: "Poppins")[#fmt(total)],
  )
]

#v(2cm)

#rect(width: 100%, fill: rgb("FFEFE4"), stroke: 0.5pt + rgb("#F97316"), radius: 4pt, inset: 1cm)[
  #text(size: 10pt, weight: "bold", font: "Poppins")[Informations de paiement]
  #v(0.3cm)
  #grid(
    columns: (auto, 1fr),
    column-gutter: 1cm,
    row-gutter: 0.2cm,
    text(weight: "bold", font: "Poppins")[Banque:], bank_name,
    text(weight: "bold", font: "Poppins")[IBAN:], text(font: "Courier")[#iban],
    text(weight: "bold", font: "Poppins")[BIC:], text(font: "Courier")[#bic],
  )
  #v(0.3cm)
  #text(size: 9pt, style: "italic")[Paiement à effectuer avant le #due_date]
]

#v(1fr)

#line(length: 100%, stroke: 0.5pt + rgb("#cccccc"))
#v(0.5cm)
#text(size: 8pt, fill: rgb("#666666"))[
  #align(center)[
    #provider_name – Développeur Freelance \
    TVA non applicable, article 293 B du CGI \
    En cas de retard, pénalités au taux de 3 fois le taux d'intérêt légal applicables.
  ]
]
`;
