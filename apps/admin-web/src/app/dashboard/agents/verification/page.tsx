'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  Eye,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Send,
  RotateCw,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ============================================================================
// TYPES
// ============================================================================

interface VerificationDocument {
  id: string;
  userId: string;
  documentType: string;
  category: string;
  documentUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'NOT_UPLOADED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REUPLOAD_REQUESTED';
  verifiedAt: string | null;
  adminComments: string | null;
  rejectionReason: string | null;
  reuploadRequestedAt: string | null;
  reuploadDeadline: string | null;
  uploadedAt: string;
}

interface PendingDocument {
  document: VerificationDocument;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface VerificationProgress {
  totalRequired: number;
  uploaded: number;
  approved: number;
  rejected: number;
  pendingReview: number;
  reuploadRequested: number;
  percentComplete: number;
  missingRequired: string[];
  canSubmitForReview: boolean;
}

interface VerificationComment {
  id: string;
  adminName: string;
  comment: string;
  action: string;
  createdAt: string;
}

const DOCUMENT_TYPE_NAMES: Record<string, string> = {
  PAN_CARD: 'PAN Card',
  AADHAAR_CARD: 'Aadhaar Card',
  PASSPORT: 'Passport',
  GST_CERTIFICATE: 'GST Certificate',
  SHOP_ESTABLISHMENT: 'Shop & Establishment',
  PARTNERSHIP_DEED: 'Partnership Deed',
  CERTIFICATE_OF_INCORPORATION: 'Certificate of Incorporation',
  IATA_CERTIFICATE: 'IATA Certificate',
  MOT_RECOGNITION: 'MOT Recognition',
  IATO_MEMBERSHIP: 'IATO Membership',
  TAAI_MEMBERSHIP: 'TAAI Membership',
  CANCELLED_CHEQUE: 'Cancelled Cheque',
  BANK_STATEMENT: 'Bank Statement',
  ITR_LAST_YEAR: 'ITR (Last Year)',
  UTILITY_BILL: 'Utility Bill',
  RENT_AGREEMENT: 'Rent Agreement',
  PROFESSIONAL_PHOTO: 'Professional Photo',
  OFFICE_FRONT_PHOTO: 'Office Front Photo',
  EXPERIENCE_CERTIFICATE: 'Experience Certificate',
};

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pending Review', color: 'bg-amber-100 text-amber-800', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  REUPLOAD_REQUESTED: { label: 'Reupload Requested', color: 'bg-orange-100 text-orange-800', icon: RotateCw },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
  NOT_UPLOADED: { label: 'Not Uploaded', color: 'bg-gray-100 text-gray-600', icon: FileText },
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchPendingVerifications(token: string, page: number = 1, pageSize: number = 20) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/identity/admin/verification/pending?page=${page}&pageSize=${pageSize}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error('Failed to fetch pending verifications');
  const data = await response.json();
  return data.data;
}

async function fetchAgentDocuments(token: string, agentId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/identity/admin/agents/${agentId}/documents`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error('Failed to fetch agent documents');
  const data = await response.json();
  return data.data;
}

async function fetchAgentComments(token: string, agentId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/identity/admin/agents/${agentId}/comments`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error('Failed to fetch comments');
  const data = await response.json();
  return data.data;
}

async function approveDocument(token: string, documentId: string, notes?: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/identity/admin/documents/${documentId}/approve`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    }
  );
  if (!response.ok) throw new Error('Failed to approve document');
  return response.json();
}

async function rejectDocument(token: string, documentId: string, reason: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/identity/admin/documents/${documentId}/reject`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    }
  );
  if (!response.ok) throw new Error('Failed to reject document');
  return response.json();
}

async function requestReupload(token: string, documentId: string, reason: string, deadlineDays: number = 7) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/identity/admin/documents/${documentId}/request-reupload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, deadlineDays }),
    }
  );
  if (!response.ok) throw new Error('Failed to request reupload');
  return response.json();
}

