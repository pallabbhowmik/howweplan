/**
 * Email Reputation Service
 *
 * Checks email domain reputation and validity.
 * Flags disposable, invalid, or high-risk email addresses.
 *
 * Checks performed:
 * - Disposable email domain detection
 * - MX record validation
 * - Domain age check
 * - Email deliverability
 * - Risk scoring
 *
 * Cost: ₹0-1 per check
 */

import dns from 'dns';
import { promisify } from 'util';
import crypto from 'crypto';
import {
  EmailReputationStatus,
  VerificationConfig,
  type EmailReputation,
} from '../types/verification.types.js';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN DISPOSABLE EMAIL DOMAINS
// ─────────────────────────────────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  // Popular disposable email services
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.org',
  'sharklasers.com',
  'mailinator.com',
  'mailinator.net',
  'maildrop.cc',
  'throwaway.email',
  '10minutemail.com',
  '10minutemail.net',
  'minutemail.com',
  'dispostable.com',
  'fakeinbox.com',
  'trashmail.com',
  'trashmail.net',
  'mailnesia.com',
  'getnada.com',
  'tempinbox.com',
  'mohmal.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'emailondeck.com',
  'tempr.email',
  'discard.email',
  'discardmail.com',
  'dropmail.me',
  'mailslurp.com',
  'receivemail.com',
  'anonbox.net',
  'anonymbox.com',
  'mytrashmail.com',
  'jetable.org',
  'nospam.ze.tc',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'spamgourmet.com',
  'spamgourmet.net',
  'spam4.me',
  'spamex.com',
  'mailcatch.com',
  'inboxalias.com',
  'sogetthis.com',
  'mailfence.com',
  'zoho.in',
  // Indian disposable domains
  'tempail.com',
  'fakemailgenerator.com',
  'throwawaymail.com',
  'tmpmail.org',
  'tmpmail.net',
]);

// ─────────────────────────────────────────────────────────────────────────────
// FREE EMAIL PROVIDERS
// ─────────────────────────────────────────────────────────────────────────────

const FREE_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.in',
  'yahoo.co.in',
  'hotmail.com',
  'outlook.com',
  'outlook.in',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'mail.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'rediffmail.com',
  'rediff.com',
  'in.com',
  'sify.com',
]);

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL VALIDATION UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain);
}

function checkIsFreeProvider(domain: string): boolean {
  return FREE_PROVIDERS.has(domain);
}

// ─────────────────────────────────────────────────────────────────────────────
// DNS CHECKS
// ─────────────────────────────────────────────────────────────────────────────

async function checkMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

async function checkSpfRecord(domain: string): Promise<boolean> {
  try {
    const records = await resolveTxt(domain);
    return records.flat().some((record) => record.includes('v=spf1'));
  } catch {
    return false;
  }
}

