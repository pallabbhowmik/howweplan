/**
 * API Routes
 * 
 * Defines all HTTP routes for the dispute service.
 */

import { Router } from 'express';
import {
  handleCreateDispute,
  handleGetDispute,
  handleListDisputes,
  handleSubmitEvidence,
  handleGetEvidence,
  handleWithdrawDispute,
} from './handlers/dispute.handler.js';
import {
  handleListAgentDisputes,
  handleGetAgentDispute,
  handleSubmitAgentResponse,
  handleAgentSubmitEvidence,
  handleGetAgentEvidence,
} from './handlers/agent.handler.js';
import {
  handleGetAdminQueue,
  handleGetAdminDispute,
  handleStartReview,
  handleResolveDispute,
  handleEscalateDispute,
  handleAddNote,
  handleGetNotes,
  handleGetArbitrationHistory,
  handleGetAuditLogs,
  handleGetAdminEvidence,
  handleVerifyEvidence,
  handleAssignDispute,
  handleGetStatistics,
} from './handlers/admin.handler.js';

/**
 * Create and configure the API router.
 */
export function createRouter(): Router {
  const router = Router();

  // ==========================================================================
  // TRAVELER ROUTES
  // ==========================================================================

  /**
   * @route POST /disputes
   * @desc Create a new dispute
   * @access Authenticated travelers
   */
  router.post('/disputes', handleCreateDispute);

  /**
   * @route GET /disputes
   * @desc List disputes for authenticated traveler
   * @access Authenticated travelers
   */
  router.get('/disputes', handleListDisputes);

  /**
   * @route GET /disputes/:disputeId
   * @desc Get dispute details
   * @access Authenticated travelers (own disputes only)
   */
  router.get('/disputes/:disputeId', handleGetDispute);

  /**
   * @route POST /disputes/:disputeId/evidence
   * @desc Submit evidence for a dispute
   * @access Authenticated travelers (own disputes only)
   */
  router.post('/disputes/:disputeId/evidence', handleSubmitEvidence);

  /**
   * @route GET /disputes/:disputeId/evidence
   * @desc Get evidence for a dispute
   * @access Authenticated travelers (own disputes only)
   */
  router.get('/disputes/:disputeId/evidence', handleGetEvidence);

  /**
   * @route POST /disputes/:disputeId/withdraw
   * @desc Withdraw a dispute
   * @access Authenticated travelers (own disputes only)
   */
  router.post('/disputes/:disputeId/withdraw', handleWithdrawDispute);

  // ==========================================================================
  // AGENT ROUTES
  // ==========================================================================

  /**
   * @route GET /agent/disputes
   * @desc List disputes for authenticated agent
   * @access Authenticated agents
   */
  router.get('/agent/disputes', handleListAgentDisputes);

  /**
   * @route GET /agent/disputes/:disputeId
   * @desc Get dispute details for agent
   * @access Authenticated agents (assigned disputes only)
   */
  router.get('/agent/disputes/:disputeId', handleGetAgentDispute);

  /**
   * @route POST /agent/disputes/:disputeId/response
   * @desc Submit response to a dispute
   * @access Authenticated agents (assigned disputes only)
   */
  router.post('/agent/disputes/:disputeId/response', handleSubmitAgentResponse);

  /**
   * @route POST /agent/disputes/:disputeId/evidence
   * @desc Submit evidence for a dispute
   * @access Authenticated agents (assigned disputes only)
   */
  router.post('/agent/disputes/:disputeId/evidence', handleAgentSubmitEvidence);

  /**
   * @route GET /agent/disputes/:disputeId/evidence
   * @desc Get evidence for a dispute
   * @access Authenticated agents (assigned disputes only)
   */
  router.get('/agent/disputes/:disputeId/evidence', handleGetAgentEvidence);

  // ==========================================================================
  // ADMIN ROUTES
  // ==========================================================================

  /**
   * @route GET /admin/disputes
   * @desc Get admin dispute queue
   * @access Authenticated admins
   */
  router.get('/admin/disputes', handleGetAdminQueue);

  /**
   * @route GET /admin/disputes/stats
   * @desc Get dispute statistics for admin dashboard
   * @access Authenticated admins
   */
  router.get('/admin/disputes/stats', handleGetStatistics);

  /**
   * @route GET /admin/statistics
   * @desc Get dispute statistics (legacy route)
   * @access Authenticated admins
   */
  router.get('/admin/statistics', handleGetStatistics);

  /**
   * @route GET /admin/disputes/:disputeId
   * @desc Get full dispute details for admin
   * @access Authenticated admins
   */
  router.get('/admin/disputes/:disputeId', handleGetAdminDispute);

  /**
   * @route POST /admin/disputes/:disputeId/review
   * @desc Start admin review of a dispute
   * @access Authenticated admins
   */
  router.post('/admin/disputes/:disputeId/review', handleStartReview);

  /**
   * @route POST /admin/disputes/:disputeId/resolve
   * @desc Resolve a dispute
   * @access Authenticated admins
   */
  router.post('/admin/disputes/:disputeId/resolve', handleResolveDispute);

  /**
   * @route POST /admin/disputes/:disputeId/escalate
   * @desc Escalate a dispute
   * @access Authenticated admins
   */
  router.post('/admin/disputes/:disputeId/escalate', handleEscalateDispute);

  /**
   * @route POST /admin/disputes/:disputeId/assign
   * @desc Assign dispute to admin
   * @access Authenticated admins
   */
  router.post('/admin/disputes/:disputeId/assign', handleAssignDispute);

  /**
   * @route POST /admin/disputes/:disputeId/notes
   * @desc Add a note to a dispute
   * @access Authenticated admins
   */
  router.post('/admin/disputes/:disputeId/notes', handleAddNote);

  /**
   * @route GET /admin/disputes/:disputeId/notes
   * @desc Get notes for a dispute
   * @access Authenticated admins
   */
  router.get('/admin/disputes/:disputeId/notes', handleGetNotes);

  /**
   * @route GET /admin/disputes/:disputeId/history
   * @desc Get arbitration history
   * @access Authenticated admins
   */
  router.get('/admin/disputes/:disputeId/history', handleGetArbitrationHistory);

  /**
   * @route GET /admin/disputes/:disputeId/audit
   * @desc Get audit logs for a dispute
   * @access Authenticated admins
   */
  router.get('/admin/disputes/:disputeId/audit', handleGetAuditLogs);

  /**
   * @route GET /admin/disputes/:disputeId/evidence
   * @desc Get evidence for a dispute (admin view)
   * @access Authenticated admins
   */
  router.get('/admin/disputes/:disputeId/evidence', handleGetAdminEvidence);

  /**
   * @route POST /admin/evidence/:evidenceId/verify
   * @desc Verify or reject evidence
   * @access Authenticated admins
   */
  router.post('/admin/evidence/:evidenceId/verify', handleVerifyEvidence);

  return router;
}
