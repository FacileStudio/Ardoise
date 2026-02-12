# Charles - Guide de démarrage rapide

## Prérequis

- **Bun** >= 1.3.7
- **PostgreSQL** >= 14
- **Just** (task runner)
- **MinIO** (optionnel, pour le stockage de fichiers)

## Installation rapide

```bash
# 1. Initialiser le projet (install, generate, createdb, push schema)
just init

# 2. Créer le compte admin (yann@facile.studio / testcaca123)
just create-admin

# 3. Démarrer tous les serveurs
just dev
```

Voilà ! L'application est prête à l'adresse :
- **Frontend** : http://localhost:5173
- **Backend** : http://localhost:3001
- **Backoffice** : http://localhost:3002

## Compte admin par défaut

**Email :** yann@facile.studio
**Mot de passe :** testcaca123

Connectez-vous au backoffice pour accéder à l'administration.

## Configuration détaillée

### Variables d'environnement

Les fichiers `.env` sont déjà configurés avec des valeurs par défaut pour le développement local.

#### Backend (`apps/backend/.env`)
```env
DATABASE_URL="postgresql://fangafunk@localhost:5432/charles"
ENCRYPTION_SECRET=<votre-clé-32-caractères-minimum>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173
PORT=3001
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET_NAME=my-app-bucket
TRUSTED_ORIGINS=http://localhost:5173,http://localhost:3001,http://localhost:3002
```

#### Frontend (`apps/frontend/.env`)
```env
PORT=5173
VITE_API_URL=http://localhost:3001
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
PUBLIC_STRIPE_PRICE_ID=price_...
```

### Commandes disponibles

```bash
just                  # Liste toutes les commandes
just init             # Installation complète du projet
just create-admin     # Créer le compte admin
just dev              # Lancer tous les serveurs
just backend          # Lancer uniquement le backend
just frontend         # Lancer uniquement le frontend
just backoffice       # Lancer uniquement le backoffice
just generate         # Générer le client Prisma
just push             # Push le schéma vers la DB
just studio           # Ouvrir Prisma Studio
just typecheck        # Vérifier les types TypeScript
just lint             # Linter le code
just format           # Formater avec Prettier
just build            # Build pour la production
```

## Architecture

### Frontend (port 5173)
- **Landing page** : Présentation de Charles
- **Dashboard client** : `/app` - Liste des factures à payer
- **Page de paiement** : `/app/payment/[id]` - Paiement Stripe sécurisé
- **Profil** : `/app/profile` - Gestion du profil utilisateur

### Backoffice (port 3002)
- **Clients** : `/admin/clients` - Gestion des clients (CRUD)
- **Paiements** : `/admin/payments` - Création et suivi des paiements
- **Paramètres** : `/admin/settings` - Configuration entreprise, logo, TVA
- **Statistiques** : `/admin/statistics` - Dashboard de stats
- **Utilisateurs** : `/admin/users` - Gestion des utilisateurs

### Backend (port 3001)
Serveur Hono avec tRPC exposant :
- `/trpc/*` - API tRPC
- `/webhook` - Webhooks Stripe

**Modules tRPC :**
- `auth` - Authentification (login, register)
- `user` - Gestion utilisateurs
- `client` - CRUD clients
- `payment` - CRUD paiements + Stripe
- `settings` - Configuration globale
- `media` - Upload fichiers S3/MinIO
- `admin` - Administration
- `document` - Génération documents (Typst)

## Base de données

### Schémas principaux

- **User** - Utilisateurs et admins
- **Client** - Clients avec infos de facturation
- **Payment** - Factures et paiements
- **Settings** - Configuration entreprise globale
- **Media** - Fichiers uploadés (avatars, logos)

### Migrations

```bash
# Push schema en dev (sans migration)
just push

# Créer une migration
cd packages/database && bun run db:migrate:dev --name <nom>

# Appliquer les migrations (prod)
cd packages/database && bun run db:migrate:deploy

# Reset complet (⚠️ supprime toutes les données)
cd packages/database && bunx prisma migrate reset --force
```

## Stripe

Pour tester les paiements en développement :

1. Créer un compte Stripe (mode test)
2. Copier les clés API dans `apps/backend/.env` et `apps/frontend/.env`
3. Installer Stripe CLI : `brew install stripe/stripe-cli/stripe`
4. Se connecter : `stripe login`
5. Écouter les webhooks : `stripe listen --forward-to localhost:3001/webhook`
6. Copier le webhook secret dans `STRIPE_WEBHOOK_SECRET`

**Cartes de test :**
- Succès : `4242 4242 4242 4242`
- Échec : `4000 0000 0000 0002`

## Développement

### Ajouter une nouvelle page au backoffice

1. Créer le fichier : `apps/backoffice/src/routes/admin/ma-page/+page.svelte`
2. Ajouter au menu dans `apps/backoffice/src/routes/admin/+layout.svelte`

### Ajouter un module tRPC

1. Créer `packages/trpc/src/modules/mon-module/router.ts`
2. Créer `packages/trpc/src/modules/mon-module/service.ts`
3. Importer et ajouter au `appRouter` dans `packages/trpc/src/index.ts`

### Ajouter un modèle Prisma

1. Créer `packages/database/prisma/schema/mon-modele.prisma`
2. Définir le modèle
3. `just push` pour mettre à jour la DB

## Dépannage

### Le frontend ne charge pas
```bash
# Vérifier que le backend est lancé
curl http://localhost:3001/trpc/auth.login

# Redémarrer avec cache clean
rm -rf apps/frontend/.svelte-kit
just dev
```

### Erreurs de base de données
```bash
# Vérifier que PostgreSQL tourne
psql -d charles -c "SELECT 1"

# Recréer la DB
dropdb charles
just init
```

### Le compte admin ne fonctionne pas
```bash
# Recréer l'admin
just create-admin
```

## Production

```bash
# Build
just build

# Les artifacts sont dans :
# - apps/backend/dist
# - apps/frontend/build
# - apps/backoffice/build

# Variables d'environnement en production
# Voir apps/*/. env.example pour la liste complète
```

## Support

Pour toute question, contacter l'équipe de développement.

---

**Version :** 1.0.0
**Dernière mise à jour :** 2026-02-12
