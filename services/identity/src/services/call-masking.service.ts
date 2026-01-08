/**
 * Call/Chat Masking Service
 *
 * Provides privacy-preserving communication between users and agents.
 * Uses virtual numbers to mask real phone numbers during interactions.
 *
 * Supports providers: Exotel, Knowlarity, Kaleyra
 * Cost: Usage-based (₹1.50-2.50/minute for calls)
 *
 * Features:
 * - Virtual number allocation per booking
 * - Call forwarding/bridging
 * - Session expiration
 * - Call recording (optional, for dispute resolution)
 * - Usage tracking
 */

import crypto from 'crypto';
import {
  MaskingProvider,
  MaskingSessionStatus,
  VerificationCosts,
  type MaskingSession,
  type MaskingConfig,
} from '../types/verification.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

interface MaskingProviderConfig {
  exotel?: {
    apiKey: string;
    apiToken: string;
    sid: string;
    apiUrl: string;
    virtualNumbers: string[];
  };
  knowlarity?: {
    apiKey: string;
    agentNumber: string;
    apiUrl: string;
    srNumber: string;
  };
  kaleyra?: {
    apiKey: string;
    sid: string;
    apiUrl: string;
    virtualNumbers: string[];
  };
}

const getProviderConfig = (): MaskingProviderConfig => ({
  exotel: process.env.EXOTEL_API_KEY
    ? {
        apiKey: process.env.EXOTEL_API_KEY,
        apiToken: process.env.EXOTEL_API_TOKEN!,
        sid: process.env.EXOTEL_SID!,
        apiUrl: process.env.EXOTEL_API_URL ?? 'https://api.exotel.com/v1',
        virtualNumbers: (process.env.EXOTEL_VIRTUAL_NUMBERS ?? '').split(',').filter(Boolean),
      }
    : undefined,
  knowlarity: process.env.KNOWLARITY_API_KEY
    ? {
        apiKey: process.env.KNOWLARITY_API_KEY,
        agentNumber: process.env.KNOWLARITY_AGENT_NUMBER!,
        apiUrl: process.env.KNOWLARITY_API_URL ?? 'https://kpi.knowlarity.com',
        srNumber: process.env.KNOWLARITY_SR_NUMBER!,
      }
    : undefined,
  kaleyra: process.env.KALEYRA_API_KEY
    ? {
        apiKey: process.env.KALEYRA_API_KEY,
        sid: process.env.KALEYRA_SID!,
        apiUrl: process.env.KALEYRA_API_URL ?? 'https://api.kaleyra.io/v1',
        virtualNumbers: (process.env.KALEYRA_VIRTUAL_NUMBERS ?? '').split(',').filter(Boolean),
      }
    : undefined,
});

const getPreferredProvider = (): MaskingProvider => {
  const config = getProviderConfig();
  // Priority: Exotel (most popular in India) > Knowlarity > Kaleyra
  if (config.exotel) return MaskingProvider.EXOTEL;
  if (config.knowlarity) return MaskingProvider.KNOWLARITY;
  if (config.kaleyra) return MaskingProvider.KALEYRA;
  throw new Error('No call masking provider configured');
};

const defaultConfig: MaskingConfig = {
  enabled: true,
  provider: MaskingProvider.EXOTEL,
  sessionDurationHours: 72, // 3 days
  maxCallsPerSession: 50,
  costPerMinuteCents: VerificationCosts.callMasking.perMinute,
};

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUAL NUMBER POOL MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

interface VirtualNumberAllocation {
  virtualNumber: string;
  bookingId: string;
  allocatedAt: Date;
  expiresAt: Date;
}

class VirtualNumberPool {
  private allocations = new Map<string, VirtualNumberAllocation>();
  private numberToAllocation = new Map<string, string>();

  allocateNumber(
    provider: MaskingProvider,
    bookingId: string,
    durationHours: number
  ): string | null {
    const config = getProviderConfig();
    let availableNumbers: string[] = [];

    switch (provider) {
      case MaskingProvider.EXOTEL:
        availableNumbers = config.exotel?.virtualNumbers ?? [];
        break;
      case MaskingProvider.KALEYRA:
        availableNumbers = config.kaleyra?.virtualNumbers ?? [];
        break;
      case MaskingProvider.KNOWLARITY:
        // Knowlarity uses SR numbers differently
        return config.knowlarity?.srNumber ?? null;
    }

    // Find first available number
    for (const number of availableNumbers) {
      if (!this.numberToAllocation.has(number)) {
        const allocation: VirtualNumberAllocation = {
          virtualNumber: number,
          bookingId,
          allocatedAt: new Date(),
          expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
        };
        this.allocations.set(bookingId, allocation);
        this.numberToAllocation.set(number, bookingId);
        return number;
      }
    }

    // Check for expired allocations
    for (const [_num, bId] of this.numberToAllocation) {
      const allocation = this.allocations.get(bId);
      if (allocation && new Date() > allocation.expiresAt) {
        this.releaseNumber(bId);
        // Retry allocation
        return this.allocateNumber(provider, bookingId, durationHours);
      }
    }

    return null;
  }

