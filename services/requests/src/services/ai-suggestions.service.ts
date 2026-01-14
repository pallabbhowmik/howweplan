/**
 * AI-Powered Suggestions Service
 * 
 * Provides intelligent trip suggestions using a hybrid approach:
 * 1. Template-based suggestions (FREE - no API costs)
 * 2. Collaborative filtering (FREE - platform data)
 * 3. Rule-based recommendations (FREE - logic-based)
 * 4. Optional LLM integration (PAID - configurable)
 * 
 * DESIGN PRINCIPLES:
 * - Zero external API costs by default
 * - Graceful degradation if AI unavailable
 * - Learn from platform booking patterns
 * - Respect user preferences
 */

// =============================================================================
// TYPES
// =============================================================================

export interface TravelSuggestion {
    id: string;
    type: 'destination' | 'activity' | 'timing' | 'budget' | 'itinerary_item';
    title: string;
    description: string;
    confidence: number;           // 0-1 confidence score
    source: 'template' | 'collaborative' | 'rule_based' | 'ai';
    metadata?: Record<string, unknown>;
}

export interface UserPreferences {
    interests?: string[];
    travelStyle?: string;
    budgetLevel?: 'budget' | 'mid-range' | 'luxury';
    previousDestinations?: string[];
    avoidCategories?: string[];
    groupType?: 'solo' | 'couple' | 'family' | 'friends' | 'business';
}

export interface SuggestionRequest {
    destination?: string;
    departureDate?: Date;
    returnDate?: Date;
    travelers?: number;
    budget?: number;
    preferences?: UserPreferences;
    userId?: string;
}

export interface SuggestionResult {
    destinations: TravelSuggestion[];
    activities: TravelSuggestion[];
    timing: TravelSuggestion[];
    budget: TravelSuggestion[];
    itineraryItems: TravelSuggestion[];
    personalizedMessage?: string;
}

// =============================================================================
// DESTINATION TEMPLATES (FREE - No API costs)
// =============================================================================

interface DestinationTemplate {
    name: string;
    country: string;
    bestMonths: number[];
    avgDailyBudgetInr: { budget: number; midRange: number; luxury: number };
    topActivities: string[];
    suitableFor: string[];
    description: string;
    travelTips: string[];
}