async function addComment(token: string, agentId: string, comment: string, documentId?: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/identity/admin/agents/${agentId}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment, documentId: documentId || null }),
    }
  );
  if (!response.ok) throw new Error('Failed to add comment');
  return response.json();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VerificationReviewPage() {
  const queryClient = useQueryClient();
  const { getAccessToken, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  // Document action state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'reupload' | 'comment'>('approve');
  const [selectedDocument, setSelectedDocument] = useState<VerificationDocument | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [commentText, setCommentText] = useState('');

  // Fetch pending verifications
  const { data: pendingData, isLoading: isPendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['pending-verifications', page],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return fetchPendingVerifications(token, page);
    },
    enabled: isAuthenticated,
  });

  // Fetch selected agent's documents
  const { data: agentData, isLoading: isAgentLoading, refetch: refetchAgent } = useQuery({
    queryKey: ['agent-documents', selectedAgentId],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return fetchAgentDocuments(token, selectedAgentId!);
    },
    enabled: isAuthenticated && !!selectedAgentId,
  });

  // Fetch agent comments
  const { data: commentsData } = useQuery({
    queryKey: ['agent-comments', selectedAgentId],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return fetchAgentComments(token, selectedAgentId!);
    },
    enabled: isAuthenticated && !!selectedAgentId,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({ documentId, notes }: { documentId: string; notes?: string }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return approveDocument(token, documentId, notes);
    },
    onSuccess: () => {
      refetchPending();
      if (selectedAgentId) refetchAgent();
      setActionDialogOpen(false);
      setActionReason('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return rejectDocument(token, documentId, reason);
    },
    onSuccess: () => {
      refetchPending();
      if (selectedAgentId) refetchAgent();
      setActionDialogOpen(false);
      setActionReason('');
    },
  });

  const reuploadMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return requestReupload(token, documentId, reason);
    },
    onSuccess: () => {
      refetchPending();
      if (selectedAgentId) refetchAgent();
      setActionDialogOpen(false);
      setActionReason('');
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ agentId, comment, documentId }: { agentId: string; comment: string; documentId?: string }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return addComment(token, agentId, comment, documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-comments', selectedAgentId] });
      setCommentText('');
    },
  });

  // Handlers
  const openActionDialog = (doc: VerificationDocument, action: 'approve' | 'reject' | 'reupload') => {
    setSelectedDocument(doc);
    setActionType(action);
    setActionReason('');
    setActionDialogOpen(true);
  };

  const handleAction = () => {
    if (!selectedDocument) return;

    switch (actionType) {
      case 'approve':
        approveMutation.mutate({ documentId: selectedDocument.id, notes: actionReason || undefined });
        break;
      case 'reject':
        if (actionReason.length < 10) return;
        rejectMutation.mutate({ documentId: selectedDocument.id, reason: actionReason });
        break;
      case 'reupload':
        if (actionReason.length < 10) return;
        reuploadMutation.mutate({ documentId: selectedDocument.id, reason: actionReason });
        break;
    }
  };

  const handleAddComment = () => {
    if (!selectedAgentId || commentText.length < 5) return;
    commentMutation.mutate({
      agentId: selectedAgentId,
      comment: commentText,
      documentId: selectedDocument?.id,
    });
  };

  // Group pending documents by user
  const pendingByUser = React.useMemo(() => {
    if (!pendingData?.documents) return new Map<string, PendingDocument[]>();
    const grouped = new Map<string, PendingDocument[]>();
    for (const doc of pendingData.documents) {
      const existing = grouped.get(doc.user.id) || [];
      existing.push(doc);
      grouped.set(doc.user.id, existing);
    }
    return grouped;
  }, [pendingData]);

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.NOT_UPLOADED;
    const Icon = config.icon;
    return (
      <Badge className={cn('gap-1', config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Verification</h1>
          <p className="text-muted-foreground">
            Review and verify agent documents for platform access
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchPending()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingData?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingByUser.size}</p>
                <p className="text-sm text-muted-foreground">Agents Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Approved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Rejected Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Pending Documents List */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pending Documents
            </CardTitle>
            <CardDescription>
              Click on an agent to review their documents
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isPendingLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : pendingByUser.size === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>All documents reviewed!</p>
              </div>
            ) : (
              <div className="divide-y">
                {Array.from(pendingByUser.entries()).map(([userId, docs]) => {
                  const user = docs[0].user;
                  return (
                    <button
                      key={userId}
                      onClick={() => setSelectedAgentId(userId)}
                      className={cn(
                        'w-full p-4 text-left hover:bg-gray-50 transition-colors',
                        selectedAgentId === userId && 'bg-blue-50 border-l-4 border-blue-500'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge variant="secondary">{docs.length} docs</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Documents Detail */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Document Review
            </CardTitle>
            <CardDescription>
              {selectedAgentId ? 'Review documents and take action' : 'Select an agent from the list'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedAgentId ? (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select an agent from the pending list to review their documents</p>
              </div>
            ) : isAgentLoading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Progress */}
                {agentData?.progress && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Verification Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {agentData.progress.approved}/{agentData.progress.totalRequired} required approved
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${agentData.progress.percentComplete}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Documents */}
                <div className="space-y-4">
                  {agentData?.documents?.map((doc: VerificationDocument) => (
                    <div
                      key={doc.id}
                      className="p-4 border rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {DOCUMENT_TYPE_NAMES[doc.documentType] || doc.documentType}
                            </h4>
                            {renderStatusBadge(doc.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {doc.fileName} • {Math.round(doc.fileSize / 1024)}KB
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {formatRelativeTime(new Date(doc.uploadedAt))}
                          </p>
                          {doc.rejectionReason && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                              <strong>Rejected:</strong> {doc.rejectionReason}
                            </div>
                          )}
                          {doc.adminComments && doc.status === 'REUPLOAD_REQUESTED' && (
                            <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-700">
                              <strong>Reupload requested:</strong> {doc.adminComments}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.documentUrl, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {doc.status === 'PENDING_REVIEW' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm">
                                  Actions
                                  <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openActionDialog(doc, 'approve')}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openActionDialog(doc, 'reject')}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openActionDialog(doc, 'reupload')}>
                                  <RotateCw className="h-4 w-4 mr-2 text-orange-600" />
                                  Request Reupload
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comments Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments & Communication
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                    {commentsData?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    ) : (
                      commentsData?.map((comment: VerificationComment) => (
                        <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{comment.adminName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(new Date(comment.createdAt))}
                            </span>
                          </div>
                          <p className="text-sm">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={commentText.length < 5 || commentMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Document'}
              {actionType === 'reject' && 'Reject Document'}
              {actionType === 'reupload' && 'Request Document Reupload'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'This will approve the document and notify the agent.'}
              {actionType === 'reject' && 'Please provide a reason for rejection (min 10 characters).'}
              {actionType === 'reupload' && 'Request the agent to upload a new version of this document.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedDocument && (
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="font-medium">
                  {DOCUMENT_TYPE_NAMES[selectedDocument.documentType] || selectedDocument.documentType}
                </p>
                <p className="text-sm text-muted-foreground">{selectedDocument.fileName}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>
                {actionType === 'approve' ? 'Notes (optional)' : 'Reason (required)'}
              </Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionType === 'approve'
                    ? 'Add any notes...'
                    : actionType === 'reject'
                    ? 'Explain why this document is being rejected...'
                    : 'Explain what needs to be fixed...'
                }
                rows={4}
              />
              {actionType !== 'approve' && actionReason.length > 0 && actionReason.length < 10 && (
                <p className="text-sm text-red-500">Please provide at least 10 characters</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={
                (actionType !== 'approve' && actionReason.length < 10) ||
                approveMutation.isPending ||
                rejectMutation.isPending ||
                reuploadMutation.isPending
              }
            >
              {actionType === 'approve' && 'Approve'}
              {actionType === 'reject' && 'Reject'}
              {actionType === 'reupload' && 'Request Reupload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
