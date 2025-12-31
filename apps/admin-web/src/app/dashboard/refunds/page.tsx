'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { listRefunds, approveRefund, rejectRefund, triggerRefund } from '@/lib/api';
import type { RefundFilters } from '@/lib/api';
import type { Refund, RefundStatus, RefundReason } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/admin/status-badge';
import { ReasonDialog } from '@/components/admin/reason-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatRelativeTime, formatCurrency, snakeToTitle } from '@/lib/utils';

// ============================================================================
// REFUNDS PAGE
// ============================================================================

const STATUS_OPTIONS: { value: RefundStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending_review', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'failed', label: 'Failed' },
];

export default function RefundsPage() {
  const queryClient = useQueryClient();
  const { getActionContext } = useAuth();

  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('pending_review');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [adjustedAmount, setAdjustedAmount] = useState<string>('');

  // Build filters
  const filters: RefundFilters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(searchTerm && { bookingId: searchTerm }),
  };

  // Fetch refunds
  const { data, isLoading } = useQuery({
    queryKey: ['refunds', filters, page],
    queryFn: () => listRefunds({ filters, page, pageSize: 25 }),
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ refundId, amount, reason }: { refundId: string; amount: number | null; reason: string }) =>
      approveRefund(getActionContext(), refundId, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      setApproveDialogOpen(false);
      setSelectedRefund(null);
      setAdjustedAmount('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ refundId, reason }: { refundId: string; reason: string }) =>
      rejectRefund(getActionContext(), refundId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      setRejectDialogOpen(false);
      setSelectedRefund(null);
    },
  });

  const triggerMutation = useMutation({
    mutationFn: ({ bookingId, amount, refundReason, reason }: { 
      bookingId: string; 
      amount: number; 
      refundReason: RefundReason; 
      reason: string;
    }) => triggerRefund(getActionContext(), bookingId, amount, refundReason, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      setTriggerDialogOpen(false);
    },
  });

  const handleApprove = async (reason: string) => {
    if (!selectedRefund) return;
    const amount = adjustedAmount ? parseFloat(adjustedAmount) : null;
    await approveMutation.mutateAsync({ refundId: selectedRefund.id, amount, reason });
  };

  const handleReject = async (reason: string) => {
    if (!selectedRefund) return;
    await rejectMutation.mutateAsync({ refundId: selectedRefund.id, reason });
  };

  const openApproveDialog = (refund: Refund) => {
    setSelectedRefund(refund);
    setAdjustedAmount('');
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (refund: Refund) => {
    setSelectedRefund(refund);
    setRejectDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Refund Management</h1>
          <p className="text-muted-foreground">
            Process refund requests following the strict lifecycle state machine
          </p>
        </div>
        <Button onClick={() => setTriggerDialogOpen(true)}>
          Trigger Manual Refund
        </Button>
      </div>

      {/* Lifecycle Diagram */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Refund Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-2 text-xs overflow-x-auto">
            <StatusBadge status="pending_review" size="sm" />
            <span>→</span>
            <StatusBadge status="approved" size="sm" />
            <span>→</span>
            <StatusBadge status="processing" size="sm" />
            <span>→</span>
            <StatusBadge status="completed" size="sm" />
            <span className="text-muted-foreground ml-2">|</span>
            <StatusBadge status="rejected" size="sm" />
            <span className="text-muted-foreground">or</span>
            <StatusBadge status="failed" size="sm" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as RefundStatus | 'all');
            setPage(1);
          }}
        >
          <TabsList className="flex-wrap h-auto">
            {STATUS_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search by booking ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Refunds List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Refunds {data?.totalCount !== undefined && `(${data.totalCount})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No refunds found
            </div>
          ) : (
            <div className="space-y-4">
              {data?.items.map((refund) => (
                <RefundRow
                  key={refund.id}
                  refund={refund}
                  onApprove={() => openApproveDialog(refund)}
                  onReject={() => openRejectDialog(refund)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
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
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      {selectedRefund && (
        <ReasonDialog
          open={approveDialogOpen}
          onOpenChange={setApproveDialogOpen}
          title="Approve Refund"
          description={
            <div className="space-y-4">
              <p>
                Approve refund of{' '}
                <strong>{formatCurrency(selectedRefund.amount, selectedRefund.currency)}</strong>{' '}
                for booking #{selectedRefund.bookingId.slice(0, 8)}.
              </p>
              <div>
                <Label htmlFor="adjusted-amount" className="text-sm">
                  Adjusted Amount (optional)
                </Label>
                <Input
                  id="adjusted-amount"
                  type="number"
                  step="0.01"
                  placeholder={`Original: ${selectedRefund.amount}`}
                  value={adjustedAmount}
                  onChange={(e) => setAdjustedAmount(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use the original amount
                </p>
              </div>
            </div>
          }
          actionLabel="Approve Refund"
          onConfirm={handleApprove}
        />
      )}

      {/* Reject Dialog */}
      <ReasonDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title="Reject Refund"
        description={
          selectedRefund
            ? `Reject refund request of ${formatCurrency(selectedRefund.amount, selectedRefund.currency)}. This will close the refund request.`
            : ''
        }
        actionLabel="Reject Refund"
        actionVariant="destructive"
        onConfirm={handleReject}
      />

      {/* Trigger Manual Refund Dialog */}
      <TriggerRefundDialog
        open={triggerDialogOpen}
        onOpenChange={setTriggerDialogOpen}
        onTrigger={async (bookingId, amount, refundReason, reason) => {
          await triggerMutation.mutateAsync({ bookingId, amount, refundReason, reason });
        }}
      />
    </div>
  );
}

// ============================================================================
// REFUND ROW COMPONENT
// ============================================================================

function RefundRow({
  refund,
  onApprove,
  onReject,
}: {
  refund: Refund;
  onApprove: () => void;
  onReject: () => void;
}) {
  const canApprove = refund.status === 'pending_review';
  const canReject = refund.status === 'pending_review' || refund.status === 'failed';

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm">#{refund.id.slice(0, 8)}</span>
          <StatusBadge status={refund.status} />
        </div>
        <p className="text-lg font-bold">
          {formatCurrency(refund.amount, refund.currency)}
        </p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Booking #{refund.bookingId.slice(0, 8)}</span>
          <span>•</span>
          <span>{snakeToTitle(refund.reason)}</span>
          <span>•</span>
          <span>{formatRelativeTime(refund.requestedAt)}</span>
        </div>
        {refund.disputeId && (
          <p className="text-xs text-muted-foreground">
            Related dispute: #{refund.disputeId.slice(0, 8)}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {canApprove && (
          <Button size="sm" onClick={onApprove}>
            Approve
          </Button>
        )}
        {canReject && (
          <Button size="sm" variant="destructive" onClick={onReject}>
            Reject
          </Button>
        )}
        {refund.status === 'completed' && refund.stripeRefundId && (
          <span className="text-xs text-muted-foreground">
            Stripe: {refund.stripeRefundId.slice(0, 12)}...
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TRIGGER REFUND DIALOG
// ============================================================================

function TriggerRefundDialog({
  open,
  onOpenChange,
  onTrigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrigger: (bookingId: string, amount: number, refundReason: RefundReason, reason: string) => Promise<void>;
}) {
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [refundReason, setRefundReason] = useState<RefundReason>('goodwill');
  const [adminReason, setAdminReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!bookingId || !amount || adminReason.length < 10) {
      setError('Please fill in all fields. Reason must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onTrigger(bookingId, parseFloat(amount), refundReason, adminReason);
      setBookingId('');
      setAmount('');
      setAdminReason('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const REFUND_REASONS: { value: RefundReason; label: string }[] = [
    { value: 'dispute_resolution', label: 'Dispute Resolution' },
    { value: 'service_cancellation', label: 'Service Cancellation' },
    { value: 'duplicate_charge', label: 'Duplicate Charge' },
    { value: 'agent_no_show', label: 'Agent No-Show' },
    { value: 'platform_error', label: 'Platform Error' },
    { value: 'goodwill', label: 'Goodwill' },
  ];

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/80" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-lg p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Trigger Manual Refund</h2>
        <p className="text-sm text-muted-foreground mb-4">
          ⚠️ This is a CRITICAL action. Manual refunds bypass normal workflows.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bookingId">Booking ID</Label>
            <Input
              id="bookingId"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="Enter booking ID"
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="refundReason">Refund Reason</Label>
            <select
              id="refundReason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value as RefundReason)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="adminReason">Admin Reason (min 10 chars)</Label>
            <textarea
              id="adminReason"
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              placeholder="Detailed reason for this manual refund..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {adminReason.length}/10 characters
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Trigger Refund'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
