/**
 * User management service.
 * Handles user CRUD operations and account management.
 */

import { nanoid } from 'nanoid';
import { getDbClient } from './database.js';
import { hashPassword, verifyPassword, needsRehash } from './password.service.js';
import { createTokenPair, revokeAllUserRefreshTokens } from './token.service.js';
import { createEmailVerificationToken } from './verification.service.js';
import { EventFactory, EventContext } from '../events/index.js';
import {
  User,
  UserWithProfile,
  AgentProfile,
  UserRole,
  AccountStatus,
  AgentVerificationStatus,
  ACCOUNT_STATUS_TRANSITIONS,
  AdminActionContext,
} from '../types/identity.types.js';
import {
  UserNotFoundError,
  InvalidCredentialsError,
  AccountLockedError,
  AccountSuspendedError,
  InvalidStatusTransitionError,
} from './errors.js';
import { env } from '../env.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPE MAPPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps database row to User entity.
 */
function mapDbRowToUser(row: {
  id: string;
  email: string;
  role: string;
  status: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}): User {
  const normalizedRole = (row.role ?? '').toUpperCase();
  const role = (Object.values(UserRole) as string[]).includes(normalizedRole)
    ? (normalizedRole as UserRole)
    : UserRole.USER;

  const rawStatus = (row.status ?? '').toUpperCase();
  const normalizedStatus =
    rawStatus === 'PENDING' || rawStatus === 'PENDING_APPROVAL' || rawStatus === 'PENDING_VERIFICATION'
      ? AccountStatus.PENDING_VERIFICATION
      : rawStatus === 'ACTIVE'
        ? AccountStatus.ACTIVE
        : rawStatus === 'SUSPENDED'
          ? AccountStatus.SUSPENDED
          : rawStatus === 'DEACTIVATED' || rawStatus === 'DEACTIVATED_BY_ADMIN' || rawStatus === 'INACTIVE'
            ? AccountStatus.DEACTIVATED
            : (Object.values(AccountStatus) as string[]).includes(rawStatus)
              ? (rawStatus as AccountStatus)
              : AccountStatus.ACTIVE;

  return {
    id: row.id,
    email: row.email,
    role,
    status: normalizedStatus,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

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
// USER QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets a user by ID.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const db = getDbClient();

  const { data, error } = await db
    .from('users')
    .select('id, email, role, status, first_name, last_name, photo_url, email_verified_at, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbRowToUser(data);
}

/**
 * Gets a user by email.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDbClient();

  const { data, error } = await db
    .from('users')
    .select('id, email, role, status, first_name, last_name, photo_url, email_verified_at, created_at, updated_at')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbRowToUser(data);
}

/**
 * Gets a user with their agent profile (if applicable).
 */
export async function getUserWithProfile(userId: string): Promise<UserWithProfile | null> {
  const db = getDbClient();

  const { data: userData, error: userError } = await db
    .from('users')
    .select('id, email, role, status, first_name, last_name, photo_url, email_verified_at, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    return null;
  }

  const user = mapDbRowToUser(userData);

  // Fetch agent profile if user is an agent
  if (user.role === UserRole.AGENT) {
    const { data: profileData } = await db
      .from('agent_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileData) {
      return {
        ...user,
        agentProfile: mapDbRowToAgentProfile(profileData),
      };
    }
  }

  return {
    ...user,
    agentProfile: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// USER REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers a new user.
 */
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  eventContext: EventContext
): Promise<{ user: User; accessToken: string; refreshToken: string; expiresIn: number }> {
  const db = getDbClient();

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Create the user
  const userId = nanoid();
  const { data, error } = await db
    .from('users')
    .insert({
      id: userId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
      status: AccountStatus.PENDING_VERIFICATION,
      first_name: firstName,
      last_name: lastName,
      photo_url: null,
      email_verified_at: null,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .select('id, email, role, status, first_name, last_name, photo_url, email_verified_at, created_at, updated_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create user: ${error?.message ?? 'Unknown error'}`);
  }

  const user = mapDbRowToUser(data);

  // If registering as an agent, create agent profile
  if (role === UserRole.AGENT && env.ENABLE_AGENT_VERIFICATION) {
    await db.from('agent_profiles').insert({
      user_id: userId,
      verification_status: AgentVerificationStatus.NOT_SUBMITTED,
      verification_submitted_at: null,
      verification_completed_at: null,
      verification_rejected_reason: null,
      business_name: null,
      bio: null,
      specialties: [],
    });
  }

  // Create tokens
  const tokens = await createTokenPair(
    user.id,
    user.role,
    user.status,
    role === UserRole.AGENT ? AgentVerificationStatus.NOT_SUBMITTED : null
  );

  // Create email verification token
  let verificationToken: string | undefined;
  try {
    const verificationResult = await createEmailVerificationToken(user.id, user.email);
    verificationToken = verificationResult.token;
  } catch (err) {
    // Log but don't fail registration if verification token creation fails
    console.error('Failed to create verification token:', err);
  }

  // Emit registration event with verification token
  await EventFactory.userRegistered(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      verificationToken,
    },
    eventContext
  );

  return {
    user,
    ...tokens,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticates a user with email and password.
 */
export async function authenticateUser(
  email: string,
  password: string,
  ipAddress: string,
  userAgent: string,
  eventContext: EventContext
): Promise<{ user: User; accessToken: string; refreshToken: string; expiresIn: number }> {
  const db = getDbClient();

  // Get user with password hash
  const { data, error } = await db
    .from('users')
    .select('*, agent_profiles(*)')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) {
    // Emit failed login event
    await EventFactory.loginFailed(
      {
        email,
        reason: 'INVALID_CREDENTIALS',
        ipAddress,
        attemptCount: 0,
      },
      eventContext
    );
    throw new InvalidCredentialsError();
  }

  // Check if account is locked
  if (data.locked_until && new Date(data.locked_until) > new Date()) {
    await EventFactory.loginFailed(
      {
        email,
        reason: 'ACCOUNT_LOCKED',
        ipAddress,
        attemptCount: data.failed_login_attempts,
      },
      eventContext
    );
    throw new AccountLockedError(new Date(data.locked_until));
  }

  // Check if account is suspended
  if (data.status === AccountStatus.SUSPENDED) {
    await EventFactory.loginFailed(
      {
        email,
        reason: 'ACCOUNT_SUSPENDED',
        ipAddress,
        attemptCount: data.failed_login_attempts,
      },
      eventContext
    );
    throw new AccountSuspendedError();
  }

  // Verify password
  const isValid = await verifyPassword(password, data.password_hash);

  if (!isValid) {
    // Increment failed login attempts
    const newAttemptCount = data.failed_login_attempts + 1;
    const shouldLock = newAttemptCount >= env.MAX_LOGIN_ATTEMPTS;

    const updates: Record<string, unknown> = {
      failed_login_attempts: newAttemptCount,
    };

    if (shouldLock) {
      const lockExpiresAt = new Date(Date.now() + env.ACCOUNT_LOCKOUT_DURATION_SECONDS * 1000);
      updates.locked_until = lockExpiresAt.toISOString();

      // Emit account locked event
      await EventFactory.accountLocked(
        {
          userId: data.id,
          reason: 'MAX_LOGIN_ATTEMPTS_EXCEEDED',
          lockExpiresAt: lockExpiresAt.toISOString(),
        },
        eventContext
      );
    }

    await db.from('users').update(updates).eq('id', data.id);

    await EventFactory.loginFailed(
      {
        email,
        reason: 'INVALID_CREDENTIALS',
        ipAddress,
        attemptCount: newAttemptCount,
      },
      eventContext
    );

    if (shouldLock) {
      const lockExpiresAt = new Date(Date.now() + env.ACCOUNT_LOCKOUT_DURATION_SECONDS * 1000);
      throw new AccountLockedError(lockExpiresAt);
    }

    throw new InvalidCredentialsError();
  }

  // Reset failed login attempts on successful login
  await db.from('users').update({ failed_login_attempts: 0, locked_until: null }).eq('id', data.id);

  // Check if password needs rehashing
  if (needsRehash(data.password_hash)) {
    const newHash = await hashPassword(password);
    await db.from('users').update({ password_hash: newHash }).eq('id', data.id);
  }

  const user = mapDbRowToUser(data);
  const agentProfile = data.agent_profiles?.[0];
  const agentVerificationStatus = agentProfile
    ? (agentProfile.verification_status as AgentVerificationStatus)
    : null;

  // Create tokens
  const tokens = await createTokenPair(user.id, user.role, user.status, agentVerificationStatus);

  // Emit login event
  await EventFactory.userLoggedIn(
    {
      userId: user.id,
      ipAddress,
      userAgent,
    },
    eventContext
  );

  return {
    user,
    ...tokens,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT STATUS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a status transition is allowed.
 */
function validateStatusTransition(currentStatus: AccountStatus, newStatus: AccountStatus): void {
  const allowedTransitions = ACCOUNT_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    throw new InvalidStatusTransitionError(currentStatus, newStatus);
  }
}

/**
 * Updates a user's account status.
 * Per business rules: all admin actions require a reason.
 */
export async function updateAccountStatus(
  userId: string,
  newStatus: AccountStatus,
  adminContext: AdminActionContext,
  eventContext: EventContext
): Promise<User> {
  const db = getDbClient();

  // Get current user
  const user = await getUserById(userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }

  // Validate transition
  validateStatusTransition(user.status, newStatus);

  // Update status
  const { data, error } = await db
    .from('users')
    .update({ status: newStatus })
    .eq('id', userId)
    .select('id, email, role, status, first_name, last_name, photo_url, email_verified_at, created_at, updated_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update account status: ${error?.message ?? 'Unknown error'}`);
  }

  const updatedUser = mapDbRowToUser(data);

  // Emit status change event
  await EventFactory.accountStatusChanged(
    {
      userId,
      previousStatus: user.status,
      newStatus,
      reason: adminContext.reason,
      changedBy: {
        adminId: adminContext.adminId,
        referenceId: adminContext.referenceId,
      },
    },
    eventContext
  );

  // Emit specific status events
  if (newStatus === AccountStatus.SUSPENDED) {
    await EventFactory.accountSuspended(
      {
        userId,
        reason: adminContext.reason,
        suspendedBy: {
          adminId: adminContext.adminId,
          referenceId: adminContext.referenceId,
        },
      },
      eventContext
    );

    // Revoke all refresh tokens when suspended
    await revokeAllUserRefreshTokens(userId);
  } else if (newStatus === AccountStatus.ACTIVE && user.status === AccountStatus.SUSPENDED) {
    await EventFactory.accountReactivated(
      {
        userId,
        reason: adminContext.reason,
        reactivatedBy: {
          adminId: adminContext.adminId,
          referenceId: adminContext.referenceId,
        },
      },
      eventContext
    );
  } else if (newStatus === AccountStatus.DEACTIVATED) {
    await EventFactory.accountDeactivated(
      {
        userId,
        reason: adminContext.reason,
        deactivatedBy: 'ADMIN',
        adminContext: {
          adminId: adminContext.adminId,
          referenceId: adminContext.referenceId,
        },
      },
      eventContext
    );

    // Revoke all refresh tokens when deactivated
    await revokeAllUserRefreshTokens(userId);
  }

  // Log admin action
  await EventFactory.adminActionPerformed(
    {
      adminId: adminContext.adminId,
      action: 'UPDATE_ACCOUNT_STATUS',
      targetUserId: userId,
      reason: adminContext.reason,
      referenceId: adminContext.referenceId,
      details: {
        previousStatus: user.status,
        newStatus,
      },
    },
    eventContext
  );

  return updatedUser;
}

/**
 * Updates a user's profile.
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    firstName?: string;
    lastName?: string;
    photoUrl?: string | null;
  },
  eventContext: EventContext
): Promise<User> {
  const db = getDbClient();

  const dbUpdates: Record<string, unknown> = {};
  const updatedFields: string[] = [];

  if (updates.firstName !== undefined) {
    dbUpdates.first_name = updates.firstName;
    updatedFields.push('firstName');
  }
  if (updates.lastName !== undefined) {
    dbUpdates.last_name = updates.lastName;
    updatedFields.push('lastName');
  }
  if (updates.photoUrl !== undefined) {
    dbUpdates.photo_url = updates.photoUrl;
    updatedFields.push('photoUrl');
  }

  const { data, error } = await db
    .from('users')
    .update(dbUpdates)
    .eq('id', userId)
    .select('id, email, role, status, first_name, last_name, photo_url, email_verified_at, created_at, updated_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update user profile: ${error?.message ?? 'Unknown error'}`);
  }

  const user = mapDbRowToUser(data);

  // Emit profile updated event
  await EventFactory.profileUpdated(
    {
      userId,
      updatedFields,
    },
    eventContext
  );

  return user;
}

/**
 * Changes a user's password.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  eventContext: EventContext
): Promise<void> {
  const db = getDbClient();

  // Get current password hash
  const { data, error } = await db
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new UserNotFoundError(userId);
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, data.password_hash);
  if (!isValid) {
    throw new InvalidCredentialsError();
  }

  // Hash and update new password
  const newHash = await hashPassword(newPassword);
  await db.from('users').update({ password_hash: newHash }).eq('id', userId);

  // Emit password changed event
  await EventFactory.passwordChanged(
    {
      userId,
      initiatedBy: 'USER',
    },
    eventContext
  );

  // Revoke all refresh tokens on password change
  await revokeAllUserRefreshTokens(userId);
}
