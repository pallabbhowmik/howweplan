/**
 * Request Quality Scoring Service
 * 
 * Evaluates travel requests for completeness and quality to:
 * - Reduce advisor burnout from low-quality requests
 * - Prompt users to improve incomplete requests
 * - Prioritize high-quality requests in matching
 * 
 * SCORING CRITERIA (100 points total):
 * - Budget clarity (20 points)
 * - Date specificity (15 points)
 * - Destination clarity (15 points)
 * - Traveler details (15 points)
 * - Preferences filled (20 points)
 * - Contact verification (15 points)
 * 
 * BUSINESS RULES:
 * - Requests with score < 40 are NOT matched automatically
 * - Low-quality requests receive improvement prompts
 * - Quality scores affect matching priority
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface QualityScoreResult {
    requestId: string;
    totalScore: number;
    readyForMatching: boolean;
    priorityLevel: 'low' | 'medium' | 'high' | 'premium';
    componentScores: {
        budgetClarity: number;
        dateSpecificity: number;
        destinationClarity: number;
        travelerDetails: number;
        preferences: number;
        contactVerified: number;
    };
    missingFields: string[];
    improvementSuggestions: string[];
    estimatedMatchTimeHours: number;
}

export interface TravelRequestInput {
    id: string;
    userId: string;
    destination: string | null;
    departureLocation: string | null;
    departureDate: Date | null;
    returnDate: Date | null;
    budgetMin: number | null;
    budgetMax: number | null;
    budgetCurrency: string | null;
    adults: number;
    children: number;
    infants: number;
    travelStyle: string | null;
    preferences: Record<string, unknown> | null;
    notes: string | null;
    title: string | null;
}

interface UserVerificationStatus {
    emailVerified: boolean;
    phoneVerified: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const QUALITY_CONFIG = {
    // Minimum score to be eligible for automatic matching
    MIN_MATCHING_SCORE: 40,

    // Priority thresholds
    PRIORITY_THRESHOLDS: {
        premium: 85,
        high: 70,
        medium: 50,
        low: 0,
    },

    // Estimated match time multipliers (based on quality)
    MATCH_TIME_MULTIPLIERS: {
        premium: 0.5,   // 50% faster
        high: 0.75,     // 25% faster
        medium: 1.0,    // Normal
        low: 2.0,       // 2x slower
    },

    // Base estimated match time (hours)
    BASE_MATCH_TIME_HOURS: 4,

    // Scoring weights
    MAX_SCORES: {
        budgetClarity: 20,
        dateSpecificity: 15,
        destinationClarity: 15,
        travelerDetails: 15,
        preferences: 20,
        contactVerified: 15,
    },
};

// =============================================================================
// SCORING LOGIC
// =============================================================================

/**
 * Calculate budget clarity score (max 20 points)
 */
function scoreBudgetClarity(request: TravelRequestInput): {
    score: number;
    missing: string[];
    suggestions: string[];
} {
    const missing: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (request.budgetMin !== null && request.budgetMax !== null) {
        score = 20;

        // Check for reasonable range
        const range = request.budgetMax - request.budgetMin;
        const midpoint = (request.budgetMax + request.budgetMin) / 2;

        if (range > midpoint) {
            score = 15;
            suggestions.push('Consider narrowing your budget range for better matches');
        }
    } else if (request.budgetMax !== null) {
        score = 12;
        missing.push('budgetMin');
        suggestions.push('Adding a minimum budget helps advisors understand your expectations');
    } else if (request.budgetMin !== null) {
        score = 8;
        missing.push('budgetMax');
        suggestions.push('Adding a maximum budget helps advisors create proposals within your range');
    } else {
        score = 0;
        missing.push('budgetMin', 'budgetMax');
        suggestions.push('Specify a budget range to receive relevant proposals');
    }

    return { score, missing, suggestions };
}

/**
 * Calculate date specificity score (max 15 points)
 */
