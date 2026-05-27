# List all commands
default:
    @just --list

# Initialize project (install deps, generate Prisma, create DB, push schema)
init:
    bun install
    cd packages/database && bun run db:generate
    createdb ardoise || echo "Database 'ardoise' already exists"
    cd packages/database && DATABASE_URL="postgresql://user@localhost:5432/ardoise" bun run db:push --accept-data-loss
    @echo "✅ Project initialized!"
    @echo "📝 Next: Run 'just create-admin' to create admin user, then 'just dev'"

# Create admin user (admin@example.com / admin123456789) for local dev
# Note: Backend automatically creates admin on startup from env vars
create-admin:
    DATABASE_URL="postgresql://user@localhost:5432/ardoise" bun run scripts/create-admin.ts

# Generate Prisma client
generate:
    cd packages/database && bun run db:generate

# Push schema to database
push:
    cd packages/database && DATABASE_URL="postgresql://user@localhost:5432/ardoise" bun run db:push

# Open Prisma Studio
studio:
    cd packages/database && DATABASE_URL="postgresql://user@localhost:5432/ardoise" bun run db:studio

# Run development monorepo
dev:
    bun run dev

# Build the monorepo
build:
    bun run build

# Typecheck the codebase
typecheck:
    bun run typecheck

# Lint the codebase
lint:
    bun run lint

# Format with Prettier
format:
    bun run format

# Start Dev DB
db:
    ./scripts/start-db-dev.sh

# Reset Railway database (requires RAILWAY_DATABASE_URL env var)
reset-railway:
    @echo "⚠️  WARNING: This will delete ALL data in Railway database!"
    @echo "Make sure RAILWAY_DATABASE_URL is set correctly."
    @read -p "Continue? (yes/no): " confirm; \
    if [ "$$confirm" = "yes" ]; then \
        cd packages/database && DATABASE_URL="$$RAILWAY_DATABASE_URL" bun run prisma migrate reset --force; \
    else \
        echo "Aborted."; \
    fi
