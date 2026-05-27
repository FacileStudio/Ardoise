FROM oven/bun:1.3.7-alpine AS deps
WORKDIR /app

COPY bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/admin/package.json ./packages/admin/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/auth-shared/package.json ./packages/auth-shared/package.json
COPY packages/crypto/package.json ./packages/crypto/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/docuseal/package.json ./packages/docuseal/package.json
COPY packages/env/package.json ./packages/env/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/smtp/package.json ./packages/smtp/package.json
COPY packages/storage/package.json ./packages/storage/package.json
COPY packages/storage-client/package.json ./packages/storage-client/package.json
COPY packages/stripe/package.json ./packages/stripe/package.json
COPY packages/trpc/package.json ./packages/trpc/package.json
COPY packages/trpc-client/package.json ./packages/trpc-client/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/typst/package.json ./packages/typst/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/utils/package.json ./packages/utils/package.json

RUN cat <<'EOF' > package.json
{
  "name": "ardoise-web-deploy",
  "private": true,
  "workspaces": [
    "apps/web",
    "packages/admin",
    "packages/auth",
    "packages/auth-shared",
    "packages/crypto",
    "packages/database",
    "packages/docuseal",
    "packages/env",
    "packages/i18n",
    "packages/logger",
    "packages/smtp",
    "packages/storage",
    "packages/storage-client",
    "packages/stripe",
    "packages/trpc",
    "packages/trpc-client",
    "packages/tsconfig",
    "packages/types",
    "packages/typst",
    "packages/ui",
    "packages/utils"
  ]
}
EOF

RUN bun -e "const rewrites = new Map([['apps/web/package.json', pkg => { delete pkg.devDependencies['@repo/eslint-config']; delete pkg.devDependencies.eslint; }], ['packages/admin/package.json', pkg => { delete pkg.devDependencies; }], ['packages/auth/package.json', pkg => { delete pkg.devDependencies; }], ['packages/auth-shared/package.json', pkg => { delete pkg.devDependencies; }], ['packages/crypto/package.json', pkg => { delete pkg.devDependencies; }], ['packages/database/package.json', pkg => { delete pkg.devDependencies; }], ['packages/docuseal/package.json', pkg => { delete pkg.devDependencies; }], ['packages/env/package.json', pkg => { delete pkg.devDependencies; }], ['packages/i18n/package.json', pkg => { delete pkg.devDependencies; }], ['packages/logger/package.json', pkg => { delete pkg.devDependencies; }], ['packages/smtp/package.json', pkg => { delete pkg.devDependencies; }], ['packages/storage/package.json', pkg => { delete pkg.devDependencies; }], ['packages/storage-client/package.json', pkg => { delete pkg.devDependencies; }], ['packages/stripe/package.json', pkg => { delete pkg.devDependencies; }], ['packages/trpc/package.json', pkg => { delete pkg.devDependencies; }], ['packages/trpc-client/package.json', pkg => { delete pkg.devDependencies; }], ['packages/types/package.json', pkg => { delete pkg.devDependencies; }], ['packages/typst/package.json', pkg => { delete pkg.devDependencies; }], ['packages/ui/package.json', pkg => { delete pkg.devDependencies; }], ['packages/utils/package.json', pkg => { delete pkg.devDependencies; }]]); for (const [file, rewrite] of rewrites) { const pkg = JSON.parse(await Bun.file(file).text()); rewrite(pkg); await Bun.write(file, JSON.stringify(pkg, null, 2) + '\n'); }"

RUN bun install --no-frozen-lockfile --network-concurrency 8

FROM deps AS builder
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY apps/web ./apps/web
COPY packages/admin ./packages/admin
COPY packages/auth ./packages/auth
COPY packages/auth-shared ./packages/auth-shared
COPY packages/crypto ./packages/crypto
COPY packages/database ./packages/database
COPY packages/docuseal ./packages/docuseal
COPY packages/env ./packages/env
COPY packages/i18n ./packages/i18n
COPY packages/logger ./packages/logger
COPY packages/smtp ./packages/smtp
COPY packages/storage ./packages/storage
COPY packages/storage-client ./packages/storage-client
COPY packages/stripe ./packages/stripe
COPY packages/trpc ./packages/trpc
COPY packages/trpc-client ./packages/trpc-client
COPY packages/tsconfig ./packages/tsconfig
COPY packages/types ./packages/types
COPY packages/typst ./packages/typst
COPY packages/ui ./packages/ui
COPY packages/utils ./packages/utils

RUN cd apps/web && bun --bun run build

FROM oven/bun:1.3.7-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 web

COPY --from=builder --chown=web:nodejs /app/apps/web/build ./build
COPY --from=builder --chown=web:nodejs /app/apps/web/package.json ./package.json
COPY --from=builder --chown=web:nodejs /app/node_modules ./node_modules

USER web

EXPOSE 3000

CMD ["node", "build"]
