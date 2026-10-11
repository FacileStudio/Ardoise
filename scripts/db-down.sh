#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

data_dir=".local/postgres/data"
pg_ctl_bin="$(mise which pg_ctl)"

if [ -d "$data_dir" ] && "$pg_ctl_bin" -D "$data_dir" status >/dev/null 2>&1; then
  "$pg_ctl_bin" -D "$data_dir" stop -m fast >/dev/null
  echo "stopped repo-local postgres"
else
  echo "repo-local postgres is not running"
fi
