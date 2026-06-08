# syntax=docker/dockerfile:1.7
# Production image for the Next.js app in a pnpm + Turborepo monorepo.
# Built via `turbo prune` so only `web` and its workspace dependencies ship.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# 1. Prune the monorepo to `web` + its dependencies (lockfile-aware).
FROM base AS pruner
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm dlx turbo@2.9.16 prune web --docker

# 2. Install dependencies (cached on the pruned lockfile) and copy sources.
FROM base AS installer
RUN apk add --no-cache libc6-compat
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .

# 3. Build the standalone server bundle.
FROM installer AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
RUN pnpm turbo run build --filter=web

# 3b. One-shot migrator: applies the pure-SQL migrations with the Node runner
# (no external binary). Reuses the installer layer — it already has `tsx`, `pg`,
# the migration files, and the runner under packages/db. Needs
# MIGRATION_DATABASE_URL (or DATABASE_URL) at run time — see the compose files.
FROM installer AS migrator
CMD ["pnpm", "--filter", "@workspace/db", "db:migrate"]

# 4. Minimal runtime image. (Migrations run from the `migrator` stage above —
# see the `migrator` service in the compose files — not from this image.)
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
