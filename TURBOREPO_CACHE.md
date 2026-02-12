# Turborepo Remote Caching for Railway

This guide shows how to enable Turborepo remote caching to speed up Railway deployments.

## Why Remote Caching?

Turborepo remote caching stores build outputs in the cloud, allowing:
- **Faster builds**: Skip rebuilding unchanged packages (can save 70-90% build time)
- **Shared cache**: All Railway services share the same cache
- **Cross-deployment**: Cache persists between deployments

## Option 1: Vercel Remote Cache (Recommended - FREE)

Vercel provides free remote caching for Turborepo.

### Setup Steps

1. **Link your repository to Vercel Turborepo**
   ```bash
   npx turbo login
   npx turbo link
   ```

2. **Get your team token**
   After running `turbo link`, you'll get a token. Alternatively:
   - Go to https://vercel.com/account/tokens
   - Create a new token with name "Railway Turborepo Cache"
   - Copy the token

3. **Add to Railway Environment Variables**

   For each Railway service (backend, frontend, backoffice), add:
   ```
   TURBO_TOKEN=<your-token>
   TURBO_TEAM=<your-team-slug>
   ```

   Get your team slug from the output of `turbo link` or from your Vercel dashboard URL:
   `https://vercel.com/<team-slug>`

4. **Update Railway Build Commands**

   In each `railway.toml`, update the build section:

   **Backend (`apps/backend/railway.toml`):**
   ```toml
   [build]
   builder = "dockerfile"
   dockerfilePath = "apps/backend/Dockerfile"

   [build.env]
   TURBO_TOKEN = "$TURBO_TOKEN"
   TURBO_TEAM = "$TURBO_TEAM"
   ```

   **Frontend (`apps/frontend/railway.toml`):**
   ```toml
   [build]
   builder = "dockerfile"
   dockerfilePath = "apps/frontend/Dockerfile"

   [build.env]
   TURBO_TOKEN = "$TURBO_TOKEN"
   TURBO_TEAM = "$TURBO_TEAM"
   ```

   **Backoffice (`apps/backoffice/railway.toml`):**
   ```toml
   [build]
   builder = "dockerfile"
   dockerfilePath = "apps/backoffice/Dockerfile"

   [build.env]
   TURBO_TOKEN = "$TURBO_TOKEN"
   TURBO_TEAM = "$TURBO_TEAM"
   ```

5. **Update Dockerfiles to Use Cache**

   Add `--remote-only` flag to turbo commands in Dockerfiles.

   Example for any Dockerfile that runs turbo:
   ```dockerfile
   # Before
   RUN cd apps/backend && bun run build

   # After
   RUN turbo run build --filter=@repo/backend --remote-only
   ```

   **Note:** Since you're using Dockerfiles, the cache needs to be accessed during the Docker build.

### Docker Build with Turbo Cache

Since Railway uses Docker builds, we need to pass the tokens as build args:

1. **Update Dockerfiles to accept build args:**

   ```dockerfile
   # At the top of each Dockerfile
   ARG TURBO_TOKEN
   ARG TURBO_TEAM
   ENV TURBO_TOKEN=$TURBO_TOKEN
   ENV TURBO_TEAM=$TURBO_TEAM
   ```

2. **The tokens will be automatically passed by Railway when set as environment variables.**

## Option 2: Self-Hosted Remote Cache (S3/MinIO)

Use your existing MinIO setup for Turbo cache.

### Setup Steps

1. **Install turborepo-remote-cache**
   ```bash
   bun add -d turborepo-remote-cache
   ```

2. **Create cache server** (optional - can use MinIO directly)

   Create `apps/turbo-cache-server/index.ts`:
   ```typescript
   import { createServer } from 'turborepo-remote-cache/server';

   const server = createServer({
     s3: {
       endpoint: process.env.MINIO_ENDPOINT!,
       accessKeyId: process.env.MINIO_ROOT_USER!,
       secretAccessKey: process.env.MINIO_ROOT_PASSWORD!,
       bucket: 'turborepo-cache',
     },
   });

   server.listen(9080, () => {
     console.log('Turbo cache server running on port 9080');
   });
   ```

3. **Update turbo.json**
   ```json
   {
     "remoteCache": {
       "signature": true
     }
   }
   ```

4. **Configure Railway to use self-hosted cache**

   Add to Railway environment variables:
   ```
   TURBO_API=https://your-cache-server.railway.app
   TURBO_TOKEN=<generate-a-secret-token>
   ```

## Option 3: Railway Build Cache (No Turbo Remote Cache)

Use Railway's native Docker layer caching without Turbo remote cache.

Railway automatically caches Docker layers between builds. To optimize:

1. **Use multi-stage builds** (already implemented ✅)
2. **Copy package.json files first** (already implemented ✅)
3. **Install dependencies before copying source** (already implemented ✅)

This provides some caching but not as effective as Turbo remote cache.

## Recommended Approach for Charles

**Use Option 1 (Vercel Remote Cache)** because:

✅ **Free**: No cost for private repos up to 50GB/month
✅ **Zero maintenance**: Managed by Vercel
✅ **Fast**: CDN-backed globally distributed cache
✅ **Easy setup**: Just add 2 environment variables
✅ **Works with Docker**: Compatible with Railway's Docker builds

### Expected Performance Improvements

With remote caching enabled:

- **First build**: Same as current (~3-5 minutes)
- **Subsequent builds with no changes**: ~30 seconds (95% faster)
- **Builds with small changes**: ~1-2 minutes (60-70% faster)
- **Builds after dependency updates**: ~2-3 minutes (40-50% faster)

## Implementation Checklist

- [ ] Run `npx turbo login` locally
- [ ] Run `npx turbo link` to connect to Vercel
- [ ] Copy TURBO_TOKEN from output
- [ ] Copy TURBO_TEAM from output
- [ ] Add TURBO_TOKEN to Railway environment (all services)
- [ ] Add TURBO_TEAM to Railway environment (all services)
- [ ] Update railway.toml files with build.env section
- [ ] Update Dockerfiles to accept TURBO_TOKEN and TURBO_TEAM args
- [ ] Test local build with cache: `turbo run build --remote-only`
- [ ] Deploy to Railway and verify cache is working

## Verifying Cache is Working

Check Railway build logs for:
```
>>> FULL TURBO
>>> Remote caching enabled
>>> cache hit, replaying logs
```

Or run locally:
```bash
# First run (cache miss)
TURBO_TOKEN=xxx TURBO_TEAM=yyy turbo run build --remote-only

# Second run (cache hit)
TURBO_TOKEN=xxx TURBO_TEAM=yyy turbo run build --remote-only
```

You should see "cache hit" on the second run.

## Troubleshooting

**Issue**: "Remote caching not enabled"
- **Fix**: Ensure TURBO_TOKEN and TURBO_TEAM are set

**Issue**: "Cache miss on every build"
- **Fix**: Check that task outputs are properly configured in turbo.json

**Issue**: "Docker build doesn't use cache"
- **Fix**: Ensure ARG and ENV are set in Dockerfile before RUN commands

## Resources

- [Turborepo Remote Caching Docs](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Vercel Remote Cache](https://vercel.com/docs/monorepos/remote-caching)
- [Railway Environment Variables](https://docs.railway.app/guides/variables)
