export const contrat_maintenance: string = `#set document(
  title: "Contrat de maintenance applicative",
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

#text(weight: "bold", font: "Poppins")[Article 1 – Objet]
Le présent contrat a pour objet la définition des conditions dans lesquelles le Prestataire assure la maintenance applicative de l'application du Client, ainsi que la gestion de son hébergement.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 2 – Prestations de maintenance]
La maintenance applicative comprend :
- la surveillance générale de l'application,
- la correction de bugs mineurs,
- les ajustements techniques légers,
- un support technique de base.

Sont exclues du présent contrat toute évolution fonctionnelle, refonte, ou intervention lourde, qui feront l'objet d'un devis distinct.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 3 – Hébergement]
L'application est hébergée via la plateforme #text(weight: "bold")[Railway].
Les frais d'hébergement :
- dépendent de la consommation réelle (ressources, stockage, trafic),
- sont refacturés mensuellement au Client,
- correspondent strictement aux montants communiqués par Railway, sans marge appliquée.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 4 – Conditions financières]
Les conditions financières applicables à la maintenance applicative sont définies dans le #text(weight: "bold")[devis de maintenance applicative] signé par le Client. La maintenance fait l'objet d'une facturation mensuelle récurrente.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 5 – Durée et résiliation]
Le présent contrat est conclu pour une durée indéterminée à compter de sa date de signature. Il peut être résilié par l'une ou l'autre des parties, sans justification, moyennant un préavis de #text(weight: "bold")[30 jours].

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 6 – Responsabilité]
Le Prestataire est tenu à une obligation de moyens. Il ne saurait être tenu responsable des interruptions de service, pertes de données ou incidents liés à la plateforme d'hébergement Railway ou à des services tiers.

#v(0.6cm)

#text(weight: "bold", font: "Poppins")[Article 7 – Acceptation]
La signature du devis de maintenance applicative vaut acceptation pleine et entière du présent contrat.

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
    Contrat de maintenance applicative
  ]
]`;
