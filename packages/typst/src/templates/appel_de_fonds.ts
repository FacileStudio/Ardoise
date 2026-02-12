export const appel_de_fonds: string = `#set document(
  title: "Appel de Fonds Global",
  author: "Collectif Web"
)

#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 2cm, right: 2cm),
  numbering: "1 / 1",
  number-align: right + bottom,
)

#set text(font: "Satoshi", size: 10pt, lang: "fr")

#let invoice_number = "{{global_invoice_ref}}"
#let invoice_date = "{{invoice_date}}"
#let due_date = "{{due_date}}"
#let project_name = "{{project_name}}"
#let project_step = "{{project_step}}"

#let providers = ({{payment_providers}})

#let client_name = "{{client_name}}"
#let total_appel = providers.map(p => p.amount_to_pay).sum()
#let fmt(n) = str(calc.round(n, digits: 2)) + "\\u{00A0}€"

#grid(
  columns: (1fr, 1fr),
  column-gutter: 2cm,
  align(left)[
    #text(size: 24pt, weight: "bold", font: "Poppins")[Collectif Web]
    #v(0.3cm)
    #text(size: 9pt, fill: rgb("#666666"))[
      Document de synthèse de facturation \\
      Projet : #project_name
    ]
  ],
  align(right)[
    #text(size: 20pt, weight: "bold", font: "Poppins")[APPEL DE FONDS]
    #v(0.3cm)
    #table(
      columns: (auto, auto),
      stroke: none,
      align: (left, right),
      row-gutter: 0.2cm,
      text(weight: "bold")[Réf :], text[#invoice_number],
      text(weight: "bold")[Date :], text[#invoice_date],
      text(weight: "bold")[Échéance :], text[#due_date],
    )
  ]
)

#v(1.5cm)

#rect(width: 100%, fill: rgb("#f8f9fa"), stroke: none, radius: 4pt, inset: 1cm)[
  #text(size: 9pt, weight: "bold", fill: rgb("#666666"), font: "Satoshi")[CLIENT]
  #v(0.3cm)
  #text(size: 11pt, weight: "bold", font: "Satoshi")[#client_name]
]

#v(1.2cm)

#text(size: 12pt, weight: "bold", font: "Poppins")[Objet : #project_step]
#v(0.4cm)
#text[
  Conformément au devis signé, nous vous prions de bien vouloir procéder au règlement de cette étape de mission.
  Pour faciliter votre gestion comptable, voici le récapitulatif des virements à effectuer séparément auprès de chaque intervenant.
]

#v(0.8cm)

#rect(width: 100%, fill: rgb("FFEFE4"), stroke: 0.5pt + rgb("#F97316"), radius: 4pt, inset: 1cm)[
  #text(size: 12pt, weight: "bold", font: "Poppins", fill: rgb("#F97316"))[Tableau récapitulatif des règlements]
  #v(0.5cm)

  #table(
    columns: (1.2fr, 2.5fr, 1fr),
    stroke: (y, x) => if x > 0 { (top: 0.5pt + rgb("#F97316")) } else { none },
    row-gutter: 0.4cm,
    inset: 8pt,
    align: (left, left, right),

    text(weight: "bold")[Bénéficiaire],
    text(weight: "bold")[Coordonnées Bancaires],
    text(weight: "bold")[Montant HT],

    ..providers.map(p => (
      text(weight: "bold")[#p.name],
      [
        IBAN : #text(font: "Courier", size: 9pt, weight: "bold")[#p.iban] \\
        BIC : #text(font: "Courier", size: 9pt)[#p.bic]
      ],
      text(size: 11pt, weight: "bold")[#fmt(p.amount_to_pay)]
    )).flatten()
  )

  #v(0.6cm)
  #line(length: 100%, stroke: 1.5pt + rgb("#F97316"))
  #v(0.2cm)
  #align(right)[
    #text(weight: "bold", size: 11pt)[TOTAL DE L'APPEL DE FONDS HT :] #h(0.5cm)
    #text(size: 16pt, weight: "bold", fill: rgb("#F97316"), font: "Poppins")[#fmt(total_appel)]
  ]
]

#v(1fr)

#line(length: 100%, stroke: 0.5pt + rgb("#cccccc"))
#v(0.4cm)
#text(size: 8pt, fill: rgb("#666666"))[
  #align(center)[
    *Note comptable :* Ce document est une note de synthèse pour faciliter vos paiements. \\
    Chaque prestataire vous adressera individuellement sa facture acquittée correspondant au montant perçu. \\
    TVA non applicable, article 293 B du CGI.
  ]
]
`;
