import { env } from '../../config/env';
import { SmsProvider } from '../types';
import { ConsoleSmsProvider } from './console.provider';
import { TwilioSmsProvider } from './twilio.provider';

/**
 * SMS Provider Factory
 * 
 * Creates the appropriate SMS provider based on configuration.
 * Singleton pattern ensures only one instance per process.
 */

let smsProviderInstance: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (smsProviderInstance) {
    return smsProviderInstance;
  }

  if (!env.SMS_ENABLED) {
    // Return console provider when SMS is disabled
    smsProviderInstance = new ConsoleSmsProvider();
    return smsProviderInstance;
  }

  switch (env.SMS_PROVIDER) {
    case 'twilio':
      smsProviderInstance = new TwilioSmsProvider();
      break;
    case 'console':
      smsProviderInstance = new ConsoleSmsProvider();
      break;
    case 'vonage':
      throw new Error('Vonage provider not yet implemented');
    default:
      throw new Error(`Unknown SMS provider: ${env.SMS_PROVIDER}`);
  }

  return smsProviderInstance;
}

/**
 * Reset provider instance (for testing)
 */
export function resetSmsProvider(): void {
  smsProviderInstance = null;
}

export { ConsoleSmsProvider } from './console.provider';
export { TwilioSmsProvider } from './twilio.provider';
