#!/usr/bin/env bash

set -e

DB_NAME="${DB_NAME:-myapp}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_CONTAINER_NAME="${DB_CONTAINER_NAME:-monorepo-postgres}"

echo "🗄️  Starting PostgreSQL database for development..."
echo ""

if command -v docker &> /dev/null; then
  echo "🐳 Using Docker..."

  if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
      echo "✅ Database container is already running"
    else
      echo "🔄 Starting existing database container..."
      docker start "$DB_CONTAINER_NAME"
      echo "✅ Database container started"
    fi
  else
    echo "🚀 Creating new PostgreSQL container..."
    docker run -d \
      --name "$DB_CONTAINER_NAME" \
      -e POSTGRES_DB="$DB_NAME" \
      -e POSTGRES_USER="$DB_USER" \
      -e POSTGRES_PASSWORD="$DB_PASSWORD" \
      -p "$DB_PORT:5432" \
      postgres:16-alpine

    echo "⏳ Waiting for database to be ready..."
    sleep 3

    until docker exec "$DB_CONTAINER_NAME" pg_isready -U "$DB_USER" > /dev/null 2>&1; do
      echo "   Still waiting..."
      sleep 1
    done

    echo "✅ Database container created and ready"
  fi

  DB_HOST="localhost"

elif command -v pg_ctl &> /dev/null; then
  echo "🍺 Using local PostgreSQL installation..."

  if ! pg_isready -h localhost -p "$DB_PORT" &> /dev/null; then
    echo "⚠️  PostgreSQL is not running"
    echo "💡 Starting PostgreSQL service..."

    if command -v brew &> /dev/null && brew services list | grep -q "postgresql@"; then
      brew services start postgresql@16 || brew services start postgresql@15 || brew services start postgresql
    elif [ -f "/usr/local/var/postgres/postmaster.pid" ]; then
      pg_ctl -D /usr/local/var/postgres start
    elif [ -f "/opt/homebrew/var/postgres/postmaster.pid" ]; then
      pg_ctl -D /opt/homebrew/var/postgres start
    else
      echo "⚠️  Could not start PostgreSQL automatically"
      echo "📝 Please start PostgreSQL manually and run this script again"
      exit 1
    fi

    echo "⏳ Waiting for PostgreSQL to start..."
    sleep 2
  fi

  if pg_isready -h localhost -p "$DB_PORT" &> /dev/null; then
    echo "✅ PostgreSQL is running"
  else
    echo "❌ Failed to start PostgreSQL"
    exit 1
  fi

  if ! psql -h localhost -p "$DB_PORT" -U "$USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "📝 Creating database '$DB_NAME'..."
    createdb -h localhost -p "$DB_PORT" "$DB_NAME" 2>/dev/null || true
    echo "✅ Database created"
  else
    echo "✅ Database '$DB_NAME' already exists"
  fi

  DB_HOST="localhost"
  DB_USER="$USER"
  DB_PASSWORD=""

else
  echo "❌ Neither Docker nor PostgreSQL found"
  echo ""
  echo "Please install one of the following:"
  echo "  • Docker: https://www.docker.com/get-started"
  echo "  • PostgreSQL: brew install postgresql@16"
  exit 1
fi

echo ""
echo "📊 Database connection details:"
echo "   Host:     $DB_HOST"
echo "   Port:     $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User:     $DB_USER"
if [ -n "$DB_PASSWORD" ]; then
  echo "   Password: $DB_PASSWORD"
fi
echo ""
echo "🔗 Database URL:"
if [ -n "$DB_PASSWORD" ]; then
  DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
else
  DB_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
fi
echo "   $DB_URL"
echo ""
echo "💡 Database URL for .env files:"
echo "   DATABASE_URL=\"$DB_URL\""
echo ""

if [ ! -f "apps/backend/.env" ]; then
  echo "⚠️  apps/backend/.env not found. Creating from .env.example..."
  cp apps/backend/.env.example apps/backend/.env
fi

if [ ! -f "packages/database/.env" ]; then
  echo "⚠️  packages/database/.env not found. Creating from .env.example..."
  cp packages/database/.env.example packages/database/.env
fi

echo "📝 Updating DATABASE_URL in .env files..."
if command -v sed &> /dev/null; then
  sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" apps/backend/.env && rm apps/backend/.env.bak
  sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" packages/database/.env && rm packages/database/.env.bak
  echo "✅ Updated DATABASE_URL in apps/backend/.env and packages/database/.env"
else
  echo "⚠️  sed command not found, please update DATABASE_URL manually"
fi
echo ""
if command -v docker &> /dev/null; then
  echo "📝 To stop the database:"
  echo "   docker stop $DB_CONTAINER_NAME"
  echo ""
  echo "🗑️  To remove the database:"
  echo "   docker rm -f $DB_CONTAINER_NAME"
else
  echo "📝 To stop PostgreSQL:"
  echo "   brew services stop postgresql"
fi
