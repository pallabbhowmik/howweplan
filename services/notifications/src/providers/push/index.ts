import { env } from '../../config/env';
import { PushProvider } from '../types';
import { ConsolePushProvider } from './console.provider';
import { FirebasePushProvider } from './firebase.provider';

/**
 * Push Provider Factory
 * 
 * Creates the appropriate push provider based on configuration.
 * Singleton pattern ensures only one instance per process.
 */

let pushProviderInstance: PushProvider | null = null;

export function getPushProvider(): PushProvider {
  if (pushProviderInstance) {
    return pushProviderInstance;
  }

  if (!env.PUSH_ENABLED) {
    // Return console provider when push is disabled
    pushProviderInstance = new ConsolePushProvider();
    return pushProviderInstance;
  }

  switch (env.PUSH_PROVIDER) {
    case 'firebase':
      pushProviderInstance = new FirebasePushProvider();
      break;
    case 'console':
      pushProviderInstance = new ConsolePushProvider();
      break;
    case 'onesignal':
      throw new Error('OneSignal provider not yet implemented');
    default:
      throw new Error(`Unknown push provider: ${env.PUSH_PROVIDER}`);
  }

  return pushProviderInstance;
}

/**
 * Reset provider instance (for testing)
 */
export function resetPushProvider(): void {
  pushProviderInstance = null;
}

export { ConsolePushProvider } from './console.provider';
export { FirebasePushProvider } from './firebase.provider';
