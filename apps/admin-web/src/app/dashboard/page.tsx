'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/status-badge';
import { getDisputeStats, getRefundStats, getAuditStatistics, getRecentCriticalEvents } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import type { AuditEvent } from '@/types';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Gavel,
  LayoutDashboard,
  RefreshCw,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type ServiceStatus = {
  id: string;
  name: string;
  status: 'healthy' | 'unhealthy' | 'error' | 'not_configured';
  latencyMs?: number;
};

type StatusResponse = {
  timestamp: string;
  services: ServiceStatus[];
};

// ============================================================================
// DASHBOARD PAGE
// ============================================================================

export default function DashboardPage() {
  const { admin } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: disputeStats, isLoading: disputeLoading } = useQuery({
    queryKey: ['dispute-stats'],
    queryFn: getDisputeStats,
  });

  const { data: refundStats, isLoading: refundLoading } = useQuery({
    queryKey: ['refund-stats'],
    queryFn: getRefundStats,
  });

  const { data: auditStats, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => getAuditStatistics(30),
  });

  const { data: criticalEvents } = useQuery({
    queryKey: ['critical-events'],
    queryFn: () => getRecentCriticalEvents(5),
  });

  const { data: serviceStatus, refetch: refetchServices } = useQuery({
    queryKey: ['dashboard-services'],
    queryFn: async (): Promise<StatusResponse> => {
      const res = await fetch('/api/microservices/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Compute service health summary
  const serviceHealth = useMemo(() => {
    if (!serviceStatus?.services) return { healthy: 0, unhealthy: 0, total: 0, avgLatency: 0 };
    const services = serviceStatus.services.filter(s => s.status !== 'not_configured');
    const healthy = services.filter(s => s.status === 'healthy').length;
    const latencies = services.filter(s => s.latencyMs).map(s => s.latencyMs!);
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    return { healthy, unhealthy: services.length - healthy, total: services.length, avgLatency };
  }, [serviceStatus]);

  // Greeting based on time
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, [currentTime]);

  const isLoading = disputeLoading || refundLoading || auditLoading;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-7 w-7" />
              {greeting}, {admin?.firstName || 'Admin'}!
            </h1>
            <p className="text-blue-100 mt-1">
              Here&apos;s what&apos;s happening on the platform today
            </p>
            <div className="flex items-center gap-4 mt-4 text-sm text-blue-100">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/services">
                <Server className="h-4 w-4 mr-2" />
                Services
              </Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/audit">
                <FileText className="h-4 w-4 mr-2" />
                Audit Log
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* System Health Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${serviceHealth.unhealthy > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-sm font-medium">
                  System Status: {serviceHealth.unhealthy > 0 ? 'Degraded' : 'All Systems Operational'}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {serviceHealth.healthy} healthy
                </span>
                {serviceHealth.unhealthy > 0 && (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {serviceHealth.unhealthy} unhealthy
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-purple-500" />
                  {serviceHealth.avgLatency}ms avg
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchServices()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert Banner (if critical issues) */}
      {(criticalEvents && criticalEvents.length > 0) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800 dark:text-red-200">
              {criticalEvents.length} critical event{criticalEvents.length > 1 ? 's' : ''} requiring attention
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {criticalEvents[0]?.action} - {formatRelativeTime(criticalEvents[0]?.timestamp)}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="border-red-300 text-red-700 hover:bg-red-100">
            <Link href="/dashboard/audit?severity=critical">View All</Link>
          </Button>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Open Disputes"
          value={disputeStats?.totalOpen ?? 0}
          subtitle="Requiring action"
          icon={Gavel}
          iconColor="text-orange-500"
          iconBg="bg-orange-100"
          href="/dashboard/disputes"
          trend={disputeStats?.totalOpen && disputeStats.totalOpen > 5 ? 'up' : undefined}
          trendLabel={disputeStats?.totalOpen && disputeStats.totalOpen > 5 ? 'High volume' : undefined}
          loading={isLoading}
          urgent={disputeStats?.totalOpen !== undefined && disputeStats.totalOpen > 0}
        />
        <MetricCard
          title="Pending Refunds"
          value={refundStats?.pendingCount ?? 0}
          subtitle={formatCurrency(refundStats?.pendingAmount ?? 0, 'INR')}
          icon={CreditCard}
          iconColor="text-blue-500"
          iconBg="bg-blue-100"
          href="/dashboard/refunds"
          trend={refundStats?.pendingCount && refundStats.pendingCount > 10 ? 'up' : undefined}
          loading={isLoading}
          urgent={refundStats?.pendingCount !== undefined && refundStats.pendingCount > 0}
        />
        <MetricCard
          title="Agents Pending"
          value={0}
          subtitle="Awaiting approval"
          icon={Users}
          iconColor="text-purple-500"
          iconBg="bg-purple-100"
          href="/dashboard/agents?status=pending_approval"
          loading={isLoading}
        />
        <MetricCard
          title="Audit Events"
          value={auditStats?.totalEvents ?? 0}
          subtitle="Last 30 days"
          icon={Activity}
          iconColor="text-green-500"
          iconBg="bg-green-100"
          href="/dashboard/audit"
          loading={isLoading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStatCard
          label="Avg Resolution Time"
          value={`${disputeStats?.averageResolutionDays?.toFixed(1) ?? '—'} days`}
          icon={Clock}
          trend={disputeStats?.averageResolutionDays && disputeStats.averageResolutionDays < 3 ? 'good' : 'neutral'}
        />
        <MiniStatCard
          label="Approved This Month"
          value={refundStats?.approvedThisMonth ?? 0}
          icon={CheckCircle2}
          trend="good"
        />
        <MiniStatCard
          label="Rejected This Month"
          value={refundStats?.rejectedThisMonth ?? 0}
          icon={XCircle}
          trend="neutral"
        />
        <MiniStatCard
          label="Total Refunded"
          value={formatCurrency(refundStats?.totalRefundedThisMonth ?? 0, 'INR')}
          icon={DollarSign}
          trend="neutral"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dispute Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-orange-500" />
              Dispute Pipeline
            </CardTitle>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {disputeStats ? (
              <>
                <DisputeProgressBar
                  label="Under Review"
                  count={disputeStats.pendingReview}
                  total={disputeStats.totalOpen || 1}
                  color="bg-yellow-500"
                />
                <DisputeProgressBar
                  label="Awaiting User"
                  count={disputeStats.pendingUserResponse}
                  total={disputeStats.totalOpen || 1}
                  color="bg-blue-500"
                />
                <DisputeProgressBar
                  label="Awaiting Agent"
                  count={disputeStats.pendingAgentResponse}
                  total={disputeStats.totalOpen || 1}
                  color="bg-purple-500"
                />
                <div className="pt-4 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Resolved this month</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {disputeStats.resolvedThisMonth}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            )}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/dashboard/disputes">
                View All Disputes
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Refund Summary */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Refund Overview
            </CardTitle>
            <CardDescription>This month&apos;s activity</CardDescription>
          </CardHeader>
          <CardContent>
            {refundStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{refundStats.approvedThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{refundStats.rejectedThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Refunded</span>
                    <span className="font-medium">{formatCurrency(refundStats.totalRefundedThisMonth, 'INR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average Amount</span>
                    <span className="font-medium">{formatCurrency(refundStats.averageRefundAmount, 'INR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending Review</span>
                    <span className="font-medium text-orange-600">{refundStats.pendingCount}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <Link href="/dashboard/refunds">
                View All Refunds
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <QuickActionButton
                href="/dashboard/agents?status=pending_approval"
                icon={Users}
                title="Review Agents"
                description="Approve pending applications"
                color="text-purple-500"
              />
              <QuickActionButton
                href="/dashboard/disputes?status=opened"
                icon={Gavel}
                title="Handle Disputes"
                description="Review open cases"
                color="text-orange-500"
              />
              <QuickActionButton
                href="/dashboard/refunds?status=pending_review"
                icon={CreditCard}
                title="Process Refunds"
                description="Approve or reject requests"
                color="text-blue-500"
              />
              <QuickActionButton
                href="/dashboard/matching"
                icon={Users}
                title="Matching Overrides"
                description="Manual agent assignment"
                color="text-green-500"
              />
              <QuickActionButton
                href="/dashboard/audit"
                icon={FileText}
                title="Audit Trail"
                description="Review system activity"
                color="text-gray-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Events & Service Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Critical Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-500" />
                Critical Events
              </CardTitle>
              <CardDescription>Recent events requiring attention</CardDescription>
            </div>
            <Badge variant="outline" className="text-red-500 border-red-200">
              {criticalEvents?.length ?? 0} events
            </Badge>
          </CardHeader>
          <CardContent>
            {criticalEvents && criticalEvents.length > 0 ? (
              <div className="space-y-3">
                {criticalEvents.map((event) => (
                  <CriticalEventItem key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 opacity-50" />
                <p className="text-muted-foreground mt-2">No critical events</p>
                <p className="text-xs text-muted-foreground">All systems running smoothly</p>
              </div>
            )}
            <Button variant="ghost" size="sm" className="w-full mt-4" asChild>
              <Link href="/dashboard/audit?severity=critical">
                View All Critical Events
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Service Status Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                Service Status
              </CardTitle>
              <CardDescription>Backend microservice health</CardDescription>
            </div>
            <Badge 
              variant="outline" 
              className={serviceHealth.unhealthy > 0 ? 'text-red-500 border-red-200' : 'text-green-500 border-green-200'}
            >
              {serviceHealth.healthy}/{serviceHealth.total} healthy
            </Badge>
          </CardHeader>
          <CardContent>
            {serviceStatus?.services ? (
              <div className="grid grid-cols-2 gap-2">
                {serviceStatus.services.slice(0, 8).map((service) => (
                  <ServiceStatusItem key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Loading services...</div>
            )}
            <Button variant="ghost" size="sm" className="w-full mt-4" asChild>
              <Link href="/dashboard/services">
                View All Services
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer Stats */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Logged in as <strong className="text-foreground">{admin?.email}</strong></span>
            </div>
            <div className="flex items-center gap-4">
              <span>Session: {admin?.role}</span>
              <span>•</span>
              <span>Last refresh: {currentTime.toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  href,
  trend,
  trendLabel,
  loading,
  urgent,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  href: string;
  trend?: 'up' | 'down';
  trendLabel?: string;
  loading?: boolean;
  urgent?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={`hover:shadow-md transition-all cursor-pointer group ${urgent ? 'border-orange-300 dark:border-orange-700' : ''}`}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl ${iconBg}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendLabel}
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold">
              {loading ? '—' : value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniStatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend: 'good' | 'bad' | 'neutral';
}) {
  const trendColors = {
    good: 'text-green-500',
    bad: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${trendColors[trend]}`} />
          <div>
            <p className="text-lg font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DisputeProgressBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors group"
    >
      <div className="p-2 rounded-lg bg-muted group-hover:bg-background transition-colors">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function CriticalEventItem({ event }: { event: AuditEvent }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{event.action}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {event.actorEmail} • {formatRelativeTime(event.timestamp)}
        </p>
        {event.reason && (
          <p className="text-xs mt-1 text-red-600 dark:text-red-400 truncate">
            {event.reason}
          </p>
        )}
      </div>
    </div>
  );
}

function ServiceStatusItem({ service }: { service: ServiceStatus }) {
  const isHealthy = service.status === 'healthy';
  const isNotConfigured = service.status === 'not_configured';

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${
      isNotConfigured ? 'bg-gray-50 dark:bg-gray-900/20' : 
      isHealthy ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
    }`}>
      <div className={`h-2 w-2 rounded-full ${
        isNotConfigured ? 'bg-gray-400' :
        isHealthy ? 'bg-green-500' : 'bg-red-500 animate-pulse'
      }`} />
      <span className="text-xs font-medium truncate flex-1">{service.name}</span>
      {service.latencyMs && (
        <span className="text-xs text-muted-foreground">{service.latencyMs}ms</span>
      )}
    </div>
  );
}
