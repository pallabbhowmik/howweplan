'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Building,
  CreditCard,
  User,
  ArrowRight,
  ArrowLeft,
  Bell,
  Award,
  MapPin,
  Camera,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { getAccessToken } from '@/lib/api/auth';
import { env } from '@/lib/env';

// ============================================================================
// TYPES (matching backend)
// ============================================================================

interface DocumentTypeInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  required: boolean;
  requiredForNewAgents: boolean;
  acceptedFormats: string[];
  maxSizeMB: number;
}

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
  isRead: boolean;
  createdAt: string;
  documentId: string | null;
}

interface VerificationProfile {
  businessType: string;
  businessName: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPincode: string | null;
  primaryPhone: string | null;
  whatsappNumber: string | null;
  businessEmail: string | null;
  panNumber: string | null;
  gstin: string | null;
  firstLoginPromptShown: boolean;
  documentsSubmitted: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_INFO = {
  IDENTITY: { name: 'Identity Documents', icon: User, description: 'Government issued identification' },
  BUSINESS: { name: 'Business Documents', icon: Building, description: 'Business registration and licenses' },
  PROFESSIONAL: { name: 'Professional Certifications', icon: Award, description: 'Industry certifications and memberships' },
  FINANCIAL: { name: 'Financial Documents', icon: CreditCard, description: 'Bank and tax documents' },
  ADDRESS: { name: 'Address Proof', icon: MapPin, description: 'Office address verification' },
  ADDITIONAL: { name: 'Additional Documents', icon: Camera, description: 'Photos and other documents' },
};

const STATUS_BADGES = {
  PENDING_REVIEW: { label: 'Pending Review', variant: 'secondary' as const, icon: Clock },
  APPROVED: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
  REUPLOAD_REQUESTED: { label: 'Reupload Required', variant: 'warning' as const, icon: AlertTriangle },
  EXPIRED: { label: 'Expired', variant: 'outline' as const, icon: AlertCircle },
  NOT_UPLOADED: { label: 'Not Uploaded', variant: 'outline' as const, icon: Upload },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VerificationDocumentsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data state
  const [documentTypes, setDocumentTypes] = useState<Record<string, DocumentTypeInfo>>({});
  const [groupedTypes, setGroupedTypes] = useState<Record<string, DocumentTypeInfo[]>>({});
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [comments, setComments] = useState<VerificationComment[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<VerificationProfile | null>(null);

  // UI state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    IDENTITY: true,
    BUSINESS: false,
    PROFESSIONAL: false,
    FINANCIAL: true,
    ADDRESS: false,
    ADDITIONAL: false,
  });
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [step, setStep] = useState<'documents' | 'business-info' | 'review'>('documents');

