'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings2,
  Activity,
  Clock,
  Server,
  Database,
  MessageSquare,
  Users,
  FileText,
  CreditCard,
  Shield,
  Bell,
  Star,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
  Zap,
  Globe,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type ServiceStatus = {
  id: string;
  name: string;
  baseUrl?: string;
  healthUrl?: string;
  status: 'healthy' | 'unhealthy' | 'error' | 'not_configured';
  statusCode?: number;
  latencyMs?: number;
  details?: string;
};

type StatusResponse = {
  timestamp: string;
  timeoutMs: number;
  services: ServiceStatus[];
};

type SortOption = 'name' | 'status' | 'latency';
type FilterOption = 'all' | 'healthy' | 'unhealthy' | 'error' | 'not_configured';

// ============================================================================
// Service Metadata
// ============================================================================

const SERVICE_META: Record<string, { 
  description: string; 
  port: number; 
  category: 'core' | 'business' | 'support';
  icon: React.ElementType;
}> = {
  'supabase-rest': {
    description: 'PostgreSQL REST API proxy',
    port: 54321,
    category: 'core',
    icon: Database,
  },
  'audit': {
    description: 'Activity logging and compliance tracking',
    port: 3010,
    category: 'support',
    icon: FileText,
  },
  'identity': {
    description: 'User authentication and authorization',
    port: 3011,
    category: 'core',
    icon: Shield,
  },
  'requests': {
    description: 'Travel request management',
    port: 3012,
    category: 'business',
    icon: FileText,
  },
  'matching': {
    description: 'Agent-request matching algorithm',
    port: 3013,
    category: 'business',
    icon: Users,
  },
  'itineraries': {
    description: 'Trip itinerary creation and management',
    port: 3014,
    category: 'business',
    icon: Globe,
  },
  'booking-payments': {
    description: 'Booking and payment processing',
    port: 3015,
    category: 'business',
    icon: CreditCard,
  },
  'messaging': {
    description: 'Real-time chat and communications',
    port: 3016,
    category: 'business',
    icon: MessageSquare,
  },
  'disputes': {
    description: 'Dispute resolution and management',
    port: 3017,
    category: 'support',
    icon: AlertCircle,
  },
  'reviews': {
    description: 'Rating and review system',
    port: 3018,
    category: 'business',
    icon: Star,
  },
  'notifications': {
    description: 'Push notifications and alerts',
    port: 3019,
    category: 'support',
    icon: Bell,
  },
};

// ============================================================================
// Helper Components
// ============================================================================

async function fetchServiceStatus(): Promise<StatusResponse> {
  const res = await fetch('/api/microservices/status', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load microservice status');
  return res.json();
}

function StatusPill({ status }: { status: ServiceStatus['status'] }) {
  switch (status) {
    case 'healthy':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Healthy
        </Badge>
      );
    case 'unhealthy':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1">
          <XCircle className="h-3 w-3" />
          Unhealthy
        </Badge>
      );
    case 'error':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1">
          <XCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    case 'not_configured':
      return (
        <Badge variant="secondary" className="gap-1">
          <Settings2 className="h-3 w-3" />
          Not configured
        </Badge>
      );
  }
}

function LatencyIndicator({ latencyMs }: { latencyMs?: number }) {
  if (latencyMs === undefined) return <span className="text-muted-foreground">—</span>;
  
  let color = 'text-green-600';
  let label = 'Fast';
  
  if (latencyMs > 500) {
    color = 'text-red-600';
    label = 'Slow';
  } else if (latencyMs > 200) {
    color = 'text-yellow-600';
    label = 'Medium';
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Zap className={`h-3 w-3 ${color}`} />
        <span className={`font-mono text-sm ${color}`}>{latencyMs}ms</span>
      </div>
      <span className="text-xs text-muted-foreground">({label})</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={handleCopy}
      title="Copy URL"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </Button>
  );
}

function SummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceCard({ 
  service, 
  isExpanded, 
  onToggle 
}: { 
  service: ServiceStatus; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const meta = SERVICE_META[service.id];
  const Icon = meta?.icon ?? Server;
  const description = meta?.description ?? 'Microservice';
  const port = meta?.port;
  const category = meta?.category ?? 'core';
  
  const categoryColors: Record<string, string> = {
    core: 'border-l-blue-500',
    business: 'border-l-purple-500',
    support: 'border-l-orange-500',
  };
  
  return (
    <Card className={`border-l-4 ${categoryColors[category]} transition-all hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <StatusPill status={service.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Port</span>
            <p className="font-mono font-medium">{port ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">HTTP Status</span>
            <p className="font-mono font-medium">{service.statusCode ?? '—'}</p>
          </div>
        </div>
        
        <div>
          <span className="text-sm text-muted-foreground">Response Time</span>
          <LatencyIndicator latencyMs={service.latencyMs} />
        </div>
        
        {service.baseUrl && (
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
              {service.healthUrl ?? service.baseUrl}
            </code>
            <CopyButton text={service.healthUrl ?? service.baseUrl} />
          </div>
        )}
        
        {service.details && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={onToggle}
            >
              <span>Response Details</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {isExpanded && (
              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                {service.details}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ServicesStatusPage() {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('name');
  
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['microservices-status'],
    queryFn: fetchServiceStatus,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Compute summary stats
  const stats = useMemo(() => {
    if (!data?.services) return { total: 0, healthy: 0, unhealthy: 0, notConfigured: 0 };
    
    return data.services.reduce(
      (acc, svc) => {
        acc.total++;
        if (svc.status === 'healthy') acc.healthy++;
        else if (svc.status === 'not_configured') acc.notConfigured++;
        else acc.unhealthy++;
        return acc;
      },
      { total: 0, healthy: 0, unhealthy: 0, notConfigured: 0 }
    );
  }, [data?.services]);

  // Filter and sort services
  const filteredServices = useMemo(() => {
    if (!data?.services) return [];
    
    let services = [...data.services];
    
    // Filter
    if (filter !== 'all') {
      services = services.filter(s => {
        if (filter === 'unhealthy') return s.status === 'unhealthy' || s.status === 'error';
        return s.status === filter;
      });
    }
    
    // Sort
    services.sort((a, b) => {
      switch (sort) {
        case 'status':
          const statusOrder = { healthy: 0, unhealthy: 1, error: 2, not_configured: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'latency':
          return (a.latencyMs ?? 9999) - (b.latencyMs ?? 9999);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    return services;
  }, [data?.services, filter, sort]);

  // Average latency
  const avgLatency = useMemo(() => {
    if (!data?.services) return null;
    const withLatency = data.services.filter(s => s.latencyMs !== undefined);
    if (withLatency.length === 0) return null;
    const sum = withLatency.reduce((acc, s) => acc + (s.latencyMs ?? 0), 0);
    return Math.round(sum / withLatency.length);
  }, [data?.services]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Service Health
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of backend microservices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground text-right">
            {data && (
              <>
                <div className="flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" />
                  {new Date(data.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-xs">Auto-refresh: 5s • Timeout: {data.timeoutMs}ms</div>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Total Services"
          value={stats.total}
          icon={Server}
          color="text-blue-600"
        />
        <SummaryCard
          title="Healthy"
          value={stats.healthy}
          icon={CheckCircle2}
          color="text-green-600"
        />
        <SummaryCard
          title="Unhealthy"
          value={stats.unhealthy}
          icon={XCircle}
          color="text-red-600"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
                <p className="text-3xl font-bold text-purple-600">
                  {avgLatency !== null ? `${avgLatency}ms` : '—'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Bar */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground w-24">Health Score</span>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${(stats.healthy / stats.total) * 100}%` }}
                  />
                  <div
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${(stats.unhealthy / stats.total) * 100}%` }}
                  />
                  <div
                    className="bg-gray-400 h-full transition-all"
                    style={{ width: `${(stats.notConfigured / stats.total) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold w-16 text-right">
                {stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-center gap-6 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Healthy ({stats.healthy})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Unhealthy ({stats.unhealthy})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-400" />
                <span>Not Configured ({stats.notConfigured})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backend Not Deployed Alert */}
      {stats.total > 0 && stats.healthy === 0 && stats.unhealthy === stats.total - stats.notConfigured && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Backend Services Not Reachable
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-300">
              All backend microservices are showing as unhealthy. This typically means:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2 list-disc list-inside">
              <li><strong>Backend not deployed:</strong> The microservices (identity, requests, audit, etc.) need to be deployed to a server</li>
              <li><strong>Wrong API URL:</strong> The <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded">NEXT_PUBLIC_API_BASE_URL</code> environment variable may be pointing to localhost</li>
              <li><strong>Network issue:</strong> The API gateway may not be accessible from this environment</li>
            </ul>
            <div className="pt-2 border-t border-amber-200 dark:border-amber-700">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                <strong>To fix:</strong> Deploy your backend services to a cloud provider (Railway, Render, Fly.io, AWS) 
                and update <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded">NEXT_PUBLIC_API_BASE_URL</code> in your Vercel environment variables.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Sort */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {(['all', 'healthy', 'unhealthy', 'not_configured'] as FilterOption[]).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'not_configured' ? 'Not Configured' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {(['name', 'status', 'latency'] as SortOption[]).map(s => (
              <Button
                key={s}
                variant={sort === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSort(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Unable to load status
            </CardTitle>
            <CardDescription className="text-red-600">
              {(error as Error).message}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Service Cards */}
      {!error && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              isExpanded={expandedCards.has(svc.id)}
              onToggle={() => toggleExpand(svc.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!error && filteredServices.length === 0 && data && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No services match the current filter.</p>
          </CardContent>
        </Card>
      )}

      {/* Category Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Service Categories
          </CardTitle>
          <CardDescription>
            Services are grouped by their function in the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded bg-blue-500" />
              <div>
                <p className="font-medium">Core Infrastructure</p>
                <p className="text-xs text-muted-foreground">Database, Auth, Gateway</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded bg-purple-500" />
              <div>
                <p className="font-medium">Business Services</p>
                <p className="text-xs text-muted-foreground">Requests, Bookings, Messaging</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded bg-orange-500" />
              <div>
                <p className="font-medium">Support Services</p>
                <p className="text-xs text-muted-foreground">Audit, Disputes, Notifications</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Deployment Configuration
          </CardTitle>
          <CardDescription>
            Configure your environment variables in Vercel or your deployment platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Required Environment Variables</h4>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
{`# API Gateway URL (points to your deployed backend)
NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway.example.com

# Health check timeout (ms)
NEXT_PUBLIC_SERVICE_HEALTH_TIMEOUT_MS=5000`}
            </pre>
          </div>
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-2">Backend Deployment Options</h4>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span><strong>Railway / Render:</strong> Deploy Docker containers from docker-compose.yml</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span><strong>Supabase:</strong> Already configured - just need the microservices</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span><strong>AWS / GCP:</strong> Use ECS, Cloud Run, or Kubernetes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
