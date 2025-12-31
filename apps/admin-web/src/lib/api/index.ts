/**
 * API Module Index
 */

export { apiClient, ApiClientError, NetworkError, TimeoutError, buildPaginationParams } from './client';

// Agent APIs
export {
  listAgents,
  getAgent,
  approveAgent,
  suspendAgent,
  reactivateAgent,
  rejectAgent,
} from './agents';
export type { AgentFilters, AgentQueryParams, AgentDetails } from './agents';

// Dispute APIs
export {
  listDisputes,
  getDispute,
  updateDisputeStatus,
  addDisputeNote,
  resolveDispute,
  getDisputeStats,
} from './disputes';
export type { DisputeFilters, DisputeQueryParams, DisputeDetails } from './disputes';

// Refund APIs
export {
  listRefunds,
  getRefund,
  approveRefund,
  rejectRefund,
  triggerRefund,
  getRefundStats,
} from './refunds';
export type { RefundFilters, RefundQueryParams, RefundDetails } from './refunds';

// Matching APIs
export {
  listMatchingOverrides,
  getMatchingOverride,
  createMatchingOverride,
  cancelMatchingOverride,
  getPendingTripRequests,
  getAvailableAgents,
} from './matching';
export type { MatchingOverrideFilters, MatchingOverrideQueryParams, MatchingOverrideDetails } from './matching';

// Audit APIs
export {
  queryAuditEvents,
  getAuditEvent,
  getAuditEventsForTarget,
  getAuditStatistics,
  exportAuditEvents,
  getRecentCriticalEvents,
  getEventsByCorrelationId,
} from './audit';
export type { AuditQueryParams } from './audit';
