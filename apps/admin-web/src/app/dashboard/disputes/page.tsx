'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import {
  listDisputes,
  getDispute,
  getDisputeStats,
  updateDisputeStatus,
  addDisputeNote,
  resolveDispute,
} from '@/lib/api';
import type { DisputeFilters } from '@/lib/api';
import type { Dispute, DisputeStatus, DisputeCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/admin/status-badge';
import { ReasonDialog } from '@/components/admin/reason-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDate, formatRelativeTime, formatCurrency, snakeToTitle } from '@/lib/utils';
import { 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  Download, 
  Copy, 
  CheckSquare,
  Square,
  TrendingUp,
  FileText,
  Filter,
  RefreshCw,
  Scale,
  Users,
  ShieldAlert,
  MessageSquare,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Search,
  XCircle,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// DISPUTES PAGE
// ============================================================================

const STATUS_OPTIONS: { value: DisputeStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'opened', label: 'Open' },
  { value: 'under_review', label: 'Review' },
  { value: 'pending_user_response', label: 'User' },
  { value: 'pending_agent_response', label: 'Agent' },
];

const CATEGORY_OPTIONS: { value: DisputeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'service_not_delivered', label: 'Not delivered' },
  { value: 'service_quality', label: 'Quality' },
  { value: 'pricing_discrepancy', label: 'Pricing' },
  { value: 'communication_issue', label: 'Communication' },
  { value: 'safety_concern', label: 'Safety' },
  { value: 'fraud_suspected', label: 'Fraud' },
  { value: 'other', label: 'Other' },
];

type SortField = 'createdAt' | 'updatedAt' | 'status';
type SortDirection = 'asc' | 'desc';
type Priority = 'critical' | 'high' | 'normal' | 'low';

