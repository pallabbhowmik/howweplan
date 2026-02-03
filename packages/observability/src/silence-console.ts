/**
 * Disable console output in production environments.
 * Useful to avoid leaking sensitive data via logs.
 */
export function silenceConsoleInProduction(): void {
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
}
