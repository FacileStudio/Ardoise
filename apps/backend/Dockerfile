FROM oven/bun:1.3.7-alpine AS base

FROM base AS builder
WORKDIR /app

COPY . .

RUN bun install --no-frozen-lockfile
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