  releaseNumber(bookingId: string): void {
    const allocation = this.allocations.get(bookingId);
    if (allocation) {
      this.numberToAllocation.delete(allocation.virtualNumber);
      this.allocations.delete(bookingId);
    }
  }

  getAllocation(bookingId: string): VirtualNumberAllocation | null {
    return this.allocations.get(bookingId) ?? null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

interface CreateMaskingResult {
  success: boolean;
  userMaskedNumber: string | null;
  agentMaskedNumber: string | null;
  sessionId: string | null;
  error?: string;
}

/**
 * Create masking session via Exotel
 */
async function createExotelSession(
  userPhone: string,
  agentPhone: string,
  virtualNumber: string,
  config: NonNullable<MaskingProviderConfig['exotel']>
): Promise<CreateMaskingResult> {
  try {
    const auth = Buffer.from(`${config.apiKey}:${config.apiToken}`).toString('base64');

    // Create ExoPhone bridge
    const response = await fetch(
      `${config.apiUrl}/Accounts/${config.sid}/Calls/connect.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: userPhone,
          To: agentPhone,
          CallerId: virtualNumber,
          CallType: 'trans',
          StatusCallback: process.env.EXOTEL_CALLBACK_URL ?? '',
        }).toString(),
      }
    );

    const data = (await response.json()) as {
      Call?: {
        Sid: string;
        PhoneNumberSid: string;
      };
      RestException?: { Message: string };
    };

    if (!data.Call) {
      return {
        success: false,
        userMaskedNumber: null,
        agentMaskedNumber: null,
        sessionId: null,
        error: data.RestException?.Message ?? 'Failed to create Exotel session',
      };
    }

    return {
      success: true,
      userMaskedNumber: virtualNumber,
      agentMaskedNumber: virtualNumber,
      sessionId: data.Call.Sid,
    };
  } catch (error) {
    console.error('[call-masking] Exotel session creation failed', error);
    return {
      success: false,
      userMaskedNumber: null,
      agentMaskedNumber: null,
      sessionId: null,
      error: String(error),
    };
  }
}

/**
 * Create masking session via Knowlarity
 */
async function createKnowlaritySession(
  userPhone: string,
  agentPhone: string,
  config: NonNullable<MaskingProviderConfig['knowlarity']>
): Promise<CreateMaskingResult> {
  try {
    const response = await fetch(`${config.apiUrl}/Basic/v1/account/call/makecall`, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        k_number: config.srNumber,
        agent_number: agentPhone,
        customer_number: userPhone,
      }),
    });

    const data = (await response.json()) as {
      success?: {
        call_id: string;
      };
      error?: { message: string };
    };

    if (!data.success) {
      return {
        success: false,
        userMaskedNumber: null,
        agentMaskedNumber: null,
        sessionId: null,
        error: data.error?.message ?? 'Failed to create Knowlarity session',
      };
    }

    return {
      success: true,
      userMaskedNumber: config.srNumber,
      agentMaskedNumber: config.srNumber,
      sessionId: data.success.call_id,
    };
  } catch (error) {
    console.error('[call-masking] Knowlarity session creation failed', error);
    return {
      success: false,
      userMaskedNumber: null,
      agentMaskedNumber: null,
      sessionId: null,
      error: String(error),
    };
  }
}

/**
 * Create masking session via Kaleyra
 */
async function createKaleyraSession(
  userPhone: string,
  agentPhone: string,
  virtualNumber: string,
  config: NonNullable<MaskingProviderConfig['kaleyra']>
): Promise<CreateMaskingResult> {
  try {
    const response = await fetch(`${config.apiUrl}/${config.sid}/messages`, {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: virtualNumber,
        to: [userPhone, agentPhone],
        type: 'OBD',
        body: {
          text: 'Connecting call...',
        },
      }),
    });

    const data = (await response.json()) as {
      id?: string;
      error?: { message: string };
    };

    if (!data.id) {
      return {
        success: false,
        userMaskedNumber: null,
        agentMaskedNumber: null,
        sessionId: null,
        error: data.error?.message ?? 'Failed to create Kaleyra session',
      };
    }

    return {
      success: true,
      userMaskedNumber: virtualNumber,
      agentMaskedNumber: virtualNumber,
      sessionId: data.id,
    };
  } catch (error) {
    console.error('[call-masking] Kaleyra session creation failed', error);
    return {
      success: false,
      userMaskedNumber: null,
      agentMaskedNumber: null,
      sessionId: null,
      error: String(error),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CALL MASKING SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class CallMaskingService {
  private sessions = new Map<string, MaskingSession>();
  private bookingToSession = new Map<string, string>();
  private numberPool = new VirtualNumberPool();
  private config = defaultConfig;

  /**
   * Create a new masking session for a booking
   */
  async createSession(params: {
    bookingId: string;
    userId: string;
    agentId: string;
    userPhone: string;
    agentPhone: string;
  }): Promise<MaskingSession> {
    const { bookingId, userId, agentId, userPhone, agentPhone } = params;

    // Check for existing session
    const existingSessionId = this.bookingToSession.get(bookingId);
    if (existingSessionId) {
      const existing = this.sessions.get(existingSessionId);
      if (existing && existing.status === MaskingSessionStatus.ACTIVE) {
        return existing;
      }
    }

    const provider = getPreferredProvider();
    const providerConfig = getProviderConfig();

    // Allocate virtual number
    const virtualNumber = this.numberPool.allocateNumber(
      provider,
      bookingId,
      this.config.sessionDurationHours
    );

    if (!virtualNumber) {
      throw new Error('No virtual numbers available');
    }

    console.log('Creating call masking session', { bookingId, provider, virtualNumber });

    // Create session via provider
    let result: CreateMaskingResult;

    switch (provider) {
      case MaskingProvider.EXOTEL:
        result = await createExotelSession(
          userPhone,
          agentPhone,
          virtualNumber,
          providerConfig.exotel!
        );
        break;
      case MaskingProvider.KNOWLARITY:
        result = await createKnowlaritySession(userPhone, agentPhone, providerConfig.knowlarity!);
        break;
      case MaskingProvider.KALEYRA:
        result = await createKaleyraSession(
          userPhone,
          agentPhone,
          virtualNumber,
          providerConfig.kaleyra!
        );
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!result.success) {
      this.numberPool.releaseNumber(bookingId);
      throw new Error(`Failed to create masking session: ${result.error}`);
    }

    const session: MaskingSession = {
      id: crypto.randomUUID(),
      bookingId,
      userId,
      agentId,
      provider,
      userMaskedNumber: result.userMaskedNumber!,
      agentMaskedNumber: result.agentMaskedNumber!,
      status: MaskingSessionStatus.ACTIVE,
      expiresAt: new Date(Date.now() + this.config.sessionDurationHours * 60 * 60 * 1000),
      totalCalls: 0,
      totalDurationMinutes: 0,
      costCents: 0,
      createdAt: new Date(),
    };

    this.sessions.set(session.id, session);
    this.bookingToSession.set(bookingId, session.id);

    console.log('Call masking session created', { sessionId: session.id, bookingId });

    return session;
  }

  /**
   * Get session by booking ID
   */
  getSessionByBooking(bookingId: string): MaskingSession | null {
    const sessionId = this.bookingToSession.get(bookingId);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): MaskingSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Record a call in the session
   */
  recordCall(sessionId: string, durationMinutes: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updatedSession: MaskingSession = {
      ...session,
      totalCalls: session.totalCalls + 1,
      totalDurationMinutes: session.totalDurationMinutes + durationMinutes,
      costCents: session.costCents + Math.ceil(durationMinutes * this.config.costPerMinuteCents),
    };

    this.sessions.set(sessionId, updatedSession);

    // Check if max calls reached
    if (updatedSession.totalCalls >= this.config.maxCallsPerSession) {
      this.terminateSession(sessionId);
    }
  }

  /**
   * Terminate a session
   */
  terminateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updatedSession: MaskingSession = {
      ...session,
      status: MaskingSessionStatus.TERMINATED,
    };

    this.sessions.set(sessionId, updatedSession);
    this.numberPool.releaseNumber(session.bookingId);

    console.log('Call masking session terminated', {
      sessionId,
      bookingId: session.bookingId,
      totalCalls: session.totalCalls,
      totalDurationMinutes: session.totalDurationMinutes,
    });
  }

  /**
   * Check and expire old sessions
   */
  expireSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions) {
      if (session.status === MaskingSessionStatus.ACTIVE && now > session.expiresAt) {
        const updatedSession: MaskingSession = {
          ...session,
          status: MaskingSessionStatus.EXPIRED,
        };
        this.sessions.set(sessionId, updatedSession);
        this.numberPool.releaseNumber(session.bookingId);

        console.log('Call masking session expired', { sessionId });
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MaskingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): MaskingConfig {
    return this.config;
  }
}

export const callMaskingService = new CallMaskingService();