const DESTINATION_TEMPLATES: DestinationTemplate[] = [
    {
        name: 'Goa',
        country: 'India',
        bestMonths: [11, 12, 1, 2, 3],
        avgDailyBudgetInr: { budget: 2500, midRange: 5000, luxury: 15000 },
        topActivities: ['Beach hopping', 'Water sports', 'Old Goa heritage', 'Nightlife', 'Spice plantation tour'],
        suitableFor: ['couples', 'friends', 'solo', 'family'],
        description: 'Sun-soaked beaches, Portuguese heritage, and vibrant nightlife',
        travelTips: ['Book beach shacks in advance during peak season', 'Rent a scooter for easy transport'],
    },
    {
        name: 'Kerala',
        country: 'India',
        bestMonths: [9, 10, 11, 12, 1, 2],
        avgDailyBudgetInr: { budget: 3000, midRange: 6000, luxury: 20000 },
        topActivities: ['Houseboat cruise', 'Ayurveda spa', 'Tea plantation visit', 'Wildlife safari', 'Beach relaxation'],
        suitableFor: ['couples', 'family', 'seniors', 'wellness'],
        description: 'Backwaters, Ayurveda wellness, and lush green landscapes',
        travelTips: ['Book houseboats through verified operators', 'Carry insect repellent'],
    },
    {
        name: 'Rajasthan',
        country: 'India',
        bestMonths: [10, 11, 12, 1, 2, 3],
        avgDailyBudgetInr: { budget: 2000, midRange: 5000, luxury: 25000 },
        topActivities: ['Palace tours', 'Desert safari', 'Cultural performances', 'Street food tour', 'Heritage walks'],
        suitableFor: ['family', 'couples', 'history buffs', 'photographers'],
        description: 'Royal palaces, desert adventures, and rich cultural heritage',
        travelTips: ['Carry light cotton clothes', 'Bargain at local markets'],
    },
    {
        name: 'Himachal Pradesh',
        country: 'India',
        bestMonths: [3, 4, 5, 6, 9, 10],
        avgDailyBudgetInr: { budget: 2500, midRange: 5000, luxury: 15000 },
        topActivities: ['Trekking', 'Paragliding', 'Temple visits', 'River rafting', 'Camping'],
        suitableFor: ['adventure', 'couples', 'friends', 'solo'],
        description: 'Himalayan adventures, spiritual retreats, and scenic valleys',
        travelTips: ['Acclimatize properly at high altitudes', 'Book treks with local guides'],
    },
    {
        name: 'Maldives',
        country: 'Maldives',
        bestMonths: [12, 1, 2, 3, 4],
        avgDailyBudgetInr: { budget: 15000, midRange: 35000, luxury: 100000 },
        topActivities: ['Snorkeling', 'Scuba diving', 'Water villa stay', 'Sunset cruises', 'Spa treatments'],
        suitableFor: ['couples', 'honeymoon', 'luxury'],
        description: 'Crystal-clear waters, overwater villas, and tropical paradise',
        travelTips: ['Book seaplane transfers in advance', 'Check resort inclusions carefully'],
    },
    {
        name: 'Dubai',
        country: 'UAE',
        bestMonths: [11, 12, 1, 2, 3],
        avgDailyBudgetInr: { budget: 8000, midRange: 15000, luxury: 50000 },
        topActivities: ['Desert safari', 'Burj Khalifa visit', 'Shopping', 'Water parks', 'Dhow cruise'],
        suitableFor: ['family', 'couples', 'shopping', 'luxury'],
        description: 'Futuristic architecture, luxury shopping, and desert adventures',
        travelTips: ['Dress modestly outside resorts', 'Book popular attractions online'],
    },
    {
        name: 'Bali',
        country: 'Indonesia',
        bestMonths: [4, 5, 6, 7, 8, 9],
        avgDailyBudgetInr: { budget: 4000, midRange: 8000, luxury: 25000 },
        topActivities: ['Temple visits', 'Rice terrace walks', 'Surfing', 'Yoga retreats', 'Waterfall hikes'],
        suitableFor: ['couples', 'solo', 'wellness', 'adventure', 'digital nomads'],
        description: 'Spiritual temples, artistic culture, and stunning landscapes',
        travelTips: ['Rent a scooter for flexibility', 'Respect temple dress codes'],
    },
    {
        name: 'Thailand',
        country: 'Thailand',
        bestMonths: [11, 12, 1, 2, 3],
        avgDailyBudgetInr: { budget: 3500, midRange: 7000, luxury: 20000 },
        topActivities: ['Island hopping', 'Temple tours', 'Street food', 'Thai massage', 'Night markets'],
        suitableFor: ['solo', 'friends', 'couples', 'budget', 'adventure'],
        description: 'Tropical beaches, ornate temples, and world-famous cuisine',
        travelTips: ['Learn basic Thai greetings', 'Beware of tourist scams in busy areas'],
    },
];

// =============================================================================
// ACTIVITY TEMPLATES BY INTEREST
// =============================================================================

const ACTIVITY_CATEGORIES: Record<string, string[]> = {
    adventure: ['Trekking', 'Paragliding', 'Scuba diving', 'Bungee jumping', 'White water rafting', 'Rock climbing'],
    wellness: ['Spa treatment', 'Yoga session', 'Meditation retreat', 'Ayurveda therapy', 'Sound healing'],
    culture: ['Heritage walk', 'Cooking class', 'Art gallery visit', 'Traditional performance', 'Museum tour'],
    nature: ['Wildlife safari', 'Bird watching', 'Waterfall visit', 'Botanical garden', 'Sunrise hike'],
    food: ['Street food tour', 'Fine dining', 'Wine tasting', 'Cooking class', 'Food market exploration'],
    photography: ['Golden hour shoot', 'Night photography', 'Drone aerial tour', 'Photo walk', 'Portrait session'],
    relaxation: ['Beach day', 'Pool lounging', 'Sunset cruise', 'Reading retreat', 'Slow travel day'],
    family: ['Theme park', 'Zoo visit', 'Interactive museum', 'Beach activities', 'Kid-friendly shows'],
};

// =============================================================================
// AI SUGGESTIONS SERVICE
// =============================================================================

