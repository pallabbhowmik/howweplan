/**
 * Bank Account Verification Service
 *
 * Verifies agent bank account ownership via penny drop verification.
 * Confirms account holder name matches the registered agent name.
 *
 * Supports providers: Cashfree, Razorpay, Signzy
 * Cost: ₹1-3 per verification
 *
 * Flow:
 * 1. Agent submits bank account details (number, IFSC)
 * 2. System initiates penny drop (₹1 transfer)
 * 3. Provider returns account holder name from bank
 * 4. System compares with agent's registered name
 * 5. If match score >= threshold, mark as verified
 */

import crypto from 'crypto';
import {
  BankVerificationProvider,
  BankVerificationStatus,
  VerificationConfig,
  VerificationCosts,
  type BankAccountDetails,
  type BankVerification,
  type BankVerificationResponse,
} from '../types/verification.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

interface BankProviderConfig {
  cashfree?: {
    clientId: string;
    clientSecret: string;
    apiUrl: string;
  };
  razorpay?: {
    keyId: string;
    keySecret: string;
  };
  signzy?: {
    apiKey: string;
    apiUrl: string;
  };
}

const getProviderConfig = (): BankProviderConfig => ({
  cashfree: process.env.CASHFREE_CLIENT_ID
    ? {
        clientId: process.env.CASHFREE_CLIENT_ID,
        clientSecret: process.env.CASHFREE_CLIENT_SECRET!,
        apiUrl: process.env.CASHFREE_API_URL ?? 'https://api.cashfree.com',
      }
    : undefined,
  razorpay: process.env.RAZORPAY_KEY_ID
    ? {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET!,
      }
    : undefined,
  signzy: process.env.SIGNZY_API_KEY
    ? {
        apiKey: process.env.SIGNZY_API_KEY,
        apiUrl: process.env.SIGNZY_API_URL ?? 'https://signzy.tech',
      }
    : undefined,
});

const getPreferredProvider = (): BankVerificationProvider => {
  const config = getProviderConfig();
  // Priority: Razorpay (cheapest) > Cashfree > Signzy
  if (config.razorpay) return BankVerificationProvider.RAZORPAY;
  if (config.cashfree) return BankVerificationProvider.CASHFREE;
  if (config.signzy) return BankVerificationProvider.SIGNZY;
  throw new Error('No bank verification provider configured');
};

// ─────────────────────────────────────────────────────────────────────────────
// NAME MATCHING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize name for comparison
 * - Convert to uppercase
 * - Remove special characters
 * - Remove common prefixes/suffixes (MR, MRS, etc.)
 * - Trim whitespace
 */
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\b(MR|MRS|MS|DR|SHRI|SMT|KUMAR|KUMARI)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate name match score using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
    Array.from({ length: a.length + 1 }, () => 0)
  );

  for (let i = 0; i <= b.length; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Calculate name match score (0-100)
 */
function calculateNameMatchScore(providedName: string, verifiedName: string): number {
  const normalized1 = normalizeName(providedName);
  const normalized2 = normalizeName(verifiedName);

  // Exact match
  if (normalized1 === normalized2) {
    return 100;
  }

  // Check if one name contains the other (common for variations)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 90;
  }

  // Calculate Levenshtein-based similarity
  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) return 0;

  const distance = levenshteinDistance(normalized1, normalized2);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  // Token-based matching (compare individual words)
  const tokens1 = normalized1.split(' ').filter((t) => t.length > 0);
  const tokens2 = normalized2.split(' ').filter((t) => t.length > 0);

  let tokenMatches = 0;
  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) {
        tokenMatches++;
        break;
      }
    }
  }

  const tokenScore = (tokenMatches / Math.max(tokens1.length, tokens2.length)) * 100;

  // Return the higher of the two scores
  return Math.round(Math.max(similarity, tokenScore));
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