export default function DisputesPage() {
  const queryClient = useQueryClient();
  const { getActionContext } = useAuth();

  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<DisputeCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [selectedDisputes, setSelectedDisputes] = useState<Set<string>>(new Set());

  // Dialog states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<DisputeStatus | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);

  // Build filters
  const filters: DisputeFilters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(categoryFilter !== 'all' && { category: categoryFilter }),
    ...(searchTerm && { bookingId: searchTerm }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const sort = useMemo(
    () => ({ field: sortField, direction: sortDirection } as const),
    [sortField, sortDirection]
  );

  const isFiltered =
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    priorityFilter !== 'all' ||
    Boolean(searchTerm) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const resetFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSortField('createdAt');
    setSortDirection('desc');
    setPage(1);
    setSelectedDisputes(new Set());
  };

  // Calculate priority based on age and category
  const calculatePriority = useCallback((dispute: any): Priority => {
    const ageInHours = (Date.now() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60);
    const isFraud = dispute.category === 'fraud_suspected';
    const isSafety = dispute.category === 'safety_concern';
    
    if (isFraud || isSafety) return 'critical';
    if (ageInHours > 72) return 'high';
    if (ageInHours > 48) return 'high';
    if (ageInHours > 24) return 'normal';
    return 'normal';
  }, []);

  // SLA tracking (disputes should be resolved within 72 hours)
  const getSLAStatus = useCallback((dispute: any): { status: 'ok' | 'warning' | 'breached'; hoursRemaining: number } => {
    const ageInHours = (Date.now() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60);
    const slaHours = 72;
    const hoursRemaining = slaHours - ageInHours;
    
    if (hoursRemaining < 0) return { status: 'breached', hoursRemaining: 0 };
    if (hoursRemaining < 24) return { status: 'warning', hoursRemaining };
    return { status: 'ok', hoursRemaining };
  }, []);

  // Fetch dispute stats
  const { data: disputeStats } = useQuery({
    queryKey: ['dispute-stats'],
    queryFn: getDisputeStats,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  // Fetch disputes list
  const {
    data: disputesData,
    isLoading: isLoadingList,
    isFetching: isFetchingList,
    refetch: refetchList,
    error: listError,
  } = useQuery({
    queryKey: ['disputes', filters, sort, page],
    queryFn: () => listDisputes({ filters, sort, page, pageSize: 25 }),
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (!disputesData?.items) return;
    
    const headers = ['ID', 'Status', 'Category', 'Priority', 'Booking ID', 'Created', 'Updated', 'SLA Status'];
    const rows = disputesData.items.map(dispute => {
      const priority = calculatePriority(dispute);
      const sla = getSLAStatus(dispute);
      return [
        dispute.id,
        dispute.status,
        dispute.category,
        priority,
        dispute.bookingId,
        dispute.createdAt,
        dispute.updatedAt,
        sla.status
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disputes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [disputesData, calculatePriority, getSLAStatus]);

  // Copy dispute link
  const copyDisputeLink = useCallback((disputeId: string) => {
    const link = `${window.location.origin}/dashboard/disputes?id=${disputeId}`;
    navigator.clipboard.writeText(link).then(() => {
      console.log('Link copied');
    });
  }, []);

  // Bulk actions
  const toggleSelectAll = useCallback(() => {
    if (selectedDisputes.size === disputesData?.items.length) {
      setSelectedDisputes(new Set());
    } else {
      setSelectedDisputes(new Set(disputesData?.items.map(d => d.id) || []));
    }
  }, [selectedDisputes, disputesData]);

  const toggleSelectDispute = useCallback((id: string) => {
    const newSet = new Set(selectedDisputes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDisputes(newSet);
  }, [selectedDisputes]);

  // Fetch selected dispute details
  const {
    data: selectedDispute,
    isLoading: isLoadingDetails,
    isFetching: isFetchingDetails,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: ['dispute', selectedDisputeId],
    queryFn: () => getDispute(selectedDisputeId!),
    enabled: !!selectedDisputeId,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const items = disputesData?.items || [];
        if (!selectedDisputeId && items.length > 0) {
          setSelectedDisputeId(items[0].id);
        } else if (selectedDisputeId) {
          const currentIndex = items.findIndex(d => d.id === selectedDisputeId);
          if (currentIndex < items.length - 1) {
            setSelectedDisputeId(items[currentIndex + 1].id);
          }
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const items = disputesData?.items || [];
        if (selectedDisputeId) {
          const currentIndex = items.findIndex(d => d.id === selectedDisputeId);
          if (currentIndex > 0) {
            setSelectedDisputeId(items[currentIndex - 1].id);
          }
        }
      } else if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        void refetchList();
        if (selectedDisputeId) void refetchDetails();
      } else if (e.key === 'c' && selectedDisputeId) {
        e.preventDefault();
        copyDisputeLink(selectedDisputeId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDisputeId, disputesData, refetchList, refetchDetails, copyDisputeLink]);

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ disputeId, status, reason }: { disputeId: string; status: DisputeStatus; reason: string }) =>
      updateDisputeStatus(getActionContext(), disputeId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['dispute', selectedDisputeId] });
      setStatusDialogOpen(false);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ disputeId, content, isInternal, reason }: { 
      disputeId: string; 
      content: string; 
      isInternal: boolean; 
      reason: string;
    }) => addDisputeNote(getActionContext(), disputeId, content, isInternal, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', selectedDisputeId] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ 
      disputeId, 
      resolution, 
      refundAmount, 
      summary, 
      reason 
    }: { 
      disputeId: string; 
      resolution: DisputeStatus; 
      refundAmount: number | null;
      summary: string;
      reason: string;
    }) => resolveDispute(getActionContext(), disputeId, resolution, refundAmount, summary, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['dispute', selectedDisputeId] });
      queryClient.invalidateQueries({ queryKey: ['dispute-stats'] });
      setResolveDialogOpen(false);
    },
  });

  const escalateMutation = useMutation({
    mutationFn: ({ disputeId, reason }: { disputeId: string; reason: string }) =>
      addDisputeNote(getActionContext(), disputeId, `🚨 ESCALATED: ${reason}`, true, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', selectedDisputeId] });
      setEscalateDialogOpen(false);
    },
  });

  const handleStatusChange = async (reason: string) => {
    if (!selectedDisputeId || !newStatus) return;
    await updateStatusMutation.mutateAsync({ 
      disputeId: selectedDisputeId, 
      status: newStatus, 
      reason 
    });
  };

  const handleEscalate = async (reason: string) => {
    if (!selectedDisputeId) return;
    await escalateMutation.mutateAsync({ 
      disputeId: selectedDisputeId, 
      reason 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dispute Resolution</h1>
              <p className="text-sm text-muted-foreground">
                Review and resolve user disputes • All actions are audit-logged
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
              <XCircle className="h-4 w-4 mr-1.5" />
              Clear filters
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetchList();
              if (selectedDisputeId) void refetchDetails();
            }}
            disabled={isFetchingList || isFetchingDetails}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isFetchingList || isFetchingDetails ? 'animate-spin' : ''}`} />
            {isFetchingList || isFetchingDetails ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {disputeStats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card
            className="cursor-pointer group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300"
            onClick={() => { setStatusFilter('opened'); setPage(1); }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Open Disputes</p>
                  <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{disputeStats.totalOpen}</p>
                  <p className="text-xs text-muted-foreground">Needs attention</p>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card
            className="cursor-pointer group relative overflow-hidden border-0 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40 hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-300"
            onClick={() => { setStatusFilter('under_review'); setPage(1); }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Under Review</p>
                  <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{disputeStats.pendingReview}</p>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </div>
                <div className="p-2.5 rounded-xl bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                  <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card
            className="cursor-pointer group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
            onClick={() => { setStatusFilter('pending_user_response'); setPage(1); }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Awaiting Response</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{disputeStats.pendingUserResponse + disputeStats.pendingAgentResponse}</p>
                  <p className="text-xs text-muted-foreground">Waiting on parties</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card
            className="cursor-pointer group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300"
            onClick={() => { setStatusFilter('all'); setPage(1); }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Resolved (Month)</p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{disputeStats.resolvedThisMonth}</p>
                  <p className="text-xs text-muted-foreground">Successfully closed</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions Toolbar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-background border shadow-sm">
            <Button
              variant={priorityFilter === 'critical' ? 'destructive' : 'ghost'}
              size="sm"
              onClick={() => {
                setPriorityFilter(priorityFilter === 'critical' ? 'all' : 'critical');
                setPage(1);
              }}
              className="gap-1.5 h-8"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Critical
            </Button>
            <Button
              variant={priorityFilter === 'high' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high');
                setPage(1);
              }}
              className="gap-1.5 h-8"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              High Priority
            </Button>
          </div>
          {selectedDisputes.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{selectedDisputes.size} selected</span>
              <button 
                onClick={() => setSelectedDisputes(new Set())} 
                className="ml-1 p-0.5 rounded hover:bg-primary/20 text-primary"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!disputesData?.items.length} className="gap-1.5 shadow-sm">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disputes List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filters */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Filters</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status tabs */}
              <Tabs
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as DisputeStatus | 'all');
                  setPage(1);
                }}
              >
                <TabsList className="w-full grid grid-cols-5 h-9 p-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <TabsTrigger key={opt.value} value={opt.value} className="text-xs px-1 data-[state=active]:shadow-sm">
                      {opt.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Category dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value as DisputeCategory | 'all');
                    setPage(1);
                  }}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search booking ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 pl-9 shadow-sm"
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sort by</Label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as typeof sortField)}
                    className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="createdAt">Newest first</option>
                    <option value="updatedAt">Recently updated</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div className="pt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 shadow-sm"
                    onClick={() => setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'))}
                  >
                    {sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* List */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1.5 hover:bg-muted rounded-md transition-colors"
                    title={selectedDisputes.size === disputesData?.items.length ? 'Deselect all' : 'Select all'}
                  >
                    {selectedDisputes.size === disputesData?.items.length ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <CardTitle className="text-sm font-semibold">
                    Disputes {disputesData?.totalCount !== undefined && <span className="text-muted-foreground font-normal">({disputesData.totalCount})</span>}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  {disputesData ? `${disputesData.page}/${disputesData.totalPages}` : isFetchingList ? 'Loading…' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {listError ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-3">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-sm font-medium text-destructive">{(listError as Error).message}</p>
                </div>
              ) : isLoadingList ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                  </div>
                  <p className="text-sm text-muted-foreground">Loading disputes...</p>
                </div>
              ) : disputesData?.items.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                    <Sparkles className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="font-semibold text-foreground">No disputes found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isFiltered ? 'Try adjusting your filters' : 'All clear! No active disputes.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {disputesData?.items.map((dispute) => {
                    const priority = calculatePriority(dispute);
                    const sla = getSLAStatus(dispute);
                    const isSelected = selectedDisputes.has(dispute.id);
                    const isActive = selectedDisputeId === dispute.id;
                    
                    return (
                      <div
                        key={dispute.id}
                        className={`flex items-start gap-3 p-4 transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? 'bg-primary/5 border-l-2 border-l-primary' 
                            : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectDispute(dispute.id);
                          }}
                          className="p-1 hover:bg-muted rounded-md transition-colors mt-0.5"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedDisputeId(dispute.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-semibold text-sm truncate">
                                #{dispute.id.slice(0, 8)}
                              </span>
                              <PriorityBadge priority={priority} />
                              {sla.status !== 'ok' && (
                                <Badge 
                                  variant={sla.status === 'breached' ? 'destructive' : 'outline'} 
                                  className="text-[10px] px-1.5 py-0 h-5 gap-1"
                                >
                                  <Clock className="h-3 w-3" />
                                  {sla.status === 'breached' ? 'SLA!' : `${Math.floor(sla.hoursRemaining)}h`}
                                </Badge>
                              )}
                            </div>
                            <StatusBadge status={dispute.status} size="sm" />
                          </div>
                          <p className="text-xs font-medium text-foreground/80 mb-1.5">
                            {snakeToTitle(dispute.category)}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{dispute.bookingId.slice(0, 12)}...</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(dispute.createdAt)}
                            </span>
                            {dispute.updatedAt !== dispute.createdAt && (
                              <span className="flex items-center gap-1">
                                <ArrowUpRight className="h-3 w-3" />
                                {formatRelativeTime(dispute.updatedAt)}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {disputesData && disputesData.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={disputesData.page <= 1}
                className="shadow-sm"
              >
                <ChevronUp className="h-4 w-4 mr-1 rotate-[-90deg]" />
                Previous
              </Button>
              <div className="text-xs text-muted-foreground font-medium">
                <span className="text-foreground">{disputesData.page * disputesData.pageSize - disputesData.pageSize + 1}</span>
                {' - '}
                <span className="text-foreground">{Math.min(disputesData.page * disputesData.pageSize, disputesData.totalCount)}</span>
                {' of '}
                <span className="text-foreground">{disputesData.totalCount}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(disputesData.totalPages, p + 1))}
                disabled={disputesData.page >= disputesData.totalPages}
                className="shadow-sm"
              >
                Next
                <ChevronDown className="h-4 w-4 ml-1 rotate-[-90deg]" />
              </Button>
            </div>
          )}
        </div>

        {/* Dispute Details */}
        <div className="lg:col-span-2">
          {selectedDispute ? (
            <DisputeDetail
              dispute={selectedDispute}
              priority={calculatePriority(selectedDispute)}
              sla={getSLAStatus(selectedDispute)}
              onChangeStatus={(status) => {
                setNewStatus(status);
                setStatusDialogOpen(true);
              }}
              onResolve={() => setResolveDialogOpen(true)}
              onEscalate={() => setEscalateDialogOpen(true)}
              onCopyLink={() => copyDisputeLink(selectedDispute.id)}
              onAddNote={(content, isInternal) => {
                addNoteMutation.mutate({
                  disputeId: selectedDispute.id,
                  content,
                  isInternal,
                  reason: `Adding ${isInternal ? 'internal' : 'public'} note to dispute`,
                });
              }}
              isLoading={isLoadingDetails}
            />
          ) : (
            <Card className="border-0 shadow-md h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 mb-6">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="font-semibold text-lg mb-2">Select a dispute</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Choose a dispute from the list to view details, timeline, and take actions.
                </p>
                <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <kbd className="px-2 py-1 rounded bg-muted border">↑↓</kbd>
                  <span>or</span>
                  <kbd className="px-2 py-1 rounded bg-muted border">J/K</kbd>
                  <span>to navigate</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Change Dialog */}
      <ReasonDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title="Update Dispute Status"
        description={`Change status to "${newStatus ? snakeToTitle(newStatus) : ''}". This will notify both parties.`}
        actionLabel="Update Status"
        onConfirm={handleStatusChange}
      />

      {/* Resolve Dialog */}
      {selectedDispute && (
        <ResolveDisputeDialog
          open={resolveDialogOpen}
          onOpenChange={setResolveDialogOpen}
          dispute={selectedDispute}
          onResolve={async (resolution, refundAmount, summary, reason) => {
            await resolveMutation.mutateAsync({
              disputeId: selectedDispute.id,
              resolution,
              refundAmount,
              summary,
              reason,
            });
          }}
        />
      )}

      {/* Escalate Dialog */}
      <ReasonDialog
        open={escalateDialogOpen}
        onOpenChange={setEscalateDialogOpen}
        title="Escalate Dispute"
        description="Mark this dispute as escalated and add it to the high-priority queue. This will notify senior staff."
        actionLabel="Escalate"
        actionVariant="destructive"
        placeholder="Explain why this dispute needs escalation..."
        onConfirm={handleEscalate}
      />
    </div>
  );
}

