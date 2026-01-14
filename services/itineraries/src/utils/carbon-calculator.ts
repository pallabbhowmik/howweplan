/**
 * Carbon Footprint Calculator
 * 
 * Calculates travel carbon emissions using industry-standard factors from:
 * - ICAO (International Civil Aviation Organization) for flights
 * - DEFRA (UK Department for Environment, Food & Rural Affairs) guidelines
 * 
 * This is an OFFLINE calculation - no paid API calls required.
 * 
 * EMISSION FACTORS (kg CO2e per unit):
 * - Flights: 0.255 kg CO2e per km per passenger (economy class average)
 * - Hotels: 21 kg CO2e per room-night (average)
 * - Ground transport: varies by type
 * 
 * ECO SCORE GRADES:
 * - A: < 200 kg total emissions (excellent)
 * - B: 200-500 kg (good)
 * - C: 500-1000 kg (average)
 * - D: 1000-2000 kg (below average)
 * - F: > 2000 kg (high emissions)
 */

// =============================================================================
// EMISSION FACTORS
// =============================================================================

/**
 * Flight emission factors by class (kg CO2e per km per passenger)
 * Based on ICAO Carbon Emissions Calculator methodology
 */
export const FLIGHT_EMISSION_FACTORS = {
    economy: 0.255,
    premiumEconomy: 0.382,
    business: 0.765,
    first: 1.020,
} as const;

/**
 * Hotel emission factors by category (kg CO2e per room-night)
 * Based on Cornell Hotel Sustainability Benchmarking studies
 */
export const HOTEL_EMISSION_FACTORS = {
    budget: 12,      // Hostels, budget hotels
    midRange: 21,    // 3-star hotels
    upscale: 33,     // 4-star hotels
    luxury: 55,      // 5-star resorts
    ecoLodge: 8,     // Eco-certified accommodations
} as const;

/**
 * Ground transport emission factors (kg CO2e per km per person)
 */
export const TRANSPORT_EMISSION_FACTORS = {
    taxi: 0.171,
    privateCar: 0.192,
    bus: 0.089,
    train: 0.041,
    electricVehicle: 0.053,
    motorcycle: 0.113,
    ferry: 0.019,
} as const;

/**
 * Activity emission estimates (kg CO2e per activity)
 */
export const ACTIVITY_EMISSION_FACTORS = {
    diving: 5,
    safari: 15,
    skiing: 20,
    golfing: 10,
    boatTour: 8,
    helicopter: 100,
    standard: 2,     // Walking tours, museums, etc.
} as const;

/**
 * Food emission factors (kg CO2e per meal)
 */
