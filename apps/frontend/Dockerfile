FROM oven/bun:1.3.7-alpine AS base

FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/admin/package.json ./packages/admin/
COPY packages/auth-shared/package.json ./packages/auth-shared/
COPY packages/database/package.json ./packages/database/
COPY packages/env/package.json ./packages/env/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/logger/package.json ./packages/logger/
COPY packages/storage-client/package.json ./packages/storage-client/
COPY packages/trpc/package.json ./packages/trpc/
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

ARG VITE_API_URL
ARG PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN cd apps/frontend && bun run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 frontend

COPY --from=builder --chown=frontend:nodejs /app/apps/frontend/build ./build
COPY --from=builder --chown=frontend:nodejs /app/apps/frontend/package.json ./package.json

USER frontend

EXPOSE 3000

CMD ["node", "build"]
