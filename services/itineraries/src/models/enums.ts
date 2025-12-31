import { z } from 'zod';

/**
 * Itinerary disclosure state machine.
 * Controls what information is visible at each stage.
 * 
 * BUSINESS RULES:
 * - Pre-payment: Obfuscated only (no exact hotels, vendors, references)
 * - Post-payment: Full disclosure
 * - Cancelled: Reverts to obfuscated
 */
export const DisclosureState = {
  OBFUSCATED: 'OBFUSCATED',
  REVEALED: 'REVEALED',
} as const;

export type DisclosureState = typeof DisclosureState[keyof typeof DisclosureState];

export const disclosureStateSchema = z.enum(['OBFUSCATED', 'REVEALED']);

/**
 * Itinerary lifecycle states.
 */
export const ItineraryStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ItineraryStatus = typeof ItineraryStatus[keyof typeof ItineraryStatus];

export const itineraryStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
]);

/**
 * Item types within an itinerary.
 */
export const ItineraryItemType = {
  ACCOMMODATION: 'ACCOMMODATION',
  TRANSPORT: 'TRANSPORT',
  ACTIVITY: 'ACTIVITY',
  MEAL: 'MEAL',
  TRANSFER: 'TRANSFER',
  FREE_TIME: 'FREE_TIME',
  OTHER: 'OTHER',
} as const;

export type ItineraryItemType = typeof ItineraryItemType[keyof typeof ItineraryItemType];

export const itineraryItemTypeSchema = z.enum([
  'ACCOMMODATION',
  'TRANSPORT',
  'ACTIVITY',
  'MEAL',
  'TRANSFER',
  'FREE_TIME',
  'OTHER',
]);

/**
 * Submission source types.
 */
export const SubmissionSource = {
  PDF_UPLOAD: 'PDF_UPLOAD',
  EXTERNAL_LINK: 'EXTERNAL_LINK',
  FREE_TEXT: 'FREE_TEXT',
  STRUCTURED_INPUT: 'STRUCTURED_INPUT',
} as const;

export type SubmissionSource = typeof SubmissionSource[keyof typeof SubmissionSource];

export const submissionSourceSchema = z.enum([
  'PDF_UPLOAD',
  'EXTERNAL_LINK',
  'FREE_TEXT',
  'STRUCTURED_INPUT',
]);

/**
 * Valid state transitions for itineraries.
 */
export const VALID_STATUS_TRANSITIONS: Record<ItineraryStatus, ItineraryStatus[]> = {
  DRAFT: ['SUBMITTED', 'ARCHIVED'],
  SUBMITTED: ['UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['ARCHIVED'],
  REJECTED: ['DRAFT', 'ARCHIVED'],
  ARCHIVED: [],
};

/**
 * Valid state transitions for disclosure.
 */
export const VALID_DISCLOSURE_TRANSITIONS: Record<DisclosureState, DisclosureState[]> = {
  OBFUSCATED: ['REVEALED'],
  REVEALED: ['OBFUSCATED'], // Can revert on cancellation
};
