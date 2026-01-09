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
  | 'event-bus'
  | 'disputes'
  | 'reviews';

type ServiceConfig = {
  id: ServiceId;
  name: string;
  urlEnvKey: keyof typeof env;
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
 * Service configurations - URLs come from environment variables
 */
function getServiceConfigs(): ServiceConfig[] {
  return [
    {
      id: 'gateway',
      name: 'Gateway',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_GATEWAY_URL',
      healthPath: '/health',
    },
    {
      id: 'identity',
      name: 'Identity',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_IDENTITY_URL',
      healthPath: '/api/v1/health',
    },
    {
      id: 'requests',
      name: 'Requests',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_REQUESTS_URL',
      healthPath: '/api/v1/health',
    },
    {
      id: 'matching',
      name: 'Matching',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_MATCHING_URL',
      healthPath: '/health',
    },
    {
      id: 'itineraries',
      name: 'Itineraries',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_ITINERARIES_URL',
      healthPath: '/health',
    },
    {
      id: 'booking-payments',
      name: 'Booking-Payments',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_BOOKING_PAYMENTS_URL',
      healthPath: '/health',
    },
    {
      id: 'messaging',
      name: 'Messaging',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_MESSAGING_URL',
      healthPath: '/health',
    },
    {
      id: 'notifications',
      name: 'Notifications',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_NOTIFICATIONS_URL',
      healthPath: '/health',
    },
    {
      id: 'event-bus',
      name: 'Event Bus',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_EVENTBUS_URL',
      healthPath: '/health',
    },
    {
      id: 'audit',
      name: 'Audit',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_AUDIT_URL',
      healthPath: '/health',
    },
    {
      id: 'disputes',
      name: 'Disputes',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_DISPUTES_URL',
      healthPath: '/health',
    },
    {
      id: 'reviews',
      name: 'Reviews',
      urlEnvKey: 'NEXT_PUBLIC_SERVICE_REVIEWS_URL',
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
  // Get URL from environment variable
  const baseUrl = env[service.urlEnvKey] as string | undefined;
  
  if (!baseUrl) {
    return {
      id: service.id,
      name: service.name,
      status: 'not_configured',
      details: `Environment variable ${service.urlEnvKey} not set`,
    };
  }

  const healthUrl = `${baseUrl}${service.healthPath}`;
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