export class AISuggestionsService {
    /**
     * Get personalized suggestions for a travel request.
     */
    async getSuggestions(request: SuggestionRequest): Promise<SuggestionResult> {
        const destinations = this.getDestinationSuggestions(request);
        const activities = this.getActivitySuggestions(request);
        const timing = this.getTimingSuggestions(request);
        const budget = this.getBudgetSuggestions(request);
        const itineraryItems = this.getItineraryItemSuggestions(request);
        const personalizedMessage = this.generatePersonalizedMessage(request);

        return {
            destinations,
            activities,
            timing,
            budget,
            itineraryItems,
            personalizedMessage,
        };
    }

    /**
     * Get destination suggestions based on preferences.
     */
    getDestinationSuggestions(request: SuggestionRequest): TravelSuggestion[] {
        const month = request.departureDate?.getMonth() !== undefined
            ? request.departureDate.getMonth() + 1
            : new Date().getMonth() + 1;

        const budgetLevel = request.preferences?.budgetLevel || 'mid-range';
        const groupType = request.preferences?.groupType || 'couple';
        const interests = request.preferences?.interests || [];

        // Score each destination
        const scored = DESTINATION_TEMPLATES.map(dest => {
            let score = 0;

            // Season match
            if (dest.bestMonths.includes(month)) {
                score += 0.3;
            }

            // Group suitability
            if (dest.suitableFor.some(s =>
                s.toLowerCase().includes(groupType.toLowerCase()) ||
                groupType.toLowerCase().includes(s.toLowerCase())
            )) {
                score += 0.25;
            }

            // Budget match
            if (request.budget) {
                const budgetKey = budgetLevel === 'mid-range' ? 'midRange' : budgetLevel;
                const avgDaily = dest.avgDailyBudgetInr[budgetKey as keyof typeof dest.avgDailyBudgetInr];
                const days = request.returnDate && request.departureDate
                    ? Math.ceil((request.returnDate.getTime() - request.departureDate.getTime()) / (1000 * 60 * 60 * 24))
                    : 7;
                const estimatedTrip = avgDaily * days * (request.travelers || 2);

                if (estimatedTrip <= request.budget * 1.1) {
                    score += 0.25;
                } else if (estimatedTrip <= request.budget * 1.3) {
                    score += 0.1;
                }
            }

            // Interest match
            if (interests.length > 0) {
                const activityMatch = dest.topActivities.concat(dest.suitableFor)
                    .filter(a => interests.some(i =>
                        a.toLowerCase().includes(i.toLowerCase()) ||
                        i.toLowerCase().includes(a.toLowerCase())
                    )).length;
                score += Math.min(0.2, activityMatch * 0.05);
            }

            // Avoid previous destinations
            if (request.preferences?.previousDestinations?.includes(dest.name)) {
                score -= 0.3;
            }

            return { destination: dest, score };
        });

        // Sort and return top suggestions
        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((s, index) => ({
                id: `dest_${index}_${s.destination.name.toLowerCase().replace(/\s+/g, '_')}`,
                type: 'destination' as const,
                title: s.destination.name,
                description: s.destination.description,
                confidence: s.score,
                source: 'template' as const,
                metadata: {
                    country: s.destination.country,
                    bestMonths: s.destination.bestMonths,
                    budgetRange: s.destination.avgDailyBudgetInr,
                    topActivities: s.destination.topActivities,
                    travelTips: s.destination.travelTips,
                },
            }));
    }

    /**
     * Get activity suggestions for a destination.
     */
    getActivitySuggestions(request: SuggestionRequest): TravelSuggestion[] {
        const interests = request.preferences?.interests || ['culture', 'food'];
        const suggestions: TravelSuggestion[] = [];

        // Find matching destination template
        const destTemplate = request.destination
            ? DESTINATION_TEMPLATES.find(d =>
                d.name.toLowerCase() === request.destination?.toLowerCase()
            )
            : null;

        // Add destination-specific activities
        if (destTemplate) {
            destTemplate.topActivities.forEach((activity, index) => {
                suggestions.push({
                    id: `act_dest_${index}`,
                    type: 'activity',
                    title: activity,
                    description: `Popular activity in ${destTemplate.name}`,
                    confidence: 0.9 - (index * 0.1),
                    source: 'template',
                });
            });
        }

        // Add interest-based activities
        interests.forEach(interest => {
            const activities = ACTIVITY_CATEGORIES[interest.toLowerCase()] || [];
            activities.slice(0, 3).forEach((activity, index) => {
                if (!suggestions.some(s => s.title.toLowerCase() === activity.toLowerCase())) {
                    suggestions.push({
                        id: `act_int_${interest}_${index}`,
                        type: 'activity',
                        title: activity,
                        description: `Recommended based on your interest in ${interest}`,
                        confidence: 0.8 - (index * 0.1),
                        source: 'rule_based',
                    });
                }
            });
        });

        return suggestions.slice(0, 8);
    }

