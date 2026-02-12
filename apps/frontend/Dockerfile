FROM oven/bun:1.3.7-alpine AS base

ARG TURBO_TOKEN
ARG TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN
ENV TURBO_TEAM=$TURBO_TEAM

FROM base AS builder
WORKDIR /app

COPY . .

ARG VITE_API_URL
ARG PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN bun install --no-frozen-lockfile
RUN cd apps/frontend && bun run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

ARG VITE_API_URL
ARG PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 frontend

COPY --from=builder --chown=frontend:nodejs /app/apps/frontend/build ./build
COPY --from=builder --chown=frontend:nodejs /app/apps/frontend/package.json ./package.json

USER frontend

EXPOSE 3000

CMD ["node", "build"]