async function checkDmarcRecord(domain: string): Promise<boolean> {
  try {
    const records = await resolveTxt(`_dmarc.${domain}`);
    return records.flat().some((record) => record.includes('v=DMARC1'));
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN AGE CHECK (via WHOIS API if configured)
// ─────────────────────────────────────────────────────────────────────────────

interface WhoisConfig {
  apiKey: string;
  apiUrl: string;
}

const getWhoisConfig = (): WhoisConfig | null => {
  if (!process.env.WHOIS_API_KEY) return null;
  return {
    apiKey: process.env.WHOIS_API_KEY,
    apiUrl: process.env.WHOIS_API_URL ?? 'https://www.whoisxmlapi.com/whoisserver/WhoisService',
  };
};

async function getDomainAgeDays(domain: string): Promise<number | null> {
  const config = getWhoisConfig();
  if (!config) return null;

  try {
    const params = new URLSearchParams({
      apiKey: config.apiKey,
      domainName: domain,
      outputFormat: 'JSON',
    });

    const response = await fetch(`${config.apiUrl}?${params}`);
    const data = (await response.json()) as {
      WhoisRecord?: {
        createdDate?: string;
      };
    };

    if (!data.WhoisRecord?.createdDate) return null;

    const createdDate = new Date(data.WhoisRecord.createdDate);
    const now = new Date();
    return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.debug('WHOIS lookup failed', { domain, error });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK SCORING
// ─────────────────────────────────────────────────────────────────────────────

interface RiskFactors {
  isDisposable: boolean;
  isFreeProvider: boolean;
  hasMxRecords: boolean;
  hasSpfRecord: boolean;
  hasDmarcRecord: boolean;
  domainAge: number | null;
}

function calculateRiskScore(factors: RiskFactors): { score: number; riskFactors: string[] } {
  let score = 100;
  const riskFactors: string[] = [];

  // Disposable domain is highest risk
  if (factors.isDisposable) {
    score -= 80;
    riskFactors.push('Disposable email domain');
  }

  // No MX records
  if (!factors.hasMxRecords) {
    score -= 40;
    riskFactors.push('No MX records found');
  }

  // Free provider is slight risk for business context
  if (factors.isFreeProvider) {
    score -= 10;
    riskFactors.push('Free email provider');
  }

  // No SPF record
  if (!factors.hasSpfRecord && !factors.isFreeProvider) {
    score -= 10;
    riskFactors.push('No SPF record');
  }

  // No DMARC record
  if (!factors.hasDmarcRecord && !factors.isFreeProvider) {
    score -= 5;
    riskFactors.push('No DMARC record');
  }

  // Very new domain (less than 30 days)
  if (factors.domainAge !== null && factors.domainAge < 30) {
    score -= 20;
    riskFactors.push('Domain less than 30 days old');
  }

  // Ensure score is between 0 and 100
  return {
    score: Math.max(0, Math.min(100, score)),
    riskFactors,
  };
}

function determineStatus(score: number, isDisposable: boolean): EmailReputationStatus {
  if (isDisposable) return EmailReputationStatus.DISPOSABLE;
  if (score >= VerificationConfig.emailReputationThreshold) return EmailReputationStatus.VALID;
  if (score >= 30) return EmailReputationStatus.HIGH_RISK;
  return EmailReputationStatus.INVALID;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL REPUTATION SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class EmailReputationService {
  // In-memory cache for demo - replace with database/Redis in production
  private reputations = new Map<string, EmailReputation>();
  private cacheTTLMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check email reputation
   */
  async checkReputation(userId: string, email: string): Promise<EmailReputation> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check cache first
    const cached = this.reputations.get(normalizedEmail);
    if (cached && Date.now() - cached.checkedAt.getTime() < this.cacheTTLMs) {
      console.debug('Email reputation cache hit', { email: normalizedEmail });
      return cached;
    }

    console.log('Checking email reputation', { userId, email: normalizedEmail });

    // Validate format
    if (!isValidEmailFormat(normalizedEmail)) {
      const reputation: EmailReputation = {
        id: crypto.randomUUID(),
        userId,
        email: normalizedEmail,
        status: EmailReputationStatus.INVALID,
        score: 0,
        isDisposable: false,
        isFreeProvider: false,
        domainAge: null,
        hasMxRecords: false,
        isDeliverable: false,
        riskFactors: ['Invalid email format'],
        checkedAt: new Date(),
      };
      this.reputations.set(normalizedEmail, reputation);
      return reputation;
    }

    const domain = extractDomain(normalizedEmail);
    const isDisposable = isDisposableDomain(domain);
    const emailIsFreeProvider = checkIsFreeProvider(domain);

    // Perform DNS checks in parallel
    const [hasMxRecords, hasSpfRecord, hasDmarcRecord, domainAge] = await Promise.all([
      checkMxRecords(domain),
      checkSpfRecord(domain),
      checkDmarcRecord(domain),
      getDomainAgeDays(domain),
    ]);

    const factors: RiskFactors = {
      isDisposable,
      isFreeProvider: emailIsFreeProvider,
      hasMxRecords,
      hasSpfRecord,
      hasDmarcRecord,
      domainAge,
    };

    const { score, riskFactors } = calculateRiskScore(factors);
    const status = determineStatus(score, isDisposable);

    const reputation: EmailReputation = {
      id: crypto.randomUUID(),
      userId,
      email: normalizedEmail,
      status,
      score,
      isDisposable,
      isFreeProvider: emailIsFreeProvider,
      domainAge,
      hasMxRecords,
      isDeliverable: hasMxRecords && !isDisposable,
      riskFactors,
      checkedAt: new Date(),
    };

    this.reputations.set(normalizedEmail, reputation);

    console.log('Email reputation checked', { userId, email: normalizedEmail, score, status });

    return reputation;
  }

  /**
   * Quick check if email is acceptable
   */
  async isEmailAcceptable(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    if (!isValidEmailFormat(normalizedEmail)) return false;

    const domain = extractDomain(normalizedEmail);
    if (isDisposableDomain(domain)) return false;

    const hasMx = await checkMxRecords(domain);
    return hasMx;
  }

  /**
   * Get cached reputation
   */
  getCachedReputation(email: string): EmailReputation | null {
    return this.reputations.get(email.toLowerCase().trim()) ?? null;
  }

  /**
   * Invalidate cache for email
   */
  invalidateCache(email: string): void {
    this.reputations.delete(email.toLowerCase().trim());
  }
}

export const emailReputationService = new EmailReputationService();