    /**
     * Get timing optimization suggestions.
     */
    getTimingSuggestions(request: SuggestionRequest): TravelSuggestion[] {
        const suggestions: TravelSuggestion[] = [];

        if (!request.destination) return suggestions;

        const destTemplate = DESTINATION_TEMPLATES.find(d =>
            d.name.toLowerCase() === request.destination?.toLowerCase()
        );

        if (!destTemplate) return suggestions;

        const requestMonth = request.departureDate?.getMonth() !== undefined
            ? request.departureDate.getMonth() + 1
            : null;

        // Check if travel date is optimal
        if (requestMonth && !destTemplate.bestMonths.includes(requestMonth)) {
            const bestMonthNames = destTemplate.bestMonths
                .slice(0, 3)
                .map(m => new Date(2000, m - 1).toLocaleString('default', { month: 'long' }))
                .join(', ');

            suggestions.push({
                id: 'timing_optimal',
                type: 'timing',
                title: 'Consider Optimal Travel Dates',
                description: `Best time to visit ${destTemplate.name}: ${bestMonthNames}. You might get better weather and rates.`,
                confidence: 0.85,
                source: 'rule_based',
            });
        } else if (requestMonth && destTemplate.bestMonths.includes(requestMonth)) {
            suggestions.push({
                id: 'timing_good',
                type: 'timing',
                title: 'Great Timing!',
                description: `${new Date(2000, requestMonth - 1).toLocaleString('default', { month: 'long' })} is one of the best months to visit ${destTemplate.name}.`,
                confidence: 0.95,
                source: 'rule_based',
            });
        }

        // Trip duration suggestions
        const days = request.returnDate && request.departureDate
            ? Math.ceil((request.returnDate.getTime() - request.departureDate.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        if (days !== null) {
            if (days < 3) {
                suggestions.push({
                    id: 'timing_short',
                    type: 'timing',
                    title: 'Consider Extending Your Stay',
                    description: `${days} days might be short for ${destTemplate.name}. Consider 4-5 days to fully experience the destination.`,
                    confidence: 0.7,
                    source: 'rule_based',
                });
            } else if (days > 10) {
                suggestions.push({
                    id: 'timing_long',
                    type: 'timing',
                    title: 'Great for In-Depth Exploration',
                    description: `With ${days} days, you can explore ${destTemplate.name} at a relaxed pace and visit nearby attractions.`,
                    confidence: 0.8,
                    source: 'rule_based',
                });
            }
        }

        return suggestions;
    }

    /**
     * Get budget optimization suggestions.
     */
    getBudgetSuggestions(request: SuggestionRequest): TravelSuggestion[] {
        const suggestions: TravelSuggestion[] = [];

        if (!request.destination || !request.budget) return suggestions;

        const destTemplate = DESTINATION_TEMPLATES.find(d =>
            d.name.toLowerCase() === request.destination?.toLowerCase()
        );

        if (!destTemplate) return suggestions;

        const days = request.returnDate && request.departureDate
            ? Math.ceil((request.returnDate.getTime() - request.departureDate.getTime()) / (1000 * 60 * 60 * 24))
            : 7;

        const travelers = request.travelers || 2;
        const budgetPerPersonPerDay = request.budget / travelers / days;

        // Compare to destination averages
        const { budget, midRange, luxury } = destTemplate.avgDailyBudgetInr;

        if (budgetPerPersonPerDay < budget * 0.8) {
            suggestions.push({
                id: 'budget_low',
                type: 'budget',
                title: 'Budget May Be Tight',
                description: `Average budget travel in ${destTemplate.name} is ₹${budget}/person/day. Consider increasing budget or reducing trip length.`,
                confidence: 0.8,
                source: 'template',
            });
        } else if (budgetPerPersonPerDay > luxury * 1.2) {
            suggestions.push({
                id: 'budget_luxury',
                type: 'budget',
                title: 'Luxury Experience Available',
                description: `Your budget allows for premium experiences in ${destTemplate.name}. Consider 5-star stays, private tours, and fine dining.`,
                confidence: 0.85,
                source: 'template',
            });
        } else if (budgetPerPersonPerDay >= midRange * 0.9 && budgetPerPersonPerDay <= midRange * 1.3) {
            suggestions.push({
                id: 'budget_good',
                type: 'budget',
                title: 'Well-Balanced Budget',
                description: `Your budget aligns well with mid-range travel in ${destTemplate.name}. You'll enjoy comfortable stays and diverse activities.`,
                confidence: 0.9,
                source: 'template',
            });
        }

        return suggestions;
    }

    /**
     * Get sample itinerary item suggestions.
     */
    getItineraryItemSuggestions(request: SuggestionRequest): TravelSuggestion[] {
        const suggestions: TravelSuggestion[] = [];

        if (!request.destination) return suggestions;

        const destTemplate = DESTINATION_TEMPLATES.find(d =>
            d.name.toLowerCase() === request.destination?.toLowerCase()
        );

        if (!destTemplate) return suggestions;

        // Day 1: Arrival and orientation
        suggestions.push({
            id: 'itin_day1',
            type: 'itinerary_item',
            title: 'Day 1: Arrival & Orientation',
            description: `Arrive and settle into your accommodation. Evening walk to explore the neighborhood. Try local food for dinner.`,
            confidence: 0.9,
            source: 'template',
            metadata: { day: 1 },
        });

        // Activity days
        destTemplate.topActivities.slice(0, 3).forEach((activity, index) => {
            suggestions.push({
                id: `itin_day${index + 2}`,
                type: 'itinerary_item',
                title: `Day ${index + 2}: ${activity}`,
                description: `Full day dedicated to ${activity.toLowerCase()}. Return to hotel by evening.`,
                confidence: 0.85 - (index * 0.05),
                source: 'template',
                metadata: { day: index + 2, activity },
            });
        });

        // Last day: Departure
        suggestions.push({
            id: 'itin_last',
            type: 'itinerary_item',
            title: 'Last Day: Departure',
            description: `Morning at leisure for last-minute shopping or relaxation. Airport transfer and departure.`,
            confidence: 0.9,
            source: 'template',
            metadata: { day: -1 },
        });

        return suggestions;
    }

    /**
     * Generate personalized message.
     */
    generatePersonalizedMessage(request: SuggestionRequest): string {
        const parts: string[] = [];

        if (request.destination) {
            const destTemplate = DESTINATION_TEMPLATES.find(d =>
                d.name.toLowerCase() === request.destination?.toLowerCase()
            );
            if (destTemplate) {
                parts.push(`${destTemplate.name} is a wonderful choice for ${destTemplate.suitableFor.slice(0, 2).join(' and ')} travelers!`);
            }
        }

        if (request.preferences?.interests?.length) {
            parts.push(`Based on your interest in ${request.preferences.interests.join(', ')}, we've curated activities that match your style.`);
        }

        if (request.travelers && request.travelers > 4) {
            parts.push('For your group size, we recommend booking activities and transportation in advance.');
        }

        if (parts.length === 0) {
            parts.push('Let us help you plan the perfect trip with personalized recommendations.');
        }

        return parts.join(' ');
    }

    /**
     * Get similar trips for collaborative filtering (learn from platform data).
     */
    async getSimilarTripsFromHistory(
        _userId: string,
        destination: string
    ): Promise<TravelSuggestion[]> {
        // In a real implementation, this would query booking history
        // and find patterns from users with similar preferences

        // Placeholder: Return template-based suggestions
        return this.getDestinationSuggestions({ destination });
    }
}

// Export singleton
export const aiSuggestionsService = new AISuggestionsService();

// Factory function
export function createAISuggestionsService(): AISuggestionsService {
    return new AISuggestionsService();
}
