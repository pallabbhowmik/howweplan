import { NextResponse } from 'next/server';
import { env } from '../../../../config/env';

type ServiceId =
  | 'gateway'
  | 'audit'
  | 'identity'
  | 'requests'
  | 'matching'
  | 'itineraries'
  | 'booking-payments'
  | 'messaging'
  | 'notifications'
  | 'event-bus';

type ServiceConfig = {
  id: ServiceId;
  name: string;
  productionUrl: string;
  healthPath: string;
};

type ServiceStatus = {
  id: ServiceId;
  name: string;
  healthUrl?: string;
  status: 'healthy' | 'unhealthy' | 'error' | 'not_configured';
  statusCode?: number;
  latencyMs?: number;
  details?: string;
};

function getTimeoutMs(): number {
  return env.NEXT_PUBLIC_SERVICE_HEALTH_TIMEOUT_MS;
}

/**
 * Production service URLs - direct health checks
 * These are the actual Render.com deployment URLs
 */
function getServiceConfigs(): ServiceConfig[] {
  return [
    {
      id: 'gateway',
      name: 'Gateway',
      productionUrl: 'https://howweplan-irjf.onrender.com',
      healthPath: '/health',
    },
    {
      id: 'identity',
      name: 'Identity',
      productionUrl: 'https://howweplan-tozr.onrender.com',
      healthPath: '/api/v1/health',
    },
    {
      id: 'requests',
      name: 'Requests',
      productionUrl: 'https://howweplan-requests-kghq.onrender.com',
      healthPath: '/api/v1/health',
    },
    {
      id: 'matching',
      name: 'Matching',
      productionUrl: 'https://howweplan-matching-6wxj.onrender.com',
      healthPath: '/health',
    },
    {
      id: 'itineraries',
      name: 'Itineraries',
      productionUrl: 'https://howweplan-uo1z.onrender.com',
      healthPath: '/health',
    },
    {
      id: 'booking-payments',
      name: 'Booking-Payments',
      productionUrl: 'https://howweplan-booking-payments-npgv.onrender.com',
      healthPath: '/health',
    },
    {
      id: 'messaging',
      name: 'Messaging',
      productionUrl: 'https://howweplan-ptx3.onrender.com',
      healthPath: '/health',
    },
    {
      id: 'notifications',
      name: 'Notifications',
      productionUrl: 'https://howweplan-4cx5.onrender.com',
      healthPath: '/health',
    },
    {
      id: 'event-bus',
      name: 'Event Bus',
      productionUrl: 'https://howweplan-eventbus-sicz.onrender.com',
      healthPath: '/health',
    },
    {
      id: 'audit',
      name: 'Audit',
      productionUrl: 'https://howweplan-audit-gdzb.onrender.com',
      healthPath: '/health',
    },
  ];
}

function truncateDetails(input: string, maxLen: number = 200): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}

async function checkService(service: ServiceConfig, timeoutMs: number): Promise<ServiceStatus> {
  // Direct health check to the production service URL
  const healthUrl = `${service.productionUrl}${service.healthPath}`;
  const startedAt = Date.now();

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });

    const latencyMs = Date.now() - startedAt;
    const statusCode = res.status;

    const contentType = res.headers.get('content-type') ?? '';

    let details: string | undefined;
    try {
      if (contentType.includes('application/json')) {
        const json = (await res.json()) as unknown;
        details = truncateDetails(JSON.stringify(json));
      } else {
        const text = await res.text();
        details = truncateDetails(text);
      }
    } catch {
      // ignore body parsing errors
    }

    return {
      id: service.id,
      name: service.name,
      healthUrl,
      status: res.ok ? 'healthy' : 'unhealthy',
      statusCode,
      latencyMs,
      details,
    };
  } catch (e: any) {
    const latencyMs = Date.now() - startedAt;
    return {
      id: service.id,
      name: service.name,
      healthUrl,
      status: 'error',
      latencyMs,
      details: truncateDetails(e?.message ?? 'Request failed'),
    };
  }
}

export async function GET() {
  const timeoutMs = getTimeoutMs();
  const services = getServiceConfigs();

  const results = await Promise.all(services.map((s) => checkService(s, timeoutMs)));

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      timeoutMs,
      services: results,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
