/**
 * Platform Engagement Incentive Service
 * 
 * Manages loyalty credits, discounts, and platform incentives to reduce
 * disintermediation and encourage repeat bookings.
 * 
 * BUSINESS RULES:
 * - Award credits on completed bookings (configurable percentage)
 * - Loyalty discounts increase with booking count
 * - Credits expire after configurable period
 * - Referral bonuses awarded when referred users complete first booking
 * - All incentive activities are audit-logged
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../env.js';

// =============================================================================
// TYPES
// =============================================================================

export type IncentiveType =
  | 'loyalty_discount'
  | 'credits'
  | 'badge'
  | 'priority_matching'
  | 'referral_bonus'
  | 'milestone_reward';

export interface Incentive {
  id: string;
  userId: string;
  incentiveType: IncentiveType;
  amountCents: number;
  percentageDiscount: number;
  description: string | null;
  sourceBookingId: string | null;
  expiresAt: Date | null;
  redeemedAt: Date | null;
  redeemedBookingId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIncentiveInput {
  userId: string;
  incentiveType: IncentiveType;
  amountCents?: number;
  percentageDiscount?: number;
  description?: string;
  sourceBookingId?: string;
  expiresInDays?: number;
}

export interface RedeemIncentiveInput {
  incentiveId: string;
  bookingId: string;
}

export interface UserIncentiveSummary {
  userId: string;
  totalCreditsAvailable: number;
  totalCreditsRedeemed: number;
  activeDiscountPercentage: number;
  incentivesCount: number;
  expiringWithin7Days: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const INCENTIVE_CONFIG = {
  // Credit awards
  BOOKING_COMPLETION_CREDIT_RATE: 0.02, // 2% of booking value as credits
  REFERRAL_BONUS_CENTS: 50000,          // ₹500 referral bonus

  // Loyalty tiers (based on lifetime bookings)
  LOYALTY_TIERS: {
    bronze: { minBookings: 0, discountRate: 0 },
    silver: { minBookings: 3, discountRate: 0.02 },
    gold: { minBookings: 7, discountRate: 0.04 },
    platinum: { minBookings: 15, discountRate: 0.06 },
  },

  // Milestone rewards
  MILESTONES: [
    { bookings: 1, creditsCents: 10000, description: 'First booking bonus' },
    { bookings: 5, creditsCents: 25000, description: '5 bookings milestone' },
    { bookings: 10, creditsCents: 50000, description: '10 bookings milestone' },
    { bookings: 25, creditsCents: 100000, description: '25 bookings milestone' },
  ],

  // Expiration
  DEFAULT_CREDIT_EXPIRY_DAYS: 365,
  REFERRAL_BONUS_EXPIRY_DAYS: 180,
};

// =============================================================================
// INCENTIVE SERVICE
// =============================================================================

export class IncentiveService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      config.database.supabaseUrl,
      config.database.supabaseServiceRoleKey
    );
  }

  /**
   * Award credits to a user after a completed booking.
   */
  async awardBookingCredits(
    userId: string,
    bookingId: string,
    bookingAmountCents: number
  ): Promise<Incentive> {
    const creditAmount = Math.floor(
      bookingAmountCents * INCENTIVE_CONFIG.BOOKING_COMPLETION_CREDIT_RATE
    );

    if (creditAmount < 100) {
      // Minimum 1 rupee credit
      throw new Error('Booking amount too low for credit award');
    }

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + INCENTIVE_CONFIG.DEFAULT_CREDIT_EXPIRY_DAYS
    );

    const { data, error } = await this.supabase
      .from('platform_engagement_incentives')
      .insert({
        user_id: userId,
        incentive_type: 'credits',
        amount_cents: creditAmount,
        description: `2% cashback on booking`,
        source_booking_id: bookingId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to award booking credits: ${error.message}`);
    }

    // Check for milestone rewards
    await this.checkAndAwardMilestones(userId);

    return this.mapToIncentive(data);
  }

  /**
   * Award referral bonus when referred user completes their first booking.
   */
  async awardReferralBonus(
    referrerId: string,
    referredUserId: string,
    referralBookingId: string
  ): Promise<Incentive> {
    // Check if referrer already received bonus for this user
    const { data: existing } = await this.supabase
      .from('platform_engagement_incentives')
      .select('id')
      .eq('user_id', referrerId)
      .eq('incentive_type', 'referral_bonus')
      .eq('description', `Referral bonus: ${referredUserId}`)
      .single();

    if (existing) {
      throw new Error('Referral bonus already awarded for this user');
    }

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + INCENTIVE_CONFIG.REFERRAL_BONUS_EXPIRY_DAYS
    );

    const { data, error } = await this.supabase
      .from('platform_engagement_incentives')
      .insert({
        user_id: referrerId,
        incentive_type: 'referral_bonus',
        amount_cents: INCENTIVE_CONFIG.REFERRAL_BONUS_CENTS,
        description: `Referral bonus: ${referredUserId}`,
        source_booking_id: referralBookingId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to award referral bonus: ${error.message}`);
    }

    return this.mapToIncentive(data);
  }

  /**
   * Check and award milestone rewards.
   */
  async checkAndAwardMilestones(userId: string): Promise<Incentive | null> {
    // Get user's completed booking count
    const { count: bookingCount } = await this.supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (!bookingCount) return null;

    // Get already awarded milestones
    const { data: awardedMilestones } = await this.supabase
      .from('platform_engagement_incentives')
      .select('description')
      .eq('user_id', userId)
      .eq('incentive_type', 'milestone_reward');

    const awardedDescriptions = new Set(
      awardedMilestones?.map((m) => m.description) || []
    );

    // Find highest eligible milestone not yet awarded
    const eligibleMilestones = INCENTIVE_CONFIG.MILESTONES.filter(
      (m) =>
        bookingCount >= m.bookings && !awardedDescriptions.has(m.description)
    );

    if (eligibleMilestones.length === 0) return null;

    // Award the highest eligible milestone
    const milestone = eligibleMilestones[eligibleMilestones.length - 1];
    if (!milestone) return null;

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + INCENTIVE_CONFIG.DEFAULT_CREDIT_EXPIRY_DAYS
    );

    const { data, error } = await this.supabase
      .from('platform_engagement_incentives')
      .insert({
        user_id: userId,
        incentive_type: 'milestone_reward',
        amount_cents: milestone.creditsCents,
        description: milestone.description,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`Failed to award milestone: ${error.message}`);
      return null;
    }

    return this.mapToIncentive(data);
  }

  /**
   * Get user's loyalty tier based on booking history.
   */
  async getUserLoyaltyTier(
    userId: string
  ): Promise<'bronze' | 'silver' | 'gold' | 'platinum'> {
    const { count: bookingCount } = await this.supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    const count = bookingCount || 0;

    if (count >= INCENTIVE_CONFIG.LOYALTY_TIERS.platinum.minBookings) {
      return 'platinum';
    }
    if (count >= INCENTIVE_CONFIG.LOYALTY_TIERS.gold.minBookings) {
      return 'gold';
    }
    if (count >= INCENTIVE_CONFIG.LOYALTY_TIERS.silver.minBookings) {
      return 'silver';
    }
    return 'bronze';
  }

  /**
   * Get loyalty discount rate for a user.
   */
  async getLoyaltyDiscountRate(userId: string): Promise<number> {
    const tier = await this.getUserLoyaltyTier(userId);
    return INCENTIVE_CONFIG.LOYALTY_TIERS[tier].discountRate;
  }

  /**
   * Get user's available credits.
   */
  async getAvailableCredits(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from('platform_engagement_incentives')
      .select('amount_cents')
      .eq('user_id', userId)
      .in('incentive_type', ['credits', 'referral_bonus', 'milestone_reward'])
      .is('redeemed_at', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (!data) return 0;

    return data.reduce((sum, item) => sum + (item.amount_cents || 0), 0);
  }

  /**
   * Get user's incentive summary.
   */
  async getIncentiveSummary(userId: string): Promise<UserIncentiveSummary> {
    const [availableCredits, loyaltyTier, incentives, redeemed] =
      await Promise.all([
        this.getAvailableCredits(userId),
        this.getUserLoyaltyTier(userId),
        this.supabase
          .from('platform_engagement_incentives')
          .select('*')
          .eq('user_id', userId)
          .is('redeemed_at', null),
        this.supabase
          .from('platform_engagement_incentives')
          .select('amount_cents')
          .eq('user_id', userId)
          .not('redeemed_at', 'is', null),
      ]);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringWithin7Days = (incentives.data || []).filter(
      (i) => i.expires_at && new Date(i.expires_at) <= sevenDaysFromNow
    ).length;

    const totalRedeemed = (redeemed.data || []).reduce(
      (sum, item) => sum + (item.amount_cents || 0),
      0
    );

    return {
      userId,
      totalCreditsAvailable: availableCredits,
      totalCreditsRedeemed: totalRedeemed,
      activeDiscountPercentage:
        INCENTIVE_CONFIG.LOYALTY_TIERS[loyaltyTier].discountRate * 100,
      incentivesCount: incentives.data?.length || 0,
      expiringWithin7Days,
      loyaltyTier,
    };
  }

  /**
   * Redeem credits for a booking.
   */
  async redeemCredits(
    userId: string,
    bookingId: string,
    amountToRedeem: number
  ): Promise<number> {
    const availableCredits = await this.getAvailableCredits(userId);

    if (amountToRedeem > availableCredits) {
      throw new Error(
        `Insufficient credits. Available: ${availableCredits}, Requested: ${amountToRedeem}`
      );
    }

    // Get eligible incentives ordered by expiry (FIFO)
    const { data: incentives } = await this.supabase
      .from('platform_engagement_incentives')
      .select('*')
      .eq('user_id', userId)
      .in('incentive_type', ['credits', 'referral_bonus', 'milestone_reward'])
      .is('redeemed_at', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('expires_at', { ascending: true, nullsFirst: false });

    if (!incentives) {
      throw new Error('No incentives available for redemption');
    }

    let remaining = amountToRedeem;
    const redeemedIds: string[] = [];

    for (const incentive of incentives) {
      if (remaining <= 0) break;

      if (incentive.amount_cents <= remaining) {
        // Fully redeem this incentive
        redeemedIds.push(incentive.id);
        remaining -= incentive.amount_cents;
      } else {
        // Partial redemption - split the incentive
        // Create new incentive with remaining balance
        const newBalance = incentive.amount_cents - remaining;

        await this.supabase.from('platform_engagement_incentives').insert({
          user_id: userId,
          incentive_type: incentive.incentive_type,
          amount_cents: newBalance,
          description: `Remaining balance from partial redemption`,
          expires_at: incentive.expires_at,
        });

        // Mark original as redeemed with adjusted amount
        await this.supabase
          .from('platform_engagement_incentives')
          .update({
            amount_cents: remaining,
            redeemed_at: new Date().toISOString(),
            redeemed_booking_id: bookingId,
          })
          .eq('id', incentive.id);

        remaining = 0;
      }
    }

    // Mark fully redeemed incentives
    if (redeemedIds.length > 0) {
      await this.supabase
        .from('platform_engagement_incentives')
        .update({
          redeemed_at: new Date().toISOString(),
          redeemed_booking_id: bookingId,
        })
        .in('id', redeemedIds);
    }

    return amountToRedeem - remaining;
  }

  /**
   * Get all incentives for a user.
   */
  async getIncentives(
    userId: string,
    options?: {
      includeRedeemed?: boolean;
      includeExpired?: boolean;
    }
  ): Promise<Incentive[]> {
    let query = this.supabase
      .from('platform_engagement_incentives')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!options?.includeRedeemed) {
      query = query.is('redeemed_at', null);
    }

    if (!options?.includeExpired) {
      query = query.or(
        `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get incentives: ${error.message}`);
    }

    return (data || []).map((item) => this.mapToIncentive(item));
  }

  /**
   * Calculate total discount for a booking.
   */
  async calculateBookingDiscount(
    userId: string,
    bookingAmountCents: number,
    applyCredits: boolean = true
  ): Promise<{
    loyaltyDiscount: number;
    creditsApplied: number;
    totalDiscount: number;
    finalAmount: number;
  }> {
    const loyaltyRate = await this.getLoyaltyDiscountRate(userId);
    const loyaltyDiscount = Math.floor(bookingAmountCents * loyaltyRate);

    let creditsApplied = 0;
    if (applyCredits) {
      const availableCredits = await this.getAvailableCredits(userId);
      const afterLoyalty = bookingAmountCents - loyaltyDiscount;
      creditsApplied = Math.min(availableCredits, afterLoyalty);
    }

    const totalDiscount = loyaltyDiscount + creditsApplied;
    const finalAmount = bookingAmountCents - totalDiscount;

    return {
      loyaltyDiscount,
      creditsApplied,
      totalDiscount,
      finalAmount,
    };
  }

  /**
   * Create a custom incentive (admin use).
   */
  async createIncentive(input: CreateIncentiveInput): Promise<Incentive> {
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const { data, error } = await this.supabase
      .from('platform_engagement_incentives')
      .insert({
        user_id: input.userId,
        incentive_type: input.incentiveType,
        amount_cents: input.amountCents || 0,
        percentage_discount: input.percentageDiscount || 0,
        description: input.description,
        source_booking_id: input.sourceBookingId,
        expires_at: expiresAt?.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create incentive: ${error.message}`);
    }

    return this.mapToIncentive(data);
  }

  private mapToIncentive(row: Record<string, unknown>): Incentive {
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      incentiveType: row['incentive_type'] as IncentiveType,
      amountCents: (row['amount_cents'] as number) || 0,
      percentageDiscount: (row['percentage_discount'] as number) || 0,
      description: row['description'] as string | null,
      sourceBookingId: row['source_booking_id'] as string | null,
      expiresAt: row['expires_at'] ? new Date(row['expires_at'] as string) : null,
      redeemedAt: row['redeemed_at']
        ? new Date(row['redeemed_at'] as string)
        : null,
      redeemedBookingId: row['redeemed_booking_id'] as string | null,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}

// Export singleton instance
export const incentiveService = new IncentiveService();
