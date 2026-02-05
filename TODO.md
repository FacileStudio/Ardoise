# Todo Boilerplate Monorepo

## Critiques (À faire rapidement)

### Sécurité & Architecture
- [ ] **URGENT** : Retirer `@repo/trpc` des dépendances de frontend/backoffice/mobile (violation server/client boundary)
- [x] **FIXED** : Custom auth system implemented, better-auth removed
- [ ] Uniformiser les versions de Svelte sur 5.x partout (actuellement mélange 4.x et 5.x)
- [ ] Uniformiser les versions de Zod sur 3.x partout (actuellement ^3.23.8, ^3.24.0, et ^4.3.6 invalide)
- [x] TypeScript configuration standardized across all packages

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
- [ ] Export données utilisateur (GDPR Article 15)
- [ ] Delete account cascade (GDPR "Right to be forgotten")
- [ ] Cookie consent manager

## Architecture & Patterns

### Multi-Tenant (SaaS Ready)
- [ ] Ajouter table `Organization` dans Prisma
- [ ] Ajouter colonne `orgId` sur entités sensibles
- [ ] Middleware tRPC qui filtre auto par `orgId` selon session user
- [ ] Row-Level Security (RLS) pour PostgreSQL

### Event System
- [ ] Créer `@repo/hooks` - système événementiel découplé (type WordPress/Shopify)
- [ ] Hook registry avec `hooks.on()` et `hooks.execute()`
- [ ] Events standard: `user:created`, `user:deleted`, `order:completed`, etc.
- [ ] Documentation des hooks disponibles

### Feature Flags
- [ ] Créer `@repo/feature-flags` package
- [ ] Toggle features par environnement
- [ ] Rollout progressif (% users)
- [ ] A/B testing support
- [ ] Intégration LaunchDarkly/Unleash (optionnel)

## Infrastructure

### Caching & Performance
- [ ] Redis integration pour cache
- [ ] Redis pour rate limiting
- [ ] Redis pour sessions (optionnel)
- [ ] Query caching layer pour Prisma
- [ ] Read replicas pour queries lourdes

### Database
- [ ] Database Seeder intelligent avec Faker.js (`bun db:seed --model Product --count 500`)
- [ ] Prisma query analyzer (detect N+1)
- [ ] Auto-indexing suggestions
- [ ] Migration vers PostgreSQL avec connection pooling

### CDN & Edge
- [ ] Images sur S3 + CloudFront/Cloudflare
- [ ] Edge caching pour API reads (Cloudflare Workers)
- [ ] Geo-distributed assets pour latence minimale

### Monitoring & Ops
- [ ] Cron Jobs (BullMQ ou node-cron)
- [x] AuditLogs (qui a fait quoi et quand)
- [x] Healthcheck endpoints (`/health`, `/ready`, `/liveness`) with DB, Storage, and Stripe checks
- [ ] Graceful shutdown (finir requêtes en cours avant kill)
- [x] Logger structuré (@repo/logger avec Pino)
- [ ] Log correlation IDs (tracer requête à travers services)
- [ ] Contexte auto dans logs (userId, orgId, traceId)
- [ ] Log sampling en prod (éviter flood)
- [ ] Sentry/Error tracking integration
- [ ] OpenTelemetry (tracing distribué + custom metrics)
- [ ] Métriques Prometheus/DataDog (signup rate, API latency, etc.)

## Security

### Rate Limiting
- [ ] Rate limiting avancé par IP, user, et endpoint
- [ ] Sliding window algorithm (plus précis que fixed window)
- [ ] Redis-backed pour distribution multi-instance
- [ ] Different limits selon plan user (free vs premium)

### Headers & Policies
- [ ] Content Security Policy (CSP) strict
- [ ] HSTS headers
- [ ] X-Frame-Options
- [ ] Permissions-Policy
- [ ] CORS configuration stricte

### GDPR Compliance
- [x] Audit log de toutes actions admin
- [ ] Export données user complet (JSON/CSV)
- [ ] Anonymisation des données après suppression
- [ ] Cookie consent manager
- [ ] Privacy policy generator

## DevEx & Quality

### Tooling
- [x] ESLint setup pour tout le monorepo (@repo/eslint-config avec TypeScript support)
- [x] Prettier setup (.prettierrc avec single quotes, trailing commas, etc.)
- [ ] Config Centralisée `@repo/config` (ESLint, Prettier, Tailwind tokens, constantes)
- [ ] Code Generator avec Plop (`bun gen module`, `bun gen trpc-router`, `bun gen cron`)
- [ ] Pre-commit hooks (Husky + lint-staged)

### Testing
- [ ] Tests unitaires (Vitest)
- [ ] Tests E2E (Playwright)
- [ ] Test coverage tracking
- [ ] Visual regression tests (Percy/Chromatic)

