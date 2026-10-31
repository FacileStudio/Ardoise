import { Context } from 'hono';
import { prisma } from '@repo/database';
import { StorageService } from '@repo/storage';
import { logger } from '../lib/logger';

export interface HealthCheckDependencies {
  storage: StorageService;
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
    logger.error({ err: error }, 'Health check failed');
    return { status: 'unhealthy', error: 'unavailable' };
  }
}

async function checkStorage(storage: StorageService): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await storage.ping();
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    return { status: 'unhealthy', error: 'unavailable' };
  }
}

export function createHealthCheckHandler(deps: HealthCheckDependencies) {
  return async (c: Context) => {
    const startTime = Date.now();

    const [databaseStatus, storageStatus] = await Promise.all([
      checkDatabase(),
      checkStorage(deps.storage),
    ]);

    const apiStatus: ServiceStatus = {
      status: 'healthy',
      latency: Date.now() - startTime,
    };

    const services = {
      api: apiStatus,
      database: databaseStatus,
      storage: storageStatus,
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