export const FOOD_EMISSION_FACTORS = {
    meatHeavy: 7.5,
    balanced: 5.0,
    vegetarian: 2.5,
    vegan: 1.5,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface FlightSegment {
    origin: string;         // IATA code or city name
    destination: string;    // IATA code or city name
    distanceKm?: number;    // If known, otherwise we estimate
    flightClass?: keyof typeof FLIGHT_EMISSION_FACTORS;
    passengers?: number;
}

export interface HotelStay {
    nights: number;
    category?: keyof typeof HOTEL_EMISSION_FACTORS;
    ecoRating?: number;     // 1-5 eco rating if known
}

export interface GroundTransport {
    type: keyof typeof TRANSPORT_EMISSION_FACTORS;
    distanceKm: number;
    passengers?: number;
}

export interface ItineraryActivity {
    type?: keyof typeof ACTIVITY_EMISSION_FACTORS;
    name?: string;
}

export interface CarbonCalculationInput {
    flights?: FlightSegment[];
    hotels?: HotelStay[];
    groundTransport?: GroundTransport[];
    activities?: ItineraryActivity[];
    daysCount?: number;
    travelerCount: number;
    dietaryPreference?: keyof typeof FOOD_EMISSION_FACTORS;
}

export interface CarbonFootprintResult {
    flightEmissionsKg: number;
    hotelEmissionsKg: number;
    groundTransportEmissionsKg: number;
    activitiesEmissionsKg: number;
    foodEmissionsKg: number;
    totalEmissionsKg: number;
    emissionsPerTravelerKg: number;
    emissionsPerDayKg: number;
    ecoScore: 'A' | 'B' | 'C' | 'D' | 'F';
    ecoScorePercentile: number;
    offsetCostUsd: number;
    offsetAvailable: boolean;
    recommendations: string[];
    calculationMethod: 'estimated' | 'detailed';
}

// =============================================================================
// DISTANCE ESTIMATION
// =============================================================================

/**
 * Major airport coordinates for distance calculation
 * This is a simplified dataset - a production system would use a complete database
 */
const AIRPORT_COORDINATES: Record<string, { lat: number; lon: number }> = {
    // India
    DEL: { lat: 28.5562, lon: 77.1000 },   // Delhi
    BOM: { lat: 19.0896, lon: 72.8656 },   // Mumbai
    BLR: { lat: 13.1989, lon: 77.7068 },   // Bangalore
    MAA: { lat: 12.9941, lon: 80.1707 },   // Chennai
    CCU: { lat: 22.6520, lon: 88.4463 },   // Kolkata
    HYD: { lat: 17.2403, lon: 78.4294 },   // Hyderabad
    GOI: { lat: 15.3808, lon: 73.8314 },   // Goa
    // International hubs
    DXB: { lat: 25.2532, lon: 55.3657 },   // Dubai
    SIN: { lat: 1.3644, lon: 103.9915 },   // Singapore
    BKK: { lat: 13.6900, lon: 100.7501 },  // Bangkok
    LHR: { lat: 51.4700, lon: -0.4543 },   // London
    JFK: { lat: 40.6413, lon: -73.7781 },  // New York
    CDG: { lat: 49.0097, lon: 2.5478 },    // Paris
    FRA: { lat: 50.0379, lon: 8.5622 },    // Frankfurt
    HND: { lat: 35.5494, lon: 139.7798 },  // Tokyo
    SYD: { lat: -33.9399, lon: 151.1753 }, // Sydney
};

/**
 * Calculate great-circle distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Estimate flight distance from city names/codes
 */
export function estimateFlightDistance(origin: string, destination: string): number {
    const originCode = origin.toUpperCase().substring(0, 3);
    const destCode = destination.toUpperCase().substring(0, 3);

    const originCoords = AIRPORT_COORDINATES[originCode];
    const destCoords = AIRPORT_COORDINATES[destCode];

    if (originCoords && destCoords) {
        return Math.round(calculateDistance(
            originCoords.lat, originCoords.lon,
            destCoords.lat, destCoords.lon
        ));
    }

    // Fallback: estimate based on common routes
    // Default to medium-haul flight (~2000 km)
    return 2000;
}

// =============================================================================
// CARBON CALCULATOR
// =============================================================================

export class CarbonCalculator {
    /**
     * Calculate total carbon footprint for an itinerary
     */
    calculate(input: CarbonCalculationInput): CarbonFootprintResult {
        const flightEmissions = this.calculateFlightEmissions(input.flights || []);
        const hotelEmissions = this.calculateHotelEmissions(input.hotels || []);
        const transportEmissions = this.calculateTransportEmissions(input.groundTransport || []);
        const activityEmissions = this.calculateActivityEmissions(input.activities || []);

        const daysCount = input.daysCount || this.estimateDaysFromHotels(input.hotels || []);
        const foodEmissions = this.calculateFoodEmissions(
            daysCount,
            input.travelerCount,
            input.dietaryPreference
        );

        const totalEmissions =
            flightEmissions +
            hotelEmissions +
            transportEmissions +
            activityEmissions +
            foodEmissions;

        const perTraveler = totalEmissions / Math.max(1, input.travelerCount);
        const perDay = totalEmissions / Math.max(1, daysCount);

        const ecoScore = this.getEcoScore(perTraveler);
        const ecoScorePercentile = this.getEcoScorePercentile(perTraveler);
        const offsetCostUsd = this.calculateOffsetCost(totalEmissions);
        const recommendations = this.generateRecommendations(input, {
            flightEmissions,
            hotelEmissions,
            transportEmissions,
            perTraveler,
        });

        return {
            flightEmissionsKg: Math.round(flightEmissions * 10) / 10,
            hotelEmissionsKg: Math.round(hotelEmissions * 10) / 10,
            groundTransportEmissionsKg: Math.round(transportEmissions * 10) / 10,
            activitiesEmissionsKg: Math.round(activityEmissions * 10) / 10,
            foodEmissionsKg: Math.round(foodEmissions * 10) / 10,
            totalEmissionsKg: Math.round(totalEmissions * 10) / 10,
            emissionsPerTravelerKg: Math.round(perTraveler * 10) / 10,
            emissionsPerDayKg: Math.round(perDay * 10) / 10,
            ecoScore,
            ecoScorePercentile,
            offsetCostUsd: Math.round(offsetCostUsd * 100) / 100,
            offsetAvailable: true,
            recommendations,
            calculationMethod: input.flights?.some(f => f.distanceKm) ? 'detailed' : 'estimated',
        };
    }

    /**
     * Quick estimate for preview (before full itinerary)
     */
    quickEstimate(
        origin: string,
        destination: string,
        days: number,
        travelers: number,
        travelStyle: 'budget' | 'mid-range' | 'luxury' = 'mid-range'
    ): CarbonFootprintResult {
        const flightDistance = estimateFlightDistance(origin, destination);

        const hotelCategory: keyof typeof HOTEL_EMISSION_FACTORS =
            travelStyle === 'budget' ? 'budget' :
                travelStyle === 'luxury' ? 'luxury' : 'midRange';

        return this.calculate({
            flights: [
                { origin, destination, distanceKm: flightDistance, flightClass: 'economy', passengers: travelers },
                { origin: destination, destination: origin, distanceKm: flightDistance, flightClass: 'economy', passengers: travelers },
            ],
            hotels: [{ nights: days, category: hotelCategory }],
            daysCount: days,
            travelerCount: travelers,
        });
    }

    private calculateFlightEmissions(flights: FlightSegment[]): number {
        return flights.reduce((total, flight) => {
            const distance = flight.distanceKm || estimateFlightDistance(flight.origin, flight.destination);
            const factor = FLIGHT_EMISSION_FACTORS[flight.flightClass || 'economy'];
            const passengers = flight.passengers || 1;

            // Add 10% for takeoff/landing overhead
            const adjustedDistance = distance * 1.1;

            return total + (adjustedDistance * factor * passengers);
        }, 0);
    }

    private calculateHotelEmissions(hotels: HotelStay[]): number {
        return hotels.reduce((total, hotel) => {
            const category = hotel.category || 'midRange';
            let factor = HOTEL_EMISSION_FACTORS[category];

            // Reduce emissions for eco-rated properties
            if (hotel.ecoRating && hotel.ecoRating >= 4) {
                factor *= 0.7; // 30% reduction for eco-certified
            }

            return total + (hotel.nights * factor);
        }, 0);
    }

    private calculateTransportEmissions(transport: GroundTransport[]): number {
        return transport.reduce((total, t) => {
            const factor = TRANSPORT_EMISSION_FACTORS[t.type];
            const passengers = t.passengers || 1;
            return total + (t.distanceKm * factor * passengers);
        }, 0);
    }

    private calculateActivityEmissions(activities: ItineraryActivity[]): number {
        return activities.reduce((total, activity) => {
            const factor = ACTIVITY_EMISSION_FACTORS[activity.type || 'standard'];
            return total + factor;
        }, 0);
    }

    private calculateFoodEmissions(
        days: number,
        travelers: number,
        dietary?: keyof typeof FOOD_EMISSION_FACTORS
    ): number {
        const mealsPerDay = 3;
        const factor = FOOD_EMISSION_FACTORS[dietary || 'balanced'];
        return days * mealsPerDay * factor * travelers;
    }

    private estimateDaysFromHotels(hotels: HotelStay[]): number {
        return Math.max(1, hotels.reduce((total, h) => total + h.nights, 0));
    }

    private getEcoScore(perTravelerKg: number): 'A' | 'B' | 'C' | 'D' | 'F' {
        if (perTravelerKg < 200) return 'A';
        if (perTravelerKg < 500) return 'B';
        if (perTravelerKg < 1000) return 'C';
        if (perTravelerKg < 2000) return 'D';
        return 'F';
    }

    private getEcoScorePercentile(perTravelerKg: number): number {
        // Based on typical travel emissions distribution
        // Lower emissions = higher percentile (better)
        if (perTravelerKg < 100) return 95;
        if (perTravelerKg < 200) return 85;
        if (perTravelerKg < 400) return 70;
        if (perTravelerKg < 600) return 55;
        if (perTravelerKg < 1000) return 40;
        if (perTravelerKg < 1500) return 25;
        if (perTravelerKg < 2000) return 15;
        return 5;
    }

    private calculateOffsetCost(totalKg: number): number {
        // Carbon offset price: approximately $15-25 per tonne CO2e
        // Using $20/tonne as baseline
        const tonnes = totalKg / 1000;
        return tonnes * 20;
    }

    private generateRecommendations(
        input: CarbonCalculationInput,
        emissions: {
            flightEmissions: number;
            hotelEmissions: number;
            transportEmissions: number;
            perTraveler: number;
        }
    ): string[] {
        const recommendations: string[] = [];

        // Flight recommendations
        if (emissions.flightEmissions > 500) {
            recommendations.push('Consider direct flights to reduce emissions from layovers');
        }
        if (input.flights?.some(f => f.flightClass === 'business' || f.flightClass === 'first')) {
            recommendations.push('Economy class has 60-75% lower emissions than premium cabins');
        }

        // Hotel recommendations
        if (emissions.hotelEmissions > 200) {
            recommendations.push('Look for eco-certified hotels with sustainability programs');
        }

        // Transport recommendations
        if (emissions.transportEmissions > 100) {
            recommendations.push('Use public transport or electric vehicles for local travel');
        }

        // General recommendations
        if (emissions.perTraveler > 1000) {
            recommendations.push('Consider carbon offset programs for this trip');
        }
        if (emissions.perTraveler < 300) {
            recommendations.push('Great job! Your trip has below-average carbon emissions');
        }

        return recommendations.slice(0, 3); // Top 3 recommendations
    }
}

// Singleton instance
export const carbonCalculator = new CarbonCalculator();

// Helper for quick calculations
export function calculateCarbonFootprint(input: CarbonCalculationInput): CarbonFootprintResult {
    return carbonCalculator.calculate(input);
}

export function quickCarbonEstimate(
    origin: string,
    destination: string,
    days: number,
    travelers: number,
    travelStyle?: 'budget' | 'mid-range' | 'luxury'
): CarbonFootprintResult {
    return carbonCalculator.quickEstimate(origin, destination, days, travelers, travelStyle);
}
