FROM oven/bun:1.3.7-alpine AS base

FROM base AS builder
WORKDIR /app

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN bun install --no-frozen-lockfile
RUN cd apps/backoffice && bun run build
RUN bun pm prune --production

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backoffice

COPY --from=builder --chown=backoffice:nodejs /app/apps/backoffice/build ./build
COPY --from=builder --chown=backoffice:nodejs /app/apps/backoffice/package.json ./package.json
COPY --from=builder --chown=backoffice:nodejs /app/node_modules ./node_modules

USER backoffice

EXPOSE 3002

CMD ["node", "build"]
