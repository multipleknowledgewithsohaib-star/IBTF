#!/bin/sh
set -eu
pnpm db:migrate:local
pnpm db:seed:local
PORT="${PORT:-8787}"
exec pnpm dev -- --host 0.0.0.0 --port "$PORT"
