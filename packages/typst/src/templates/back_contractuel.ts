export const back_contractuel: string = `#set document(
  title: "Devis & Convention de Co-traitance",
  author: "Collectif Web"
)

#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 2cm, right: 2cm),
  numbering: "1 / 2",
  number-align: right + bottom,
)

#set text(font: "Satoshi", size: 10pt, lang: "fr")

#let contract_date = "{{contract_date}}"
#let contract_reference = "{{contract_reference}}"
#let valid_until = "{{valid_until}}"
#let project_name = "{{project_name}}"

#let providers = ({{providers}})

#let features_list = ({{features}})

#let items = ({{items}})

#let client_name = "{{client_name}}"
#let client_address = "{{client_address}}"
#let client_city = "{{client_city}}"
#let client_siret = "{{client_siret}}"

#let mandataire = providers.at(0)
#let fmt(n) = str(calc.round(n, digits: 2)) + "\\u{00A0}€"

#grid(
  columns: (1fr, 1fr),
  column-gutter: 2cm,
  align(left)[
    #text(size: 24pt, weight: "bold", font: "Poppins")[Collectif Web]
    #v(0.3cm)
    #text(size: 9pt, fill: rgb("#666666"))[
      Représenté par #mandataire.name \\
      #mandataire.address, #mandataire.city \\
      SIRET : #mandataire.siret \\
      #mandataire.email
    ]
  ],
  align(right)[
    #text(size: 20pt, weight: "bold", font: "Poppins")[DEVIS & CONTRAT]
    #v(0.3cm)
    #text(size: 10pt)[
      Réf : #contract_reference \\
      Date : #contract_date \\
      Validité : #valid_until
    ]
  ]
)

#v(1.2cm)

#rect(width: 100%, fill: rgb("#f8f9fa"), stroke: none, radius: 4pt, inset: 1cm)[
  #text(size: 9pt, weight: "bold", fill: rgb("#666666"), font: "Satoshi")[CLIENT]
  #v(0.3cm)
  #text(size: 11pt, weight: "bold", font: "Satoshi")[#client_name]
  #v(0.2cm)
  #client_address \\ #client_city \\
  #if client_siret != "" [SIRET : #client_siret]
]

#v(0.8cm)
#text(size: 14pt, weight: "bold", font: "Poppins")[Projet : #project_name]
#v(0.2cm)
#text(style: "italic", size: 9pt)[Prestation réalisée en co-traitance par un groupement momentané d'indépendants.]

#v(0.8cm)

#text(size: 12pt, weight: "bold", font: "Poppins")[1. Périmètre de la mission]
#v(0.4cm)
#grid(
  columns: (1fr, 1fr),
  row-gutter: 0.4cm,
  column-gutter: 0.4cm,
  ..features_list.map(f => (
    rect(width: 100%, fill: rgb("#f8f9fa"), stroke: (left: 2pt + rgb("#F97316")), radius: 2pt, inset: 10pt)[
      #text(weight: "bold", font: "Poppins", size: 10pt)[#f.title]
      #v(0.1cm)
      #text(size: 8.5pt, fill: rgb("#333333"))[#f.desc]
    ]
  ))
)

#v(0.8cm)

#text(size: 12pt, weight: "bold", font: "Poppins")[2. Offre Financière]
#v(0.4cm)
#table(
  columns: (1fr, 0.25fr),
  stroke: (x, y) => {
    if y == 0 { (bottom: 1.5pt + rgb("#333333")) }
    else { (bottom: 0.5pt + rgb("#cccccc")) }
  },
  inset: 0.4cm,
  align: (left, right),
  text(weight: "bold", font: "Poppins")[Description des prestations],
  text(weight: "bold", font: "Poppins")[Total HT],
  ..items.map(item => (
    item.description,
    fmt(item.price)
  )).flatten()
)

#let total_global = providers.map(p => p.amount).sum()

#align(right)[
  #v(0.2cm)
  #text(size: 12pt, weight: "bold", font: "Poppins")[TOTAL GÉNÉRAL HT : ]
  #text(size: 12pt, weight: "bold", fill: rgb("#F97316"), font: "Poppins")[#fmt(total_global)] \\
  #text(size: 8pt, style: "italic")[TVA non applicable, art. 293 B du CGI]
]

#pagebreak()

#text(size: 14pt, weight: "bold", font: "Poppins")[Annexe : Convention de Co-traitance]
#v(0.5cm)
#text(size: 9pt)[Le Client accepte que la mission soit réalisée par les intervenants suivants. Chaque intervenant facture sa part et est responsable de son lot.]

#v(0.5cm)
#table(
  columns: (1.5fr, 1fr, 0.8fr),
  stroke: (bottom: 0.5pt + rgb("#eeeeee")),
  inset: 10pt,
  align: (left, left, right),
  text(weight: "bold")[Prestataire], text(weight: "bold")[Rôle], text(weight: "bold")[Part HT],
  ..providers.map(p => (
    [#text(weight: "bold")[#p.name] \\ #text(size: 7pt)[SIRET: #p.siret]],
    p.role,
    fmt(p.amount)
  )).flatten()
)

#v(1cm)
#text(weight: "bold", font: "Poppins")[Clauses particulières :]
#text(size: 9pt)[
  - *Interlocuteur unique :* #mandataire.name est désigné mandataire pour la gestion administrative.
  - *Maintenance :* Le support et la maintenance sont assurés par les prestataires désignés.
  - *Paiement :* Le Client s'engage à régler chaque facture à réception selon les RIB fournis dans l'appel de fonds.
  - *Propriété :* Le transfert des droits intervient après paiement intégral de tous les co-traitants.
]

#v(2cm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 3cm,
  align(left)[
    #text(weight: "bold")[Le Mandataire] \\
    #text(size: 8pt)[(Pour le groupement)]
    #v(2cm)
    Signature :
  ],
  align(left)[
    #text(weight: "bold")[Le Client] \\
    #text(size: 8pt)[(Lu et approuvé)]
    #v(2cm)
    Signature :
  ]
)
`;
