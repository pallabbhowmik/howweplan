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
  | 'disputes'
  | 'reviews'
  | 'notifications'
  | 'event-bus';

type ServiceConfig = {
  id: ServiceId;
  name: string;
  gatewayPath: string;
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

function getGatewayBaseUrl(): string {
  // Use the public API base URL (gateway). This route runs server-side.
  return env.NEXT_PUBLIC_API_BASE_URL;
}

function getTimeoutMs(): number {
  return env.NEXT_PUBLIC_SERVICE_HEALTH_TIMEOUT_MS;
}

function getServiceConfigs(): ServiceConfig[] {
  // In production we route ALL service visibility through the gateway.
  // This avoids accidental bypass of auth/RBAC and keeps the network perimeter simple.
  return [
    {
      id: 'gateway',
      name: 'Gateway',
      gatewayPath: '/health',
    },
    {
      id: 'audit',
      name: 'Audit',
      gatewayPath: '/api/audit/health',
    },
    {
      id: 'identity',
      name: 'Identity',
      gatewayPath: '/api/identity/api/v1/health',
    },
    {
      id: 'requests',
      name: 'Requests',
      gatewayPath: '/api/requests/api/v1/health',
    },
    {
      id: 'matching',
      name: 'Matching',
      gatewayPath: '/api/matching/health',
    },
    {
      id: 'itineraries',
      name: 'Itineraries',
      gatewayPath: '/api/itineraries/health',
    },
    {
      id: 'booking-payments',
      name: 'Booking-Payments',
      gatewayPath: '/api/booking-payments/health',
    },
    {
      id: 'messaging',
      name: 'Messaging',
      gatewayPath: '/api/messaging/health',
    },
    {
      id: 'disputes',
      name: 'Disputes',
      gatewayPath: '/api/disputes/health',
    },
    {
      id: 'reviews',
      name: 'Reviews',
      gatewayPath: '/api/reviews/health',
    },
    {
      id: 'notifications',
      name: 'Notifications',
      gatewayPath: '/api/notifications/health',
    },
    {
      id: 'event-bus',
      name: 'Event Bus',
      gatewayPath: '/api/event-bus/health',
    },
  ];
}

function truncateDetails(input: string, maxLen: number = 200): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}

async function checkService(service: ServiceConfig, timeoutMs: number): Promise<ServiceStatus> {
  const gatewayBaseUrl = getGatewayBaseUrl();
  if (!gatewayBaseUrl) {
    return {
      id: service.id,
      name: service.name,
      status: 'not_configured',
      details: 'Gateway base URL not configured',
    };
  }

  const healthUrl = `${gatewayBaseUrl}${service.gatewayPath}`;
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