// ============================================================================
// DISPUTE DETAIL COMPONENT
// ============================================================================

function DisputeDetail({
  dispute,
  priority,
  sla,
  onChangeStatus,
  onResolve,
  onEscalate,
  onCopyLink,
  onAddNote,
  isLoading,
}: {
  dispute: any;
  priority: Priority;
  sla: { status: 'ok' | 'warning' | 'breached'; hoursRemaining: number };
  onChangeStatus: (status: DisputeStatus) => void;
  onResolve: () => void;
  onEscalate: () => void;
  onCopyLink: () => void;
  onAddNote: (content: string, isInternal: boolean) => void;
  isLoading: boolean;
}) {
  const [noteContent, setNoteContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [detailTab, setDetailTab] = useState<'overview' | 'timeline' | 'evidence' | 'notes'>('overview');
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
            <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading dispute details...</p>
        </CardContent>
      </Card>
    );
  }

  const isResolved = dispute.status.startsWith('resolved') || dispute.status === 'closed_no_action';

  const bookingCurrency: string | undefined = dispute?.booking?.currency;
  const refundCurrency = bookingCurrency ?? 'INR';

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                  <Scale className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-xl">Dispute #{dispute.id.slice(0, 8)}</CardTitle>
                    <PriorityBadge priority={priority} />
                    {sla.status === 'breached' && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        SLA Breached
                      </Badge>
                    )}
                    {sla.status === 'warning' && (
                      <Badge variant="outline" className="text-xs gap-1 border-yellow-500 text-yellow-600">
                        <Clock className="h-3 w-3" />
                        {Math.floor(sla.hoursRemaining)}h remaining
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {snakeToTitle(dispute.category)} • Booking <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{dispute.bookingId.slice(0, 12)}...</span>
                    {' '}• Created {formatDate(dispute.createdAt)}
                  </CardDescription>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onCopyLink();
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shadow-sm gap-1.5"
              >
                {copied ? (
                  <>
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
              <StatusBadge status={dispute.status} />
              {!isResolved && (
                <>
                  <Button variant="outline" onClick={onEscalate} className="shadow-sm gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950">
                    <TrendingUp className="h-4 w-4" />
                    Escalate
                  </Button>
                  <Button onClick={onResolve} className="shadow-sm gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700">
                    <CheckSquare className="h-4 w-4" />
                    Resolve
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!isResolved && (
            <div className="flex gap-2 flex-wrap p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground self-center mr-2">Quick actions:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChangeStatus('under_review')}
                disabled={dispute.status === 'under_review'}
                className="h-8 text-xs shadow-sm"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Under Review
              </Button>
              <Button variant="outline" size="sm" onClick={() => onChangeStatus('pending_user_response')} className="h-8 text-xs shadow-sm">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Request User Info
              </Button>
              <Button variant="outline" size="sm" onClick={() => onChangeStatus('pending_agent_response')} className="h-8 text-xs shadow-sm">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Request Agent Info
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Tabs */}
      <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as any)}>
        <TabsList className="w-full grid grid-cols-4 p-1 h-11 bg-muted/50">
          <TabsTrigger value="overview" className="text-sm gap-1.5 data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-sm gap-1.5 data-[state=active]:shadow-sm">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="evidence" className="text-sm gap-1.5 data-[state=active]:shadow-sm">
            <Paperclip className="h-4 w-4" />
            Evidence
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-sm gap-1.5 data-[state=active]:shadow-sm">
            <MessageSquare className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Case Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-muted/50">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                <p className="mt-2 text-sm leading-relaxed">{dispute.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">User</Label>
                  </div>
                  <p className="font-semibold">
                    {dispute.user?.firstName} {dispute.user?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{dispute.user?.email}</p>
                </div>
                <div className="p-4 rounded-xl border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-purple-500/10">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Agent</Label>
                  </div>
                  <p className="font-semibold">
                    {dispute.agent?.firstName} {dispute.agent?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{dispute.agent?.email}</p>
                </div>
              </div>

              {dispute.booking && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                      <FileText className="h-4 w-4 text-emerald-600" />
                    </div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Booking Details</Label>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(dispute.booking.amount, dispute.booking.currency)}
                    </p>
                    <StatusBadge status={dispute.booking.status} size="sm" />
                  </div>
                </div>
              )}

              {dispute.refundAmount !== null && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <TrendingUp className="h-4 w-4 text-amber-600" />
                    </div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Refund Amount</Label>
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {formatCurrency(dispute.refundAmount, refundCurrency)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-card">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Created</Label>
                  <p className="mt-2 font-medium">{formatRelativeTime(dispute.createdAt)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(dispute.createdAt)}</p>
                </div>
                <div className="p-4 rounded-xl border bg-card">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Last Updated</Label>
                  <p className="mt-2 font-medium">{formatRelativeTime(dispute.updatedAt)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(dispute.updatedAt)}</p>
                </div>
              </div>

              {/* Response Time Metrics */}
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10">
                    <Clock className="h-4 w-4 text-indigo-600" />
                  </div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Response Metrics</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Dispute Age</p>
                    <p className="text-lg font-semibold">
                      {Math.floor((Date.now() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60))} hours
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Priority Level</p>
                    <div className="mt-1">
                      <PriorityBadge priority={priority} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Timeline
              </CardTitle>
              <CardDescription>Chronological history of the dispute</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(dispute.timeline) && dispute.timeline.length > 0 ? (
                <div className="relative space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-3 bottom-3 w-px bg-border" />
                  {dispute.timeline.map((entry: any, idx: number) => (
                    <div key={`${entry.timestamp}-${idx}`} className="relative pl-10 pb-6 last:pb-0">
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-semibold">{snakeToTitle(entry.type)}</p>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {formatRelativeTime(entry.timestamp)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">Action by: <span className="font-medium text-foreground">{entry.actor}</span></p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No timeline entries available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="mt-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Evidence
              </CardTitle>
              <CardDescription>Attachments and references provided by both parties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">User Evidence</Label>
                </div>
                {Array.isArray(dispute.userEvidence) && dispute.userEvidence.length > 0 ? (
                  <div className="space-y-2">
                    {dispute.userEvidence.map((item: string, idx: number) => (
                      <EvidenceItem key={`user-${idx}`} value={item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">No evidence submitted</p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-purple-500/10">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Agent Evidence</Label>
                </div>
                {Array.isArray(dispute.agentEvidence) && dispute.agentEvidence.length > 0 ? (
                  <div className="space-y-2">
                    {dispute.agentEvidence.map((item: string, idx: number) => (
                      <EvidenceItem key={`agent-${idx}`} value={item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">No evidence submitted</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Notes & Communication
              </CardTitle>
              <CardDescription>Internal notes and public messages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Add note form */}
                <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                  <Textarea
                    placeholder="Write a note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    className="resize-none bg-background"
                  />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isInternalNote ? 'bg-primary border-primary' : 'border-input hover:border-primary/50'
                      }`}>
                        {isInternalNote && <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="sr-only"
                      />
                      <span className="text-muted-foreground">Internal note (not visible to user/agent)</span>
                    </label>
                    <Button
                      size="sm"
                      disabled={!noteContent.trim()}
                      onClick={() => {
                        onAddNote(noteContent, isInternalNote);
                        setNoteContent('');
                      }}
                      className="gap-1.5 shadow-sm"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Add Note
                    </Button>
                  </div>
                </div>

                {/* Notes list */}
                {Array.isArray(dispute.adminNotes) && dispute.adminNotes.length > 0 ? (
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Previous Notes</Label>
                    {dispute.adminNotes.map((note: any) => (
                      <div
                        key={note.id}
                        className={`p-4 rounded-xl border transition-colors ${
                          note.isInternal 
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50' 
                            : 'bg-card hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={note.isInternal ? 'secondary' : 'outline'} 
                            className={`text-[10px] ${
                              note.isInternal 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' 
                                : ''
                            }`}
                          >
                            {note.isInternal ? '🔒 Internal' : '📤 Public'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 rounded-xl border border-dashed">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                      <MessageSquare className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Add a note above to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// RESOLVE DIALOG COMPONENT
// ============================================================================

function ResolveDisputeDialog({
  open,
  onOpenChange,
  dispute,
  onResolve,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispute: Dispute;
  onResolve: (resolution: DisputeStatus, refundAmount: number | null, summary: string, reason: string) => Promise<void>;
}) {
  const [resolution, setResolution] = useState<DisputeStatus>('resolved_user_favor');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [summary, setSummary] = useState('');

  const needsRefundAmount = resolution === 'resolved_user_favor' || resolution === 'resolved_partial';

  const resolutionOptions = [
    { value: 'resolved_user_favor', label: 'User favor', icon: Users, color: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
    { value: 'resolved_agent_favor', label: 'Agent favor', icon: Users, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
    { value: 'resolved_partial', label: 'Partial', icon: Scale, color: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
    { value: 'closed_no_action', label: 'No action', icon: XCircle, color: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
  ];

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resolve Dispute"
      description="Make a final decision on this dispute. This action cannot be undone."
      actionLabel="Resolve Dispute"
      actionVariant="default"
      placeholder="Explain the decision, key evidence, and why this resolution is correct (minimum 10 characters)..."
      onConfirm={async (r) => {
        const parsedRefund = refundAmount.trim() ? Number(refundAmount) : null;
        await onResolve(resolution, parsedRefund, summary.trim(), r);
      }}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Resolution Decision</Label>
          <div className="grid grid-cols-2 gap-2">
            {resolutionOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = resolution === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setResolution(opt.value as DisputeStatus)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected 
                      ? `${opt.color} border-current shadow-sm` 
                      : 'bg-background border-input hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1">
            Refund Amount
            {needsRefundAmount && <span className="text-destructive">*</span>}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder={needsRefundAmount ? 'Enter refund amount' : 'Optional'}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="pl-7"
            />
          </div>
          {dispute.refundAmount !== null && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Current recorded refund: ${dispute.refundAmount}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Resolution Summary <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief summary of the decision and key findings..."
            rows={3}
            className="resize-none"
          />
        </div>
      </div>
    </ReasonDialog>
  );
}

function EvidenceItem({ value }: { value: string }) {
  const isUrl = /^https?:\/\//i.test(value);
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          {isUrl ? (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline break-all flex items-center gap-1"
            >
              {value}
              <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
            </a>
          ) : (
            <p className="text-sm break-all">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const variants = {
    critical: { 
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800', 
      label: 'Critical', 
      icon: <ShieldAlert className="h-3 w-3" /> 
    },
    high: { 
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800', 
      label: 'High', 
      icon: <AlertTriangle className="h-3 w-3" /> 
    },
    normal: { 
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', 
      label: 'Normal', 
      icon: null 
    },
    low: { 
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700', 
      label: 'Low', 
      icon: null 
    },
  };

  const { className, label, icon } = variants[priority];

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${className}`}>
      {icon}
      {label}
    </span>
  );
}
