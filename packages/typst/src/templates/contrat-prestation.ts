export const contrat_prestation: string = `#set document(
  title: "Contrat de prestation de services",
  author: "{{provider_name}}"
)

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  numbering: "1 / 1",
  number-align: right + bottom,
)

#set text(font: "Satoshi", size: 10pt, lang: "fr")

#let contract_date = "{{contract_date}}"
#let contract_reference = "{{contract_reference}}"

#let provider_name = "{{provider_name}}"
#let provider_legal = "{{provider_legal}}"
#let provider_address = "{{provider_address}}"
#let provider_city = "{{provider_city}}"
#let provider_siret = "{{provider_siret}}"
#let provider_email = "{{provider_email}}"

#let client_name = "{{client_name}}"
#let client_address = "{{client_address}}"
#let client_city = "{{client_city}}"
#let client_country = "{{client_country}}"
#let client_siret = "{{client_siret}}"

#grid(
  columns: (1fr, 1fr),
  column-gutter: 2cm,
  align(left)[
    #box(height: 24pt, baseline: 20%, image("logo.png", height: 24pt))
    #h(0.3cm)
    #text(size: 24pt, weight: "bold", font: "Poppins")[#provider_name]
    #v(0.3cm)
    #text(size: 9pt, fill: rgb("#666666"))[
      Développeur freelance \
      #provider_address \
      #provider_city \
      SIRET : #provider_siret \
      #provider_email
    ]
  ],
  align(right)[
    #text(size: 20pt, weight: "bold", font: "Poppins")[CONTRAT]
    #v(0.3cm)
    #text(size: 10pt)[
      Référence : #contract_reference \
      Date : #contract_date
    ]
  ]
)

#v(1.8cm)

#text(weight: "bold", font: "Poppins")[Entre les soussignés :]
#v(0.5cm)

#text(weight: "bold")[Le Prestataire] \
#provider_name (#provider_legal) \
#provider_address \
#provider_city

#v(0.5cm)

#text(weight: "bold")[Et le Client] \
#client_name \
#client_address \
#client_city \
#client_country \
#if client_siret != "" and client_siret != "0" [SIRET : #client_siret]

#v(1cm)

#text(weight: "bold", font: "Poppins")[Article 1 – Objet de la mission]
Le présent contrat définit les conditions dans lesquelles le Prestataire s'engage à réaliser pour le Client les prestations de services décrites dans le devis n°{{quote_number}}.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 2 – Obligations du Prestataire]
Le Prestataire s'engage à apporter tout le soin et la diligence nécessaires à la réalisation d'une prestation de qualité, conformément aux règles de l'art. Il s'agit d'une obligation de moyens et non de résultat.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 3 – Collaboration du Client]
Le Client s'engage à fournir au Prestataire toutes les informations et documents nécessaires à la bonne compréhension et à l'exécution de la mission. Un retard dans la transmission peut entraîner un décalage du calendrier de livraison.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 4 – Propriété intellectuelle]
La propriété des livrables (code, design, documents) est transférée au Client dès le paiement intégral des sommes dues. Jusqu'au paiement complet, le Prestataire reste propriétaire exclusif des travaux réalisés.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 5 – Conditions de règlement]
Le prix de la prestation est celui indiqué sur le devis accepté. Tout retard de paiement pourra donner lieu à l'application de pénalités de retard exigibles sans rappel préalable, au taux de trois fois le taux d'intérêt légal.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 6 – Confidentialité]
Chacune des parties s'engage à considérer comme confidentiels toutes les informations, documents ou données communiqués par l'autre partie pour les besoins de l'exécution du présent contrat.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 7 – Résiliation]
En cas de manquement par l'une des parties à ses obligations, non réparé dans un délai de 15 jours à compter de la réception d'une mise en demeure, l'autre partie pourra résilier le contrat de plein droit.

#v(1.5cm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 3cm,
  align(left)[
    #text(weight: "bold")[Le Prestataire] \
    #v(1.5cm)
    Signature :
  ],
  align(left)[
    #text(weight: "bold")[Le Client] \
    #v(1.5cm)
    Signature :
  ]
)

#v(1.5cm)
#line(length: 100%, stroke: 0.5pt + rgb("#cccccc"))
#v(0.4cm)
#text(size: 8pt, fill: rgb("#666666"))[
  #align(center)[
    #provider_name – Développeur Freelance \
    Contrat de prestation de services
  ]
]`;