function scoreDateSpecificity(request: TravelRequestInput): {
    score: number;
    missing: string[];
    suggestions: string[];
} {
    const missing: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (request.departureDate && request.returnDate) {
        score = 15;

        // Check if dates are reasonable
        const departureDate = new Date(request.departureDate);
        const returnDate = new Date(request.returnDate);
        const tripDuration = (returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24);

        if (tripDuration < 1) {
            score = 10;
            suggestions.push('Return date should be after departure date');
        } else if (tripDuration > 60) {
            suggestions.push('Longer trips may have limited advisor availability');
        }

        // Check if departure is in the past
        if (departureDate < new Date()) {
            score = 5;
            suggestions.push('Please update your departure date to a future date');
        }
    } else if (request.departureDate) {
        score = 8;
        missing.push('returnDate');
        suggestions.push('Adding a return date helps advisors plan the full itinerary');
    } else if (request.returnDate) {
        score = 5;
        missing.push('departureDate');
        suggestions.push('Specifying a departure date is essential for planning');
    } else {
        score = 0;
        missing.push('departureDate', 'returnDate');
        suggestions.push('Specify your travel dates to receive accurate proposals');
    }

    return { score, missing, suggestions };
}

/**
 * Calculate destination clarity score (max 15 points)
 */
function scoreDestinationClarity(request: TravelRequestInput): {
    score: number;
    missing: string[];
    suggestions: string[];
} {
    const missing: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (request.destination && request.destination.trim().length > 2) {
        score = 15;

        // Check for vague destinations
        const vaguePhrases = ['anywhere', 'somewhere', 'undecided', 'not sure', 'flexible'];
        const destLower = request.destination.toLowerCase();

        if (vaguePhrases.some(phrase => destLower.includes(phrase))) {
            score = 5;
            suggestions.push('A specific destination helps us find specialized advisors');
        }

        // Check for departure location (helps with routing)
        if (!request.departureLocation) {
            score = Math.max(score - 3, 10);
            missing.push('departureLocation');
            suggestions.push('Adding your departure city helps with flight planning');
        }
    } else {
        score = 0;
        missing.push('destination');
        suggestions.push('Specify your destination to get matched with expert advisors');
    }

    return { score, missing, suggestions };
}

/**
 * Calculate traveler details score (max 15 points)
 */
function scoreTravelerDetails(request: TravelRequestInput): {
    score: number;
    missing: string[];
    suggestions: string[];
} {
    const suggestions: string[] = [];
    let score = 0;

    // Basic travelers count (must have at least 1 adult)
    if (request.adults > 0) {
        score = 10;

        // Children and infants specified (even if 0)
        if (request.children !== null && request.infants !== null) {
            score = 15;
        }

        // Extra validation
        const totalTravelers = request.adults + (request.children || 0) + (request.infants || 0);

        if (totalTravelers > 20) {
            suggestions.push('For large groups, consider our group travel feature for better coordination');
        }

        if (request.children && request.children > 0) {
            suggestions.push('Consider specifying ages for child-friendly activity recommendations');
        }
    } else {
        score = 0;
        suggestions.push('Please specify the number of adult travelers');
    }

    return { score, missing: [], suggestions };
}

/**
 * Calculate preferences score (max 20 points)
 */
function scorePreferences(request: TravelRequestInput): {
    score: number;
    missing: string[];
    suggestions: string[];
} {
    const missing: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Travel style
    if (request.travelStyle) {
        score += 8;
    } else {
        missing.push('travelStyle');
        suggestions.push('Selecting a travel style helps match you with appropriate advisors');
    }

    // Preferences object
    if (request.preferences && Object.keys(request.preferences).length > 0) {
        const prefCount = Object.keys(request.preferences).length;
        score += Math.min(prefCount * 2, 7);
    } else {
        suggestions.push('Adding preferences like interests, accommodation type, or activities improves matches');
    }

    // Notes
    if (request.notes && request.notes.trim().length > 20) {
        score += 5;

        if (request.notes.length > 500) {
            suggestions.push('Well-detailed requirements! Advisors will appreciate this context');
        }
    } else if (request.notes && request.notes.trim().length > 0) {
        score += 2;
        suggestions.push('Adding more details about your trip helps advisors create better proposals');
    } else {
        missing.push('notes');
        suggestions.push('Describe your ideal trip - interests, must-sees, dietary needs, etc.');
    }

    // Title
    if (request.title && request.title.trim().length > 5) {
        // Bonus for good title (not counted in max, but adds quality feel)
        // No score change, but no penalty
    }

    return { score: Math.min(score, 20), missing, suggestions };
}

/**
 * Calculate contact verification score (max 15 points)
 */
