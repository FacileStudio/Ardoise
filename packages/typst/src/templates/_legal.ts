/**
 * Déclarations Typst des variables légales et footers réutilisables.
 * Référence: Art. 242 nonies A CGI, Art. L441-9 / L441-10 Code commerce, Art. R123-237 Ccom.
 */

export const legalLetDeclarations: string = `
#let provider_legal = "{{provider_legal}}"
#let provider_legal_form = "{{provider_legal_form}}"
#let provider_share_capital = "{{provider_share_capital}}"
#let provider_rcs_city = "{{provider_rcs_city}}"
#let provider_ape_code = "{{provider_ape_code}}"
#let provider_tva_intracom = "{{provider_tva_intracom}}"
#let provider_postal_code = "{{provider_postal_code}}"
#let client_postal_code = "{{client_postal_code}}"
#let client_tva_intracom = "{{client_tva_intracom}}"
#let payment_terms_days = "{{payment_terms_days}}"
#let late_fee_rate = "{{late_fee_rate}}"
#let recovery_fee_amount = {{recovery_fee_amount}}
#let vat_exemption_mention = "{{vat_exemption_mention}}"
`;

/**
 * Footer complet pour FACTURES — inclut pénalités de retard + indemnité forfaitaire 40 €.
 * Requiert que les variables de `legalLetDeclarations` soient déclarées.
 */
export const legalInvoiceFooter: string = `
#line(length: 100%, stroke: 0.5pt + rgb("#dddddd"))
#v(0.6cm)
#text(size: 8pt, fill: rgb("#888888"))[
  #provider_legal #if provider_legal_form != "" [ \u{00B7} #provider_legal_form]#if provider_share_capital != "" [ au capital de #provider_share_capital\u{00A0}€]#if provider_rcs_city != "" [ \u{00B7} RCS #provider_rcs_city]#if provider_ape_code != "" [ \u{00B7} APE #provider_ape_code] \\
  SIRET #provider_siret#if provider_tva_intracom != "" [ \u{00B7} TVA intracommunautaire #provider_tva_intracom] \\
  #if vat_exemption_mention != "" [#vat_exemption_mention \\ ]
  En cas de retard de paiement, pénalités égales à #late_fee_rate. \\
  Indemnité forfaitaire pour frais de recouvrement de #fmt(recovery_fee_amount) (Art. L441-10 Code de commerce). \\
  Pas d'escompte en cas de paiement anticipé.
]
`;

/**
 * Footer simplifié pour DEVIS / CONTRATS — mentions d'identification entreprise (Art. R123-237 Ccom).
 * Pas de pénalités ni 40 € (pas applicable hors facture).
 */
export const legalContractFooter: string = `
#line(length: 100%, stroke: 0.5pt + rgb("#dddddd"))
#v(0.6cm)
#text(size: 8pt, fill: rgb("#888888"))[
  #provider_legal #if provider_legal_form != "" [ \u{00B7} #provider_legal_form]#if provider_share_capital != "" [ au capital de #provider_share_capital\u{00A0}€]#if provider_rcs_city != "" [ \u{00B7} RCS #provider_rcs_city]#if provider_ape_code != "" [ \u{00B7} APE #provider_ape_code] \\
  SIRET #provider_siret#if provider_tva_intracom != "" [ \u{00B7} TVA intracommunautaire #provider_tva_intracom] \\
  #if vat_exemption_mention != "" [#vat_exemption_mention]
]
`;