interface PennyDropResult {
  success: boolean;
  accountHolderName: string | null;
  referenceId: string;
  error?: string;
}

/**
 * Verify via Cashfree Penny Drop
 */
async function verifyViaCashfree(
  accountNumber: string,
  ifscCode: string,
  config: NonNullable<BankProviderConfig['cashfree']>
): Promise<PennyDropResult> {
  try {
    const response = await fetch(`${config.apiUrl}/verification/bank-account/sync`, {
      method: 'POST',
      headers: {
        'x-client-id': config.clientId,
        'x-client-secret': config.clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bank_account: accountNumber,
        ifsc: ifscCode,
      }),
    });

    const data = (await response.json()) as {
      status: string;
      data?: {
        account_holder: string;
        ref_id: string;
      };
      message?: string;
    };

    if (data.status !== 'SUCCESS' || !data.data) {
      return {
        success: false,
        accountHolderName: null,
        referenceId: '',
        error: data.message ?? 'Verification failed',
      };
    }

    return {
      success: true,
      accountHolderName: data.data.account_holder,
      referenceId: data.data.ref_id,
    };
  } catch (error) {
    console.error('Cashfree verification failed', error);
    return {
      success: false,
      accountHolderName: null,
      referenceId: '',
      error: String(error),
    };
  }
}

/**
 * Verify via Razorpay Fund Account Validation
 */