  // ============================================================================
  // API CALLS
  // ============================================================================

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getAccessToken();
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch all data in parallel
      const [typesRes, docsRes, commentsRes, profileRes] = await Promise.all([
        fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/document-types`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setDocumentTypes(typesData.data.documentTypes);
        setGroupedTypes(typesData.data.groupedTypes);
        setRequiredDocuments(typesData.data.requiredDocuments);
      }

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.data.documents || []);
        setProgress(docsData.data.progress);
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData.data.comments || []);
        setUnreadCount(commentsData.data.unreadCount || 0);
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load verification data');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for new comments every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/comments/unread`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data.count > unreadCount) {
            setUnreadCount(data.data.count);
            // Refresh all data if new comments
            fetchData();
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [unreadCount, fetchData]);

  const uploadDocument = async (docType: string, file: File) => {
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // For now, we'll use a placeholder URL
      // In production, you'd upload to cloud storage first
      const documentUrl = URL.createObjectURL(file);

      const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentType: docType,
          documentUrl: `https://storage.example.com/documents/${file.name}`, // Placeholder
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to upload document');
      }

      setSuccessMessage(`${documentTypes[docType]?.name || docType} uploaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
      setSelectedDocType(null);
    }
  };

  const deleteDocument = async (documentId: string) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/documents/${documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete document');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const submitForReview = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to submit');
      }

      setSuccessMessage('Documents submitted for review! We will notify you once verified.');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit for review');
    }
  };

  const markCommentRead = async (commentId: string) => {
    const token = getAccessToken();
    if (!token) return;

    await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/comments/${commentId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getDocumentByType = (docType: string): VerificationDocument | undefined => {
    return documents.find(d => d.documentType === docType);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Document Verification</h1>
          <p className="text-muted-foreground">
            Upload required documents to complete your verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="relative"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Error / Success Messages */}
      {error && (
        <Alert variant="error" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Comments Panel */}
      {showComments && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Admin Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No notifications yet</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map(comment => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-lg border ${!comment.isRead ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
                    onClick={() => !comment.isRead && markCommentRead(comment.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{comment.adminName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                    {comment.action !== 'COMMENT' && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {comment.action.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress Card */}
      {progress && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Verification Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {progress.approved} of {progress.totalRequired} required documents approved
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{progress.percentComplete}%</span>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
            <div className="flex justify-between mt-4 text-sm">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {progress.pendingReview} Pending
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {progress.approved} Approved
                </span>
                {progress.rejected > 0 && (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {progress.rejected} Rejected
                  </span>
                )}
              </div>
              {progress.canSubmitForReview && progress.pendingReview === 0 && progress.approved < progress.totalRequired && (
                <Button size="sm" onClick={submitForReview}>
                  Submit for Review
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Required Documents Alert */}
      {progress && progress.missingRequired.length > 0 && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Missing required documents:</strong>{' '}
            {progress.missingRequired.map(docType => documentTypes[docType]?.name || docType).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Document Categories */}
      <div className="space-y-4">
        {Object.entries(CATEGORY_INFO).map(([category, info]) => {
          const categoryDocs = groupedTypes[category] || [];
          if (categoryDocs.length === 0) return null;

          const Icon = info.icon;
          const isExpanded = expandedCategories[category];
          const uploadedCount = categoryDocs.filter(dt => getDocumentByType(dt.id)).length;

          return (
            <Card key={category}>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.name}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {uploadedCount} / {categoryDocs.length}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {categoryDocs.map(docType => {
                      const doc = getDocumentByType(docType.id);
                      const statusInfo = doc ? STATUS_BADGES[doc.status] : STATUS_BADGES.NOT_UPLOADED;
                      const StatusIcon = statusInfo.icon;
                      const isRequired = requiredDocuments.includes(docType.id);

                      return (
                        <div
                          key={docType.id}
                          className={`p-4 rounded-lg border ${
                            doc?.status === 'REJECTED' || doc?.status === 'REUPLOAD_REQUESTED'
                              ? 'border-red-200 bg-red-50'
                              : doc?.status === 'APPROVED'
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{docType.name}</h4>
                                {isRequired && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                <Badge variant={statusInfo.variant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {docType.description}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Accepted: {docType.acceptedFormats.join(', ').toUpperCase()} • Max {docType.maxSizeMB}MB
                              </p>

                              {/* Show rejection reason or reupload request */}
                              {doc?.rejectionReason && (
                                <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800">
                                  <strong>Rejected:</strong> {doc.rejectionReason}
                                </div>
                              )}
                              {doc?.adminComments && doc.status === 'REUPLOAD_REQUESTED' && (
                                <div className="mt-2 p-2 bg-amber-100 rounded text-sm text-amber-800">
                                  <strong>Reupload requested:</strong> {doc.adminComments}
                                  {doc.reuploadDeadline && (
                                    <span className="block text-xs mt-1">
                                      Deadline: {new Date(doc.reuploadDeadline).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Show uploaded file */}
                              {doc && (
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate max-w-xs">{doc.fileName}</span>
                                  <a
                                    href={doc.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              {(!doc || doc.status === 'REJECTED' || doc.status === 'REUPLOAD_REQUESTED') && (
                                <div>
                                  <input
                                    type="file"
                                    id={`upload-${docType.id}`}
                                    className="hidden"
                                    accept={docType.acceptedFormats.map(f => `.${f}`).join(',')}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (file.size > docType.maxSizeMB * 1024 * 1024) {
                                          setError(`File too large. Max size: ${docType.maxSizeMB}MB`);
                                          return;
                                        }
                                        uploadDocument(docType.id, file);
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant={doc ? 'destructive' : 'default'}
                                    disabled={isUploading}
                                    onClick={() => document.getElementById(`upload-${docType.id}`)?.click()}
                                  >
                                    {isUploading ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    {doc ? 'Re-upload' : 'Upload'}
                                  </Button>
                                </div>
                              )}
                              {doc && doc.status !== 'APPROVED' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteDocument(doc.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Submit Button */}
      {progress && progress.canSubmitForReview && !profile?.documentsSubmitted && (
        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={submitForReview} className="px-8">
            <Shield className="h-5 w-5 mr-2" />
            Submit All Documents for Verification
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      )}

      {/* Already submitted message */}
      {profile?.documentsSubmitted && (
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6 text-center">
            <Clock className="h-12 w-12 mx-auto text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold text-blue-800">Documents Under Review</h3>
            <p className="text-blue-700 mt-2">
              Your documents are being reviewed by our team. We'll notify you once the verification is complete.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
