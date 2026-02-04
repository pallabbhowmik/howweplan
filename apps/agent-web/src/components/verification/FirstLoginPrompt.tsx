'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Shield,
  ArrowRight,
  FileText,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, Badge } from '@/components/ui';
import { getAccessToken } from '@/lib/api/auth';
import { env } from '@/lib/env';

interface VerificationPromptProps {
  isAgent: boolean;
}

interface VerificationStatus {
  status: 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REVOKED';
  firstLoginPromptShown: boolean;
  documentsSubmitted: boolean;
  progress?: {
    percentComplete: number;
    missingRequired: string[];
  };
}

const REQUIRED_DOCUMENTS = [
  { name: 'PAN Card', description: 'Tax identification' },
  { name: 'Aadhaar Card', description: 'Identity proof' },
  { name: 'Cancelled Cheque', description: 'Bank verification' },
  { name: 'Professional Photo', description: 'Profile photo' },
];

export function FirstLoginVerificationPrompt({ isAgent }: VerificationPromptProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Don't show on verification page
  const isVerificationPage = pathname?.includes('/verification');

  useEffect(() => {
    if (!isAgent || isVerificationPage) {
      setIsLoading(false);
      return;
    }

    const checkVerificationStatus = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        // Check agent profile
        const [profileRes, verProfileRes] = await Promise.all([
          fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (profileRes.ok && verProfileRes.ok) {
          const profileData = await profileRes.json();
          const verProfileData = await verProfileRes.json();

          const verificationStatus = profileData.data?.verificationStatus || 'NOT_SUBMITTED';
          const firstLoginPromptShown = verProfileData.data?.first_login_prompt_shown || false;
          const documentsSubmitted = verProfileData.data?.documents_submitted || false;

          setStatus({
            status: verificationStatus,
            firstLoginPromptShown,
            documentsSubmitted,
          });

          // Show prompt if:
          // 1. Status is NOT_SUBMITTED or REJECTED
          // 2. First login prompt hasn't been shown yet
          // 3. Not already on verification page
          if (
            (verificationStatus === 'NOT_SUBMITTED' || verificationStatus === 'REJECTED') &&
            !firstLoginPromptShown &&
            !isVerificationPage
          ) {
            setIsOpen(true);
          }
        }
      } catch (error) {
        console.error('Failed to check verification status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkVerificationStatus();
  }, [isAgent, isVerificationPage]);

  const handleStartVerification = async () => {
    // Mark prompt as shown
    try {
      const token = getAccessToken();
      if (token) {
        await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/first-login-shown`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Failed to mark prompt as shown:', error);
    }

    setIsOpen(false);
    router.push('/verification/documents');
  };

  const handleLater = async () => {
    // Mark prompt as shown so we don't keep asking
    try {
      const token = getAccessToken();
      if (token) {
        await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/verification/first-login-shown`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Failed to mark prompt as shown:', error);
    }

    setIsOpen(false);
  };

  if (!isAgent || isLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Complete Your Verification</DialogTitle>
              <DialogDescription>
                To start receiving travel requests, please verify your agent profile
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {status?.status === 'REJECTED' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Previous submission was rejected</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Please review the feedback and resubmit your documents.
              </p>
            </div>
          )}

          <h4 className="font-medium mb-3">Required Documents:</h4>
          <div className="space-y-2 mb-6">
            {REQUIRED_DOCUMENTS.map((doc, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <span className="font-medium">{doc.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">- {doc.description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-blue-800">Quick & Easy Process</h5>
                <p className="text-sm text-blue-700">
                  Upload your documents in minutes. Our team typically verifies within 24-48 hours.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleLater}>
              I'll do this later
            </Button>
            <Button className="flex-1" onClick={handleStartVerification}>
              Start Verification
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Verification status banner shown at the top of the dashboard
 */
export function VerificationStatusBanner({ isAgent }: VerificationPromptProps) {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isAgent) {
      setIsLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/identity/agents/me/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setStatus({
            status: data.data?.verificationStatus || 'NOT_SUBMITTED',
            firstLoginPromptShown: true,
            documentsSubmitted: false,
          });
        }
      } catch (error) {
        console.error('Failed to check verification status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [isAgent]);

  if (!isAgent || isLoading || isDismissed) {
    return null;
  }

  // Don't show for verified agents
  if (status?.status === 'VERIFIED') {
    return null;
  }

  const getBannerConfig = () => {
    switch (status?.status) {
      case 'NOT_SUBMITTED':
        return {
          bgColor: 'bg-amber-50 border-amber-200',
          icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
          title: 'Complete Your Verification',
          message: 'Submit required documents to start receiving travel requests.',
          buttonText: 'Start Verification',
          buttonVariant: 'default' as const,
        };
      case 'PENDING_REVIEW':
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          icon: <Clock className="h-5 w-5 text-blue-600" />,
          title: 'Verification In Progress',
          message: 'Your documents are being reviewed. This usually takes 24-48 hours.',
          buttonText: 'View Status',
          buttonVariant: 'outline' as const,
        };
      case 'REJECTED':
        return {
          bgColor: 'bg-red-50 border-red-200',
          icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
          title: 'Verification Rejected',
          message: 'Please review the feedback and resubmit your documents.',
          buttonText: 'Resubmit Documents',
          buttonVariant: 'destructive' as const,
        };
      case 'REVOKED':
        return {
          bgColor: 'bg-gray-50 border-gray-200',
          icon: <AlertTriangle className="h-5 w-5 text-gray-600" />,
          title: 'Verification Revoked',
          message: 'Your verification has been revoked. Please contact support.',
          buttonText: 'Contact Support',
          buttonVariant: 'outline' as const,
        };
      default:
        return null;
    }
  };

  const config = getBannerConfig();
  if (!config) return null;

  return (
    <div className={`${config.bgColor} border rounded-lg p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <h4 className="font-medium">{config.title}</h4>
            <p className="text-sm text-muted-foreground">{config.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={config.buttonVariant}
            size="sm"
            onClick={() => router.push('/verification/documents')}
          >
            {config.buttonText}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
