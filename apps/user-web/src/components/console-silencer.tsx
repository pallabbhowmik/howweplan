'use client';

import { useEffect } from 'react';

export function ConsoleSilencer(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    const noop = () => undefined;
    // eslint-disable-next-line no-console
    console.log = noop;
    // eslint-disable-next-line no-console
    console.info = noop;
    // eslint-disable-next-line no-console
    console.warn = noop;
    // eslint-disable-next-line no-console
    console.error = noop;
    // eslint-disable-next-line no-console
    console.debug = noop;
  }, []);

  return null;
}
