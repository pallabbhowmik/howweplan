/**
 * Price Benchmark Service
 * 
 * Provides price transparency by comparing itinerary pricing against
 * historical platform data and market benchmarks.
 * 
 * PRICE INDICATORS:
 * - below_market: 15%+ below average (good value)
 * - at_market: Within ±15% of average (fair price)
 * - above_market: 15-40% above average (premium pricing)
 * - premium: 40%+ above average (luxury/exclusive)
 * 
 * BUSINESS RULES:
 * - Compare against similar trips (destination, style, season)
 * - Update benchmarks from completed bookings
 * - Display value indicators on itineraries
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export type PriceIndicator = 'below_market' | 'at_market' | 'above_market' | 'premium';
export type Season = 'peak' | 'shoulder' | 'off_peak';
export type TravelStyle = 'budget' | 'mid-range' | 'luxury' | 'ultra-luxury';

export interface PriceBenchmark {
    destination: string;
    season: Season;
    travelStyle: TravelStyle | null;
    hotelMinCents: number | null;
    hotelMaxCents: number | null;
    hotelMedianCents: number | null;
    flightMinCents: number | null;
    flightMaxCents: number | null;
    flightMedianCents: number | null;
    overallMinCents: number | null;
    overallMaxCents: number | null;
    overallMedianCents: number | null;
    sampleSize: number;
    lastUpdatedAt: Date;
}

export interface PriceComparisonResult {
    indicator: PriceIndicator;
    percentageVsMarket: number;        // e.g., -10% means 10% below market
    marketMedianCents: number;
    marketRangeLow: number;
    marketRangeHigh: number;
    valueScore: number;                 // 1-5 stars
    valueSummary: string;
    confidence: 'high' | 'medium' | 'low';
    sampleSize: number;
}

export interface ItineraryPriceInput {
    destination: string;
    totalPriceCents: number;
    daysCount: number;
    travelerCount: number;
    travelStyle?: TravelStyle;
    departureDateStr?: string;
}

export interface PriceTrend {
    destination: string;
    currentMedianCents: number;
    previousMedianCents: number;
    changePercentage: number;
    trendDirection: 'up' | 'down' | 'stable';
    seasonalFactor: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const PRICE_CONFIG = {
    // Indicator thresholds (percentage vs median)
    THRESHOLDS: {
        below_market: -15,
        above_market: 15,
        premium: 40,
    },

    // Minimum sample size for high confidence
    HIGH_CONFIDENCE_SAMPLES: 20,
    MEDIUM_CONFIDENCE_SAMPLES: 5,

    // Seasonal adjustment factors (multiplier on base price)
    SEASONAL_FACTORS: {
        peak: 1.35,
        shoulder: 1.0,
        off_peak: 0.75,
    },

    // Travel style multipliers (for cross-style comparison)
    STYLE_MULTIPLIERS: {
        budget: 0.6,
        'mid-range': 1.0,
        luxury: 2.0,
        'ultra-luxury': 4.0,
    },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine season from date
 */
function getSeason(dateStr: string | undefined): Season {
    if (!dateStr) return 'shoulder';

    const date = new Date(dateStr);
    const month = date.getMonth() + 1; // 1-12

    // Indian peak seasons (simplified)
    // Peak: Oct-Mar (winter tourism), Apr-Jun (summer holidays)
    // Off-peak: Jul-Sep (monsoon)
    if (month >= 7 && month <= 9) return 'off_peak';
    if (month >= 10 || month <= 3) return 'peak';
    return 'shoulder';
}

/**
 * Normalize destination name for matching
 */
function normalizeDestination(destination: string): string {
    return destination
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 2) // First two words
        .join(' ');
}

/**
 * Calculate value score (1-5 stars)
 */
function calculateValueScore(percentageVsMarket: number): number {
    if (percentageVsMarket <= -20) return 5;
    if (percentageVsMarket <= -10) return 4;
    if (percentageVsMarket <= 10) return 3;
    if (percentageVsMarket <= 25) return 2;
    return 1;
}

/**
 * Generate value summary text
 */
function generateValueSummary(indicator: PriceIndicator, percentage: number): string {
    switch (indicator) {
        case 'below_market':
            return `${Math.abs(percentage).toFixed(0)}% below average market rate - Great value!`;
        case 'at_market':
            return 'Priced at market average - Fair and competitive';
        case 'above_market':
            return `${percentage.toFixed(0)}% above average - Premium service included`;
        case 'premium':
            return 'Luxury exclusive pricing - Exceptional experience';
    }
}

// =============================================================================
// PRICE BENCHMARK SERVICE
// =============================================================================

export class PriceBenchmarkService {
    private readonly supabase: SupabaseClient;

