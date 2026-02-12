FROM oven/bun:1.3.7-alpine AS base

FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/backoffice/package.json ./apps/backoffice/
COPY packages/admin/package.json ./packages/admin/
COPY packages/auth-shared/package.json ./packages/auth-shared/
COPY packages/database/package.json ./packages/database/
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

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN cd apps/backoffice && bun run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backoffice

COPY --from=builder --chown=backoffice:nodejs /app/apps/backoffice/build ./build
COPY --from=builder --chown=backoffice:nodejs /app/apps/backoffice/package.json ./package.json

USER backoffice

EXPOSE 3002

CMD ["node", "build"]
