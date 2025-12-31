'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import {
  listMatchingOverrides,
  createMatchingOverride,
  cancelMatchingOverride,
  getPendingTripRequests,
  getAvailableAgents,
} from '@/lib/api';
import type { MatchingOverrideFilters } from '@/lib/api';
import type { MatchingOverride, MatchingOverrideType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/admin/status-badge';
import { ReasonDialog } from '@/components/admin/reason-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDate, formatRelativeTime, snakeToTitle } from '@/lib/utils';

// ============================================================================
// MATCHING PAGE
// ============================================================================

export default function MatchingPage() {
  const queryClient = useQueryClient();
  const { getActionContext } = useAuth();

  const [activeTab, setActiveTab] = useState('overrides');
  const [page, setPage] = useState(1);
  const [onlyActive, setOnlyActive] = useState(true);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<MatchingOverride | null>(null);
  const [selectedTripRequest, setSelectedTripRequest] = useState<string | null>(null);

  // Build filters
  const filters: MatchingOverrideFilters = {
    ...(onlyActive && { isActive: true }),
  };

  // Fetch overrides
  const { data: overridesData, isLoading: isLoadingOverrides } = useQuery({
    queryKey: ['matching-overrides', filters, page],
    queryFn: () => listMatchingOverrides({ filters, page, pageSize: 25 }),
  });

  // Fetch pending requests
  const { data: pendingRequests, isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => getPendingTripRequests({ pageSize: 50 }),
  });

  // Fetch available agents for selected request
  const { data: availableAgents } = useQuery({
    queryKey: ['available-agents', selectedTripRequest],
    queryFn: () => getAvailableAgents(selectedTripRequest!),
    enabled: !!selectedTripRequest,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ 
      type, 
      tripRequestId, 
      agentId, 
      expiresAt, 
      reason 
    }: { 
      type: MatchingOverrideType;
      tripRequestId: string;
      agentId: string | null;
      expiresAt: string | null;
      reason: string;
    }) => createMatchingOverride(getActionContext(), { type, tripRequestId, agentId, expiresAt }, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      setCreateDialogOpen(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ overrideId, reason }: { overrideId: string; reason: string }) =>
      cancelMatchingOverride(getActionContext(), overrideId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-overrides'] });
      setCancelDialogOpen(false);
      setSelectedOverride(null);
    },
  });

  const handleCancel = async (reason: string) => {
    if (!selectedOverride) return;
    await cancelMutation.mutateAsync({ overrideId: selectedOverride.id, reason });
  };

  const openCancelDialog = (override: MatchingOverride) => {
    setSelectedOverride(override);
    setCancelDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Matching Overrides</h1>
        <p className="text-muted-foreground">
          Manually assign agents to trip requests or create matching rules
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overrides">Active Overrides</TabsTrigger>
          <TabsTrigger value="pending">Pending Requests</TabsTrigger>
        </TabsList>

        {/* Active Overrides Tab */}
        <TabsContent value="overrides" className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="rounded"
              />
              Show only active overrides
            </label>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Overrides {overridesData?.totalCount !== undefined && `(${overridesData.totalCount})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingOverrides ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : overridesData?.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No overrides found
                </div>
              ) : (
                <div className="space-y-4">
                  {overridesData?.items.map((override) => (
                    <OverrideRow
                      key={override.id}
                      override={override}
                      onCancel={() => openCancelDialog(override)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Trip Requests</CardTitle>
              <CardDescription>
                Requests without matched agents. Consider creating overrides for long-waiting requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPending ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : pendingRequests?.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending requests
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests?.items.map((request) => (
                    <PendingRequestRow
                      key={request.id}
                      request={request}
                      onAssign={() => {
                        setSelectedTripRequest(request.id);
                        setCreateDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Override Dialog */}
      <ReasonDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Override"
        description={
          selectedOverride
            ? `Cancel the ${snakeToTitle(selectedOverride.type)} override for request #${selectedOverride.tripRequestId.slice(0, 8)}. The system will resume normal matching.`
            : ''
        }
        actionLabel="Cancel Override"
        actionVariant="destructive"
        onConfirm={handleCancel}
      />

      {/* Create Override Dialog */}
      <CreateOverrideDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setSelectedTripRequest(null);
        }}
        tripRequestId={selectedTripRequest}
        availableAgents={availableAgents ?? []}
        onCreate={async (type, agentId, expiresAt, reason) => {
          if (!selectedTripRequest) return;
          await createMutation.mutateAsync({
            type,
            tripRequestId: selectedTripRequest,
            agentId,
            expiresAt,
            reason,
          });
        }}
      />
    </div>
  );
}

