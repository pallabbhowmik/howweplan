'use client';

/**
 * Test Site Banner Component
 * 
 * Displays a prominent banner indicating this is a test/demo environment.
 * Controlled via NEXT_PUBLIC_SHOW_TEST_BANNER environment variable.
 */

import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface TestSiteBannerProps {
  message?: string;
}

export function TestSiteBanner({ 
  message = 'This is a test environment. Data may be reset periodically.' 
}: TestSiteBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  
  const showBanner = process.env.NEXT_PUBLIC_SHOW_TEST_BANNER === 'true';
  
  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium relative">
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>{message}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-amber-600 rounded transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
