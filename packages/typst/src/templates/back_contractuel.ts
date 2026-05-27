import { legalLetDeclarations, legalContractFooter } from './_legal';

export const back_contractuel: string = `#set document(
  title: "Devis & Convention de Co-traitance",
  author: "Collectif Web"
)

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  numbering: "1 / 2",
  number-align: right + bottom,
)

#set text(font: "Satoshi", size: 10pt, lang: "fr")
#set par(leading: 0.65em, spacing: 0.65em)

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

#let provider_name = "{{provider_name}}"
#let provider_siret = "{{provider_siret}}"
${legalLetDeclarations}

#let mandataire = providers.at(0)
#let fmt(n) = str(calc.round(n, digits: 2)) + "\u{00A0}€"

// Header
#grid(
  columns: (1fr, auto),
  column-gutter: 3cm,
  [
    #text(size: 26pt, weight: "bold", font: "Satoshi")[Collectif Web]
    #v(0.7cm)
    #text(size: 9.5pt, fill: rgb("#555555"))[
      Représenté par #mandataire.name \
      #mandataire.address, #mandataire.city \
      SIRET: #mandataire.siret
    ]
    #v(0.3cm)
    #text(size: 9.5pt, fill: rgb("#555555"))[
      #mandataire.email
    ]
  ],
  [
    #text(size: 28pt, weight: "bold", font: "Satoshi", fill: rgb("#1a1a1a"))[DEVIS & CONTRAT]
    #v(0.8cm)
    #table(
      columns: (auto, auto),
      stroke: none,
      align: (left, left),
      row-gutter: 0.35cm,
      column-gutter: 1.2cm,
      text(weight: "medium", fill: rgb("#666666"), size: 9pt)[RÉFÉRENCE],
      text(weight: "bold", size: 10pt)[#contract_reference],
      text(weight: "medium", fill: rgb("#666666"), size: 9pt)[DATE],
      text(size: 10pt)[#contract_date],
      text(weight: "medium", fill: rgb("#666666"), size: 9pt)[VALIDITÉ],
      text(size: 10pt)[#valid_until],
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
  #v(0.3cm)
  #text(size: 9.5pt, fill: rgb("#333333"))[
    #client_address \
    #client_city \
    #if client_siret != "" [SIRET: #client_siret]
  ]
]

#v(1.5cm)

#text(size: 13pt, weight: "bold", font: "Satoshi")[Projet : #project_name]
#v(0.4cm)
#text(style: "italic", size: 9pt, fill: rgb("#666666"))[Prestation réalisée en co-traitance par un groupement momentané d'indépendants.]

#v(1.2cm)

#text(size: 12pt, weight: "bold", font: "Satoshi")[1. Périmètre de la mission]
#v(0.6cm)
#grid(
  columns: (1fr, 1fr),
  row-gutter: 0.5cm,
  column-gutter: 0.5cm,
  ..features_list.map(f => (
    rect(
      width: 100%,
      fill: rgb("#fafafa"),
      stroke: (left: 3pt + rgb("#1a1a1a")),
      radius: 0pt,
      inset: (left: 0.8cm, right: 0.8cm, top: 0.7cm, bottom: 0.7cm)
    )[
      #text(weight: "bold", font: "Satoshi", size: 10pt)[#f.title]
      #v(0.3cm)
      #text(size: 9pt, fill: rgb("#555555"))[#f.desc]
    ]
  ))
)

#v(1.5cm)

#text(size: 12pt, weight: "bold", font: "Satoshi")[2. Offre Financière]
#v(0.6cm)
#table(
  columns: (1fr, 0.18fr),
  stroke: (x, y) => {
    if y == 0 { (bottom: 2pt + rgb("#1a1a1a")) }
    else { none }
  },
  inset: (left: 0pt, right: 0pt, top: 0.6cm, bottom: 0.6cm),
  align: (left, left),
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[DESCRIPTION DES PRESTATIONS],
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[TOTAL HT],
  ..items.map(item => (
    [#text(size: 9.5pt)[#item.description]],
    [#text(size: 9.5pt, weight: "medium")[#fmt(item.price)]]
  )).flatten()
)

#let total_global = providers.map(p => p.amount).sum()

#v(1.5cm)

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
      text(size: 13pt, weight: "bold", font: "Satoshi")[TOTAL GÉNÉRAL HT],
      text(size: 14pt, weight: "bold", fill: rgb("#1a1a1a"), font: "Satoshi")[#fmt(total_global)],
    )
    #v(0.4cm)
    #text(size: 9pt, style: "italic", fill: rgb("#666666"))[
      TVA non applicable, art. 293 B du CGI
    ]
  ]
)

#pagebreak()

#text(size: 14pt, weight: "bold", font: "Satoshi")[Annexe : Convention de Co-traitance]
#v(0.7cm)
#text(size: 9.5pt, fill: rgb("#555555"))[Le Client accepte que la mission soit réalisée par les intervenants suivants. Chaque intervenant facture sa part et est responsable de son lot.]

#v(1cm)
#table(
  columns: (1.5fr, 1fr, 0.8fr),
  stroke: (x, y) => {
    if y == 0 { (bottom: 2pt + rgb("#1a1a1a")) }
    else { none }
  },
  inset: (left: 0pt, right: 0pt, top: 0.6cm, bottom: 0.6cm),
  align: (left, left, left),
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[PRESTATAIRE],
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[RÔLE],
  text(weight: "bold", font: "Satoshi", size: 9.5pt, tracking: 0.3pt)[PART HT],
  ..providers.map(p => (
    [#text(weight: "bold", size: 9.5pt)[#p.name] \ #text(size: 8pt, fill: rgb("#666666"))[SIRET: #p.siret]],
    [#text(size: 9.5pt)[#p.role]],
    [#text(size: 9.5pt, weight: "medium")[#fmt(p.amount)]]
  )).flatten()
)

#v(1.5cm)
#text(size: 11pt, weight: "bold", font: "Satoshi")[Clauses particulières]
#v(0.5cm)
#text(size: 9.5pt, fill: rgb("#333333"))[
  - *Interlocuteur unique :* #mandataire.name est désigné mandataire pour la gestion administrative.
  - *Maintenance :* Le support et la maintenance sont assurés par les prestataires désignés.
  - *Paiement :* Le Client s'engage à régler chaque facture à réception selon les RIB fournis dans l'appel de fonds.
  - *Propriété :* Le transfert des droits intervient après paiement intégral de tous les co-traitants.
]

#v(2cm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 3cm,
  [
    #text(weight: "bold", size: 10pt)[Le Mandataire] \
    #text(size: 8pt, fill: rgb("#666666"))[(Pour le groupement)]
    #v(2cm)
    #text(size: 9pt)[Signature :]
  ],
  [
    #text(weight: "bold", size: 10pt)[Le Client] \
    #text(size: 8pt, fill: rgb("#666666"))[(Lu et approuvé)]
    #v(2cm)
    #text(size: 9pt)[Signature :]
  ]
)

#v(1fr)
${legalContractFooter}
`;
