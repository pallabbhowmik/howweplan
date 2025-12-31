# @tripcomposer/shared-types

Shared TypeScript types for the HowWePlan monorepo.

> Note: Package scope remains `@tripcomposer/*` for compatibility.

## Overview

This package provides common type definitions used across frontend apps and backend services. It complements `@tripcomposer/contracts` but does NOT duplicate domain contracts or lifecycle state machines.

## Installation

```bash
npm install @tripcomposer/shared-types
```

## Usage

```typescript
import type {
  UUID,
  Money,
  PaginationRequest,
  ApiSuccessResponse,
  ObfuscatedAgentProfile,
} from '@tripcomposer/shared-types';

import { ApiErrorCode, isApiSuccess } from '@tripcomposer/shared-types';
```

## Package Contents

### Primitives (`/primitives`)

Branded type aliases for type-safe primitive values:

- `UUID` - UUID v4 string
- `ISODateString` - ISO 8601 date string
- `CurrencyCode` - ISO 4217 currency code
- `Money` - Monetary value (amount + currency)
- `Percentage` - Percentage value (0-100)
- `NonEmptyString` - Non-empty string
- `EmailAddress` - Email address string
- `URLString` - URL string
- `PositiveInteger` - Positive integer

### View Models (`/views`)

UI-safe data transfer objects:

- `ObfuscatedAgentProfile` - Public agent profile
- `PublicAgentStats` - Agent statistics
- `ObfuscatedItinerarySummary` - Itinerary preview
- `RevealedItineraryDetails` - Full itinerary details
- `BookingPriceBreakdown` - Detailed price breakdown

### API Types (`/api`)

Request/response shapes and error handling:

- `PaginationRequest` / `PaginationResponse<T>` - Pagination
- `SortOrder` / `SortConfig` - Sorting
- `DateRange` - Date range filtering
- `ApiErrorCode` - Standardized error codes
- `ApiErrorResponse` / `ApiSuccessResponse<T>` - Response wrappers
- `isApiSuccess()` / `isApiError()` - Type guards

## Design Principles

1. **No business logic** - Types only, no behavior
2. **No validation** - Validation belongs in domain layer
3. **No side effects** - Pure type definitions
4. **No environment dependencies** - Works in browser and Node.js
5. **No external imports** - Self-contained package

## License

UNLICENSED - Private package
