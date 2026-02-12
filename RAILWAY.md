# Railway Deployment Guide

This guide will walk you through deploying Charles to Railway.app, a modern Platform-as-a-Service that makes deployment simple.

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository with your code
- Stripe account with API keys
- SMTP server credentials
- Company information for invoices

## Overview

We'll deploy four services to Railway:
1. PostgreSQL database
2. Backend API (apps/backend)
3. Frontend client portal (apps/frontend)
4. Backoffice admin panel (apps/backoffice)

For file storage, you have two options:
- Use Railway's volume storage (simpler, but limited)
- Use external S3/MinIO service (recommended for production)

## Step 1: Create a New Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Empty Project"
4. Name it "Charles" or your preferred name

## Step 2: Add PostgreSQL Database

1. In your project, click "New Service"
2. Select "Database"
3. Choose "PostgreSQL"
4. Railway will automatically provision the database

Railway will create a `DATABASE_URL` variable that we'll reference later.

## Step 3: Deploy Backend

### 3.1 Create Backend Service

1. Click "New Service"
2. Select "GitHub Repo"
3. Choose your repository
4. Railway will detect it's a monorepo

### 3.2 Configure Backend Build

In the service settings:

**Root Directory:** Leave empty (we'll use Dockerfile context)

**Dockerfile Path:** `apps/backend/Dockerfile`

**Build Command:** (leave empty, Docker handles it)

**Start Command:** (leave empty, Docker handles it)

### 3.3 Set Backend Environment Variables

Add these variables in the Railway service settings:

```env
NODE_ENV=production
PORT=3001

DATABASE_URL=${{Postgres.DATABASE_URL}}

ENCRYPTION_SECRET=your-super-secret-key-min-32-characters

STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

MINIO_ENDPOINT=https://your-s3-endpoint.com
MINIO_ROOT_USER=your_s3_access_key
MINIO_ROOT_PASSWORD=your_s3_secret_key
MINIO_BUCKET_NAME=charles-production
MINIO_PUBLIC_URL=https://your-s3-endpoint.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@yourdomain.com

COMPANY_NAME=Facile Studio
COMPANY_ADDRESS=Your Company Address
COMPANY_CITY=75001 Paris, France
COMPANY_SIRET=123 456 789 00010
COMPANY_EMAIL=contact@facile.studio
COMPANY_PHONE=+33 1 23 45 67 89

FRONTEND_URL=${{Frontend.url}}
TRUSTED_ORIGINS=${{Frontend.url}},${{Backoffice.url}},${{Backend.url}}

LOG_LEVEL=info
```

**Important Notes:**

- `${{Postgres.DATABASE_URL}}` references the PostgreSQL service
- `${{Frontend.url}}`, `${{Backoffice.url}}` reference other services (add after deploying them)
- Railway automatically provides public URLs for each service

### 3.4 Generate Domain

1. Go to the backend service "Settings"
2. Click "Generate Domain" to get a public URL
3. Note this URL for the frontend configuration

## Step 4: Deploy Frontend

### 4.1 Create Frontend Service

1. Click "New Service"
2. Select "GitHub Repo"
3. Choose your repository

### 4.2 Configure Frontend Build

**Dockerfile Path:** `apps/frontend/Dockerfile`

### 4.3 Set Frontend Environment Variables

```env
NODE_ENV=production
PORT=3000

VITE_API_URL=${{Backend.url}}/trpc
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
```

### 4.4 Set Build Arguments

In the service settings, add build arguments:

```
VITE_API_URL=${{Backend.url}}/trpc
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
```

### 4.5 Generate Domain

1. Generate a domain for the frontend
2. Optionally add a custom domain (e.g., charles.yourdomain.com)

## Step 5: Deploy Backoffice

### 5.1 Create Backoffice Service

1. Click "New Service"
2. Select "GitHub Repo"
3. Choose your repository

### 5.2 Configure Backoffice Build

**Dockerfile Path:** `apps/backoffice/Dockerfile`

### 5.3 Set Backoffice Environment Variables

```env
NODE_ENV=production
PORT=3002

VITE_API_URL=${{Backend.url}}/trpc
```

### 5.4 Set Build Arguments

```
VITE_API_URL=${{Backend.url}}/trpc
```

### 5.5 Generate Domain

1. Generate a domain for the backoffice
2. Optionally add a custom domain (e.g., admin.yourdomain.com)

## Step 6: Update Backend CORS Configuration

After deploying frontend and backoffice:

1. Go back to the backend service
2. Update `FRONTEND_URL` and `TRUSTED_ORIGINS` with the actual URLs:

```env
FRONTEND_URL=https://your-frontend.railway.app
TRUSTED_ORIGINS=https://your-frontend.railway.app,https://your-backoffice.railway.app,https://your-backend.railway.app
```

3. Redeploy the backend service

## Step 7: Run Database Migrations

Railway automatically runs migrations via the Docker entrypoint script. However, to verify:

1. Go to the backend service
2. Open the "Deployments" tab
3. Check the logs for "Running database migrations..."
4. Verify migrations completed successfully

If you need to run migrations manually:

1. Go to backend service
2. Click "Settings" → "Variables"
3. Add a temporary command variable
4. Or use Railway CLI (see below)

### Using Railway CLI

```bash
railway login
railway link
railway run --service backend bun run packages/database/db:migrate:deploy
```

## Step 8: Create Admin Account

You need to create an admin account to access the backoffice:

### Option 1: Railway CLI

```bash
railway link
railway run --service backend bun run scripts/create-admin.ts
```

### Option 2: Manual Database Access

1. Go to PostgreSQL service
2. Click "Connect"
3. Use the connection details to connect via psql or GUI tool
4. Run the admin creation SQL manually

## Step 9: Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your backend URL + `/webhook`: `https://your-backend.railway.app/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in Railway backend environment variables
7. Redeploy backend

## Step 10: Configure SMTP (Email Notifications)

Ensure your SMTP credentials are correct in the backend environment variables.

**Recommended SMTP Providers:**
- Gmail (with App Password)
- SendGrid
- Mailgun
- AWS SES
- Postmark

**Gmail Setup:**
1. Enable 2FA on your Google account
2. Generate an App Password
3. Use that as `SMTP_PASS`

## Step 11: Configure File Storage (S3/MinIO)

### Option 1: Use Railway Volume (Development Only)

Not recommended for production as Railway volumes are not persistent across deployments.

### Option 2: External S3 Service (Recommended)

Use one of these services:
- AWS S3
- DigitalOcean Spaces
- Cloudflare R2
- Backblaze B2
- Self-hosted MinIO

Configure the `MINIO_*` environment variables with your S3 credentials.

**Example for AWS S3:**

```env
MINIO_ENDPOINT=https://s3.amazonaws.com
MINIO_ROOT_USER=your_aws_access_key_id
MINIO_ROOT_PASSWORD=your_aws_secret_access_key
MINIO_BUCKET_NAME=charles-production
MINIO_PUBLIC_URL=https://s3.amazonaws.com
```

## Step 12: Set Up Custom Domains (Optional)

### Frontend

1. Go to frontend service → Settings → Networking
2. Click "Custom Domain"
3. Add your domain (e.g., `charles.yourdomain.com`)
4. Update DNS records as instructed by Railway
5. Railway automatically provisions SSL certificates

### Backoffice

1. Go to backoffice service → Settings → Networking
2. Add custom domain (e.g., `admin-charles.yourdomain.com`)
3. Update DNS records

### Backend

1. Go to backend service → Settings → Networking
2. Add custom domain (e.g., `api-charles.yourdomain.com`)
3. Update DNS records

### Update Environment Variables

After adding custom domains, update:
- Backend `FRONTEND_URL` and `TRUSTED_ORIGINS`
- Frontend `VITE_API_URL`
- Backoffice `VITE_API_URL`

## Step 13: Monitoring & Logs

### View Logs

1. Go to each service
2. Click "Deployments"
3. Click on the latest deployment
4. View real-time logs

### Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request counts

### Alerts (Optional)

Set up Logtail for advanced logging:
1. Create Logtail account
2. Get your source token
3. Add `LOGTAIL_TOKEN` to backend environment variables
4. Redeploy backend

## Troubleshooting

### Build Failures

**Issue:** Docker build fails

**Solutions:**
1. Check Railway build logs for specific errors
2. Ensure all package.json files are included in Dockerfile COPY commands
3. Verify Dockerfile paths are correct
4. Try building locally: `docker build -f apps/backend/Dockerfile .`

### Database Connection Errors

**Issue:** Backend can't connect to database

**Solutions:**
1. Verify `DATABASE_URL` is set correctly with `${{Postgres.DATABASE_URL}}`
2. Check database service is running
3. Review backend logs for specific error messages

### CORS Errors

**Issue:** Frontend can't connect to backend

**Solutions:**
1. Verify `TRUSTED_ORIGINS` includes frontend URL
2. Ensure URLs don't have trailing slashes
3. Check backend logs for CORS-related errors
4. Update `FRONTEND_URL` with correct frontend domain

### Stripe Webhook Failures

**Issue:** Payments complete but status doesn't update

**Solutions:**
1. Verify webhook URL is correct in Stripe dashboard
2. Check `STRIPE_WEBHOOK_SECRET` matches Stripe
3. Review backend logs for webhook errors
4. Test webhook with Stripe CLI: `stripe trigger payment_intent.succeeded`

### Migration Failures

**Issue:** Database migrations fail on deployment

**Solutions:**
1. Check backend deployment logs
2. Manually run migrations via Railway CLI
3. Verify DATABASE_URL is accessible
4. Check for conflicting schema changes

### Email Not Sending

**Issue:** Payment emails not being sent

**Solutions:**
1. Verify SMTP credentials are correct
2. Check SMTP_PORT (usually 587 or 465)
3. For Gmail, ensure App Password is used (not regular password)
4. Review backend logs for SMTP errors
5. Test SMTP connection locally

## Environment Variables Reference

### Backend Service

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `${{Postgres.DATABASE_URL}}` |
| `ENCRYPTION_SECRET` | JWT secret (32+ chars) | `your-secret-key` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_...` |
| `MINIO_ENDPOINT` | S3 endpoint URL | `https://s3.amazonaws.com` |
| `MINIO_ROOT_USER` | S3 access key | `your_access_key` |
| `MINIO_ROOT_PASSWORD` | S3 secret key | `your_secret_key` |
| `MINIO_BUCKET_NAME` | S3 bucket name | `charles-production` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `your-email@domain.com` |
| `SMTP_PASS` | SMTP password | `your-app-password` |
| `SMTP_FROM` | From email address | `noreply@yourdomain.com` |
| `COMPANY_NAME` | Company name for invoices | `Facile Studio` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://charles.yourdomain.com` |
| `TRUSTED_ORIGINS` | Allowed CORS origins | `https://frontend.com,https://admin.com` |

### Frontend Service

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `${{Backend.url}}/trpc` |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_...` |

### Backoffice Service

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `${{Backend.url}}/trpc` |

## Production Checklist

Before going live, ensure:

- [ ] All environment variables are set correctly
- [ ] Custom domains are configured with SSL
- [ ] Database migrations have run successfully
- [ ] Admin account has been created
- [ ] Stripe webhook is configured and tested
- [ ] SMTP is configured and emails are sending
- [ ] S3/MinIO storage is configured
- [ ] CORS origins include all production URLs
- [ ] Stripe is using live mode keys (not test mode)
- [ ] Company information is accurate
- [ ] Test payment flow end-to-end
- [ ] Monitoring/logging is configured
- [ ] Backups are configured for database

## Continuous Deployment

Railway automatically redeploys when you push to your GitHub repository:

1. Push changes to your main branch
2. Railway detects the change
3. Rebuilds affected services
4. Deploys new versions
5. Runs health checks

To disable auto-deployment:
1. Go to service settings
2. Find "Deployments" section
3. Toggle "Auto Deploy"

## Scaling

Railway automatically handles basic scaling, but for advanced needs:

### Vertical Scaling
Upgrade to Railway Pro or Enterprise for more resources per service.

### Database Connection Pooling
For high traffic, consider adding PgBouncer:
1. Add new service with PgBouncer image
2. Configure connection pooling
3. Update `DATABASE_URL` to point to PgBouncer

### CDN for Static Assets
Use Railway's built-in CDN or configure Cloudflare for better performance.

## Cost Estimation

Railway pricing (as of 2024):
- Free tier: $5/month in credits
- Pro: $20/month + resource usage
- Database: ~$5-10/month
- Each service: Based on CPU/memory usage

Estimated monthly cost for Charles: $30-50/month on Pro plan.

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Charles Issues: Contact Facile Studio development team

## Additional Resources

- [Railway CLI Documentation](https://docs.railway.app/develop/cli)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Railway Custom Domains](https://docs.railway.app/deploy/exposing-your-app)
- [Railway Volumes](https://docs.railway.app/deploy/volumes)
