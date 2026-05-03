FROM ghcr.io/typst/typst:v0.13.1 AS typst

FROM oven/bun:1.3.7 AS base

COPY --from=typst /bin/typst /usr/local/bin/typst

FROM base AS builder
WORKDIR /app

# Copy dependency files first to leverage Docker cache
COPY package.json bun.lockb* turbo.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/backend/package.json ./apps/backend/

# Now copy the rest
COPY . .

ARG DATABASE_URL
ARG ADMIN_EMAIL
ARG ADMIN_PASSWORD
ARG ADMIN_FIRST_NAME
ARG ADMIN_LAST_NAME

ENV DATABASE_URL=$DATABASE_URL
ENV ADMIN_EMAIL=$ADMIN_EMAIL
ENV ADMIN_PASSWORD=$ADMIN_PASSWORD
ENV ADMIN_FIRST_NAME=$ADMIN_FIRST_NAME
ENV ADMIN_LAST_NAME=$ADMIN_LAST_NAME

RUN bun install --no-frozen-lockfile
RUN cd packages/database && bun run db:generate

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# Copy built assets
COPY --from=builder --chown=backend:nodejs /app/apps/backend ./apps/backend
COPY --from=builder --chown=backend:nodejs /app/packages ./packages
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/package.json ./
COPY --from=builder --chown=backend:nodejs /app/turbo.json ./

USER backend

EXPOSE 3001

CMD ["bun", "run", "apps/backend/src/index.ts"]
