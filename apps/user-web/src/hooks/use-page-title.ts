'use client';

import { useEffect } from 'react';

/**
 * Sets the document title for client-side pages.
 * Usage: usePageTitle('Messages') → "Messages | HowWePlan"
 */
export function usePageTitle(title: string, suffix = 'HowWePlan') {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | ${suffix}` : suffix;
    return () => {
      document.title = prev;
    };
  }, [title, suffix]);
}
