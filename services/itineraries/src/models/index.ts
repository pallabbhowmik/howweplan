// Enums and constants
export {
  DisclosureState,
  disclosureStateSchema,
  ItineraryStatus,
  itineraryStatusSchema,
  ItineraryItemType,
  itineraryItemTypeSchema,
  SubmissionSource,
  submissionSourceSchema,
  VALID_STATUS_TRANSITIONS,
  VALID_DISCLOSURE_TRANSITIONS,
} from './enums.js';

// Itinerary item models
export {
  locationSchema,
  type Location,
  timeRangeSchema,
  type TimeRange,
  vendorInfoSchema,
  type VendorInfo,
  accommodationDetailsSchema,
  type AccommodationDetails,
  transportDetailsSchema,
  type TransportDetails,
  activityDetailsSchema,
  type ActivityDetails,
  itineraryItemSchema,
  type ItineraryItem,
  createItineraryItemSchema,
  type CreateItineraryItemInput,
  updateItineraryItemSchema,
  type UpdateItineraryItemInput,
} from './itinerary-item.model.js';

// Main itinerary models
export {
  tripOverviewSchema,
  type TripOverview,
  pricingInfoSchema,
  type PricingInfo,
  itinerarySchema,
  type Itinerary,
  createItinerarySchema,
  type CreateItineraryInput,
  updateItinerarySchema,
  type UpdateItineraryInput,
  dayPlanSchema,
  type DayPlan,
  type ItineraryWithMeta,
  withMeta,
} from './itinerary.model.js';

// Submission models
export {
  SubmissionStatus,
  submissionStatusSchema,
  pdfSubmissionSchema,
  type PdfSubmission,
  linkSubmissionSchema,
  type LinkSubmission,
  freeTextSubmissionSchema,
  type FreeTextSubmission,
  structuredSubmissionSchema,
  type StructuredSubmission,
  submissionContentSchema,
  type SubmissionContent,
  submissionSchema,
  type Submission,
  createSubmissionDtoSchema,
  type CreateSubmissionDto,
  type SubmissionWithMeta,
  withSubmissionMeta,
} from './submission.model.js';

// Version models
export {
  VersionChangeType,
  versionChangeTypeSchema,
  versionChangeSchema,
  type VersionChange,
  itineraryVersionSchema,
  type ItineraryVersion,
  createVersionSchema,
  type CreateVersionInput,
  type VersionListItem,
  toVersionListItem,
  type VersionDiff,
} from './itinerary-version.model.js';