async function verifyViaRazorpay(
  accountNumber: string,
  ifscCode: string,
  config: NonNullable<BankProviderConfig['razorpay']>
): Promise<PennyDropResult> {
  try {
    const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');

    // Step 1: Create a fund account
    const fundAccountResponse = await fetch('https://api.razorpay.com/v1/fund_accounts', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_id: 'cont_verification',
        account_type: 'bank_account',
        bank_account: {
          ifsc: ifscCode,
          account_number: accountNumber,
        },
      }),
    });

    const fundAccountData = (await fundAccountResponse.json()) as {
      id?: string;
      bank_account?: {
        name: string;
      };
      error?: { description: string };
    };

    if (!fundAccountData.id || !fundAccountData.bank_account) {
      return {
        success: false,
        accountHolderName: null,
        referenceId: '',
        error: fundAccountData.error?.description ?? 'Fund account creation failed',
      };
    }

    // Step 2: Validate the fund account
    const validationResponse = await fetch(
      `https://api.razorpay.com/v1/fund_accounts/${fundAccountData.id}/validation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          types: ['bank_account'],
          amount: 100, // ₹1 for penny drop
          currency: 'INR',
        }),
      }
    );

    const validationData = (await validationResponse.json()) as {
      id?: string;
      results?: {
        account_holder: string;
      };
    };

    return {
      success: true,
      accountHolderName: validationData.results?.account_holder ?? fundAccountData.bank_account.name,
      referenceId: validationData.id ?? fundAccountData.id,
    };
  } catch (error) {
    console.error('Razorpay verification failed', error);
    return {
      success: false,
      accountHolderName: null,
      referenceId: '',
      error: String(error),
    };
  }
}

/**
 * Verify via Signzy Bank Account Verification
 */
async function verifyViaSignzy(
  accountNumber: string,
  ifscCode: string,
  config: NonNullable<BankProviderConfig['signzy']>
): Promise<PennyDropResult> {
  try {
    const response = await fetch(`${config.apiUrl}/api/v2/bankacc`, {
      method: 'POST',
      headers: {
        Authorization: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        essentials: {
          beneficiaryAccount: accountNumber,
          beneficiaryIFSC: ifscCode,
        },
        task: 'bankTransfer',
      }),
    });

    const data = (await response.json()) as {
      result?: {
        bankTransfer?: {
          response?: {
            nameAtBank?: string;
            utr?: string;
          };
        };
      };
      error?: { message: string };
    };

    if (!data.result?.bankTransfer?.response?.nameAtBank) {
      return {
        success: false,
        accountHolderName: null,
        referenceId: '',
        error: data.error?.message ?? 'Verification failed',
      };
    }

    return {
      success: true,
      accountHolderName: data.result.bankTransfer.response.nameAtBank,
      referenceId: data.result.bankTransfer.response.utr ?? '',
    };
  } catch (error) {
    console.error('Signzy verification failed', error);
    return {
      success: false,
      accountHolderName: null,
      referenceId: '',
      error: String(error),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK VERIFICATION SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class BankAccountVerificationService {
  // In-memory store for demo - replace with database in production
  private verifications = new Map<string, BankVerification>();

  /**
   * Verify bank account via penny drop
   */
  async verifyBankAccount(
    userId: string,
    details: BankAccountDetails
  ): Promise<BankVerificationResponse> {
    const provider = getPreferredProvider();
    const config = getProviderConfig();

    console.log('Starting bank account verification', { userId, provider, ifsc: details.ifscCode });

    // Perform verification via provider
    let result: PennyDropResult;
    let costCents: number;

    switch (provider) {
      case BankVerificationProvider.CASHFREE:
        result = await verifyViaCashfree(details.accountNumber, details.ifscCode, config.cashfree!);
        costCents = VerificationCosts.bankVerification.cashfree;
        break;
      case BankVerificationProvider.RAZORPAY:
        result = await verifyViaRazorpay(details.accountNumber, details.ifscCode, config.razorpay!);
        costCents = VerificationCosts.bankVerification.razorpay;
        break;
      case BankVerificationProvider.SIGNZY:
        result = await verifyViaSignzy(details.accountNumber, details.ifscCode, config.signzy!);
        costCents = VerificationCosts.bankVerification.signzy;
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!result.success || !result.accountHolderName) {
      const verification: BankVerification = {
        id: crypto.randomUUID(),
        userId,
        accountNumber: this.maskAccountNumber(details.accountNumber),
        ifscCode: details.ifscCode,
        providedName: details.accountHolderName,
        verifiedName: null,
        nameMatchScore: null,
        provider,
        status: BankVerificationStatus.FAILED,
        referenceId: result.referenceId,
        costCents,
        verifiedAt: null,
        createdAt: new Date(),
      };

      this.verifications.set(userId, verification);

      return {
        success: false,
        status: BankVerificationStatus.FAILED,
        accountHolderName: null,
        nameMatchScore: null,
        referenceId: result.referenceId,
        costCents,
      };
    }

    // Calculate name match
    const nameMatchScore = calculateNameMatchScore(
      details.accountHolderName,
      result.accountHolderName
    );

    const status =
      nameMatchScore >= VerificationConfig.bankNameMatchThreshold
        ? BankVerificationStatus.VERIFIED
        : BankVerificationStatus.NAME_MISMATCH;

    const verification: BankVerification = {
      id: crypto.randomUUID(),
      userId,
      accountNumber: this.maskAccountNumber(details.accountNumber),
      ifscCode: details.ifscCode,
      providedName: details.accountHolderName,
      verifiedName: result.accountHolderName,
      nameMatchScore,
      provider,
      status,
      referenceId: result.referenceId,
      costCents,
      verifiedAt: status === BankVerificationStatus.VERIFIED ? new Date() : null,
      createdAt: new Date(),
    };

    this.verifications.set(userId, verification);

    console.log('Bank account verification completed', { userId, status, nameMatchScore });

    return {
      success: status === BankVerificationStatus.VERIFIED,
      status,
      accountHolderName: result.accountHolderName,
      nameMatchScore,
      referenceId: result.referenceId,
      costCents,
    };
  }

  /**
   * Get verification status
   */
  getVerificationStatus(userId: string): BankVerification | null {
    return this.verifications.get(userId) ?? null;
  }

  /**
   * Mask account number for storage (show last 4 digits)
   */
  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    return 'X'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  }
}

export const bankVerificationService = new BankAccountVerificationService();
