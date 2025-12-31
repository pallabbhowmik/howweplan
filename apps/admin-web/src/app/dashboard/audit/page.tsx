'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryAuditEvents, getAuditStatistics, exportAuditEvents } from '@/lib/api';
import type { AuditQueryFilters, AuditCategory, AuditSeverity } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/admin/status-badge';
import { AuditTrail } from '@/components/admin/audit-trail';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatDateTime, formatRelativeTime, snakeToTitle } from '@/lib/utils';
import { env } from '@/config/env';

// ============================================================================
// AUDIT PAGE
// ============================================================================

const CATEGORY_OPTIONS: { value: AuditCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'agent_management', label: 'Agents' },
  { value: 'dispute', label: 'Disputes' },
  { value: 'refund', label: 'Refunds' },
  { value: 'matching', label: 'Matching' },
  { value: 'booking', label: 'Bookings' },
  { value: 'payment', label: 'Payments' },
  { value: 'authentication', label: 'Auth' },
  { value: 'system', label: 'System' },
];

const SEVERITY_OPTIONS: { value: AuditSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditQueryFilters>({});
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch audit events
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-events', filters, page],
    queryFn: () => queryAuditEvents({ 
      filters, 
      page, 
      pageSize: env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE 
    }),
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => getAuditStatistics(30),
  });

  // Handle filter changes
  const updateFilter = <K extends keyof AuditQueryFilters>(
    key: K,
    value: AuditQueryFilters[K] | 'all'
  ) => {
    setPage(1);
    if (value === 'all') {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [key]: value });
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const result = await exportAuditEvents({
        filters,
        format,
        includeMetadata: true,
      });
      // Open download URL
      window.open(result.downloadUrl, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">
            Complete record of all platform actions and state changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={isExporting}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Events"
            value={stats.totalEvents}
            subtitle="Last 30 days"
          />
          <StatCard
            title="Critical Events"
            value={stats.recentCriticalEvents}
            subtitle="Requiring review"
            variant={stats.recentCriticalEvents > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="By Category"
            value={Object.keys(stats.eventsByCategory).length}
            subtitle="Active categories"
          />
          <StatCard
            title="Admin Actions"
            value={stats.eventsByActorType.admin || 0}
            subtitle="Last 30 days"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Category Filter */}
            <div>
              <Label className="text-xs">Category</Label>
              <select
                value={filters.category || 'all'}
                onChange={(e) => updateFilter('category', e.target.value as AuditCategory | 'all')}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <Label className="text-xs">Severity</Label>
              <select
                value={filters.severity || 'all'}
                onChange={(e) => updateFilter('severity', e.target.value as AuditSeverity | 'all')}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={filters.startDate?.split('T')[0] || ''}
                onChange={(e) => updateFilter('startDate', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={filters.endDate?.split('T')[0] || ''}
                onChange={(e) => updateFilter('endDate', e.target.value ? `${e.target.value}T23:59:59Z` : undefined)}
                className="h-9 mt-1"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div>
              <Label className="text-xs">Search</Label>
              <Input
                placeholder="Search actions, reasons..."
                value={filters.searchTerm || ''}
                onChange={(e) => updateFilter('searchTerm', e.target.value || undefined)}
                className="h-9 mt-1"
              />
            </div>

            {/* Actor ID */}
            <div>
              <Label className="text-xs">Actor ID</Label>
              <Input
                placeholder="Admin/User ID"
                value={filters.actorId || ''}
                onChange={(e) => updateFilter('actorId', e.target.value || undefined)}
                className="h-9 mt-1"
              />
            </div>

            {/* Target ID */}
            <div>
              <Label className="text-xs">Target ID</Label>
              <Input
                placeholder="Agent/Booking/Dispute ID"
                value={filters.targetId || ''}
                onChange={(e) => updateFilter('targetId', e.target.value || undefined)}
                className="h-9 mt-1"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {Object.keys(filters).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
            >
              Clear all filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Events {auditData?.totalCount !== undefined && `(${auditData.totalCount})`}
          </CardTitle>
          <CardDescription>
            Showing page {page} • {env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE} per page
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : auditData?.events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit events found
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {auditData?.events.map((event) => (
                  <AuditEventRow key={event.id} event={event} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!auditData?.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  variant = 'default',
}: {
  title: string;
  value: number;
  subtitle: string;
  variant?: 'default' | 'warning';
}) {
  return (
    <Card className={variant === 'warning' ? 'border-yellow-500/50' : ''}>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function AuditEventRow({ event }: { event: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{event.action}</span>
              <StatusBadge status={event.severity} size="sm" />
              <span className="text-xs px-2 py-0.5 bg-muted rounded">
                {snakeToTitle(event.category)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              by {event.actorEmail || event.actorId} ({snakeToTitle(event.actorType)})
            </p>
            {event.reason && (
              <p className="text-sm">
                <span className="text-muted-foreground">Reason:</span> {event.reason}
              </p>
            )}
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{formatRelativeTime(event.timestamp)}</div>
            <div className="text-xs">{formatDateTime(event.timestamp)}</div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Event ID</Label>
              <p className="font-mono text-xs">{event.id}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Correlation ID</Label>
              <p className="font-mono text-xs">{event.correlationId}</p>
            </div>
            {event.targetType && (
              <div>
                <Label className="text-xs text-muted-foreground">Target</Label>
                <p>{snakeToTitle(event.targetType)} #{event.targetId?.slice(0, 8)}</p>
              </div>
            )}
            {event.ipAddress && (
              <div>
                <Label className="text-xs text-muted-foreground">IP Address</Label>
                <p className="font-mono text-xs">{event.ipAddress}</p>
              </div>
            )}
          </div>

          {Object.keys(event.metadata || {}).length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Metadata</Label>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}

          {(event.previousState || event.newState) && (
            <div className="grid grid-cols-2 gap-4">
              {event.previousState && (
                <div>
                  <Label className="text-xs text-muted-foreground">Previous State</Label>
                  <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/10 rounded text-xs overflow-auto max-h-24">
                    {JSON.stringify(event.previousState, null, 2)}
                  </pre>
                </div>
              )}
              {event.newState && (
                <div>
                  <Label className="text-xs text-muted-foreground">New State</Label>
                  <pre className="mt-1 p-2 bg-green-50 dark:bg-green-900/10 rounded text-xs overflow-auto max-h-24">
                    {JSON.stringify(event.newState, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