### CI/CD
- [x] CI/CD pipeline (GitHub Actions avec lint, typecheck, build, deploy, Docker workflows)
- [x] TypeScript strict mode avec typecheck standardisé sur tout le monorepo
- [ ] Automatic dependency updates (Renovate/Dependabot)
- [ ] Semantic versioning automation
- [ ] Changelog generation automatique

## UI/UX Features

### Components
- [x] Command Palette Component (Cmd+K avec search, keyboard navigation, command registry)
- [ ] Stylable AutoForms (basé sur Zod schema)
- [x] AutoTable avec pagination/tri/filtres/CSV export
- [x] Toast/Notification system universel (toastStore + ToastContainer avec 4 types)
- [ ] Charts/Graphiques réutilisables (Chart.js ou Recharts)
- [ ] File uploader avec drag & drop et progress
- [ ] Rich text editor (TipTap)
- [ ] Date picker avancé avec time zones

### i18n
- [x] i18n complète sur mobile (useI18n() hook pour React Native + Svelte store pour web)
- [x] Support en/fr avec type-safety et interpolation
- [ ] Ajouter locales supplémentaires (es, de, it, pt, etc.)
- [ ] Extraction automatique de clés de traduction
- [ ] Traduction dynamique via admin panel
- [ ] Pluralization support

### Themes
- [ ] Dark mode / Light mode toggle
- [ ] Custom theme builder
- [ ] Thème Tailwind tokens centralisés dans `@repo/config`

## Advanced Features

### Admin Engine
- [ ] Zod Prisma Generator
- [x] AdminEngine universel avec autoform + autotable sur endpoint `/admin/[entity]`
- [x] Permissions granulaires par entité (canCreate, canRead, canUpdate, canDelete)
- [x] Audit log automatique sur mutations admin (avec IP, user agent, changes JSON)
- [ ] Bulk operations (delete multiple, update multiple)
- [ ] Import/Export CSV pour toutes les entités

### Webhooks
- [ ] Créer `@repo/webhooks` package
- [ ] User configure URL webhook dans settings
- [ ] POST événements (ex: `order.created`, `user.updated`)
- [ ] Retry logic avec exponential backoff
- [ ] Webhook signature (HMAC) pour sécurité
- [ ] Webhook logs et monitoring
- [ ] Test webhook avec payload examples

### File Processing
- [ ] Queue jobs avec BullMQ (resize images, scan virus, OCR PDF)
- [ ] Progress tracking côté client (WebSocket ou polling)
- [ ] Support batch upload
- [ ] Thumbnail generation automatique
- [ ] Image optimization (WebP conversion)
- [ ] Virus scanning (ClamAV)

### Real-time
- [ ] tRPC Subscriptions pour real-time updates
- [ ] WebSocket server setup
- [ ] Notifications push (Server-Sent Events)
- [ ] Présence utilisateur ("Bob is typing...")
- [ ] Live cursors/collaboration features

### API
- [ ] Swagger/OpenAPI pour tRPC (tRPC OpenAPI)
- [ ] API rate limiting par token
- [ ] API versioning strategy
- [ ] GraphQL endpoint (optionnel)

## Mobile-Specific

### Expo & React Native
- [ ] OTA Updates avec Expo EAS
- [ ] Push fix bugs sans revalidation Apple
- [ ] Rollback automatique si update cassé
- [ ] Phased rollouts (10% → 50% → 100%)
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Deep linking configuration
- [ ] App icons et splash screens

### Offline-First
- [ ] Cache tRPC avec `@tanstack/query` + persistence
- [ ] Conflict resolution (Optimistic UI + retry queue)
- [ ] Sync queue pour mutations offline
- [ ] Offline indicator dans UI
- [ ] Background sync quand connexion revient

## Documentation

### Developer Docs
- [ ] Swagger/OpenAPI pour tRPC (tRPC OpenAPI)
- [ ] Storybook pour @repo/ui
- [ ] Guide de contribution (CONTRIBUTING.md)
- [ ] Architecture Decision Records (ADR)
- [ ] Database schema documentation
- [ ] API documentation complète

### User Docs
- [ ] User guides et tutorials
- [ ] FAQ section
- [ ] Video tutorials
- [ ] Help center / Knowledge base

## Performance

### Optimization
- [ ] Bundle size analysis et optimization
- [ ] Code splitting stratégique
- [ ] Lazy loading pour routes et composants
- [ ] Image lazy loading
- [ ] Prefetching pour navigation rapide

### Monitoring
- [ ] Lighthouse CI dans pipeline
- [ ] Core Web Vitals tracking
- [ ] Performance budgets
- [ ] Real User Monitoring (RUM)
