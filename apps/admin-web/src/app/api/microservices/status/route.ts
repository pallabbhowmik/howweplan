import { NextResponse } from 'next/server';

type ServiceId =
  | 'supabase-rest'
  | 'audit'
  | 'identity'
  | 'requests'
  | 'matching'
  | 'itineraries'
  | 'booking-payments'
  | 'messaging'
  | 'disputes'
  | 'reviews'
  | 'notifications';

type ServiceConfig = {
  id: ServiceId;
  name: string;
  baseUrl?: string;
  healthPath: string;
};

type ServiceStatus = {
  id: ServiceId;
  name: string;
  baseUrl?: string;
  healthUrl?: string;
  status: 'healthy' | 'unhealthy' | 'error' | 'not_configured';
  statusCode?: number;
  latencyMs?: number;
  details?: string;
};

function getTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_SERVICE_HEALTH_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return 2000;
  return Math.min(Math.max(parsed, 250), 30000);
}

function getServiceConfigs(): ServiceConfig[] {
  // Base URLs from .env; health paths defined here per service convention
  return [
    {
      id: 'supabase-rest',
      name: 'Supabase REST',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_SUPABASE_REST_URL,
      healthPath: '/health',
    },
    {
      id: 'audit',
      name: 'Audit',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_AUDIT_URL,
      healthPath: '/health',
    },
    {
      id: 'identity',
      name: 'Identity',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_IDENTITY_URL,
      healthPath: '/api/v1/health',
    },
    {
      id: 'requests',
      name: 'Requests',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_REQUESTS_URL,
      healthPath: '/api/v1/health',
    },
    {
      id: 'matching',
      name: 'Matching',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_MATCHING_URL,
      healthPath: '/health',
    },
    {
      id: 'itineraries',
      name: 'Itineraries',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_ITINERARIES_URL,
      healthPath: '/health',
    },
    {
      id: 'booking-payments',
      name: 'Booking-Payments',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_BOOKING_PAYMENTS_URL,
      healthPath: '/health',
    },
    {
      id: 'messaging',
      name: 'Messaging',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_MESSAGING_URL,
      healthPath: '/health',
    },
    {
      id: 'disputes',
      name: 'Disputes',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_DISPUTES_URL,
      healthPath: '/health',
    },
    {
      id: 'reviews',
      name: 'Reviews',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_REVIEWS_URL,
      healthPath: '/health',
    },
    {
      id: 'notifications',
      name: 'Notifications',
      baseUrl: process.env.NEXT_PUBLIC_SERVICE_NOTIFICATIONS_URL,
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
  if (!service.baseUrl) {
    return {
      id: service.id,
      name: service.name,
      status: 'not_configured',
      details: 'Base URL not configured',
    };
  }

  const healthUrl = `${service.baseUrl.replace(/\/$/, '')}${service.healthPath}`;
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
      baseUrl: service.baseUrl,
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
      baseUrl: service.baseUrl,
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