function scoreContactVerification(verification: UserVerificationStatus): {
    score: number;
    missing: string[];
    suggestions: string[];
} {
    const missing: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (verification.emailVerified) {
        score += 7;
    } else {
        missing.push('emailVerification');
        suggestions.push('Verify your email to receive proposal notifications');
    }

    if (verification.phoneVerified) {
        score += 8;
    } else {
        missing.push('phoneVerification');
        suggestions.push('Verify your phone for important updates and advisor contact');
    }

    return { score, missing, suggestions };
}

// =============================================================================
// REQUEST QUALITY SERVICE
// =============================================================================

export class RequestQualityService {
    private readonly supabase: SupabaseClient;

    constructor(supabaseUrl: string, supabaseServiceKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    /**
     * Calculate quality score for a travel request.
     */
    async calculateQualityScore(requestId: string): Promise<QualityScoreResult> {
        // Fetch request data
        const { data: request, error } = await this.supabase
            .from('travel_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (error || !request) {
            throw new Error(`Request not found: ${requestId}`);
        }

        // Fetch user verification status
        const { data: user } = await this.supabase
            .from('users')
            .select('is_verified')
            .eq('id', request.user_id)
            .single();

        const verificationStatus: UserVerificationStatus = {
            emailVerified: user?.is_verified || false,
            phoneVerified: false, // Would check phone_verifications table
        };

        // Convert to input type
        const requestInput: TravelRequestInput = {
            id: request.id,
            userId: request.user_id,
            destination: request.destination,
            departureLocation: request.departure_location,
            departureDate: request.departure_date ? new Date(request.departure_date) : null,
            returnDate: request.return_date ? new Date(request.return_date) : null,
            budgetMin: request.budget_min,
            budgetMax: request.budget_max,
            budgetCurrency: request.budget_currency,
            adults: request.adults || 1,
            children: request.children || 0,
            infants: request.infants || 0,
            travelStyle: request.travel_style,
            preferences: request.preferences as Record<string, unknown>,
            notes: request.notes,
            title: request.title,
        };

        return this.scoreRequest(requestInput, verificationStatus);
    }

    /**
     * Score a request (can be used for preview before submission).
     */
    scoreRequest(
        request: TravelRequestInput,
        verification: UserVerificationStatus
    ): QualityScoreResult {
        // Calculate component scores
        const budgetResult = scoreBudgetClarity(request);
        const dateResult = scoreDateSpecificity(request);
        const destinationResult = scoreDestinationClarity(request);
        const travelerResult = scoreTravelerDetails(request);
        const preferencesResult = scorePreferences(request);
        const contactResult = scoreContactVerification(verification);

        // Aggregate
        const totalScore =
            budgetResult.score +
            dateResult.score +
            destinationResult.score +
            travelerResult.score +
            preferencesResult.score +
            contactResult.score;

        const missingFields = [
            ...budgetResult.missing,
            ...dateResult.missing,
            ...destinationResult.missing,
            ...travelerResult.missing,
            ...preferencesResult.missing,
            ...contactResult.missing,
        ];

        const improvementSuggestions = [
            ...budgetResult.suggestions,
            ...dateResult.suggestions,
            ...destinationResult.suggestions,
            ...travelerResult.suggestions,
            ...preferencesResult.suggestions,
            ...contactResult.suggestions,
        ].filter((s, i, arr) => arr.indexOf(s) === i); // Dedupe

        // Priority and matching eligibility
        const readyForMatching = totalScore >= QUALITY_CONFIG.MIN_MATCHING_SCORE;
        const priorityLevel = this.getPriorityLevel(totalScore);
        const estimatedMatchTimeHours = this.calculateEstimatedMatchTime(priorityLevel);

        return {
            requestId: request.id,
            totalScore,
            readyForMatching,
            priorityLevel,
            componentScores: {
                budgetClarity: budgetResult.score,
                dateSpecificity: dateResult.score,
                destinationClarity: destinationResult.score,
                travelerDetails: travelerResult.score,
                preferences: preferencesResult.score,
                contactVerified: contactResult.score,
            },
            missingFields,
            improvementSuggestions: improvementSuggestions.slice(0, 5), // Top 5 suggestions
            estimatedMatchTimeHours,
        };
    }

    /**
     * Save quality score to database.
     */
    async saveQualityScore(result: QualityScoreResult): Promise<void> {
        const { error } = await this.supabase
            .from('request_quality_scores')
            .upsert({
                request_id: result.requestId,
                total_score: result.totalScore,
                ready_for_matching: result.readyForMatching,
                budget_clarity_score: result.componentScores.budgetClarity,
                date_specificity_score: result.componentScores.dateSpecificity,
                destination_clarity_score: result.componentScores.destinationClarity,
                traveler_details_score: result.componentScores.travelerDetails,
                preferences_score: result.componentScores.preferences,
                contact_verified_score: result.componentScores.contactVerified,
                missing_fields: result.missingFields,
                improvement_suggestions: result.improvementSuggestions,
                estimated_match_time_hours: result.estimatedMatchTimeHours,
                priority_level: result.priorityLevel,
                scored_at: new Date().toISOString(),
            }, {
                onConflict: 'request_id',
            });

        if (error) {
            console.error('Failed to save quality score:', error);
            throw new Error(`Failed to save quality score: ${error.message}`);
        }

        // Also update the travel_requests table with quality score
        await this.supabase
            .from('travel_requests')
            .update({ quality_score: result.totalScore })
            .eq('id', result.requestId);
    }

    /**
     * Get cached quality score for a request.
     */
    async getQualityScore(requestId: string): Promise<QualityScoreResult | null> {
        const { data, error } = await this.supabase
            .from('request_quality_scores')
            .select('*')
            .eq('request_id', requestId)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            requestId: data.request_id,
            totalScore: data.total_score,
            readyForMatching: data.ready_for_matching,
            priorityLevel: data.priority_level,
            componentScores: {
                budgetClarity: data.budget_clarity_score,
                dateSpecificity: data.date_specificity_score,
                destinationClarity: data.destination_clarity_score,
                travelerDetails: data.traveler_details_score,
                preferences: data.preferences_score,
                contactVerified: data.contact_verified_score,
            },
            missingFields: data.missing_fields || [],
            improvementSuggestions: data.improvement_suggestions || [],
            estimatedMatchTimeHours: data.estimated_match_time_hours,
        };
    }

