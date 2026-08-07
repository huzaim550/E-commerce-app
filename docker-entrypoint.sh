#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL is not set." >&2
  exit 1
fi

if [ -z "$AUTH_SECRET" ]; then
  echo "FATAL: AUTH_SECRET is not set. Generate one with: openssl rand -base64 32" >&2
  exit 1
fi

echo "→ Applying database migrations…"
npx prisma migrate deploy

# Opt-in so a redeploy never silently rewrites a live catalogue. The seed is
# idempotent (upserts), so re-running it is safe but pointless.
if [ "$SEED_ON_START" = "true" ]; then
  echo "→ Seeding demo data…"
  node prisma/seed.js || echo "  (seed skipped or already applied)"
fi

echo "→ Starting server on port ${PORT:-3000}"
exec "$@"
