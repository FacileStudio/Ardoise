# Todo Boilerplate Monorepo

## Critiques (À faire rapidement)

### Sécurité & Architecture
- [ ] **URGENT** : Retirer `@repo/trpc` des dépendances de frontend/backoffice/mobile (violation server/client boundary)
- [ ] **URGENT** : Retirer `better-auth` de tous les packages (package inutilisé, reliquat de l'ancien système)
- [ ] Uniformiser les versions de Svelte sur 5.x partout (actuellement mélange 4.x et 5.x)
- [ ] Uniformiser les versions de Zod sur 3.x partout (actuellement ^3.23.8, ^3.24.0, et ^4.3.6 invalide)

## Features Core

### Stripe
- [ ] Requêtes marketplace (Connect API)
- [ ] Fix URLs de redirection cancel/success
- [ ] Définir URLs de redirection dans l'env

### Mail
- [ ] Email Service (Resend/SendGrid/Postmark)
- [ ] Vérification email lors de l'inscription
- [ ] Réinitialisation mot de passe par email
- [ ] Templates email réutilisables (React Email)

### Auth
- [ ] A2F (TOTP avec `@otplib/preset-default`)
- [ ] Google OAuth
- [ ] Github OAuth
- [ ] Rate limiting sur login/register

### Encryption
- [ ] Chiffrer données sensibles au repos (utiliser `@repo/crypto`)

### Backoffice
- [ ] Modération utilisateurs (ban/unban, delete account)

## Infrastructure

### Caching & Performance
- [ ] Redis integration pour cache
- [ ] Redis pour rate limiting
- [ ] Redis pour sessions (optionnel)

### Monitoring & Ops
- [ ] Cron Jobs (BullMQ ou node-cron)
- [x] AuditLogs (qui a fait quoi et quand)
- [ ] Healthcheck endpoints (`/health`, `/ready`)
- [x] Logger structuré (@repo/logger avec Pino, request ID tracking, context injection, error interceptor)
- [ ] Sentry/Error tracking
- [ ] Métriques (Prometheus ou DataDog)

### DevEx & Quality
- [ ] ESLint setup pour tout le monorepo
- [x] Prettier setup (.prettierrc avec single quotes, trailing commas, etc.)
- [ ] Tests unitaires (Vitest)
- [ ] Tests E2E (Playwright)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Pre-commit hooks (Husky + lint-staged)

## UI/UX Features

### Components
- [x] Command Palette Component (Cmd+K avec search, keyboard navigation, command registry)
- [ ] Stylable AutoForms (basé sur Zod schema)
- [x] AutoTable avec pagination/tri/filtres/CSV export
- [x] Toast/Notification system universel (toastStore + ToastContainer avec 4 types)

### i18n
- [x] i18n complète sur mobile (useI18n() hook pour React Native + Svelte store pour web)
- [x] Support en/fr avec type-safety et interpolation
- [ ] Ajouter locales supplémentaires (es, de, etc.)
- [ ] Extraction automatique de clés de traduction

## Advanced Features

### Admin Engine
- [ ] Zod Prisma Generator
- [x] AdminEngine universel avec autoform + autotable sur endpoint `/admin/[entity]`
- [x] Permissions granulaires par entité (canCreate, canRead, canUpdate, canDelete)
- [x] Audit log automatique sur mutations admin (avec IP, user agent, changes JSON)

### Documentation
- [ ] Swagger/OpenAPI pour tRPC (tRPC OpenAPI)
- [ ] Storybook pour @repo/ui
- [ ] Guide de contribution (CONTRIBUTING.md)
- [ ] Architecture Decision Records (ADR)


---

## Suggestions Claude

### Architecture & Patterns

#### 1. Multi-Tenant Ready (Architecture SaaS)
Prépare ton boilerplate pour le SaaS B2B :
- Ajouter table `Organization` dans Prisma
- Ajouter colonne `orgId` sur entités sensibles
- Middleware tRPC qui filtre auto par `orgId` selon session user
- Row-Level Security (RLS) pour PostgreSQL si migration depuis SQLite

**Bénéfice** : Transformer n'importe quel projet en SaaS multi-client sans refonte

#### 2. Event Hooks System (`@repo/hooks`)
Système événementiel découplé type WordPress/Shopify :
```typescript
// Dans ton code
hooks.execute('user:deleted', { userId });

// Ailleurs, dans un plugin
hooks.on('user:deleted', async ({ userId }) => {
  await storage.deleteUserFiles(userId);
  await slack.notify(`User ${userId} deleted`);
});
```

**Bénéfice** : Code totalement modulaire, ajout de features sans toucher au core

#### 3. Feature Flags (`@repo/feature-flags`)
Système de toggles pour déploiements progressifs :
- Toggle features par environnement
- Rollout progressif (% users)
- A/B testing ready
- Intégration avec LaunchDarkly/Unleash ou version custom

**Bénéfice** : Déployer en prod avec features désactivées, activer graduellement

### DevEx & Tooling

#### 4. Database Seeder Intelligent (`packages/database/seed`)
Seeder pilotable avec Faker.js :
```bash
bun db:seed --model Product --count 500
bun db:seed --all --realistic
```

**Bénéfice** : Tester AutoTable, pagination, performance avec vraies données

#### 5. Config Centralisée (`@repo/config`)
Package unique pour :
- Règles ESLint partagées
- Config Prettier
- Thème Tailwind (tokens de couleurs, spacing)
- Constantes app-wide (MAX_FILE_SIZE, etc.)

**Bénéfice** : Modifier thème/règles à un seul endroit pour tout le monorepo

#### 6. Code Generator (`plop` ou custom CLI)
Générateurs interactifs :
```bash
bun gen module user-notifications
bun gen trpc-router analytics
bun gen cron cleanup-old-files
```

**Bénéfice** : Réduire le boilerplate, conventions cohérentes

### Production & Monitoring

#### 7. Structured Logging Universel
Étendre `pino` à tous les packages :
- Log correlation IDs (tracer requête à travers services)
- Contexte auto (userId, orgId, traceId)
- Log sampling en prod (éviter flood)
- JSON structured logs pour parsing Grafana/Loki

**Bénéfice** : Debug production facilité, analytics sur logs

#### 8. OpenTelemetry (Traces & Métriques)
Observabilité complète :
- Tracing distribué (voir latence par procedure tRPC)
- Custom metrics (signup rate, API latency, etc.)
- Integration Grafana/Prometheus

**Bénéfice** : Identifier bottlenecks performance en prod

#### 9. Graceful Shutdown & Health Checks
- `/health` : Liveness probe (app alive?)
- `/ready` : Readiness probe (DB connectée? Redis up?)
- Graceful shutdown (finir requêtes en cours avant kill)

**Bénéfice** : Zero-downtime deployments avec Kubernetes/Railway

### Security & Compliance

#### 10. Rate Limiting Avancé
Au-delà du simple rate limit :
- Par IP, par user, par endpoint
- Sliding window algorithm (plus précis que fixed window)
- Redis-backed pour distribution multi-instance
- Different limits selon plan user (free vs premium)

**Bénéfice** : Protection DDoS, abuse prevention

#### 11. GDPR Compliance Tools
Features pour conformité :
- Export données user (GDPR Article 15)
- Delete account cascade (GDPR "Right to be forgotten")
- Audit log de toutes actions admin
- Cookie consent manager

**Bénéfice** : Déploiement Europe facilité

#### 12. Content Security Policy (CSP) Headers
Headers sécurité :
- CSP strict
- HSTS
- X-Frame-Options
- Permissions-Policy

**Bénéfice** : Protection XSS, clickjacking, etc.

### Advanced Features

#### 13. Webhooks Sortants (`@repo/webhooks`)
Système pour permettre aux users de s'abonner à événements :
- User configure URL webhook
- Ton app POSTe événements (ex: `order.created`)
- Retry logic avec exponential backoff
- Webhook signature (HMAC)

**Bénéfice** : Intégrations tierces type Zapier/Make

#### 14. File Processing Pipeline
Pour upload fichiers :
- Queue jobs (BullMQ) : resize images, scan virus, OCR PDF
- Progress tracking côté client
- Support batch upload
- Thumbnail generation auto

**Bénéfice** : UX async, pas de timeout sur gros fichiers

#### 15. Real-time avec WebSockets
Au-delà du simple tRPC :
- tRPC Subscriptions pour real-time
- Notifications push (Server-Sent Events ou WebSocket)
- Présence utilisateur ("Bob is typing...")

**Bénéfice** : Apps collaboratives (chat, dashboards live)

### Mobile-Specific

#### 16. OTA Updates (Expo EAS)
Config Expo pour updates sans App Store review :
- Push fix bugs sans revalidation Apple
- Rollback si update cassé
- Phased rollouts

**Bénéfice** : Itérer plus vite sur mobile

#### 17. Offline-First Architecture
Pour mobile :
- Cache tRPC avec `@tanstack/query` + persistence
- Conflict resolution (Optimistic UI + retry)
- Sync queue pour mutations offline

**Bénéfice** : App utilisable sans réseau

### Performance

#### 18. Edge Functions pour Static Assets
Déployer assets sur CDN :
- Images sur S3 + CloudFront/Cloudflare
- Edge caching pour API reads (Cloudflare Workers)
- Geo-distributed pour latence minimale

**Bénéfice** : Perf globale, réduire coût bande passante

#### 19. Database Query Optimization
Tooling pour performance DB :
- Prisma query analyzer (detect N+1)
- Auto-indexing suggestions
- Query caching layer (Redis)
- Read replicas pour queries lourdes

**Bénéfice** : Scale à des millions de rows
