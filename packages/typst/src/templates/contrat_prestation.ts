export const contratPrestation: string = `#set document(
  title: "Contrat de Prestation",
  author: "{{provider_name}}"
)

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  numbering: "1",
  number-align: right + bottom,
)

#set text(font: "Satoshi", size: 10pt, lang: "fr")

#let number = "{{number}}"
#let date = "{{date}}"
#let quote_number = "{{quote_number}}"

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

// Header section - Left-aligned logo + provider name
#box(height: 26pt, baseline: 20%, image("logo.png", height: 26pt))
#h(0.4cm)
#text(size: 26pt, weight: "bold", fill: rgb("#1a1a1a"))[#provider_name]

#v(1.2cm)

// Main title - Left-aligned, large heading
#text(size: 22pt, weight: "bold", fill: rgb("#1a1a1a"))[CONTRAT DE PRESTATION DE SERVICES]

#v(0.6cm)

// Contract metadata - Left-aligned
#text(size: 10pt, fill: rgb("#666666"))[
  Contrat N° #number \
  Fait le #date
]

#v(1.8cm)

// Section heading
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[ENTRE LES SOUSSIGNÉS :]

#v(0.6cm)

// Provider section
#text(size: 10pt, weight: "bold", fill: rgb("#1a1a1a"))[Le prestataire :]

#v(0.3cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  #provider_name \
  #provider_address \
  #provider_city \
  SIRET: #provider_siret \
  Email: #provider_email \
  Téléphone: #provider_phone
]

#v(0.5cm)

#text(size: 9.5pt, fill: rgb("#555555"))[Ci-après dénommé « le Prestataire »,]

#v(0.5cm)

#text(size: 10pt, weight: "bold", fill: rgb("#1a1a1a"))[D'une part,]

#v(1cm)

// Client section
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[ET :]

#v(0.6cm)

#text(size: 10pt, weight: "bold", fill: rgb("#1a1a1a"))[Le client :]

#v(0.3cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  #client_name \
  #client_address \
  #client_city \
  #client_country \
  #if client_siret != "" and client_siret != "0" [SIRET: #client_siret]
]

#v(0.5cm)

#text(size: 9.5pt, fill: rgb("#555555"))[Ci-après dénommé « le Client »,]

#v(0.5cm)

#text(size: 10pt, weight: "bold", fill: rgb("#1a1a1a"))[D'autre part,]

#pagebreak()

// Main contract body
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[IL A ÉTÉ CONVENU CE QUI SUIT :]

#v(1cm)

// Article 1
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 1 – Objet du contrat]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  Le présent contrat a pour objet la réalisation d'une prestation de services en développement informatique, conformément au devis N° #quote_number accepté par le Client.
]

#v(0.8cm)

// Article 2
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 2 – Description de la prestation]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  La prestation comprend les services détaillés dans le devis N° #quote_number, qui fait partie intégrante du présent contrat.
]

#v(0.8cm)

// Article 3
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 3 – Obligations du Prestataire]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  Le Prestataire s'engage à :
]

#v(0.2cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  • Réaliser la prestation avec professionnalisme et selon les règles de l'art \
  • Respecter les délais convenus dans le devis \
  • Informer le Client de l'avancement des travaux \
  • Garantir la confidentialité des informations communiquées
]

#v(0.8cm)

// Article 4
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 4 – Obligations du Client]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  Le Client s'engage à :
]

#v(0.2cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  • Fournir toutes les informations nécessaires à la réalisation de la prestation \
  • Répondre dans des délais raisonnables aux demandes du Prestataire \
  • Régler les factures selon les modalités convenues \
  • Collaborer activement à la réalisation du projet
]

#v(0.8cm)

// Article 5
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 5 – Prix et modalités de paiement]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  Le prix de la prestation est celui mentionné dans le devis N° #quote_number. Les modalités de paiement sont celles définies dans le devis.
]

#v(0.8cm)

// Article 6
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 6 – Propriété intellectuelle]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  Les droits de propriété intellectuelle sur les livrables sont transférés au Client après paiement intégral de la prestation. Le Prestataire conserve le droit d'utiliser les travaux réalisés à des fins de portfolio et de démonstration.
]

#v(0.8cm)

// Article 7
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 7 – Résiliation]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  En cas de manquement grave de l'une des parties à ses obligations, le présent contrat pourra être résilié de plein droit par l'autre partie, 15 jours après mise en demeure restée sans effet.
]

#v(0.8cm)

// Article 8
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 8 – Juridiction compétente]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#555555"))[
  En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les parties s'engagent à rechercher une solution amiable. À défaut, le litige sera porté devant les tribunaux compétents.
]

#pagebreak()

#v(2cm)

// Signatures section
#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[SIGNATURES]

#v(1.2cm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 2.5cm,
  [
    #text(size: 10pt, weight: "bold", fill: rgb("#1a1a1a"))[Le Prestataire]
    #v(0.5cm)
    #text(size: 9.5pt, fill: rgb("#555555"))[#provider_name]
    #v(0.4cm)
    #text(size: 9pt, fill: rgb("#888888"))[
      Fait à #provider_city \
      Le #date
    ]
    #v(2.5cm)
    #text(size: 9pt, fill: rgb("#888888"))[Signature et cachet]
  ],
  [
    #text(size: 10pt, weight: "bold", fill: rgb("#1a1a1a"))[Le Client]
    #v(0.5cm)
    #text(size: 9.5pt, fill: rgb("#555555"))[#client_name]
    #v(0.4cm)
    #text(size: 9pt, fill: rgb("#888888"))[
      Fait à #client_city \
      Le #date
    ]
    #v(2.5cm)
    #text(size: 9pt, fill: rgb("#888888"))[Signature et cachet]
  ]
)

#v(1fr)

// Footer - Left-aligned
#line(length: 100%, stroke: 0.5pt + rgb("#dddddd"))
#v(0.5cm)
#text(size: 8.5pt, fill: rgb("#888888"))[
  #provider_name – Développeur Freelance \
  #provider_address – #provider_city \
  SIRET: #provider_siret
]
`;
