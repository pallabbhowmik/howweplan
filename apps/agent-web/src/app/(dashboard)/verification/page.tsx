'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Redirect to the new comprehensive verification documents page.
 */
export default function VerificationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/verification/documents');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to verification...</p>
      </div>
    </div>
  );
}
