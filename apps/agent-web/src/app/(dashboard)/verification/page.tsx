'use client';

import { useState, useEffect } from 'react';
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
} from '@/components/ui';
import { getAccessToken } from '@/lib/api/auth';
import { env } from '@/lib/env';

// ============================================================================
// TYPES
// ============================================================================

interface VerificationStatus {
  status: 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REVOKED';
  submittedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'government_id',
    name: 'Government ID',
    description: 'Valid government-issued ID (Passport, Aadhaar, PAN)',
    icon: <User className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'business_registration',
    name: 'Business Registration',
    description: 'Business license, GST certificate, or company registration',
    icon: <Building className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'bank_details',
    name: 'Bank Account Proof',
    description: 'Cancelled cheque or bank statement header',
    icon: <CreditCard className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'experience_proof',
    name: 'Experience Certificate',
    description: 'Tourism certification, IATA card, or employment letter (optional)',
    icon: <FileText className="h-5 w-5" />,
    required: false,
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VerificationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedDocType, setSelectedDocType] = useState<string>('government_id');
  const [documentUrl, setDocumentUrl] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      setIsLoading(true);
      const token = getAccessToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load verification status');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setVerificationStatus({
          status: data.data.verificationStatus || 'NOT_SUBMITTED',
          submittedAt: data.data.verificationSubmittedAt,
          completedAt: data.data.verificationCompletedAt,
          rejectionReason: data.data.verificationRejectedReason,
        });
      }
    } catch (err) {
      console.error('Failed to load verification status:', err);
      setError('Failed to load verification status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!documentUrl.trim()) {
      setError('Please provide a document URL');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const token = getAccessToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentType: selectedDocType,
          documentUrl: documentUrl.trim(),
          additionalNotes: additionalNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to submit verification');
      }

      // Reload status
      await loadVerificationStatus();
      setDocumentUrl('');
      setAdditionalNotes('');
    } catch (err) {
      console.error('Failed to submit verification:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = verificationStatus?.status || 'NOT_SUBMITTED';

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Verification</h1>
        <p className="mt-2 text-gray-600">
          Complete your verification to start receiving travel requests and bookings.
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification Status
              </CardTitle>
              <CardDescription>
                Your current account verification status
              </CardDescription>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent>
          <StatusMessage status={status} rejectionReason={verificationStatus?.rejectionReason} />
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Document Submission Form - only show if NOT_SUBMITTED or REJECTED */}
      {(status === 'NOT_SUBMITTED' || status === 'REJECTED') && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Verification Documents</CardTitle>
            <CardDescription>
              Upload your documents to begin the verification process. Our team will review within 24-48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Type Selection */}
            <div className="grid gap-4 sm:grid-cols-2">
              {DOCUMENT_TYPES.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocType(doc.id)}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    selectedDocType === doc.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${selectedDocType === doc.id ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                      {doc.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.name}</span>
                        {doc.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Document URL Input */}
            <div className="space-y-2">
              <Label htmlFor="documentUrl">Document URL</Label>
              <div className="flex gap-2">
                <Input
                  id="documentUrl"
                  type="url"
                  placeholder="https://drive.google.com/file/... or upload to a file sharing service"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">
                Upload your document to Google Drive, Dropbox, or any file sharing service and paste the public link here.
              </p>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information that might help with verification..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitVerification}
                disabled={isSubmitting || !documentUrl.trim()}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Review Info */}
      {status === 'PENDING_REVIEW' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">Under Review</h3>
                <p className="text-yellow-700 mt-1">
                  Your documents are being reviewed by our team. This usually takes 24-48 hours.
                  You'll receive an email notification once the review is complete.
                </p>
                <p className="text-sm text-yellow-600 mt-3">
                  Submitted: {verificationStatus?.submittedAt 
                    ? new Date(verificationStatus.submittedAt).toLocaleDateString('en-US', {
                        dateStyle: 'medium',
                      })
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verified Success */}
      {status === 'VERIFIED' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Verified Agent</h3>
                <p className="text-green-700 mt-1">
                  Congratulations! Your account has been verified. You can now receive travel requests
                  and start earning by creating amazing itineraries for travelers.
                </p>
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="mt-4 gap-2"
                  variant="default"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'NOT_SUBMITTED':
      return (
        <Badge variant="outline" className="gap-1 text-gray-600 border-gray-300">
          <AlertTriangle className="h-3 w-3" />
          Not Submitted
        </Badge>
      );
    case 'PENDING_REVIEW':
      return (
        <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300 bg-yellow-50">
          <Clock className="h-3 w-3" />
          Under Review
        </Badge>
      );
    case 'VERIFIED':
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="outline" className="gap-1 text-red-600 border-red-300 bg-red-50">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case 'REVOKED':
      return (
        <Badge variant="outline" className="gap-1 text-red-600 border-red-300 bg-red-50">
          <XCircle className="h-3 w-3" />
          Revoked
        </Badge>
      );
    default:
      return null;
  }
}

function StatusMessage({ status, rejectionReason }: { status: string; rejectionReason: string | null }) {
  switch (status) {
    case 'NOT_SUBMITTED':
      return (
        <p className="text-gray-600">
          You haven't submitted your verification documents yet. Please submit the required documents
          to start receiving travel requests.
        </p>
      );
    case 'PENDING_REVIEW':
      return (
        <p className="text-yellow-700">
          Your documents are under review. Our team will verify your information within 24-48 hours.
        </p>
      );
    case 'VERIFIED':
      return (
        <p className="text-green-700">
          Your account is verified! You can receive travel requests and start earning.
        </p>
      );
    case 'REJECTED':
      return (
        <div>
          <p className="text-red-700">
            Your verification was not approved. Please review the reason and submit again.
          </p>
          {rejectionReason && (
            <div className="mt-3 p-3 bg-red-100 rounded-lg">
              <p className="text-sm font-medium text-red-800">Reason:</p>
              <p className="text-sm text-red-700">{rejectionReason}</p>
            </div>
          )}
        </div>
      );
    case 'REVOKED':
      return (
        <p className="text-red-700">
          Your verification has been revoked. Please contact support for more information.
        </p>
      );
    default:
      return null;
  }
}
