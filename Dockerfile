# ════════════════════════════════════════════════════════════════════
# Multi-stage Dockerfile — Precision Project Flow (Next.js 14 standalone)
#
# Stage 1: deps   — install all dependencies (cached layer)
# Stage 2: build  — compile the Next.js app (output: standalone)
# Stage 3: run    — minimal runtime: standalone server + static assets
#
# Railway detects this Dockerfile and skips Nixpacks entirely.
# ════════════════════════════════════════════════════════════════════

# ── Stage 1: dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy manifests first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── Stage 2: build ───────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (public only — never secrets).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

# ── Stage 3: runtime (minimal) ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Non-root user for safety.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone server + its bundled node_modules.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./

# Static assets + server pages required by the standalone server.
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/.next/server ./.next/server
COPY --from=build --chown=nextjs:nodejs /app/.next/BUILD_ID ./.next/BUILD_ID
COPY --from=build --chown=nextjs:nodejs /app/.next/routes-manifest.json ./.next/routes-manifest.json
COPY --from=build --chown=nextjs:nodejs /app/.next/required-server-files.json ./.next/required-server-files.json

# Public assets (favicon, images, etc.).
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]