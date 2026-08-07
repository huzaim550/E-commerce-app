# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- deps
FROM node:22-alpine AS deps
WORKDIR /app

# Prisma's engines need OpenSSL on Alpine.
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------- build
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The Prisma client is generated TypeScript under src/, so it must exist
# before `next build` typechecks anything.
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined at build time. Supply it here so metadata,
# sitemap and OpenGraph URLs are absolute in the built image.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

# The runtime image has no dev dependencies, so `tsx` isn't available to run
# the TypeScript seed. Bundle it to plain JS here instead.
RUN npx esbuild prisma/seed.ts \
      --bundle --platform=node --format=cjs --packages=external \
      --outfile=prisma/seed.js

# ---------------------------------------------------------------- runtime
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `output: "standalone"` emits a minimal server plus only the modules it needs.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migrations run on boot, so the CLI, schema and config have to ship too.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg ./node_modules/pg

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Default location for the `local` storage driver; mount a volume here.
RUN mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
