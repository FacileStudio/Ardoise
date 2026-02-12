# Quick Setup: Turbo Remote Cache

Follow these steps to enable Turborepo remote caching with Vercel (FREE).

## Step 1: Authenticate with Vercel

Run these commands locally:

```bash
npx turbo login
```

This will open your browser to authenticate with Vercel. Sign in or create a free account.

## Step 2: Link Your Repository

```bash
npx turbo link
```

Follow the prompts:
1. Select or create a team (you can use your personal account)
2. Confirm the repository name

You'll see output like:
```
>>> Success! Turborepo CLI authorized for <your-team>
>>>
>>> To enable Remote Caching for this project, set the following environment variables:
>>>
>>> TURBO_TOKEN=xxxxxxxxxxxxxxxxxxx
>>> TURBO_TEAM=<your-team-slug>
```

**IMPORTANT**: Copy both values! You'll need them in the next step.

## Step 3: Add Environment Variables to Railway

For **each** Railway service (backend, frontend, backoffice):

1. Go to Railway dashboard → Your project → Select service
2. Click "Variables" tab
3. Add these two variables:

   ```
   TURBO_TOKEN = <paste-your-token-here>
   TURBO_TEAM = <paste-your-team-slug-here>
   ```

4. Click "Deploy" or wait for auto-deploy

**Tip**: You can also set these in Railway's project-level shared variables to apply to all services at once:
- Project Settings → Shared Variables → Add `TURBO_TOKEN` and `TURBO_TEAM`

## Step 4: Verify It's Working

### Test Locally

```bash
# First build (cache miss)
TURBO_TOKEN=<your-token> TURBO_TEAM=<your-team> turbo run build

# Second build (cache hit - should be MUCH faster)
TURBO_TOKEN=<your-token> TURBO_TEAM=<your-team> turbo run build
```

You should see `cache hit, replaying logs` on the second run!

### Test on Railway

1. Trigger a deploy on Railway
2. Check the build logs
3. Look for these indicators:

   ✅ **Cache enabled**:
   ```
   >>> TURBO
   >>> Remote caching enabled
   ```

   ✅ **Cache hit** (on subsequent builds):
   ```
   >>> cache hit, replaying logs
   ```

   ⚠️ **Cache miss** (first build or after changes):
   ```
   >>> cache miss, executing
   ```

## Expected Performance

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| No changes | 3-5 min | 30s | 🚀 **90-95% faster** |
| Small changes | 3-5 min | 1-2 min | 🚀 **60-70% faster** |
| Dependency updates | 3-5 min | 2-3 min | 🚀 **40-50% faster** |

## Troubleshooting

### "Remote caching not enabled"

**Problem**: Turbo doesn't detect the token/team
**Solution**:
- Verify `TURBO_TOKEN` and `TURBO_TEAM` are set in Railway
- Check they're set in the **build environment** (not just deploy)
- Redeploy the service

### "Cache miss on every build"

**Problem**: Cache isn't being reused
**Solution**:
- This is normal for the first build
- Subsequent builds with unchanged code should hit cache
- Check turbo.json task outputs are correctly configured

### "Invalid token"

**Problem**: Token expired or incorrect
**Solution**:
- Run `npx turbo login` again to get a new token
- Update the `TURBO_TOKEN` in Railway
- Redeploy

## Need Help?

Check the full documentation: [TURBOREPO_CACHE.md](./TURBOREPO_CACHE.md)

Or run:
```bash
npx turbo help
```

## Quick Commands Reference

```bash
# Login to Vercel
npx turbo login

# Link repository
npx turbo link

# Build with remote cache
turbo run build --remote-only

# Check cache status
turbo run build --dry=json

# Clear local cache
turbo run build --force

# Disable remote cache (testing)
TURBO_REMOTE_CACHE_ENABLED=0 turbo run build
```

## Done! 🎉

Your monorepo is now configured for blazing-fast builds with Vercel Remote Cache.

Next deploy will use the cache automatically.
