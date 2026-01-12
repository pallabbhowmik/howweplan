/**
 * Create Request DTO
 * 
 * Input validation schema for creating a new travel request.
 * Uses Zod for runtime type validation.
 */

import { z } from 'zod';

const TravelerCountSchema = z.object({
  adults: z
    .number()
    .int()
    .min(1, 'At least one adult is required')
    .max(10, 'Maximum 10 adults allowed'),
  children: z
    .number()
    .int()
    .min(0)
    .max(10, 'Maximum 10 children allowed')
    .default(0),
  infants: z
    .number()
    .int()
    .min(0)
    .max(5, 'Maximum 5 infants allowed')
    .default(0),
}).refine(
  (data: { adults: number; children: number; infants: number }) => data.adults + data.children + data.infants <= 15,
  { message: 'Maximum 15 total travelers allowed' }
);

const TravelStyleSchema = z.enum([
  'budget',
  'mid-range', 
  'luxury',
  'ultra-luxury',
]);

const BudgetRangeSchema = z.object({
  minAmount: z
    .number()
    .positive('Minimum budget must be positive')
    .max(1000000, 'Budget too large'),
  maxAmount: z
    .number()
    .positive('Maximum budget must be positive')
    .max(10000000, 'Budget too large'),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code')
    .toUpperCase(),
}).refine(
  (data: { minAmount: number; maxAmount: number }) => data.maxAmount >= data.minAmount,
  { message: 'Maximum budget must be greater than or equal to minimum budget' }
);

export const CreateRequestSchema = z.object({
  destination: z
    .string()
    .min(2, 'Destination must be at least 2 characters')
    .max(200, 'Destination too long')
    .trim(),
  
  departureLocation: z
    .string()
    .min(2, 'Departure location must be at least 2 characters')
    .max(200, 'Departure location too long')
    .trim(),
  
  departureDate: z
    .string()
    .datetime({ message: 'Invalid departure date format' })
    .transform((val: string) => new Date(val))
    .refine(
      (date: Date) => date > new Date(),
      { message: 'Departure date must be in the future' }
    ),
  
  returnDate: z
    .string()
    .datetime({ message: 'Invalid return date format' })
    .transform((val: string) => new Date(val)),
  
  travelers: TravelerCountSchema,
  
  travelStyle: TravelStyleSchema,
  
  budgetRange: BudgetRangeSchema,
  
  notes: z
    .string()
    .max(2000, 'Notes too long')
    .trim()
    .nullable()
    .optional()
    .transform((val: string | null | undefined) => val || null),
  
  preferences: z
    .object({
      dietary_restrictions: z.array(z.string()).optional(),
      special_occasions: z.array(z.string()).optional(),
      accommodation_type: z.string().optional(),
      interests: z.array(z.string()).optional(),
    })
    .passthrough()
    .nullable()
    .optional()
    .transform((val) => val || null),
}).refine(
  (data: { returnDate: Date; departureDate: Date }) => data.returnDate > data.departureDate,
  { message: 'Return date must be after departure date', path: ['returnDate'] }
).refine(
  (data: { returnDate: Date; departureDate: Date }) => {
    const tripDays = Math.ceil(
      (data.returnDate.getTime() - data.departureDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return tripDays <= 90;
  },
  { message: 'Trip duration cannot exceed 90 days', path: ['returnDate'] }
).refine(
  (data: { departureDate: Date }) => {
    const daysUntilDeparture = Math.ceil(
      (data.departureDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDeparture >= 3;
  },
  { message: 'Departure must be at least 3 days from now', path: ['departureDate'] }
);

export type CreateRequestDTO = z.input<typeof CreateRequestSchema>;
export type ValidatedCreateRequest = z.output<typeof CreateRequestSchema>;
