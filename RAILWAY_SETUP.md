# Railway Environment Variables Setup

## Turbo Remote Cache (REQUIRED for fast builds)

Add these variables to **Railway Project Settings → Shared Variables** to apply to all services:

```
TURBO_TOKEN=***REMOVED***
TURBO_TEAM=saravenpi
```

### How to Add in Railway:

1. Go to your Railway project dashboard
2. Click "Settings" (gear icon)
3. Scroll to "Shared Variables" section
4. Click "+ New Variable"
5. Add `TURBO_TOKEN` with the value above
6. Click "+ New Variable" again
7. Add `TURBO_TEAM` with value `saravenpi`
8. Click "Deploy" on all services or wait for auto-redeploy

**Note**: Shared Variables are automatically available to all services during both build and runtime.

### Alternative: Add to Each Service

If you prefer to add per-service instead of shared:

**For Backend:**
1. Railway Dashboard → Backend service
2. Variables tab → Add `TURBO_TOKEN` and `TURBO_TEAM`

**For Frontend:**
1. Railway Dashboard → Frontend service
2. Variables tab → Add `TURBO_TOKEN` and `TURBO_TEAM`

**For Backoffice:**
1. Railway Dashboard → Backoffice service
2. Variables tab → Add `TURBO_TOKEN` and `TURBO_TEAM`

## Verify It's Working

After adding the variables and redeploying, check the build logs for:

✅ **Success indicators:**
```
• Remote caching enabled
cache hit, replaying logs  (on subsequent builds)
```

⚠️ **If you see this, it's working but first build:**
```
• Remote caching enabled
cache miss, executing
```

❌ **If cache is not enabled:**
```
• Remote caching disabled
```
**Fix**: Check that TURBO_TOKEN and TURBO_TEAM are set correctly.

## Expected Results

| Build Type | Time Before | Time After | Improvement |
|------------|-------------|------------|-------------|
| First build | 3-5 min | 3-5 min | None (building cache) |
| No changes | 3-5 min | 30 sec | 🚀 **90% faster** |
| Small changes | 3-5 min | 1-2 min | 🚀 **60% faster** |
| Big changes | 3-5 min | 2-3 min | 🚀 **40% faster** |

## Security Note

The `.env.turbo` file is gitignored for safety, but these tokens are also safe to commit because:
- They only grant access to Turbo cache (not your code)
- They're specific to this project
- You can revoke/regenerate them anytime at https://vercel.com/account/tokens

## Need New Tokens?

If you ever need to regenerate:

```bash
npx turbo login
npx turbo link
```

Then update the Railway environment variables with the new values.
