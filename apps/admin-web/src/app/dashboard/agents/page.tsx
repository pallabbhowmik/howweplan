'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { listAgents, approveAgent, suspendAgent, reactivateAgent, rejectAgent, getAgent } from '@/lib/api';
import type { AgentFilters } from '@/lib/api';
import type { Agent, AgentStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/admin/status-badge';
import { ReasonDialog } from '@/components/admin/reason-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Star,
  AlertTriangle,
  Download,
  Copy,
  CheckSquare,
  Square,
  RefreshCw,
  Search,
  XCircle,
  Mail,
  Calendar,
  TrendingUp,
  Shield,
  Filter,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type AgentActionType = 'approve' | 'suspend' | 'reactivate' | 'reject';
type SortField = 'createdAt' | 'rating' | 'bookings';
type SortDirection = 'asc' | 'desc';

const STATUS_TABS: { value: AgentStatus | 'all'; label: string; icon?: React.ReactNode }[] = [
  { value: 'all', label: 'All Agents', icon: <Users className="h-4 w-4" /> },
  { value: 'pending_approval', label: 'Pending', icon: <Clock className="h-4 w-4" /> },
  { value: 'approved', label: 'Approved', icon: <UserCheck className="h-4 w-4" /> },
  { value: 'suspended', label: 'Suspended', icon: <UserX className="h-4 w-4" /> },
  { value: 'rejected', label: 'Rejected', icon: <XCircle className="h-4 w-4" /> },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'createdAt', label: 'Date Joined' },
  { value: 'rating', label: 'Rating' },
  { value: 'bookings', label: 'Bookings' },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AgentsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { getActionContext } = useAuth();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>(
    (searchParams.get('status') as AgentStatus) || 'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [minRating, setMinRating] = useState<number | undefined>();
  const [hasDisputes, setHasDisputes] = useState<boolean | undefined>();
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);

  // Selection state
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Action dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<{
    type: AgentActionType;
    agent: Agent;
  } | null>(null);

  // Build filters
  const filters: AgentFilters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(searchTerm && { search: searchTerm }),
    ...(minRating !== undefined && { minRating }),
    ...(hasDisputes !== undefined && { hasDisputes }),
  };

  const sort = useMemo(
    () => ({ field: sortField, direction: sortDirection } as const),
    [sortField, sortDirection]
  );

  const isFiltered = statusFilter !== 'all' || Boolean(searchTerm) || minRating !== undefined || hasDisputes !== undefined;

  const resetFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setMinRating(undefined);
    setHasDisputes(undefined);
    setSortField('createdAt');
    setSortDirection('desc');
    setPage(1);
    setSelectedAgents(new Set());
  };

  // Fetch agents list
  const {
    data: agentsData,
    isLoading,
    isFetching,
    refetch,
    error: listError,
  } = useQuery({
    queryKey: ['agents', filters, sort, page],
    queryFn: () => listAgents({ filters, sort, page, pageSize: 25 }),
    refetchInterval: 30000,
  });

  // Fetch selected agent details
  const {
    data: selectedAgent,
    isLoading: isLoadingDetails,
  } = useQuery({
    queryKey: ['agent', selectedAgentId],
    queryFn: () => getAgent(selectedAgentId!),
    enabled: !!selectedAgentId,
  });

  // Calculate stats from current data
  const stats = useMemo(() => {
    const items = agentsData?.items || [];
    const ratedAgents = items.filter(a => a.averageRating);
    return {
      total: agentsData?.totalCount || 0,
      pending: items.filter(a => a.status === 'pending_approval').length,
      approved: items.filter(a => a.status === 'approved').length,
      suspended: items.filter(a => a.status === 'suspended').length,
      avgRating: ratedAgents.length > 0 
        ? ratedAgents.reduce((sum, a) => sum + (a.averageRating || 0), 0) / ratedAgents.length
        : 0,
      totalBookings: items.reduce((sum, a) => sum + a.totalBookings, 0),
      withDisputes: items.filter(a => a.disputeCount > 0).length,
    };
  }, [agentsData]);

  // SLA tracking (pending approvals should be reviewed within 48 hours)
  const getSLAStatus = useCallback((agent: Agent): { status: 'ok' | 'warning' | 'breached'; hoursRemaining: number } => {
    if (agent.status !== 'pending_approval') return { status: 'ok', hoursRemaining: 999 };
    const ageInHours = (Date.now() - new Date(agent.applicationDate).getTime()) / (1000 * 60 * 60);
    const slaHours = 48;
    const hoursRemaining = slaHours - ageInHours;
    
    if (hoursRemaining < 0) return { status: 'breached', hoursRemaining: 0 };
    if (hoursRemaining < 12) return { status: 'warning', hoursRemaining };
    return { status: 'ok', hoursRemaining };
  }, []);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (!agentsData?.items) return;
    
    const headers = ['ID', 'Name', 'Email', 'Status', 'Application Date', 'Total Bookings', 'Rating', 'Disputes'];
    const rows = agentsData.items.map(agent => [
      agent.id,
      `${agent.firstName} ${agent.lastName}`,
      agent.email,
      agent.status,
      agent.applicationDate,
      agent.totalBookings,
      agent.averageRating || 'N/A',
      agent.disputeCount,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [agentsData]);

  // Copy agent link
  const copyAgentLink = useCallback((agentId: string) => {
    const link = `${window.location.origin}/dashboard/agents?id=${agentId}`;
    navigator.clipboard.writeText(link);
  }, []);

  // Bulk selection
  const toggleSelectAll = useCallback(() => {
    if (selectedAgents.size === agentsData?.items.length) {
      setSelectedAgents(new Set());
    } else {
      setSelectedAgents(new Set(agentsData?.items.map(a => a.id) || []));
    }
  }, [selectedAgents, agentsData]);

  const toggleSelectAgent = useCallback((id: string) => {
    const newSet = new Set(selectedAgents);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedAgents(newSet);
  }, [selectedAgents]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const items = agentsData?.items || [];
        if (!selectedAgentId && items.length > 0) {
          setSelectedAgentId(items[0].id);
        } else if (selectedAgentId) {
          const currentIndex = items.findIndex(a => a.id === selectedAgentId);
          if (currentIndex < items.length - 1) {
            setSelectedAgentId(items[currentIndex + 1].id);
          }
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const items = agentsData?.items || [];
        if (selectedAgentId) {
          const currentIndex = items.findIndex(a => a.id === selectedAgentId);
          if (currentIndex > 0) {
            setSelectedAgentId(items[currentIndex - 1].id);
          }
        }
      } else if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        void refetch();
      } else if (e.key === 'Escape') {
        setSelectedAgentId(null);
      } else if (e.key === 'c' && selectedAgentId) {
        e.preventDefault();
        copyAgentLink(selectedAgentId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAgentId, agentsData, refetch, copyAgentLink]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ agentId, reason }: { agentId: string; reason: string }) =>
      approveAgent(getActionContext(), agentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', selectedAgentId] });
      setDialogOpen(false);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ agentId, reason }: { agentId: string; reason: string }) =>
      suspendAgent(getActionContext(), agentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', selectedAgentId] });
      setDialogOpen(false);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: ({ agentId, reason }: { agentId: string; reason: string }) =>
      reactivateAgent(getActionContext(), agentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', selectedAgentId] });
      setDialogOpen(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ agentId, reason }: { agentId: string; reason: string }) =>
      rejectAgent(getActionContext(), agentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', selectedAgentId] });
      setDialogOpen(false);
    },
  });

  // Handle action
  const handleAction = async (reason: string) => {
    if (!dialogAction) return;

    const { type, agent } = dialogAction;
    switch (type) {
      case 'approve':
        await approveMutation.mutateAsync({ agentId: agent.id, reason });
        break;
      case 'suspend':
        await suspendMutation.mutateAsync({ agentId: agent.id, reason });
        break;
      case 'reactivate':
        await reactivateMutation.mutateAsync({ agentId: agent.id, reason });
        break;
      case 'reject':
        await rejectMutation.mutateAsync({ agentId: agent.id, reason });
        break;
    }
  };

  // Open action dialog
  const openActionDialog = (type: AgentActionType, agent: Agent) => {
    setDialogAction({ type, agent });
    setDialogOpen(true);
  };

  // Get dialog config
  const getDialogConfig = () => {
    if (!dialogAction) return { title: '', description: '', actionLabel: '', variant: 'default' as const };

    const { type, agent } = dialogAction;
    const agentName = `${agent.firstName} ${agent.lastName}`;

    switch (type) {
      case 'approve':
        return {
          title: 'Approve Agent',
          description: `You are about to approve ${agentName}'s application. They will be able to receive trip requests and start working.`,
          actionLabel: 'Approve Agent',
          variant: 'default' as const,
        };
      case 'suspend':
        return {
          title: 'Suspend Agent',
          description: `You are about to suspend ${agentName}'s account. They will not be able to receive new requests or communicate with users.`,
          actionLabel: 'Suspend Agent',
          variant: 'destructive' as const,
        };
      case 'reactivate':
        return {
          title: 'Reactivate Agent',
          description: `You are about to reactivate ${agentName}'s account. They will be able to receive requests again.`,
          actionLabel: 'Reactivate Agent',
          variant: 'default' as const,
        };
      case 'reject':
        return {
          title: 'Reject Application',
          description: `You are about to reject ${agentName}'s application. This action cannot be undone.`,
          actionLabel: 'Reject Application',
          variant: 'destructive' as const,
        };
    }
  };

  const dialogConfig = getDialogConfig();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Management</h1>
          <p className="text-muted-foreground">
            Review, approve, and manage travel agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/agents/verification">
            <Button variant="default" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Review Documents
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              {stats.suspended} suspended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalBookings} total bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withDisputes}</div>
            <p className="text-xs text-muted-foreground">
              agents have open disputes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Status Tabs and Search */}
            <div className="flex flex-col lg:flex-row gap-4">
              <Tabs
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as AgentStatus | 'all');
                  setPage(1);
                }}
                className="w-full lg:w-auto"
              >
                <TabsList className="grid grid-cols-5 w-full lg:w-auto">
                  {STATUS_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex-1 flex gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(showFilters && "bg-accent")}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Min Rating</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="0.0"
                    value={minRating ?? ''}
                    onChange={(e) => setMinRating(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-24"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Has Disputes</Label>
                  <select
                    value={hasDisputes === undefined ? '' : hasDisputes.toString()}
                    onChange={(e) => setHasDisputes(e.target.value === '' ? undefined : e.target.value === 'true')}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Any</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Sort By</Label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Order</Label>
                  <select
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value as SortDirection)}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>

                {isFiltered && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Bulk Actions */}
            {selectedAgents.size > 0 && (
              <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <span className="text-sm font-medium">
                  {selectedAgents.size} agent{selectedAgents.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedAgents(new Set())}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content - List and Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents List */}
        <Card className={cn("lg:col-span-2", selectedAgentId && "lg:col-span-2")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Agents {agentsData?.totalCount !== undefined && `(${agentsData.totalCount})`}
                </CardTitle>
                <CardDescription>
                  Use ↑↓ or j/k to navigate, Ctrl+R to refresh, Esc to close details
                </CardDescription>
              </div>
              {agentsData && agentsData.items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="gap-2"
                >
                  {selectedAgents.size === agentsData.items.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Select All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : listError ? (
              <div className="text-center py-12 text-destructive">
                Failed to load agents. Please try again.
              </div>
            ) : agentsData?.items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No agents found</p>
                {isFiltered && (
                  <Button variant="link" onClick={resetFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {agentsData?.items.map((agent) => {
                  const sla = getSLAStatus(agent);
                  return (
                    <AgentRow
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgentId === agent.id}
                      isChecked={selectedAgents.has(agent.id)}
                      slaStatus={sla}
                      onSelect={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}
                      onCheck={() => toggleSelectAgent(agent.id)}
                      onApprove={() => openActionDialog('approve', agent)}
                      onSuspend={() => openActionDialog('suspend', agent)}
                      onReactivate={() => openActionDialog('reactivate', agent)}
                      onReject={() => openActionDialog('reject', agent)}
                      onCopyLink={() => copyAgentLink(agent.id)}
                    />
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {agentsData && agentsData.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {page} of {agentsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!agentsData.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Detail Panel */}
        {selectedAgentId && (
          <Card className="lg:col-span-1 h-fit sticky top-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Agent Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAgentId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : selectedAgent ? (
                <AgentDetailPanel
                  agent={selectedAgent}
                  onApprove={() => openActionDialog('approve', selectedAgent)}
                  onSuspend={() => openActionDialog('suspend', selectedAgent)}
                  onReactivate={() => openActionDialog('reactivate', selectedAgent)}
                  onReject={() => openActionDialog('reject', selectedAgent)}
                  onCopyLink={() => copyAgentLink(selectedAgent.id)}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Agent not found
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reason Dialog */}
      <ReasonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        actionLabel={dialogConfig.actionLabel}
        actionVariant={dialogConfig.variant}
        onConfirm={handleAction}
      />
    </div>
  );
}

// ============================================================================
// AGENT ROW COMPONENT
// ============================================================================

function AgentRow({
  agent,
  isSelected,
  isChecked,
  slaStatus,
  onSelect,
  onCheck,
  onApprove,
  onSuspend,
  onReactivate,
  onReject,
  onCopyLink,
}: {
  agent: Agent;
  isSelected: boolean;
  isChecked: boolean;
  slaStatus: { status: 'ok' | 'warning' | 'breached'; hoursRemaining: number };
  onSelect: () => void;
  onCheck: () => void;
  onApprove: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onReject: () => void;
  onCopyLink: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors",
        isSelected ? "bg-accent border-primary" : "hover:bg-muted/50",
        slaStatus.status === 'breached' && "border-l-4 border-l-red-500",
        slaStatus.status === 'warning' && "border-l-4 border-l-yellow-500"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
    >
      <div className="flex items-center gap-4">
        <div role="checkbox" aria-checked={isChecked} tabIndex={0} onClick={(e) => { e.stopPropagation(); onCheck(); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onCheck(); } }} className="cursor-pointer">
          {isChecked ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          )}
        </div>

        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {agent.photoUrl ? (
            <img
              src={agent.photoUrl}
              alt={`${agent.firstName} ${agent.lastName}`}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <span className="text-lg font-medium">
              {agent.firstName[0]}{agent.lastName[0]}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {agent.firstName} {agent.lastName}
            </p>
            {slaStatus.status === 'breached' && (
              <Badge variant="destructive" className="text-xs">SLA Breached</Badge>
            )}
            {slaStatus.status === 'warning' && (
              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500">
                SLA {Math.round(slaStatus.hoursRemaining)}h
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{agent.email}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatRelativeTime(agent.applicationDate)}
            </span>
            {agent.totalBookings > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {agent.totalBookings} bookings
              </span>
            )}
            {agent.averageRating && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                {agent.averageRating.toFixed(1)}
              </span>
            )}
            {agent.disputeCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-3 w-3" />
                {agent.disputeCount} disputes
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <StatusBadge status={agent.status} />

        <div className="flex gap-1">
          {agent.status === 'pending_approval' && (
            <>
              <Button size="sm" onClick={onApprove}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={onReject}>
                Reject
              </Button>
            </>
          )}
          {agent.status === 'approved' && (
            <Button size="sm" variant="outline" onClick={onSuspend}>
              Suspend
            </Button>
          )}
          {agent.status === 'suspended' && (
            <Button size="sm" variant="outline" onClick={onReactivate}>
              Reactivate
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onCopyLink} title="Copy link">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AGENT DETAIL PANEL COMPONENT
// ============================================================================

function AgentDetailPanel({
  agent,
  onApprove,
  onSuspend,
  onReactivate,
  onReject,
  onCopyLink,
}: {
  agent: Agent;
  onApprove: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onReject: () => void;
  onCopyLink: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {agent.photoUrl ? (
            <img
              src={agent.photoUrl}
              alt={`${agent.firstName} ${agent.lastName}`}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <span className="text-2xl font-medium">
              {agent.firstName[0]}{agent.lastName[0]}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-lg">
            {agent.firstName} {agent.lastName}
          </h3>
          <StatusBadge status={agent.status} />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{agent.email}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Performance</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{agent.totalBookings}</div>
            <div className="text-xs text-muted-foreground">Total Bookings</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{agent.completedBookings}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold flex items-center gap-1">
              {agent.averageRating ? (
                <>
                  <Star className="h-4 w-4 text-yellow-500" />
                  {agent.averageRating.toFixed(1)}
                </>
              ) : (
                'N/A'
              )}
            </div>
            <div className="text-xs text-muted-foreground">Rating</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className={cn(
              "text-2xl font-bold",
              agent.disputeCount > 0 && "text-orange-500"
            )}>
              {agent.disputeCount}
            </div>
            <div className="text-xs text-muted-foreground">Disputes</div>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Timeline</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Applied</span>
            <span>{formatDate(agent.applicationDate)}</span>
          </div>
          {agent.approvalDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Approved</span>
              <span>{formatDate(agent.approvalDate)}</span>
            </div>
          )}
          {agent.suspensionDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Suspended</span>
              <span>{formatDate(agent.suspensionDate)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last Updated</span>
            <span>{formatRelativeTime(agent.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-4 border-t">
        {agent.status === 'pending_approval' && (
          <>
            <Button className="w-full" onClick={onApprove}>
              <UserCheck className="h-4 w-4 mr-2" />
              Approve Agent
            </Button>
            <Button className="w-full" variant="destructive" onClick={onReject}>
              <UserX className="h-4 w-4 mr-2" />
              Reject Application
            </Button>
          </>
        )}
        {agent.status === 'approved' && (
          <Button className="w-full" variant="outline" onClick={onSuspend}>
            <Shield className="h-4 w-4 mr-2" />
            Suspend Agent
          </Button>
        )}
        {agent.status === 'suspended' && (
          <Button className="w-full" variant="outline" onClick={onReactivate}>
            <UserCheck className="h-4 w-4 mr-2" />
            Reactivate Agent
          </Button>
        )}
        <Button className="w-full" variant="ghost" onClick={onCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Agent Link
        </Button>
      </div>
    </div>
  );
}
