#!/bin/sh
set -e

echo "Running database migrations..."
cd packages/database && bun run db:migrate:deploy

echo "Starting application..."
exec "$@"
