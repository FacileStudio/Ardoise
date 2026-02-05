FROM oven/bun:1.3.7-alpine AS base

FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/backoffice/package.json ./apps/backoffice/
COPY packages/admin/package.json ./packages/admin/
COPY packages/auth-shared/package.json ./packages/auth-shared/
COPY packages/env/package.json ./packages/env/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/logger/package.json ./packages/logger/
COPY packages/trpc-client/package.json ./packages/trpc-client/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/tsconfig/package.json ./packages/tsconfig/

RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG PUBLIC_BACKEND_URL
ENV PUBLIC_BACKEND_URL=$PUBLIC_BACKEND_URL

RUN bun run build --filter=@repo/backoffice

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backoffice

COPY --from=builder --chown=backoffice:nodejs /app/apps/backoffice/build ./apps/backoffice/build
COPY --from=builder --chown=backoffice:nodejs /app/apps/backoffice/package.json ./apps/backoffice/
COPY --from=builder --chown=backoffice:nodejs /app/packages ./packages
COPY --from=builder --chown=backoffice:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backoffice:nodejs /app/package.json ./

USER backoffice

EXPOSE 3000

CMD ["bun", "run", "apps/backoffice/build"]
