import { Context } from 'hono';
import { prisma } from '@repo/database';
import { StorageService } from '@repo/storage';
import { StripeService } from '@repo/stripe';

export interface HealthCheckDependencies {
  storage: StorageService;
  stripe: StripeService;
}

interface ServiceStatus {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    storage: ServiceStatus;
    stripe: ServiceStatus;
  };
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkStorage(storage: StorageService): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await storage.client.bucketExists();
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkStripe(stripe: StripeService): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await stripe.client.balance.retrieve();
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function createHealthCheckHandler(deps: HealthCheckDependencies) {
  return async (c: Context) => {
    const startTime = Date.now();

    const [databaseStatus, storageStatus, stripeStatus] = await Promise.all([
      checkDatabase(),
      checkStorage(deps.storage),
      checkStripe(deps.stripe),
    ]);

    const apiStatus: ServiceStatus = {
      status: 'healthy',
      latency: Date.now() - startTime,
    };

    const services = {
      api: apiStatus,
      database: databaseStatus,
      storage: storageStatus,
      stripe: stripeStatus,
    };

    const unhealthyServices = Object.values(services).filter(
      (s) => s.status === 'unhealthy'
    );
    const allHealthy = unhealthyServices.length === 0;

    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
      allHealthy ? 'healthy' : unhealthyServices.length >= 2 ? 'unhealthy' : 'degraded';

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503;

    return c.json(response, statusCode);
  };
}

export function createLivenessHandler() {
  return (c: Context) => {
    return c.json({ status: 'alive', timestamp: new Date().toISOString() }, 200);
  };
}

export function createReadinessHandler() {
  return async (c: Context) => {
    const [databaseStatus] = await Promise.all([checkDatabase()]);

    const isReady = databaseStatus.status === 'healthy';

    return c.json(
      {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: databaseStatus,
        },
      },
      isReady ? 200 : 503
    );
  };
}
