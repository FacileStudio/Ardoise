import { legalLetDeclarations, legalContractFooter } from './_legal';

export const contratMaintenance: string = `#set document(
  title: "Contrat de Maintenance",
  author: "{{provider_name}}"
)

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  numbering: "1",
  number-align: right + bottom,
)

#set text(font: "Satoshi", size: 10pt, lang: "fr", fill: rgb("#1a1a1a"))

#let number = "{{number}}"
#let date = "{{date}}"

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
${legalLetDeclarations}

// Header section - left-aligned logo and provider name
#box(height: 26pt, baseline: 20%, image("logo.png", height: 26pt))
#h(0.4cm)
#text(size: 26pt, weight: "bold", fill: rgb("#1a1a1a"))[#provider_name]

#v(1.2cm)

// Main heading - left-aligned
#text(size: 22pt, weight: "bold", fill: rgb("#1a1a1a"))[CONTRAT DE MAINTENANCE]

#v(0.6cm)

// Contract metadata - left-aligned
#text(size: 10pt, fill: rgb("#666666"))[Contrat N° #number]
#v(0.2cm)
#text(size: 10pt, fill: rgb("#666666"))[Fait le #date]

#v(1.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[ENTRE LES SOUSSIGNÉS :]

#v(0.7cm)

#text(weight: "bold", size: 10pt, fill: rgb("#555555"))[Le prestataire :]

#v(0.3cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
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

#text(weight: "bold", size: 9.5pt, fill: rgb("#1a1a1a"))[D'une part,]

#v(1cm)

#text(weight: "bold", size: 10pt, fill: rgb("#555555"))[ET :]

#v(0.5cm)

#text(weight: "bold", size: 10pt, fill: rgb("#555555"))[Le client :]

#v(0.3cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  #client_name \
  #client_address \
  #client_city \
  #client_country \
  #if client_siret != "" and client_siret != "0" [SIRET: #client_siret]
]

#v(0.5cm)

#text(size: 9.5pt, fill: rgb("#555555"))[Ci-après dénommé « le Client »,]

#v(0.5cm)

#text(weight: "bold", size: 9.5pt, fill: rgb("#1a1a1a"))[D'autre part,]

#pagebreak()

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[IL A ÉTÉ CONVENU CE QUI SUIT :]

#v(1cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 1 – Objet du contrat]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  Le présent contrat a pour objet la maintenance et le support technique de l'application ou du site web du Client par le Prestataire, selon les modalités définies ci-après.
]

#v(0.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 2 – Prestations de maintenance]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  La maintenance comprend :
  - La correction des bugs et anomalies constatés
  - Les mises à jour de sécurité
  - Les mises à jour techniques (frameworks, bibliothèques)
  - Le support technique par email
  - La surveillance du bon fonctionnement de l'application
]

#v(0.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 3 – Durée et renouvellement]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  Le présent contrat est conclu pour une durée de 12 mois à compter de la date de signature. Il sera tacitement reconduit pour des périodes successives de 12 mois, sauf résiliation par l'une des parties moyennant un préavis de 2 mois.
]

#v(0.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 4 – Niveaux de service]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  Le Prestataire s'engage à :
  - Répondre aux demandes de support sous 48h ouvrées
  - Corriger les bugs critiques sous 72h ouvrées
  - Réaliser les mises à jour de sécurité dans les meilleurs délais
  - Fournir un rapport mensuel d'activité
]

#v(0.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 5 – Obligations du Client]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  Le Client s'engage à :
  - Déclarer les anomalies de manière détaillée
  - Fournir les accès nécessaires à la maintenance
  - Régler les factures selon les modalités convenues
  - Informer le Prestataire de toute modification structurelle
]

#v(0.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 6 – Exclusions]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  Sont exclus du contrat de maintenance :
  - Le développement de nouvelles fonctionnalités
  - Les modifications graphiques ou de design
  - Les interventions résultant d'une mauvaise utilisation
  - La migration vers une autre infrastructure
  - Les prestations dépassant le forfait mensuel
]

#v(0.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 7 – Prix et modalités de paiement]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  Le prix de la maintenance est facturé mensuellement. Les modalités de paiement sont : paiement à réception de facture. Toute prestation supplémentaire fera l'objet d'un devis séparé.
]

#pagebreak()

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 8 – Responsabilité]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  Le Prestataire ne saurait être tenu responsable des dommages indirects ou consécutifs résultant de l'utilisation du service. Sa responsabilité est limitée au montant annuel du contrat.
]

#v(0.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 9 – Confidentialité]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  Les parties s'engagent à respecter la confidentialité des informations échangées dans le cadre du présent contrat.
]

#v(0.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 10 – Résiliation]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  En cas de manquement grave de l'une des parties à ses obligations, le présent contrat pourra être résilié de plein droit par l'autre partie, 30 jours après mise en demeure restée sans effet.
]

#v(0.8cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[Article 11 – Juridiction compétente]

#v(0.4cm)

#text(size: 9.5pt, fill: rgb("#1a1a1a"))[
  En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les parties s'engagent à rechercher une solution amiable. À défaut, le litige sera porté devant les tribunaux compétents.
]

#v(2cm)

#text(size: 12pt, weight: "bold", fill: rgb("#1a1a1a"))[SIGNATURES]

#v(1cm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 2cm,
  [
    #text(weight: "bold", size: 10pt, fill: rgb("#1a1a1a"))[Le Prestataire]
    #v(0.5cm)
    #text(size: 9.5pt, fill: rgb("#1a1a1a"))[#provider_name]
    #v(0.3cm)
    #text(size: 9pt, fill: rgb("#888888"))[Fait à #provider_city]
    #v(0.1cm)
    #text(size: 9pt, fill: rgb("#888888"))[Le #date]
    #v(2cm)
    #text(size: 9pt, fill: rgb("#888888"))[Signature et cachet]
  ],
  [
    #text(weight: "bold", size: 10pt, fill: rgb("#1a1a1a"))[Le Client]
    #v(0.5cm)
    #text(size: 9.5pt, fill: rgb("#1a1a1a"))[#client_name]
    #v(0.3cm)
    #text(size: 9pt, fill: rgb("#888888"))[Fait à #client_city]
    #v(0.1cm)
    #text(size: 9pt, fill: rgb("#888888"))[Le #date]
    #v(2cm)
    #text(size: 9pt, fill: rgb("#888888"))[Signature et cachet]
  ]
)

#v(1fr)

${legalContractFooter}
`;
