#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

data_root=".local/postgres"
data_dir="$data_root/data"
log_file="$data_root/postgres.log"
host="127.0.0.1"
port="5433"
user="postgres"
database="ardoise"
database_url="postgresql://postgres:postgres@${host}:${port}/${database}"

mkdir -p "$data_root"

initdb_bin="$(mise which initdb)"
pg_ctl_bin="$(mise which pg_ctl)"
pg_isready_bin="$(mise which pg_isready)"
psql_bin="$(mise which psql)"
createdb_bin="$(mise which createdb)"

if [ ! -s "$data_dir/PG_VERSION" ]; then
  echo "initializing postgres data directory at $data_dir"
  "$initdb_bin" -D "$data_dir" -U "$user" -A trust >/dev/null
fi

if "$pg_ctl_bin" -D "$data_dir" status >/dev/null 2>&1; then
  echo "postgres is already running on ${host}:${port}"
else
  echo "starting postgres on ${host}:${port}"
  "$pg_ctl_bin" -D "$data_dir" -l "$log_file" -o "-h ${host} -p ${port}" start >/dev/null
fi

echo "waiting for postgres to accept connections..."
until "$pg_isready_bin" -h "$host" -p "$port" -U "$user" -d postgres >/dev/null 2>&1; do
  sleep 1
done

if ! "$psql_bin" -h "$host" -p "$port" -U "$user" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${database}'" | grep -qx "1"; then
  "$createdb_bin" -h "$host" -p "$port" -U "$user" "$database"
fi

for env_file in apps/backend/.env packages/database/.env; do
  example_file="${env_file}.example"
  if [ ! -f "$env_file" ] && [ -f "$example_file" ]; then
    cp "$example_file" "$env_file"
  fi

  if [ -f "$env_file" ]; then
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=${database_url}|" "$env_file"
    rm -f "${env_file}.bak"
  fi
done

echo "postgres is ready: ${database_url}"
