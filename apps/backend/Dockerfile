FROM oven/bun:1.3.7-alpine AS base

ARG TURBO_TOKEN
ARG TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN
ENV TURBO_TEAM=$TURBO_TEAM

FROM base AS deps
WORKDIR /app

COPY package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/admin/package.json ./packages/admin/
COPY packages/auth/package.json ./packages/auth/
COPY packages/auth-shared/package.json ./packages/auth-shared/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/database/package.json ./packages/database/
COPY packages/docuseal/package.json ./packages/docuseal/
COPY packages/env/package.json ./packages/env/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/logger/package.json ./packages/logger/
COPY packages/smtp/package.json ./packages/smtp/
COPY packages/storage/package.json ./packages/storage/
COPY packages/storage-client/package.json ./packages/storage-client/
COPY packages/stripe/package.json ./packages/stripe/
COPY packages/trpc/package.json ./packages/trpc/
COPY packages/trpc-client/package.json ./packages/trpc-client/
COPY packages/types/package.json ./packages/types/
COPY packages/typst/package.json ./packages/typst/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/

RUN bun install --no-frozen-lockfile --production

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN cd packages/database && bun run db:generate

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

COPY --from=builder --chown=backend:nodejs /app/apps/backend ./apps/backend
COPY --from=builder --chown=backend:nodejs /app/packages ./packages
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/package.json ./
COPY --from=builder --chown=backend:nodejs /app/turbo.json ./
COPY --chown=backend:nodejs scripts/docker-entrypoint.sh ./scripts/

RUN chmod +x ./scripts/docker-entrypoint.sh

USER backend

EXPOSE 3001

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["bun", "run", "apps/backend/src/index.ts"]