// ============================================================================
// OVERRIDE ROW COMPONENT
// ============================================================================

function OverrideRow({
  override,
  onCancel,
}: {
  override: MatchingOverride;
  onCancel: () => void;
}) {
  const typeColors: Record<MatchingOverrideType, string> = {
    force_assign: 'bg-green-100 text-green-800',
    force_unassign: 'bg-red-100 text-red-800',
    priority_boost: 'bg-blue-100 text-blue-800',
    blacklist: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[override.type]}`}>
            {snakeToTitle(override.type)}
          </span>
          <StatusBadge status={override.isActive ? 'active' : 'expired'} size="sm" />
        </div>
        <p className="text-sm">
          Trip Request: <span className="font-mono">#{override.tripRequestId.slice(0, 8)}</span>
        </p>
        {override.agentId && (
          <p className="text-sm text-muted-foreground">
            Agent: #{override.agentId.slice(0, 8)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Created {formatRelativeTime(override.createdAt)}
          {override.expiresAt && ` • Expires ${formatDate(override.expiresAt)}`}
        </p>
        <p className="text-xs text-muted-foreground italic">
          Reason: {override.reason}
        </p>
      </div>

      {override.isActive && (
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// PENDING REQUEST ROW COMPONENT
// ============================================================================

function PendingRequestRow({
  request,
  onAssign,
}: {
  request: {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    status: string;
    waitingDays: number;
  };
  onAssign: () => void;
}) {
  const urgencyClass = request.waitingDays > 7 
    ? 'text-red-600' 
    : request.waitingDays > 3 
    ? 'text-yellow-600' 
    : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="space-y-1">
        <p className="font-medium">{request.destination}</p>
        <p className="text-sm text-muted-foreground">
          {formatDate(request.startDate)} - {formatDate(request.endDate)}
        </p>
        <p className={`text-sm font-medium ${urgencyClass}`}>
          Waiting {request.waitingDays} day{request.waitingDays !== 1 ? 's' : ''}
        </p>
      </div>

      <Button size="sm" onClick={onAssign}>
        Create Override
      </Button>
    </div>
  );
}

// ============================================================================
// CREATE OVERRIDE DIALOG
// ============================================================================

function CreateOverrideDialog({
  open,
  onOpenChange,
  tripRequestId,
  availableAgents,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripRequestId: string | null;
  availableAgents: readonly { id: string; email: string; firstName: string; lastName: string }[];
  onCreate: (type: MatchingOverrideType, agentId: string | null, expiresAt: string | null, reason: string) => Promise<void>;
}) {
  const [type, setType] = useState<MatchingOverrideType>('force_assign');
  const [agentId, setAgentId] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<string>('7');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (reason.length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }
    if (type === 'force_assign' && !agentId) {
      setError('Please select an agent for force assign');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const expiresAt = expiresIn 
      ? new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    try {
      await onCreate(type, agentId || null, expiresAt, reason);
      setType('force_assign');
      setAgentId('');
      setExpiresIn('7');
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create override');
    } finally {
      setIsSubmitting(false);
    }
  };

  const OVERRIDE_TYPES: { value: MatchingOverrideType; label: string; description: string }[] = [
    { value: 'force_assign', label: 'Force Assign', description: 'Assign a specific agent to this request' },
    { value: 'priority_boost', label: 'Priority Boost', description: 'Boost this request in the matching queue' },
    { value: 'blacklist', label: 'Blacklist', description: 'Prevent specific agent from matching' },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/80" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-lg p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Create Matching Override</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Request: #{tripRequestId?.slice(0, 8)}
        </p>

        <div className="space-y-4">
          <div>
            <Label>Override Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MatchingOverrideType)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
            >
              {OVERRIDE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {OVERRIDE_TYPES.find((t) => t.value === type)?.description}
            </p>
          </div>

          {(type === 'force_assign' || type === 'blacklist') && (
            <div>
              <Label>Select Agent</Label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
              >
                <option value="">Select an agent...</option>
                {availableAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName} ({agent.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Expires In (days)</Label>
            <Input
              type="number"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              placeholder="7"
            />
          </div>

          <div>
            <Label>Reason (min 10 chars)</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for this override..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            />
            <p className="text-xs text-muted-foreground">{reason.length}/10 characters</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Override'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
