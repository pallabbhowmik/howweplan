/**
 * Agent verification service.
 * Handles agent verification workflow and state management.
 */

import { getDbClient } from './database.js';
import { EventFactory, EventContext } from '../events/index.js';
import {
  AgentProfile,
  AgentVerificationStatus,
  AGENT_VERIFICATION_TRANSITIONS,
  AdminActionContext,
  UserRole,
} from '../types/identity.types.js';
import {
  UserNotFoundError,
  AgentProfileNotFoundError,
  InvalidStatusTransitionError,
  InsufficientPermissionsError,
} from './errors.js';
import { getUserById } from './user.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPE MAPPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps database row to AgentProfile entity.
 */
function mapDbRowToAgentProfile(row: {
  user_id: string;
  verification_status: string;
  verification_submitted_at: string | null;
  verification_completed_at: string | null;
  verification_rejected_reason: string | null;
  business_name: string | null;
  bio: string | null;
  specialties: string[];
  created_at: string;
  updated_at: string;
}): AgentProfile {
  return {
    userId: row.user_id,
    verificationStatus: row.verification_status as AgentVerificationStatus,
    verificationSubmittedAt: row.verification_submitted_at
      ? new Date(row.verification_submitted_at)
      : null,
    verificationCompletedAt: row.verification_completed_at
      ? new Date(row.verification_completed_at)
      : null,
    verificationRejectedReason: row.verification_rejected_reason,
    businessName: row.business_name,
    bio: row.bio,
    specialties: row.specialties,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PROFILE QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets an agent profile by user ID.
 */
export async function getAgentProfile(userId: string): Promise<AgentProfile | null> {
  const db = getDbClient();

  const { data, error } = await db
    .from('agent_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbRowToAgentProfile(data);
}

/**
 * Gets an agent profile or throws if not found.
 */
export async function getAgentProfileOrThrow(userId: string): Promise<AgentProfile> {
  const profile = await getAgentProfile(userId);
  if (!profile) {
    throw new AgentProfileNotFoundError(userId);
  }
  return profile;
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a verification status transition is allowed.
 */
function validateVerificationTransition(
  currentStatus: AgentVerificationStatus,
  newStatus: AgentVerificationStatus
): void {
  const allowedTransitions = AGENT_VERIFICATION_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    throw new InvalidStatusTransitionError(currentStatus, newStatus);
  }
}

/**
 * Submits verification documents for an agent.
 */
export async function submitVerification(
  userId: string,
  documentType: string,
  documentUrl: string,
  additionalNotes: string | undefined,
  eventContext: EventContext
): Promise<AgentProfile> {
  const db = getDbClient();

  // Verify user is an agent
  const user = await getUserById(userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }
  if (user.role !== UserRole.AGENT) {
    throw new InsufficientPermissionsError('Must be an agent to submit verification');
  }

  // Get current profile
  const profile = await getAgentProfileOrThrow(userId);

  // Validate transition
  validateVerificationTransition(
    profile.verificationStatus,
    AgentVerificationStatus.PENDING_REVIEW
  );

  // Store verification document
  await db.from('verification_documents').insert({
    user_id: userId,
    document_type: documentType,
    document_url: documentUrl,
    additional_notes: additionalNotes ?? null,
    reviewed_at: null,
    reviewed_by: null,
  });

  // Update profile status
  const { data, error } = await db
    .from('agent_profiles')
    .update({
      verification_status: AgentVerificationStatus.PENDING_REVIEW,
      verification_submitted_at: new Date().toISOString(),
      verification_rejected_reason: null,
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update verification status: ${error?.message ?? 'Unknown error'}`);
  }

  // Emit event
  await EventFactory.agentVerificationSubmitted(
    {
      userId,
      documentType,
    },
    eventContext
  );

  return mapDbRowToAgentProfile(data);
}

/**
 * Approves an agent's verification.
 * Per business rules: all admin actions require a reason.
 */
export async function approveVerification(
  userId: string,
  adminContext: AdminActionContext,
  eventContext: EventContext
): Promise<AgentProfile> {
  const db = getDbClient();

  // Get current profile
  const profile = await getAgentProfileOrThrow(userId);

  // Validate transition
  validateVerificationTransition(profile.verificationStatus, AgentVerificationStatus.VERIFIED);

  // Update profile status
  const { data, error } = await db
    .from('agent_profiles')
    .update({
      verification_status: AgentVerificationStatus.VERIFIED,
      verification_completed_at: new Date().toISOString(),
      verification_rejected_reason: null,
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to approve verification: ${error?.message ?? 'Unknown error'}`);
  }

  // Update verification documents
  await db
    .from('verification_documents')
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminContext.adminId,
    })
    .eq('user_id', userId)
    .is('reviewed_at', null);

  // Emit events
  await EventFactory.agentVerificationApproved(
    {
      userId,
      approvedBy: {
        adminId: adminContext.adminId,
        reason: adminContext.reason,
        referenceId: adminContext.referenceId,
      },
    },
    eventContext
  );

  await EventFactory.adminActionPerformed(
    {
      adminId: adminContext.adminId,
      action: 'APPROVE_AGENT_VERIFICATION',
      targetUserId: userId,
      reason: adminContext.reason,
      referenceId: adminContext.referenceId,
      details: {
        previousStatus: profile.verificationStatus,
        newStatus: AgentVerificationStatus.VERIFIED,
      },
    },
    eventContext
  );

  return mapDbRowToAgentProfile(data);
}

/**
 * Rejects an agent's verification.
 * Per business rules: all admin actions require a reason.
 */
export async function rejectVerification(
  userId: string,
  rejectionReason: string,
  adminContext: AdminActionContext,
  eventContext: EventContext
): Promise<AgentProfile> {
  const db = getDbClient();

  // Get current profile
  const profile = await getAgentProfileOrThrow(userId);

  // Validate transition
  validateVerificationTransition(profile.verificationStatus, AgentVerificationStatus.REJECTED);

  // Update profile status
  const { data, error } = await db
    .from('agent_profiles')
    .update({
      verification_status: AgentVerificationStatus.REJECTED,
      verification_completed_at: new Date().toISOString(),
      verification_rejected_reason: rejectionReason,
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to reject verification: ${error?.message ?? 'Unknown error'}`);
  }

  // Update verification documents
  await db
    .from('verification_documents')
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminContext.adminId,
    })
    .eq('user_id', userId)
    .is('reviewed_at', null);

  // Emit events
  await EventFactory.agentVerificationRejected(
    {
      userId,
      rejectedBy: {
        adminId: adminContext.adminId,
        reason: adminContext.reason,
        rejectionReason,
        referenceId: adminContext.referenceId,
      },
    },
    eventContext
  );

  await EventFactory.adminActionPerformed(
    {
      adminId: adminContext.adminId,
      action: 'REJECT_AGENT_VERIFICATION',
      targetUserId: userId,
      reason: adminContext.reason,
      referenceId: adminContext.referenceId,
      details: {
        previousStatus: profile.verificationStatus,
        newStatus: AgentVerificationStatus.REJECTED,
        rejectionReason,
      },
    },
    eventContext
  );

  return mapDbRowToAgentProfile(data);
}

/**
 * Revokes an agent's verification.
 * Per business rules: all admin actions require a reason.
 */
export async function revokeVerification(
  userId: string,
  adminContext: AdminActionContext,
  eventContext: EventContext
): Promise<AgentProfile> {
  const db = getDbClient();

  // Get current profile
  const profile = await getAgentProfileOrThrow(userId);

  // Only verified agents can have verification revoked
  if (profile.verificationStatus !== AgentVerificationStatus.VERIFIED) {
    throw new InvalidStatusTransitionError(
      profile.verificationStatus,
      AgentVerificationStatus.REVOKED
    );
  }

  // Update profile status
  const { data, error } = await db
    .from('agent_profiles')
    .update({
      verification_status: AgentVerificationStatus.REVOKED,
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to revoke verification: ${error?.message ?? 'Unknown error'}`);
  }

  // Emit events
  await EventFactory.agentVerificationRevoked(
    {
      userId,
      previousStatus: profile.verificationStatus,
      revokedBy: {
        adminId: adminContext.adminId,
        reason: adminContext.reason,
        referenceId: adminContext.referenceId,
      },
    },
    eventContext
  );

  await EventFactory.adminActionPerformed(
    {
      adminId: adminContext.adminId,
      action: 'REVOKE_AGENT_VERIFICATION',
      targetUserId: userId,
      reason: adminContext.reason,
      referenceId: adminContext.referenceId,
      details: {
        previousStatus: profile.verificationStatus,
        newStatus: AgentVerificationStatus.REVOKED,
      },
    },
    eventContext
  );

  return mapDbRowToAgentProfile(data);
}

/**
 * Updates an agent's profile information.
 */
export async function updateAgentProfile(
  userId: string,
  updates: {
    businessName?: string | null;
    bio?: string | null;
    specialties?: string[];
  },
  eventContext: EventContext
): Promise<AgentProfile> {
  const db = getDbClient();

  const dbUpdates: Record<string, unknown> = {};
  const updatedFields: string[] = [];

  if (updates.businessName !== undefined) {
    dbUpdates.business_name = updates.businessName;
    updatedFields.push('businessName');
  }
  if (updates.bio !== undefined) {
    dbUpdates.bio = updates.bio;
    updatedFields.push('bio');
  }
  if (updates.specialties !== undefined) {
    dbUpdates.specialties = updates.specialties;
    updatedFields.push('specialties');
  }

  const { data, error } = await db
    .from('agent_profiles')
    .update(dbUpdates)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update agent profile: ${error?.message ?? 'Unknown error'}`);
  }

  // Emit profile updated event
  await EventFactory.profileUpdated(
    {
      userId,
      updatedFields: updatedFields.map((f) => `agentProfile.${f}`),
    },
    eventContext
  );

  return mapDbRowToAgentProfile(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lists agents pending verification review.
 */
export async function listPendingVerifications(
  page: number = 1,
  pageSize: number = 20
): Promise<{ profiles: AgentProfile[]; total: number }> {
  const db = getDbClient();

  const { data, error, count } = await db
    .from('agent_profiles')
    .select('*', { count: 'exact' })
    .eq('verification_status', AgentVerificationStatus.PENDING_REVIEW)
    .order('verification_submitted_at', { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    throw new Error(`Failed to list pending verifications: ${error.message}`);
  }

  return {
    profiles: (data ?? []).map(mapDbRowToAgentProfile),
    total: count ?? 0,
  };
}
