# List all commands
default:
    @just --list

# Initialize project (install deps, generate Prisma, create DB, push schema)
init:
    bun install
    cd packages/database && bun run db:generate
    createdb charles || echo "Database 'charles' already exists"
    cd packages/database && DATABASE_URL="postgresql://fangafunk@localhost:5432/charles" bun run db:push --accept-data-loss
    @echo "✅ Project initialized!"
    @echo "📝 Next: Run 'just create-admin' to create admin user, then 'just dev'"

# Create admin user (yann@facile.studio / testcaca123) for local dev
# Note: Backend automatically creates admin on startup from env vars
create-admin:
    DATABASE_URL="postgresql://fangafunk@localhost:5432/charles" bun run scripts/create-admin.ts

# Generate Prisma client
generate:
    cd packages/database && bun run db:generate

# Push schema to database
push:
    cd packages/database && DATABASE_URL="postgresql://fangafunk@localhost:5432/charles" bun run db:push

# Open Prisma Studio
studio:
    cd packages/database && DATABASE_URL="postgresql://fangafunk@localhost:5432/charles" bun run db:studio

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

# Run MinIO server
minio:
    ./scripts/start-minio.sh

# Configure MinIO server
config-minio:
    ./scripts/alias-minio.sh
    ./scripts/allow-minio.sh

# Start Dev DB
db:
    ./scripts/start-db-dev.sh