    /**
     * Check if a request is ready for matching.
     */
    async isReadyForMatching(requestId: string): Promise<{
        ready: boolean;
        score: number;
        blockers: string[];
    }> {
        let result = await this.getQualityScore(requestId);

        if (!result) {
            result = await this.calculateQualityScore(requestId);
            await this.saveQualityScore(result);
        }

        const blockers: string[] = [];
        if (!result.readyForMatching) {
            if (result.componentScores.budgetClarity === 0) {
                blockers.push('Budget information required');
            }
            if (result.componentScores.dateSpecificity === 0) {
                blockers.push('Travel dates required');
            }
            if (result.componentScores.destinationClarity === 0) {
                blockers.push('Destination required');
            }
        }

        return {
            ready: result.readyForMatching,
            score: result.totalScore,
            blockers,
        };
    }

    /**
     * Get requests sorted by quality for matching prioritization.
     */
    async getRequestsByQualityPriority(limit: number = 50): Promise<string[]> {
        const { data } = await this.supabase
            .from('travel_requests')
            .select('id')
            .eq('state', 'submitted')
            .gte('quality_score', QUALITY_CONFIG.MIN_MATCHING_SCORE)
            .order('quality_score', { ascending: false })
            .limit(limit);

        return (data || []).map(r => r.id);
    }

    private getPriorityLevel(score: number): 'low' | 'medium' | 'high' | 'premium' {
        if (score >= QUALITY_CONFIG.PRIORITY_THRESHOLDS.premium) return 'premium';
        if (score >= QUALITY_CONFIG.PRIORITY_THRESHOLDS.high) return 'high';
        if (score >= QUALITY_CONFIG.PRIORITY_THRESHOLDS.medium) return 'medium';
        return 'low';
    }

    private calculateEstimatedMatchTime(priority: 'low' | 'medium' | 'high' | 'premium'): number {
        const multiplier = QUALITY_CONFIG.MATCH_TIME_MULTIPLIERS[priority];
        return Math.round(QUALITY_CONFIG.BASE_MATCH_TIME_HOURS * multiplier * 10) / 10;
    }
}

// Factory function
export function createRequestQualityService(
    supabaseUrl: string,
    supabaseServiceKey: string
): RequestQualityService {
    return new RequestQualityService(supabaseUrl, supabaseServiceKey);
}
