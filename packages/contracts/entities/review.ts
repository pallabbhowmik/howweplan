/**
 * Review Entity
 * Represents a review left by a user for a completed booking
 */

export interface ReviewRatings {
  readonly overall: number; // 1-5
  readonly communication: number; // 1-5
  readonly accuracy: number; // 1-5
  readonly value: number; // 1-5
  readonly itineraryQuality: number; // 1-5
}

export interface Review {
  readonly id: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly ratings: ReviewRatings;
  readonly title: string;
  readonly content: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly wouldRecommend: boolean;
  readonly isVerifiedBooking: boolean;
  readonly isPublic: boolean;
  readonly agentResponse: string | null;
  readonly agentRespondedAt: Date | null;
  readonly isFlagged: boolean;
  readonly flagReason: string | null;
  readonly flaggedBy: string | null;
  readonly isHidden: boolean;
  readonly hiddenReason: string | null;
  readonly hiddenBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Aggregated agent ratings
 */
export interface AgentRatingsSummary {
  readonly agentId: string;
  readonly totalReviews: number;
  readonly averageOverall: number;
  readonly averageCommunication: number;
  readonly averageAccuracy: number;
  readonly averageValue: number;
  readonly averageItineraryQuality: number;
  readonly recommendationRate: number;
  readonly lastUpdatedAt: Date;
}
