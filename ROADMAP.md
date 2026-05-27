# Ardoise — Roadmap

> Objectif: rendre Ardoise **100% conforme à la réforme facturation électronique FR 2026-2027**, brancher l'écosystème Facile (notamment **Plume** pour la signature), et muscler la plateforme pour passer du MVP interne à un vrai outil de production.

État actuel: ~35% conforme. Production légale **impossible en l'état après le 1er septembre 2026**.

Fonctionnel: paiements, Stripe checkout, webhooks, Typst receipts, emails, portail client, admin, OIDC/SSO, rate limiting. Bloqué: typecheck OOM, lint cassé, 0 tests, pas de CI.

---

## Sommaire

0. [Phase 0 — Hygiène dev (BLOQUANT)](#phase-0--hygiène-dev-bloquant)
1. [Calendrier légal de référence](#calendrier-légal-de-référence)
2. [Phase 1 — Conformité légale FR 2026 (BLOQUANT)](#phase-1--conformité-légale-fr-2026-bloquant)
3. [Phase 2 — Robustesse & Production-grade](#phase-2--robustesse--production-grade)
4. [Phase 3 — Interconnexion Plume](#phase-3--interconnexion-plume)
5. [Phase 4 — Features produit](#phase-4--features-produit)
6. [Phase 5 — Stretch / Long terme](#phase-5--stretch--long-terme)
7. [Références & documentation](#références--documentation)

---

## Phase 0 — Hygiène dev ✅

> Complété. Lint green, typecheck fonctionnel, CI en place.

### 0.1 Typecheck OOM sur `apps/web` ✅

- [x] Heap augmenté à 8GB (`NODE_OPTIONS='--max-old-space-size=8192'`)
- [x] `skipLibCheck: true` ajouté au tsconfig web
- [x] `@ts-nocheck` injecté dans le zod généré via `patch-zod-types.ts` (élimine 371 erreurs)
- Résultat: OOM crash → 58 erreurs résiduelles (23 en packages workspace via svelte-check, 35 pré-existantes dans le web)

### 0.2 Lint backend ✅

- [x] Globals Web API (`btoa`, `atob`, `fetch`, `URL`, etc.) ajoutés à la config ESLint node + svelte
- [x] Catch vides annotés dans OIDC handler et rate-limit middleware
- [x] `as any` remplacés par types corrects dans OIDC handler
- Résultat: 0 erreurs, 0 warnings backend. Web: 0 erreurs, 67 warnings (cosmétiques)

### 0.3 Nettoyage `as any` ✅

- [x] OIDC handler: `(user as any).avatar` → accès direct typé
- [x] Payment router: Stripe Invoice type mis à jour pour SDK v20
- [x] Document router: `DocType`, `DocumentData`, `Record<string, unknown>` au lieu de `any`
- [x] i18n: supprimé le fallback IE `navigator.userLanguage`
- [x] Web pages: toast API, type conversions, void returns
- Restant: `admin/service.ts` dynamic delegate (inévitable), fichiers générés zod (exclus)

### 0.4 Logging structuré ✅

- [x] `console.error` → `@repo/logger` dans: payment service, settings service, document router, SMTP client, SvelteKit error handler
- [x] `@repo/logger` ajouté comme dépendance de `@repo/smtp`

### 0.5 Pipeline CI ✅

- [x] `.github/workflows/ci.yml` créé: lint + typecheck + build
- [x] PostgreSQL service container pour Prisma
- [x] `NODE_OPTIONS=--max-old-space-size=4096` global dans CI
- [ ] Turbo remote caching (nice-to-have, pas bloquant)

---

## Calendrier légal de référence

| Date | Obligation | Concerne |
|---|---|---|
| **1er sept. 2026** | Réception obligatoire factures électroniques via PA (ex-PDP) | Toutes entreprises FR |
| **1er sept. 2026** | Émission obligatoire au format structuré (Factur-X / UBL / CII) | ETI + Grandes entreprises |
| **1er sept. 2026** | E-reporting B2C + transactions internationales | ETI + GE |
| **1er sept. 2027** | Émission obligatoire au format structuré | PME + TPE (Facile inclus) |
| **1er sept. 2027** | E-reporting B2C + transactions internationales | PME + TPE |

**Implication pour Ardoise:** émission de factures vers Facile Studio (TPE) = échéance **1er septembre 2027**. Mais **réception** obligatoire dès sept. 2026 → si clients passent à l'électronique, Ardoise doit savoir les recevoir.

---

## Phase 1 — Conformité légale FR 2026 (BLOQUANT)

> Sans ces points, Ardoise ne peut PAS émettre de facture légale après 2027. Tout le reste passe après.

### 1.1 Format structuré Factur-X / CII

- [ ] Créer package `@repo/facturx` (wrapper TypeScript)
- [ ] Choisir une lib: évaluer [`@stackforge-eu/factur-x`](https://jsr.io/@stackforge-eu/factur-x) (JSR, validation XSD libxml2-wasm) vs [`@stafyniaksacha/facturx`](https://www.npmjs.com/package/@stafyniaksacha/facturx) (pdf-lib + libxmljs) vs [`e-invoice-eu`](https://github.com/gflohr/e-invoice-eu) (CLI + browser)
- [ ] Générer XML CII (UN/CEFACT Cross Industry Invoice) conforme EN 16931
- [ ] Embarquer XML dans PDF/A-3 (Factur-X = PDF lisible + XML machine attaché)
- [ ] Support profils Factur-X: `MINIMUM`, `BASIC WL`, `BASIC`, `EN 16931`, `EXTENDED`
- [ ] Support optionnel **UBL 2.1** (Peppol BIS Billing 3.0) pour interop EU
- [ ] Validation XSD côté serveur avant émission
- [ ] Tests unitaires sur 10+ factures réelles + validation [validator officiel](https://services.fnfe-mpe.org/)

**Impact code:**
- `packages/typst/src/templates/prestation.ts` → garder pour layout PDF, mais le PDF final passera par le pipeline Factur-X
- Nouveau service: `packages/facturx/src/generate.ts`
- Hook dans `packages/trpc/src/modules/payment/service.ts` à la création/finalisation d'une facture

### 1.2 Mentions légales obligatoires complètes

Article 242 nonies A CGI + Article L441-9 Code commerce:

- [ ] Ajouter champs Schema Prisma:
  - `Settings.tvaIntracom` (n° TVA intracom vendeur)
  - `Settings.legalForm` (SARL, SAS, EI, etc.)
  - `Settings.shareCapital` (capital social)
  - `Settings.rcsCity` (RCS + ville d'immatriculation)
  - `Client.tvaIntracom` (TVA intra acheteur, requis si UE)
  - `Document.deliveryDate` (date livraison/prestation distincte de la date facture)
  - `Document.paymentTermsDays` (délai paiement explicite en jours, 30 par défaut)
  - `Document.lateFeeRate` (taux pénalités retard, défaut: 3× taux légal BCE+10pts)
  - `Document.recoveryFee` (indemnité forfaitaire 40€, Art. L441-10 Ccom)
- [ ] Mettre à jour template Typst `prestation.ts` pour afficher tout ça
- [ ] Mention autoliquidation TVA si applicable (clients UE B2B avec TVA intra valide)
- [ ] Validation Zod stricte côté tRPC: refus création facture si mentions manquantes
- [ ] Numéro de facture: vérifier unicité + séquentialité (lock DB) — déjà partiellement OK via `nextInvoiceNumber`

### 1.3 TVA multi-taux + détail par ligne

- [ ] Refactorer `Document.items` (actuellement JSON non typé) → table `DocumentLine` typée:
  - `description`, `quantity`, `unitPrice`, `vatRate`, `vatAmount`, `discount`, `unit` (heure, jour, forfait...)
- [ ] Settings.tvaRate (Int unique) → `Settings.defaultVatRate` + support multi-taux par ligne (0%, 5.5%, 10%, 20%)
- [ ] Récap TVA par taux en pied de facture (obligatoire EN 16931)
- [ ] Gestion HT/TTC/exo (Art. 261, 262, 293B CGI)

### 1.4 Piste d'audit fiable (PAF)

Référence: [Piste Audit Fiable — guide DGFiP](https://facture-electronique-en-ligne.fr/blog/piste-audit-fiable-facture)

- [ ] Documenter PAF: lien commande → BL → facture → paiement (ajouter relations Prisma)
- [ ] Workflow: chaque facture doit pouvoir prouver l'enchaînement
- [ ] Procédure interne écrite (markdown dans `/docs/paf.md`)
- [ ] Tests automatisés vérifiant cohérence chaîne

### 1.5 Archivage à valeur probante (NF Z42-013 / Z42-020)

Référence: [NF Z42-013](https://logiciel-ged.net/glossaire/nf-z42-013/) — rétention 10 ans (Art. L123-22 Ccom)

- [ ] Champ `Document.retentionUntil` (createdAt + 10 ans)
- [ ] Champ `Document.pdfHash` (SHA-256 du PDF final, gel immédiat)
- [ ] Champ `Document.xmlHash` (SHA-256 du XML Factur-X)
- [ ] Champ `Document.signatureTimestamp` (horodatage qualifié — RFC 3161 TSA)
- [ ] Cron job vérifiant intégrité (recalcul hash, alerte si mismatch)
- [ ] Politique MinIO: objects en mode WORM (Write Once Read Many) pour les factures finalisées
- [ ] Option: coffre-fort numérique externe certifié NF Z42-020 (Docaposte, Arkhineo, Cecurity)
- [ ] Export "dossier d'audit" zip avec PDFs + XMLs + audit logs pour contrôle fiscal

### 1.6 Intégration Plateforme Agréée (PA, ex-PDP)

Référence: [Liste 113 PA immatriculées DGFiP](https://www.indy.fr/guide/facturation/electronique/liste-pdp-immatriculees/)

**Décision stratégique requise**: Ardoise devient-il **PA agréé** lui-même (gros chantier ~12-18 mois d'agrément DGFiP) ou se branche-t-il sur une PA tierce?

**Recommandation:** brancher une PA tierce dans un premier temps. Pistes à évaluer:
- Docaposte, Esker, Pennylane, Qonto, Tiime, Sellsy, Iopole — toutes immatriculées DGFiP

- [ ] Choisir PA partenaire (critères: API REST/AS4, prix, statuts cycle de vie, support Factur-X+UBL)
- [ ] Créer `packages/pa-client` — wrapper API de la PA choisie
- [ ] Endpoints attendus: `submitInvoice`, `getStatus`, `getDirectory` (annuaire SIRET), `webhook` pour statuts retour
- [ ] Gérer fallback temporaire vers **PPF** (Portail Public de Facturation) si PA indispo
- [ ] Documenter le contrat avec la PA dans `/docs/pa-integration.md`

### 1.7 Cycle de vie facture (statuts AFNOR XP Z12-012)

Référence: [Statuts cycle de vie](https://libeo.io/fiches-pratiques/statuts-cycle-vie-facture-electronique)

**4 statuts obligatoires DGFiP:**
- `DEPOSEE` — déposée sur la PA fournisseur
- `REJETEE` — refus technique (format invalide)
- `REFUSEE` — refus commercial par acheteur
- `ENCAISSEE` — paiement encaissé (remontée TVA CA3)

**Statuts recommandés AFNOR (utiles pour UX/process):**
- `MISE_A_DISPOSITION`, `PRISE_EN_CHARGE`, `APPROUVEE`, `EN_LITIGE`, `SUSPENDUE`, `PAIEMENT_TRANSMIS`...

- [ ] Refactor `PaymentStatus` actuel (PENDING/PAID/EXPIRED/CANCELLED) → nouveau enum `InvoiceLifecycleStatus` aligné AFNOR
- [ ] Garder `Payment.status` pour le statut paiement Stripe (orthogonal)
- [ ] Table `DocumentStatusHistory` (timestamp, statut, source, raw payload PA)
- [ ] Webhook handler pour statuts venant de la PA
- [ ] UI admin: timeline visuelle du cycle de vie facture

### 1.8 E-reporting (B2C + international)

- [ ] Détecter automatiquement le type de transaction:
  - B2B FR → e-invoicing (via PA)
  - B2C FR → e-reporting (récap transactions)
  - B2B/B2C UE/hors UE → e-reporting transactions internationales
  - Données paiement (encaissement) → e-reporting paiement
- [ ] Générer fichier e-reporting au format DGFiP (XML propriétaire, voir spécifications externes DGFiP v3.1)
- [ ] Périodicité: mensuelle (régime réel normal) ou trimestrielle (RSI)
- [ ] Soumission via PA ou PPF
- [ ] Dashboard admin: vue "e-reporting à transmettre"

### 1.9 Annuaire SIRET / validation acheteur

- [ ] Intégrer API INSEE Sirene (recherche/validation SIRET en temps réel) à la création client
- [ ] Vérifier que le SIRET acheteur est inscrit dans l'annuaire PPF (sinon, e-reporting obligatoire au lieu d'e-invoicing)
- [ ] Cache local de l'annuaire pour réduire la latence

---

## Phase 2 — Robustesse & Production-grade

### 2.1 Tests (urgent, actuellement: 0 test)

- [ ] Vitest unit tests sur tous les services tRPC
- [ ] Tests d'intégration avec base de test (testcontainers ou Prisma test env)
- [ ] Playwright E2E: parcours admin (création facture) + parcours client (paiement)
- [ ] Coverage tracking + CI gate à 70%
- [ ] Tests de conformité Factur-X: parser des factures générées et valider contre XSD officiel
- [ ] Tests de régression sur calculs TVA (Decimal.js partout, jamais Float)

### 2.2 Observabilité

- [ ] Sentry pour error tracking (backend + web)
- [ ] OpenTelemetry: traces distribuées backend ↔ tRPC ↔ Prisma ↔ Stripe ↔ PA
- [ ] Métriques Prometheus: latence tRPC, taux erreur Stripe, statuts factures
- [ ] Logs structurés avec correlation IDs (request → user → trace)
- [ ] Healthchecks enrichis (PA reachable? Stripe live? MinIO OK?)
- [ ] Dashboard Grafana ou équivalent

### 2.3 Sécurité

- [ ] 2FA (TOTP via `@otplib/preset-default`) — au moins pour les admins
- [ ] Rate limiting (sliding window, Redis-backed) sur `auth.login`, `auth.register`, endpoints publics
- [ ] CSP strict + HSTS + headers sécurité (helmet équivalent pour Hono)
- [ ] Chiffrement at-rest des données sensibles (IBAN, RIB clients) via `@repo/crypto`
- [ ] Rotation des secrets (JWT, API keys) documentée + scriptée
- [ ] Audit de sécurité externe avant mise en prod
- [ ] Conformité RGPD: export données utilisateur (Art. 15), suppression cascade (Art. 17), registre traitements

### 2.4 Infrastructure

- [ ] Redis: cache + rate limiting + sessions
- [ ] BullMQ pour jobs asynchrones (génération PDF/XML lourde, envoi PA, retry webhooks)
- [ ] Graceful shutdown (drain des requêtes en cours)
- [ ] Backups PostgreSQL automatisés + tests de restauration
- [ ] Migrations Prisma avec procédure de rollback documentée
- [ ] CDN pour assets statiques (logo client, PDFs téléchargeables)
- [ ] Monitoring uptime externe (Uptimerobot, BetterStack)

### 2.5 CI/CD & DevEx

- [ ] Renovate pour deps automatiques
- [ ] Changelog auto (changesets)
- [ ] Pre-commit hooks (Husky + lint-staged)
- [ ] Code generator Plop (`bun gen module`, `bun gen prisma-model`)
- [ ] Documentation OpenAPI/Swagger dérivée du tRPC router
- [ ] Environnement de staging iso-prod

---

## Phase 3 — Interconnexion Plume

> Plume = plateforme signature électronique de Facile (DocuSign-like, Go + SvelteKit, REST + webhooks HMAC-SHA256).

### 3.1 Ardoise → Plume (push)

- [ ] Créer `packages/plume-client` — wrapper REST API Plume
- [ ] Sur création d'un document Ardoise nécessitant signature (devis, contrat, facture avec acceptation):
  - Upload PDF vers Plume (`POST /documents`)
  - Ajouter signataires (`POST /documents/{id}/signers`)
  - Placer champs signature/date (`POST /documents/{id}/fields`)
  - Envoyer à signature
- [ ] Mapping `Document.type === 'CONTRAT' | 'DEVIS'` → workflow Plume automatique
- [ ] Stocker `Document.plumeId` pour traçabilité

### 3.2 Plume → Ardoise (webhooks)

Événements Plume disponibles: `document.{created,sent,completed,declined,deleted}`, `signer.{added,viewed,signed,declined,reminded}`

- [ ] Endpoint Ardoise `POST /webhooks/plume` avec vérification HMAC-SHA256
- [ ] `document.completed` → marquer devis accepté → générer facture automatiquement
- [ ] `signer.signed` → audit log + notification
- [ ] `signer.declined` → notification admin + statut document à `REFUSED`
- [ ] Rejouer / debug webhooks dans l'admin (table `PlumeWebhookEvent`)

### 3.3 Auth & identité partagée

- [ ] Plume supporte OIDC → Ardoise peut devenir IdP (ou les deux derrière un IdP commun: Keycloak, Zitadel, Authentik)
- [ ] Sync clients Ardoise ↔ users Plume (même email = même identité)
- [ ] SSO entre Ardoise et Plume

### 3.4 Signature qualifiée pour conformité légale

- [ ] Pour les factures: signature électronique avancée (eIDAS) via Plume = contribue à la PAF (piste audit fiable)
- [ ] Horodatage qualifié (TSA RFC 3161) sur les documents Plume → utilisable pour archivage probant Ardoise

### 3.5 UI unifiée

- [ ] Dans l'admin Ardoise, page client → onglet "Documents Plume" (liste signatures en cours/complétées)
- [ ] Dans Plume, lien vers facture Ardoise correspondante

---

## Phase 4 — Features produit

### 4.1 Devis (manquant actuellement)

- [ ] Modèle Prisma `Quote` (numérotation séquentielle séparée, ex: `DEV-2026-001`)
- [ ] Workflow: brouillon → envoyé → accepté/refusé → converti en facture
- [ ] Signature acceptation via Plume
- [ ] Template Typst dédié
- [ ] Durée de validité (30/60/90 jours)

### 4.2 Avoirs / Factures rectificatives

- [ ] Type `CREDIT_NOTE` dans Document
- [ ] Référence obligatoire à la facture d'origine
- [ ] Format Factur-X spécifique (type code 381 vs 380 pour facture)
- [ ] Workflow: créer avoir depuis une facture existante

### 4.3 Récurrence avancée

- [ ] `Payment.frequency` existe (ONE_TIME/MONTHLY/YEARLY) mais pas automatisé
- [ ] Cron job (BullMQ) générant factures récurrentes
- [ ] Mandats SEPA (prélèvement auto) via Stripe ou GoCardless
- [ ] Gestion fin d'abonnement / pause / changement de tarif

### 4.4 Comptabilité & exports

- [ ] Export FEC (Fichier Écritures Comptables) — format légal contrôle fiscal
- [ ] Export CSV/Excel ventilé par période, client, taux TVA
- [ ] Intégrations comptables: Pennylane, Qonto, Tiime, Dext
- [ ] Génération déclaration TVA (CA3) prête à recopier sur impots.gouv

### 4.5 Relances automatiques

- [ ] Workflow: J+7 (mail amical), J+15 (mail ferme), J+30 (mise en demeure)
- [ ] Templates configurables par client
- [ ] Pause/reprise relances
- [ ] Intégration signature mise en demeure via Plume (LRE — Lettre Recommandée Électronique)

### 4.6 Portail client enrichi

- [ ] Historique complet factures + devis + avoirs
- [ ] Téléchargement Factur-X (PDF+XML)
- [ ] Demande d'avoir / contestation depuis portail
- [ ] Paiement multi-factures groupé
- [ ] Mandat SEPA dématérialisé
- [ ] Espace documents (contrats Plume signés)

### 4.7 Multi-tenant (déjà au TODO)

- [ ] Table `Organization`, colonne `orgId` sur entités sensibles
- [ ] Middleware tRPC filtre auto par `orgId`
- [ ] RLS PostgreSQL en backup
- [ ] Permet à plusieurs structures Facile (ou tiers) d'utiliser la même instance
- [ ] Pricing/billing par organisation (Stripe Connect ou Subscriptions)

### 4.8 Notifications temps réel

- [ ] tRPC Subscriptions (WebSocket) pour:
  - Statuts cycle de vie facture (DEPOSEE → PRISE_EN_CHARGE → ENCAISSEE)
  - Webhooks Plume entrants
  - Paiements Stripe reçus
- [ ] Notifications push (Web Push API) pour admins

### 4.9 i18n élargie

- [ ] EN/FR déjà OK → ajouter ES, DE, IT pour clients UE
- [ ] Templates de facture multilingues
- [ ] Pluralization (intl-messageformat)

---

## Phase 5 — Stretch / Long terme

### 5.1 Devenir PA (Plateforme Agréée) DGFiP

- [ ] Étude de faisabilité (12-18 mois agrément, SOC 2, ISO 27001, audits)
- [ ] Implémenter **AS4 / Peppol** access point (transport ebMS3)
- [ ] Annuaire SMP/SML Peppol
- [ ] Tests conformité OpenPeppol
- [ ] Devient un produit Facile commercialisable, pas juste interne

### 5.2 IA & automatisation

- [ ] OCR factures fournisseurs entrantes (Mistral OCR, Tesseract, ou API spécialisée)
- [ ] Extraction auto des champs Factur-X depuis PDFs scannés
- [ ] Catégorisation comptable assistée
- [ ] Assistant IA dans l'admin (Claude / GPT) pour rédaction relances, analyse cash flow

### 5.3 Open Banking

- [ ] Intégration Bridge / Tink / Powens / GoCardless Bank Account Data
- [ ] Rapprochement bancaire automatique (matcher virements reçus avec factures)
- [ ] Cash flow forecast

### 5.4 Mobile

- [ ] App Expo (déjà au TODO du boilerplate)
- [ ] Création de facture rapide depuis mobile
- [ ] Scan QR sur facture papier pour paiement
- [ ] Notifications push paiements reçus

### 5.5 Marketplace add-ons

- [ ] Templates de facture vendables/partagés
- [ ] Connecteurs tiers (Notion, Slack, Discord, Google Drive)
- [ ] Plugin system propre (réutilise `@repo/hooks` du TODO)

---

## Références & documentation

### Réglementation FR

- [Service Public Entreprendre — facturation électronique](https://entreprendre.service-public.gouv.fr/actualites/A15683)
- [economie.gouv.fr — facturation électronique entreprises](https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises)
- [Bpifrance — réforme à anticiper 2026](https://conseil.bpifrance.fr/publications/facturation-electronique-obligatoire-un-tournant-digital-pour-les-entreprises-francaises)
- [Guide Victoris Avocat 2026](https://www.victorisavocat.com/blog/facturation-electronique-obligatoire-2026-guide-entreprises)
- [Guide Pennylane — réforme](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/reforme-facturation-electronique)
- [Spécifications externes DGFiP v3.1](https://www.impots.gouv.fr/) (octobre 2025)

### Formats techniques

- [Factur-X France 2026 guide](https://facturx-engine.github.io/facturx-engine/guides/france-2026.html)
- [UBL vs CII vs Factur-X comparaison](https://peppolvalidator.com/ubl-vs-cii-vs-factur-x)
- [Implementing Factur-X in TypeScript from scratch](https://earezki.com/ai-news/2026-04-20-factur-x-en-16931-from-scratch-pdf-a-3-cii-xml-in-nodejs-typescript/)
- [Lido — Factur-X format et outils](https://www.lido.app/fr/factur-x)
- [Invoice-X official standards](https://invoice-x.github.io/standards/)
- Norme **EN 16931** (norme européenne facturation électronique)

### Cycle de vie

- [Statuts AFNOR XP Z12-012](https://www.boutique.afnor.org/en-gb/standard/xp-z12012/invoice-message-formats-profiles-and-lifecycle-statuses-forming-the-minimum/fa300082/466440)
- [Libeo — 4 statuts obligatoires DGFiP](https://libeo.io/fiches-pratiques/statuts-cycle-vie-facture-electronique)
- [FactPulse — messages CDAR et cycle de vie](https://factpulse.fr/docs/article_cdar_cycle_vie/)

### Archivage probant

- [NF Z42-013 — Arhivix](https://arhivix.com/fr/blog/france-nf-z42-013-archivage-valeur-probante)
- [Axiocap — normes archivage probant](https://www.axiocap.com/en/blog/archivage-electronique-a-valeur-probante-les-normes-a-connaitre-nf-z42-013)
- [Piste Audit Fiable (PAF) — guide](https://facture-electronique-en-ligne.fr/blog/piste-audit-fiable-facture)

### PA / PDP & Peppol

- [Liste 113 PA immatriculées DGFiP (avril 2026)](https://www.indy.fr/guide/facturation/electronique/liste-pdp-immatriculees/)
- [Pennylane — liste 101 PA](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/liste-des-pdp)
- [Tool Advisor — comparatif 115 PA](https://tool-advisor.fr/logiciel-facturation/comparatif/liste-pa-plateforme-agree/)
- [Peppol AS4 specification](https://docs.peppol.eu/edelivery/as4/specification/)
- [Peppol 4-corner model](https://peppolvalidator.com/diagrams/four-corner-model)

### Librairies TypeScript candidates

- [`@stackforge-eu/factur-x`](https://jsr.io/@stackforge-eu/factur-x) — JSR, validation XSD libxml2-wasm
- [`@stafyniaksacha/facturx`](https://www.npmjs.com/package/@stafyniaksacha/facturx) — pdf-lib + libxmljs
- [`e-invoice-eu` (gflohr)](https://github.com/gflohr/e-invoice-eu) — CLI + browser, EN 16931, XRechnung

### Ressources communautaires

- [FNFE-MPE (Forum National Facture Électronique)](https://fnfe-mpe.org/ressources/) — validateur Factur-X officiel
- [eInvoicing in France — Commission européenne](https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/467108885/eInvoicing+in+France)

---

## Priorisation suggérée (ordre d'attaque)

0. **Immédiat:** Phase 0 (typecheck OOM, lint, `as any`, CI) → dev viable
1. **Q3 2026:** Phase 1.1 (Factur-X), 1.2 (mentions légales), 1.3 (TVA multi-taux) → permet de générer des factures conformes
2. **Q4 2026:** Phase 1.4 (PAF), 1.5 (archivage), 1.6 (choisir + brancher PA) → permet de les transmettre légalement
3. **Q1 2027:** Phase 1.7 (cycle de vie), 1.8 (e-reporting), 1.9 (annuaire) → boucle conformité bouclée
4. **Q1-Q2 2027:** Phase 2 (tests, observabilité, sécurité) en parallèle → prod sereine
5. **Q2 2027:** Phase 3 (Plume) → écosystème Facile cohérent
6. **Q3 2027+:** Phase 4 (features produit) une fois la conformité acquise
7. **2028+:** Phase 5 si Ardoise devient un produit commercialisable

> **Deadline absolue conformité PME/TPE: 1er septembre 2027.** Tout retard de la Phase 1 = facturation illégale.
