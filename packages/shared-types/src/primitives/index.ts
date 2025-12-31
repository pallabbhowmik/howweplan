/**
 * Primitives - Common type aliases for strongly-typed values
 * These are branded types to improve type safety without runtime overhead.
 */

/**
 * UUID v4 string type
 * @example "550e8400-e29b-41d4-a716-446655440000"
 */
export type UUID = string & { readonly __brand: 'UUID' };

/**
 * ISO 8601 date string type
 * @example "2025-12-29T10:30:00.000Z"
 */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

/**
 * ISO 4217 currency code
 * @example "USD", "EUR", "GBP"
 */
export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };

/**
 * Monetary value representation
 * Amount is stored as integer cents/minor units to avoid floating point issues
 */
export interface Money {
  /** Amount in minor currency units (e.g., cents for USD) */
  readonly amount: number;
  /** ISO 4217 currency code */
  readonly currency: CurrencyCode;
}

/**
 * Percentage value (0-100 scale)
 * @example 15.5 represents 15.5%
 */
export type Percentage = number & { readonly __brand: 'Percentage' };

/**
 * Non-empty string type for required text fields
 */
export type NonEmptyString = string & { readonly __brand: 'NonEmptyString' };

/**
 * Email address string type
 */
export type EmailAddress = string & { readonly __brand: 'EmailAddress' };

/**
 * URL string type
 */
export type URLString = string & { readonly __brand: 'URLString' };

/**
 * Positive integer type
 */
export type PositiveInteger = number & { readonly __brand: 'PositiveInteger' };