    constructor(supabaseUrl: string, supabaseServiceKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    /**
     * Compare an itinerary price against market benchmarks.
     */
    async comparePriceToMarket(input: ItineraryPriceInput): Promise<PriceComparisonResult> {
        const season = getSeason(input.departureDateStr);
        const normalizedDest = normalizeDestination(input.destination);

        // Get benchmark data
        const benchmark = await this.getBenchmark(
            normalizedDest,
            season,
            input.travelStyle
        );

        // Calculate per-person-per-day price for comparison
        const pricePerPersonPerDay =
            input.totalPriceCents / input.travelerCount / input.daysCount;

        // Use benchmark or fallback to defaults
        let marketMedian: number;
        let marketLow: number;
        let marketHigh: number;
        let sampleSize: number;
        let confidence: 'high' | 'medium' | 'low';

        if (benchmark && benchmark.overallMedianCents) {
            marketMedian = benchmark.overallMedianCents / input.daysCount;
            marketLow = (benchmark.overallMinCents || marketMedian * 0.7) / input.daysCount;
            marketHigh = (benchmark.overallMaxCents || marketMedian * 1.5) / input.daysCount;
            sampleSize = benchmark.sampleSize;
            confidence = this.getConfidenceLevel(sampleSize);
        } else {
            // Fallback: Use style-based estimation
            const basePrice = this.getBasePrice(input.travelStyle, season);
            marketMedian = basePrice;
            marketLow = basePrice * 0.7;
            marketHigh = basePrice * 1.5;
            sampleSize = 0;
            confidence = 'low';
        }

        // Calculate percentage difference
        const percentageVsMarket = ((pricePerPersonPerDay - marketMedian) / marketMedian) * 100;

        // Determine indicator
        const indicator = this.getIndicator(percentageVsMarket);
        const valueScore = calculateValueScore(percentageVsMarket);
        const valueSummary = generateValueSummary(indicator, percentageVsMarket);

        return {
            indicator,
            percentageVsMarket: Math.round(percentageVsMarket * 10) / 10,
            marketMedianCents: Math.round(marketMedian * input.daysCount * input.travelerCount),
            marketRangeLow: Math.round(marketLow * input.daysCount * input.travelerCount),
            marketRangeHigh: Math.round(marketHigh * input.daysCount * input.travelerCount),
            valueScore,
            valueSummary,
            confidence,
            sampleSize,
        };
    }

    /**
     * Get stored benchmark for a destination/season/style combination.
     */
    async getBenchmark(
        destination: string,
        season: Season,
        style?: TravelStyle
    ): Promise<PriceBenchmark | null> {
        // First try exact match with style
        if (style) {
            const { data } = await this.supabase
                .from('price_benchmarks')
                .select('*')
                .eq('destination', destination)
                .eq('season', season)
                .eq('travel_style', style)
                .single();

            if (data) return this.mapToBenchmark(data);
        }

        // Fall back to destination + season without style
        const { data: fallback } = await this.supabase
            .from('price_benchmarks')
            .select('*')
            .eq('destination', destination)
            .eq('season', season)
            .is('travel_style', null)
            .single();

        if (fallback) return this.mapToBenchmark(fallback);

        // Try destination-only benchmark
        const { data: destOnly } = await this.supabase
            .from('price_benchmarks')
            .select('*')
            .eq('destination', destination)
            .order('sample_size', { ascending: false })
            .limit(1)
            .single();

        return destOnly ? this.mapToBenchmark(destOnly) : null;
    }

    /**
     * Update benchmarks from completed booking data.
     * Called periodically by scheduled job.
     */
    async updateBenchmarksFromBookings(): Promise<number> {
        // Get completed bookings from last 180 days
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const { data: bookings } = await this.supabase
            .from('bookings')
            .select(`
        id,
        total_amount,
        start_date,
        end_date,
        travelers,
        booking_details
      `)
            .eq('status', 'completed')
            .gte('created_at', sixMonthsAgo.toISOString());

        if (!bookings || bookings.length === 0) {
            return 0;
        }

        // Group by destination/season
        const benchmarkData = new Map<string, number[]>();

        for (const booking of bookings) {
            const details = booking.booking_details as Record<string, unknown> | null;
            if (!details?.destination) continue;

            const destination = normalizeDestination(details.destination as string);
            const season = getSeason(booking.start_date);

            const travelers = Array.isArray(booking.travelers)
                ? booking.travelers.length
                : 1;

            const startDate = new Date(booking.start_date);
            const endDate = new Date(booking.end_date);
            const days = Math.max(1, Math.ceil(
                (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            ));

            const pricePerPersonPerDay = (booking.total_amount * 100) / travelers / days;

            const key = `${destination}|${season}`;
            if (!benchmarkData.has(key)) {
                benchmarkData.set(key, []);
            }
            benchmarkData.get(key)!.push(pricePerPersonPerDay);
        }

        // Update database
        let updatedCount = 0;

        for (const [key, prices] of benchmarkData) {
            const [destination, season] = key.split('|');

            const sorted = [...prices].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
            const min = sorted[0] ?? 0;
            const max = sorted[sorted.length - 1] ?? 0;

            const { error } = await this.supabase
                .from('price_benchmarks')
                .upsert({
                    destination,
                    season,
                    travel_style: null,
                    overall_min_cents: Math.round(min),
                    overall_max_cents: Math.round(max),
                    overall_median_cents: Math.round(median),
                    sample_size: prices.length,
                    last_updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'destination,season,travel_style',
                });

            if (!error) updatedCount++;
        }

        return updatedCount;
    }

    /**
     * Get price trends for a destination.
     */
    async getPriceTrend(destination: string): Promise<PriceTrend | null> {
        const normalizedDest = normalizeDestination(destination);
        const currentSeason = getSeason(new Date().toISOString());

        // Get current benchmark
        const current = await this.getBenchmark(normalizedDest, currentSeason);
        if (!current || !current.overallMedianCents) return null;

        // Get previous season benchmark for comparison
        const previousSeason: Season =
            currentSeason === 'peak' ? 'shoulder' :
                currentSeason === 'shoulder' ? 'off_peak' : 'peak';

        const previous = await this.getBenchmark(normalizedDest, previousSeason);
        const previousMedian = previous?.overallMedianCents || current.overallMedianCents;

        const changePercentage = ((current.overallMedianCents - previousMedian) / previousMedian) * 100;

        return {
            destination: normalizedDest,
            currentMedianCents: current.overallMedianCents,
            previousMedianCents: previousMedian,
            changePercentage: Math.round(changePercentage * 10) / 10,
            trendDirection:
                changePercentage > 5 ? 'up' :
                    changePercentage < -5 ? 'down' : 'stable',
            seasonalFactor: PRICE_CONFIG.SEASONAL_FACTORS[currentSeason],
        };
    }

    /**
     * Get popular destinations with pricing info.
     */
    async getPopularDestinationPrices(limit: number = 10): Promise<{
        destination: string;
        medianPriceCents: number;
        priceRange: string;
        season: Season;
    }[]> {
        const { data } = await this.supabase
            .from('price_benchmarks')
            .select('destination, overall_median_cents, overall_min_cents, overall_max_cents, season, sample_size')
            .order('sample_size', { ascending: false })
            .limit(limit);

        return (data || []).map(row => ({
            destination: row.destination,
            medianPriceCents: row.overall_median_cents,
            priceRange: `₹${Math.round(row.overall_min_cents / 100)} - ₹${Math.round(row.overall_max_cents / 100)}`,
            season: row.season,
        }));
    }

    private getIndicator(percentageVsMarket: number): PriceIndicator {
        if (percentageVsMarket <= PRICE_CONFIG.THRESHOLDS.below_market) {
            return 'below_market';
        }
        if (percentageVsMarket >= PRICE_CONFIG.THRESHOLDS.premium) {
            return 'premium';
        }
        if (percentageVsMarket >= PRICE_CONFIG.THRESHOLDS.above_market) {
            return 'above_market';
        }
        return 'at_market';
    }

    private getConfidenceLevel(sampleSize: number): 'high' | 'medium' | 'low' {
        if (sampleSize >= PRICE_CONFIG.HIGH_CONFIDENCE_SAMPLES) return 'high';
        if (sampleSize >= PRICE_CONFIG.MEDIUM_CONFIDENCE_SAMPLES) return 'medium';
        return 'low';
    }

    private getBasePrice(style?: TravelStyle, season: Season = 'shoulder'): number {
        // Base price per person per day in cents (₹5,000/day mid-range)
        const baseDaily = 500000; // 5000 INR

        const styleMultiplier = PRICE_CONFIG.STYLE_MULTIPLIERS[style || 'mid-range'];
        const seasonMultiplier = PRICE_CONFIG.SEASONAL_FACTORS[season];

        return baseDaily * styleMultiplier * seasonMultiplier;
    }

    private mapToBenchmark(row: Record<string, unknown>): PriceBenchmark {
        return {
            destination: row['destination'] as string,
            season: row['season'] as Season,
            travelStyle: row['travel_style'] as TravelStyle | null,
            hotelMinCents: row['hotel_min_cents'] as number | null,
            hotelMaxCents: row['hotel_max_cents'] as number | null,
            hotelMedianCents: row['hotel_median_cents'] as number | null,
            flightMinCents: row['flight_min_cents'] as number | null,
            flightMaxCents: row['flight_max_cents'] as number | null,
            flightMedianCents: row['flight_median_cents'] as number | null,
            overallMinCents: row['overall_min_cents'] as number | null,
            overallMaxCents: row['overall_max_cents'] as number | null,
            overallMedianCents: row['overall_median_cents'] as number | null,
            sampleSize: row['sample_size'] as number,
            lastUpdatedAt: new Date(row['last_updated_at'] as string),
        };
    }
}

// Factory function
export function createPriceBenchmarkService(
    supabaseUrl: string,
    supabaseServiceKey: string
): PriceBenchmarkService {
    return new PriceBenchmarkService(supabaseUrl, supabaseServiceKey);
}
