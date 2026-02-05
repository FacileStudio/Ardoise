FROM oven/bun:1.3.7-alpine AS base

FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/auth-shared/package.json ./packages/auth-shared/
COPY packages/env/package.json ./packages/env/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/logger/package.json ./packages/logger/
COPY packages/storage-client/package.json ./packages/storage-client/
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

RUN bun run build --filter=@repo/frontend

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 frontend

COPY --from=builder --chown=frontend:nodejs /app/apps/frontend/build ./apps/frontend/build
COPY --from=builder --chown=frontend:nodejs /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder --chown=frontend:nodejs /app/packages ./packages
COPY --from=builder --chown=frontend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=frontend:nodejs /app/package.json ./

USER frontend

EXPOSE 3000

CMD ["bun", "run", "apps/frontend/build"]
