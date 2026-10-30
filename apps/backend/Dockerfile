FROM ghcr.io/typst/typst:v0.13.1 AS typst

FROM oven/bun:1.3.7 AS deps
WORKDIR /app

COPY --from=typst /bin/typst /usr/local/bin/typst

COPY bun.lock ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/admin/package.json ./packages/admin/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/auth-shared/package.json ./packages/auth-shared/package.json
COPY packages/crypto/package.json ./packages/crypto/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/docuseal/package.json ./packages/docuseal/package.json
COPY packages/env/package.json ./packages/env/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/smtp/package.json ./packages/smtp/package.json
COPY packages/storage/package.json ./packages/storage/package.json
COPY packages/stripe/package.json ./packages/stripe/package.json
COPY packages/trpc/package.json ./packages/trpc/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/typst/package.json ./packages/typst/package.json
COPY packages/utils/package.json ./packages/utils/package.json

RUN cat <<'EOF' > package.json
{
  "name": "ardoise-backend-deploy",
  "private": true,
  "workspaces": [
    "apps/backend",
    "packages/admin",
    "packages/auth",
    "packages/auth-shared",
    "packages/crypto",
    "packages/database",
    "packages/docuseal",
    "packages/env",
    "packages/logger",
    "packages/smtp",
    "packages/storage",
    "packages/stripe",
    "packages/trpc",
    "packages/tsconfig",
    "packages/types",
    "packages/typst",
    "packages/utils"
  ]
}
EOF

RUN bun -e "const rewrites = new Map([['apps/backend/package.json', pkg => { delete pkg.devDependencies; }], ['packages/admin/package.json', pkg => { delete pkg.devDependencies; }], ['packages/auth/package.json', pkg => { delete pkg.devDependencies; }], ['packages/auth-shared/package.json', pkg => { delete pkg.devDependencies; }], ['packages/crypto/package.json', pkg => { delete pkg.devDependencies; }], ['packages/database/package.json', pkg => { pkg.devDependencies = { prisma: pkg.devDependencies.prisma, 'zod-prisma-types': pkg.devDependencies['zod-prisma-types'] }; }], ['packages/docuseal/package.json', pkg => { delete pkg.devDependencies; }], ['packages/env/package.json', pkg => { delete pkg.devDependencies; }], ['packages/logger/package.json', pkg => { delete pkg.devDependencies; }], ['packages/smtp/package.json', pkg => { delete pkg.devDependencies; }], ['packages/storage/package.json', pkg => { delete pkg.devDependencies; }], ['packages/stripe/package.json', pkg => { delete pkg.devDependencies; }], ['packages/trpc/package.json', pkg => { delete pkg.devDependencies; }], ['packages/types/package.json', pkg => { delete pkg.devDependencies; }], ['packages/typst/package.json', pkg => { delete pkg.devDependencies; }], ['packages/utils/package.json', pkg => { delete pkg.devDependencies; }]]); for (const [file, rewrite] of rewrites) { const pkg = JSON.parse(await Bun.file(file).text()); rewrite(pkg); await Bun.write(file, JSON.stringify(pkg, null, 2) + '\n'); }"

RUN bun install --no-frozen-lockfile --network-concurrency 8

FROM deps AS builder
WORKDIR /app

COPY apps/backend ./apps/backend
COPY packages/admin ./packages/admin
COPY packages/auth ./packages/auth
COPY packages/auth-shared ./packages/auth-shared
COPY packages/crypto ./packages/crypto
COPY packages/database ./packages/database
COPY packages/docuseal ./packages/docuseal
COPY packages/env ./packages/env
COPY packages/logger ./packages/logger
COPY packages/smtp ./packages/smtp
COPY packages/storage ./packages/storage
COPY packages/stripe ./packages/stripe
COPY packages/trpc ./packages/trpc
COPY packages/tsconfig ./packages/tsconfig
COPY packages/types ./packages/types
COPY packages/typst ./packages/typst
COPY packages/utils ./packages/utils

RUN cd packages/database && bun run db:generate

FROM oven/bun:1.3.7 AS runner
WORKDIR /app

COPY --from=typst /bin/typst /usr/local/bin/typst

ARG VERSION=
ARG RAILWAY_GIT_COMMIT_SHA=

ENV NODE_ENV=production
ENV APP_VERSION=${VERSION:-${RAILWAY_GIT_COMMIT_SHA:-dev}}

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs backend
RUN mkdir -p /data/uploads && chown backend:nodejs /data/uploads

COPY --from=builder --chown=backend:nodejs /app/apps/backend ./apps/backend
COPY --from=builder --chown=backend:nodejs /app/packages ./packages
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/package.json ./
COPY --from=builder --chown=backend:nodejs /app/bun.lock ./

USER backend

EXPOSE 3001

CMD ["/bin/sh", "-lc", "cd /app/packages/database && bun run db:migrate:deploy && cd /app && bun run apps/backend/src/index.ts"]
