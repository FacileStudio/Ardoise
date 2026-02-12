export const contratPrestation: string = `#set document(
  title: "Contrat de Prestation",
  author: "{{provider_name}}"
)

#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 2cm, right: 2cm),
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

#align(center)[
  #box(height: 24pt, baseline: 20%, image("logo.png", height: 24pt))
  #h(0.3cm)
  #text(size: 24pt, weight: "bold", font: "Poppins")[#provider_name]
]

#v(1cm)

#align(center)[
  #text(size: 18pt, weight: "bold", font: "Poppins")[CONTRAT DE PRESTATION DE SERVICES]
  #v(0.3cm)
  #text(size: 11pt)[Contrat N° #number]
  #v(0.2cm)
  #text(size: 10pt)[Fait le #date]
]

#v(1.5cm)

#text(size: 12pt, weight: "bold", font: "Poppins")[ENTRE LES SOUSSIGNÉS :]

#v(0.5cm)

#text(weight: "bold")[Le prestataire :]

#text[
  #provider_name \
  #provider_address \
  #provider_city \
  SIRET: #provider_siret \
  Email: #provider_email \
  Téléphone: #provider_phone
]

#v(0.5cm)

#text[Ci-après dénommé « le Prestataire »,]

#v(0.5cm)

#text(weight: "bold")[D'une part,]

#v(1cm)

#text(weight: "bold")[ET :]

#v(0.5cm)

#text(weight: "bold")[Le client :]

#text[
  #client_name \
  #client_address \
  #client_city \
  #client_country \
  #if client_siret != "" and client_siret != "0" [SIRET: #client_siret]
]

#v(0.5cm)

#text[Ci-après dénommé « le Client »,]

#v(0.5cm)

#text(weight: "bold")[D'autre part,]

#pagebreak()

#text(size: 12pt, weight: "bold", font: "Poppins")[IL A ÉTÉ CONVENU CE QUI SUIT :]

#v(1cm)

#text(size: 11pt, weight: "bold", font: "Poppins")[Article 1 – Objet du contrat]

#v(0.3cm)

#text[
  Le présent contrat a pour objet la réalisation d'une prestation de services en développement informatique, conformément au devis N° #quote_number accepté par le Client.
]

#v(0.8cm)

#text(size: 11pt, weight: "bold", font: "Poppins")[Article 2 – Description de la prestation]

#v(0.3cm)

#text[
  La prestation comprend les services détaillés dans le devis N° #quote_number, qui fait partie intégrante du présent contrat.
]

#v(0.8cm)

#text(size: 11pt, weight: "bold", font: "Poppins")[Article 3 – Obligations du Prestataire]

#v(0.3cm)

#text[
  Le Prestataire s'engage à :
  - Réaliser la prestation avec professionnalisme et selon les règles de l'art
  - Respecter les délais convenus dans le devis
  - Informer le Client de l'avancement des travaux
  - Garantir la confidentialité des informations communiquées
]

#v(0.8cm)

#text(size: 11pt, weight: "bold", font: "Poppins")[Article 4 – Obligations du Client]

#v(0.3cm)

#text[
  Le Client s'engage à :
  - Fournir toutes les informations nécessaires à la réalisation de la prestation
  - Répondre dans des délais raisonnables aux demandes du Prestataire
  - Régler les factures selon les modalités convenues
  - Collaborer activement à la réalisation du projet
]

#v(0.8cm)

#text(size: 11pt, weight: "bold", font: "Poppins")[Article 5 – Prix et modalités de paiement]

#v(0.3cm)

#text[
  Le prix de la prestation est celui mentionné dans le devis N° #quote_number. Les modalités de paiement sont celles définies dans le devis.
]

#v(0.8cm)

#text(size: 11pt, weight: "bold", font: "Poppins")[Article 6 – Propriété intellectuelle]

#v(0.3cm)

#text[
  Les droits de propriété intellectuelle sur les livrables sont transférés au Client après paiement intégral de la prestation. Le Prestataire conserve le droit d'utiliser les travaux réalisés à des fins de portfolio et de démonstration.
]

#v(0.8cm)

#text(size: 11pt, weight: "bold", font: "Poppins")[Article 7 – Résiliation]

#v(0.3cm)

#text[
  En cas de manquement grave de l'une des parties à ses obligations, le présent contrat pourra être résilié de plein droit par l'autre partie, 15 jours après mise en demeure restée sans effet.
]

#v(0.8cm)

#text(size: 11pt, weight: "bold", font: "Poppins")[Article 8 – Juridiction compétente]

#v(0.3cm)

#text[
  En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les parties s'engagent à rechercher une solution amiable. À défaut, le litige sera porté devant les tribunaux compétents.
]

#pagebreak()

#v(2cm)

#text(size: 11pt, weight: "bold", font: "Poppins")[SIGNATURES]

#v(1cm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 2cm,
  [
    #text(weight: "bold")[Le Prestataire]
    #v(0.5cm)
    #text[#provider_name]
    #v(0.3cm)
    #text(size: 9pt, fill: rgb("#666666"))[Fait à #provider_city]
    #text(size: 9pt, fill: rgb("#666666"))[Le #date]
    #v(2cm)
    #text(size: 9pt, fill: rgb("#666666"))[Signature et cachet]
  ],
  [
    #text(weight: "bold")[Le Client]
    #v(0.5cm)
    #text[#client_name]
    #v(0.3cm)
    #text(size: 9pt, fill: rgb("#666666"))[Fait à #client_city]
    #text(size: 9pt, fill: rgb("#666666"))[Le #date]
    #v(2cm)
    #text(size: 9pt, fill: rgb("#666666"))[Signature et cachet]
  ]
)

#v(1fr)

#line(length: 100%, stroke: 0.5pt + rgb("#cccccc"))
#v(0.5cm)
#text(size: 8pt, fill: rgb("#666666"))[
  #align(center)[
    #provider_name – Développeur Freelance \
    #provider_address – #provider_city \
    SIRET: #provider_siret
  ]
]
`;
