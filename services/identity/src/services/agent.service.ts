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
import { env } from '../env.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTER-SERVICE COMMUNICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notifies the matching service that an agent has been approved.
 * This triggers the creation of matches with existing open travel requests.
 */
async function notifyMatchingServiceOfApproval(userId: string): Promise<void> {
  const matchingUrl = env.MATCHING_SERVICE_URL;
  const internalSecret = env.INTERNAL_SERVICE_SECRET || env.EVENT_BUS_API_KEY;

  if (!matchingUrl || matchingUrl === 'http://localhost:3013') {
    console.log(`Skipping matching notification for ${userId} - no MATCHING_SERVICE_URL configured`);
    return;
  }

  try {
    const response = await fetch(`${matchingUrl}/internal/agent-onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Secret': internalSecret || '',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Matching service notification failed for ${userId}:`, response.status, errorText);
    } else {
      const result = await response.json();
      console.log(`Agent ${userId} onboarded to matching after approval:`, result);
    }
  } catch (err) {
    console.error(`Failed to notify matching service of agent approval:`, err);
  }
}

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
 * Gets user_id for an agent by their profile ID (from the agents table).
 * This is used when the caller has an agent profile ID (e.g., from itineraries)
 * and needs to look up the user's identity.
 */
export async function getUserIdByAgentProfileId(agentProfileId: string): Promise<string | null> {
  const db = getDbClient();

  const { data, error } = await db
    .from('agents')
    .select('user_id')
    .eq('id', agentProfileId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.user_id;
}

/**
 * Gets agent_id for a user by their user_id.
 * This is the inverse of getUserIdByAgentProfileId.
 */
export async function getAgentIdForUser(userId: string): Promise<string | null> {
  const db = getDbClient();

  const { data, error } = await db
    .from('agents')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

/**
 * Gets full agent info by their profile ID (from the agents table).
 * Returns combined data from agents table and users table.
 */
export async function getAgentByProfileId(agentProfileId: string): Promise<{
  agentId: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  businessName: string | null;
  bio: string | null;
  specializations: string[];
  languages: string[];
  destinations: string[];
  yearsOfExperience: number;
  tier: string;
  rating: number;
  totalReviews: number;
  completedBookings: number;
  responseTimeMinutes: number;
  isVerified: boolean;
  isAvailable: boolean;
} | null> {
  const db = getDbClient();

  // First get the agent from the agents table
  const { data: agentData, error: agentError } = await db
    .from('agents')
    .select('*')
    .eq('id', agentProfileId)
    .single();

  if (agentError || !agentData) {
    return null;
  }

  // Then get the user info
  const { data: userData, error: userError } = await db
    .from('users')
    .select('id, first_name, last_name, email, avatar_url')
    .eq('id', agentData.user_id)
    .single();

  if (userError || !userData) {
    return null;
  }

  return {
    agentId: agentData.id,
    userId: agentData.user_id,
    firstName: userData.first_name || '',
    lastName: userData.last_name || '',
    fullName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Travel Agent',
    email: userData.email,
    avatarUrl: userData.avatar_url,
    businessName: agentData.agency_name,
    bio: agentData.bio,
    specializations: agentData.specializations || [],
    languages: agentData.languages || [],
    destinations: agentData.destinations || [],
    yearsOfExperience: agentData.years_of_experience || 0,
    tier: agentData.tier || 'standard',
    rating: agentData.rating || 0,
    totalReviews: agentData.total_reviews || 0,
    completedBookings: agentData.completed_bookings || 0,
    responseTimeMinutes: agentData.response_time_minutes || 0,
    isVerified: agentData.is_verified || false,
    isAvailable: agentData.is_available || false,
  };
}

/**
 * Gets multiple agent profiles by their profile IDs in a single batch query.
 * 
 * OPTIMIZATION: Uses IN clause for single database round trip instead of N queries.
 * Time complexity: O(n) with single DB call instead of O(n) DB calls.
 * 
 * @param agentProfileIds Array of agent profile IDs (from agents table)
 * @returns Object with agents map and list of not found IDs
 */
export async function getAgentsByProfileIds(agentProfileIds: string[]): Promise<{
  agents: Record<string, {
    agentId: string;
    userId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    businessName: string | null;
    bio: string | null;
    specializations: string[];
    languages: string[];
    destinations: string[];
    yearsOfExperience: number;
    tier: string;
    rating: number;
    totalReviews: number;
    completedBookings: number;
    responseTimeMinutes: number;
    isVerified: boolean;
    isAvailable: boolean;
  }>;
  notFound: string[];
}> {
  const db = getDbClient();
  const agents: Record<string, any> = {};
  const notFound: string[] = [];

  if (agentProfileIds.length === 0) {
    return { agents, notFound };
  }

  // Batch query agents with IN clause - O(1) database round trip
  const { data: agentsData, error: agentsError } = await db
    .from('agents')
    .select('*')
    .in('id', agentProfileIds);

  if (agentsError || !agentsData) {
    return { agents, notFound: agentProfileIds };
  }

  // Track found agent IDs
  const foundAgentIds = new Set<string>();
  const userIds = agentsData.map(a => a.user_id);

  // Batch query users with IN clause - O(1) database round trip
  const { data: usersData, error: usersError } = await db
    .from('users')
    .select('id, first_name, last_name, email, avatar_url')
    .in('id', userIds);

  if (usersError || !usersData) {
    return { agents, notFound: agentProfileIds };
  }

  // Create user lookup map for O(1) access
  const userMap = new Map(usersData.map(u => [u.id, u]));

  // Build result using Map for O(1) lookups
  for (const agentData of agentsData) {
    const userData = userMap.get(agentData.user_id);
    if (!userData) continue;

    foundAgentIds.add(agentData.id);
    
    agents[agentData.id] = {
      agentId: agentData.id,
      userId: agentData.user_id,
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      fullName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Travel Agent',
      email: userData.email,
      avatarUrl: userData.avatar_url,
      businessName: agentData.agency_name,
      bio: agentData.bio,
      specializations: agentData.specializations || [],
      languages: agentData.languages || [],
      destinations: agentData.destinations || [],
      yearsOfExperience: agentData.years_of_experience || 0,
      tier: agentData.tier || 'standard',
      rating: agentData.rating || 0,
      totalReviews: agentData.total_reviews || 0,
      completedBookings: agentData.completed_bookings || 0,
      responseTimeMinutes: agentData.response_time_minutes || 0,
      isVerified: agentData.is_verified || false,
      isAvailable: agentData.is_available || false,
    };
  }

  // Find which IDs were not found
  for (const id of agentProfileIds) {
    if (!foundAgentIds.has(id)) {
      notFound.push(id);
    }
  }

  return { agents, notFound };
}

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
 * This also:
 * 1. Sets is_verified=true and is_available=true in the agents table
 * 2. Updates the user account status to ACTIVE
 * 3. Triggers matching with existing open travel requests
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

  // CRITICAL: Update the agents table to mark agent as verified and available
  const { error: agentUpdateError } = await db
    .from('agents')
    .update({
      is_verified: true,
      is_available: true,
    })
    .eq('user_id', userId);

  if (agentUpdateError) {
    console.error(`Failed to update agents table for user ${userId}:`, agentUpdateError);
  }

  // Update user account status to ACTIVE
  const { error: userUpdateError } = await db
    .from('users')
    .update({
      status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (userUpdateError) {
    console.error(`Failed to update user status for ${userId}:`, userUpdateError);
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

  // Trigger matching service to create matches for this newly verified agent
  // Fire-and-forget - don't block the response
  notifyMatchingServiceOfApproval(userId).catch(err => {
    console.error(`Failed to notify matching service of agent approval:`, err);
  });

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

  // Ensure agent remains not available for matching
  const { error: agentUpdateError } = await db
    .from('agents')
    .update({
      is_verified: false,
      is_available: false,
    })
    .eq('user_id', userId);

  if (agentUpdateError) {
    console.error(`Failed to update agents table on rejection for user ${userId}:`, agentUpdateError);
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

  // CRITICAL: Disable the agent in the agents table so they can't receive new matches
  const { error: agentUpdateError } = await db
    .from('agents')
    .update({
      is_verified: false,
      is_available: false,
    })
    .eq('user_id', userId);

  if (agentUpdateError) {
    console.error(`Failed to update agents table on revocation for user ${userId}:`, agentUpdateError);
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
