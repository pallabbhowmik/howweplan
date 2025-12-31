import { env } from '../../config/env';
import { EmailProvider } from '../types';
import { ConsoleEmailProvider } from './console.provider';
import { ResendEmailProvider } from './resend.provider';

/**
 * Email Provider Factory
 * 
 * Creates the appropriate email provider based on configuration.
 * Singleton pattern ensures only one instance per process.
 */

let emailProviderInstance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (emailProviderInstance) {
    return emailProviderInstance;
  }

  switch (env.EMAIL_PROVIDER) {
    case 'resend':
      emailProviderInstance = new ResendEmailProvider();
      break;
    case 'console':
      emailProviderInstance = new ConsoleEmailProvider();
      break;
    case 'sendgrid':
      throw new Error('SendGrid provider not yet implemented');
    case 'ses':
      throw new Error('AWS SES provider not yet implemented');
    default:
      throw new Error(`Unknown email provider: ${env.EMAIL_PROVIDER}`);
  }

  return emailProviderInstance;
}

/**
 * Reset provider instance (for testing)
 */
export function resetEmailProvider(): void {
  emailProviderInstance = null;
}

export { ConsoleEmailProvider } from './console.provider';
export { ResendEmailProvider } from './resend.provider';
