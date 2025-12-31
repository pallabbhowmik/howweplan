/**
 * Admin Entity
 * Represents a platform administrator
 */

export type AdminRole = 'super_admin' | 'support_admin' | 'finance_admin' | 'compliance_admin';

export interface AdminPermission {
  readonly resource: string;
  readonly actions: readonly ('create' | 'read' | 'update' | 'delete' | 'arbitrate')[];
}

export interface Admin {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: AdminRole;
  readonly permissions: readonly AdminPermission[];
  readonly isActive: boolean;
  readonly requiresMfa: boolean;
  readonly mfaEnabled: boolean;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: string; // Admin ID who created this admin
}

/**
 * Admin action context - required for all admin actions (constitution rule 8)
 */
export interface AdminActionContext {
  readonly adminId: string;
  readonly reason: string;
  readonly timestamp: Date;
  readonly ipAddress: string;
  readonly userAgent: string;
}
