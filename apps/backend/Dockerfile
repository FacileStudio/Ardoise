# Use a specific version for consistency
FROM oven/bun:1.3.7-alpine AS base

ARG TYPST_VERSION=0.13.1
ARG TARGETARCH

RUN set -eux; \
  apk_add() { \
    attempt=1; \
    while [ "$attempt" -le 5 ]; do \
      if apk add --no-cache ca-certificates curl libstdc++ xz; then \
        return 0; \
      fi; \
      sleep "$((attempt * 2))"; \
      attempt=$((attempt + 1)); \
    done; \
    return 1; \
  }; \
  apk_add \
  && case "$TARGETARCH" in \
    amd64) typst_arch="x86_64" ;; \
    arm64) typst_arch="aarch64" ;; \
    *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
  esac \
  && curl --fail --show-error --silent --location \
    --retry 5 --retry-delay 2 --retry-connrefused \
    "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-${typst_arch}-unknown-linux-musl.tar.xz" \
    --output /tmp/typst.tar.xz \
  && tar -xJf /tmp/typst.tar.xz -C /tmp \
  && install -m 0755 "/tmp/typst-${typst_arch}-unknown-linux-musl/typst" /usr/local/bin/typst \
  && rm -rf /tmp/typst.tar.xz "/tmp/typst-${typst_arch}-unknown-linux-musl"

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
