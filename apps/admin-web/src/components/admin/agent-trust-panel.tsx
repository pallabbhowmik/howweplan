/**
 * Agent Trust Management Panel
 * 
 * Admin component for viewing and managing agent trust profiles.
 * All actions are logged to the audit service.
 */

'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDateTime, formatRelativeTime, cn } from '@/lib/utils';
import { ReasonDialog } from './reason-dialog';
import { StatusBadge } from './status-badge';
import { AuditTrail } from './audit-trail';
import type { AuditEvent } from '@/types';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Star,
  AlertTriangle,
  Clock,
  Award,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  History,
  FileText,
  AlertOctagon,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

/** Trust levels as defined in shared contracts */
export type TrustLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

/** Badge types as defined in shared contracts */
export type Badge = 
  | 'VERIFIED_AGENT'
  | 'PLATFORM_TRUSTED'
  | 'TOP_PLANNER'
  | 'ON_TIME_EXPERT'
  | 'NEWLY_VERIFIED';

/** Agent trust profile for admin view */
export interface AgentTrustProfile {
  readonly agentId: string;
  readonly displayName: string;
  readonly email: string;
  readonly phone: string;
  readonly businessName?: string;
  readonly createdAt: string;
  
  // Trust metrics
  readonly trustLevel: TrustLevel;
  readonly badges: readonly Badge[];
  readonly platformProtectionScore: number;
  readonly platformProtectionEligible: boolean;
  
  // Performance stats
  readonly totalProposalsSubmitted: number;
  readonly totalBookingsCompleted: number;
  readonly totalBookingsCancelled: number;
  readonly averageRating: number;
  readonly ratingCount: number;
  readonly responseTimeP50: number;
  readonly responseTimeP90: number;
  
  // Violations & status
  readonly platformViolationCount: number;
  readonly activeFreezeStatus: boolean;
  readonly freezeReason?: string;
  readonly freezeStartedAt?: string;
  readonly freezeAdminId?: string;
  
  // Verification
  readonly identityVerified: boolean;
  readonly bankVerified: boolean;
  
  // Last updated
  readonly lastUpdatedAt: string;
}

/** Badge history entry */
export interface BadgeHistoryEntry {
  readonly id: string;
  readonly badge: Badge;
  readonly action: 'assigned' | 'revoked';
  readonly reason: string;
  readonly timestamp: string;
  readonly adminId?: string;
  readonly automatic: boolean;
}

/** Violation entry */
export interface ViolationEntry {
  readonly id: string;
  readonly type: 'MESSAGE_LEAK' | 'ITINERARY_LEAK' | 'POLICY_VIOLATION' | 'DISPUTE_LOST' | 'MANUAL';
  readonly description: string;
  readonly timestamp: string;
  readonly bookingId?: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly resolvedAt?: string;
  readonly resolvedBy?: string;
}

/** Admin action types */
type AdminAction = 
  | 'freeze_agent'
  | 'unfreeze_agent'
  | 'revoke_badge'
  | 'adjust_trust_level'
  | 'hide_review'
  | 'unhide_review';

interface AgentTrustPanelProps {
  readonly profile: AgentTrustProfile;
  readonly badgeHistory: readonly BadgeHistoryEntry[];
  readonly violations: readonly ViolationEntry[];
  readonly auditEvents: readonly AuditEvent[];
  readonly onAction: (action: AdminAction, params: Record<string, unknown>) => Promise<void>;
  readonly isLoading?: boolean;
}

// ============================================================================
// BADGE CONFIGURATION
// ============================================================================

const BADGE_CONFIG: Record<Badge, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  VERIFIED_AGENT: {
    label: 'Verified Agent',
    icon: <ShieldCheck className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Identity and bank account verified',
  },
  PLATFORM_TRUSTED: {
    label: 'Platform Trusted',
    icon: <Shield className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: '3+ completed bookings, no violations',
  },
  TOP_PLANNER: {
    label: 'Top Planner',
    icon: <Star className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: '5+ reviews with 4.5+ average rating',
  },
  ON_TIME_EXPERT: {
    label: 'On-Time Expert',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Consistently fast response times',
  },
  NEWLY_VERIFIED: {
    label: 'Newly Verified',
    icon: <Award className="h-4 w-4" />,
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'New to platform, identity verified',
  },
};

const TRUST_LEVEL_CONFIG: Record<TrustLevel, { label: string; color: string; description: string }> = {
  LEVEL_1: {
    label: 'Level 1 - New',
    color: 'bg-gray-100 text-gray-800',
    description: 'New agent, limited platform privileges',
  },
  LEVEL_2: {
    label: 'Level 2 - Established',
    color: 'bg-blue-100 text-blue-800',
    description: 'Proven track record, standard privileges',
  },
  LEVEL_3: {
    label: 'Level 3 - Premium',
    color: 'bg-purple-100 text-purple-800',
    description: 'Top performer, enhanced privileges',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AgentTrustPanel({
  profile,
  badgeHistory,
  violations,
  auditEvents,
  onAction,
  isLoading,
}: AgentTrustPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'violations' | 'audit'>('overview');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<AdminAction | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const handleActionClick = (action: AdminAction, badge?: Badge) => {
    setPendingAction(action);
    if (badge) setSelectedBadge(badge);
    setActionDialogOpen(true);
  };

  const handleActionConfirm = async (reason: string) => {
    if (!pendingAction) return;
    
    const params: Record<string, unknown> = { reason };
    if (selectedBadge) params.badge = selectedBadge;
    if (pendingAction === 'adjust_trust_level') {
      // Trust level adjustment would include target level
    }
    
    await onAction(pendingAction, params);
    setActionDialogOpen(false);
    setPendingAction(null);
    setSelectedBadge(null);
  };

  const getActionTitle = (): string => {
    switch (pendingAction) {
      case 'freeze_agent': return 'Freeze Agent Account';
      case 'unfreeze_agent': return 'Unfreeze Agent Account';
      case 'revoke_badge': return `Revoke ${selectedBadge ? BADGE_CONFIG[selectedBadge].label : 'Badge'}`;
      case 'adjust_trust_level': return 'Adjust Trust Level';
      case 'hide_review': return 'Hide Review';
      case 'unhide_review': return 'Unhide Review';
      default: return 'Confirm Action';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with quick actions */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{profile.displayName}</h2>
          <p className="text-muted-foreground">{profile.email}</p>
          <p className="text-sm text-muted-foreground">Agent ID: {profile.agentId}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {profile.activeFreezeStatus ? (
            <button
              onClick={() => handleActionClick('unfreeze_agent')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              disabled={isLoading}
            >
              <Unlock className="h-4 w-4" />
              Unfreeze Account
            </button>
          ) : (
            <button
              onClick={() => handleActionClick('freeze_agent')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              disabled={isLoading}
            >
              <Lock className="h-4 w-4" />
              Freeze Account
            </button>
          )}
        </div>
      </div>

      {/* Freeze warning banner */}
      {profile.activeFreezeStatus && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">Account Frozen</h4>
              <p className="text-sm text-red-700">{profile.freezeReason}</p>
              <p className="text-xs text-red-600 mt-1">
                Frozen since {profile.freezeStartedAt ? formatDateTime(profile.freezeStartedAt) : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b">
        <nav className="flex gap-4">
          {(['overview', 'badges', 'violations', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 border-b-2 font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab}
              {tab === 'violations' && profile.platformViolationCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                  {profile.platformViolationCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab profile={profile} />
      )}
      
      {activeTab === 'badges' && (
        <BadgesTab 
          profile={profile} 
          badgeHistory={badgeHistory} 
          onRevokeBadge={(badge) => handleActionClick('revoke_badge', badge)}
          isLoading={isLoading}
        />
      )}
      
      {activeTab === 'violations' && (
        <ViolationsTab violations={violations} />
      )}
      
      {activeTab === 'audit' && (
        <AuditTrail events={auditEvents} showMetadata={true} />
      )}

      {/* Action confirmation dialog */}
      <ReasonDialog
        open={actionDialogOpen}
        onOpenChange={(open) => {
          setActionDialogOpen(open);
          if (!open) {
            setPendingAction(null);
            setSelectedBadge(null);
          }
        }}
        onConfirm={handleActionConfirm}
        title={getActionTitle()}
        description="This action will be logged to the audit trail. Please provide a reason."
        actionLabel="Confirm"
      />
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ profile }: { profile: AgentTrustProfile }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Trust Level Card */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Trust Level
        </h3>
        <div className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
          TRUST_LEVEL_CONFIG[profile.trustLevel].color
        )}>
          {TRUST_LEVEL_CONFIG[profile.trustLevel].label}
        </div>
        <p className="text-sm text-muted-foreground">
          {TRUST_LEVEL_CONFIG[profile.trustLevel].description}
        </p>
      </div>

      {/* Platform Protection Card */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Platform Protection
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{profile.platformProtectionScore}%</span>
            {profile.platformProtectionEligible ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                <CheckCircle className="h-3 w-3" /> Eligible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                <XCircle className="h-3 w-3" /> Not Eligible
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={cn(
                'h-2 rounded-full',
                profile.platformProtectionScore >= 80 ? 'bg-green-500' :
                profile.platformProtectionScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${profile.platformProtectionScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Verification Status Card */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Verification Status
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Identity Verified</span>
            {profile.identityVerified ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Bank Verified</span>
            {profile.bankVerified ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
        </div>
      </div>

      {/* Performance Stats Card */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Stats
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{profile.totalBookingsCompleted}</p>
            <p className="text-xs text-muted-foreground">Completed Bookings</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.totalProposalsSubmitted}</p>
            <p className="text-xs text-muted-foreground">Proposals Sent</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.totalBookingsCancelled}</p>
            <p className="text-xs text-muted-foreground">Cancellations</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.platformViolationCount}</p>
            <p className="text-xs text-muted-foreground">Violations</p>
          </div>
        </div>
      </div>

      {/* Rating Card */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Star className="h-5 w-5" />
          Rating
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            <span className="text-2xl font-bold">{profile.averageRating.toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground">({profile.ratingCount} reviews)</span>
        </div>
      </div>

      {/* Response Time Card */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Response Time
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">P50 (Median)</span>
            <span className="font-medium">{Math.round(profile.responseTimeP50 / 60)}min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">P90</span>
            <span className="font-medium">{Math.round(profile.responseTimeP90 / 60)}min</span>
          </div>
        </div>
      </div>

      {/* Current Badges Card */}
      <div className="bg-card rounded-lg border p-6 space-y-4 md:col-span-2 lg:col-span-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="h-5 w-5" />
          Current Badges
        </h3>
        {profile.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <div
                key={badge}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm',
                  BADGE_CONFIG[badge].color
                )}
                title={BADGE_CONFIG[badge].description}
              >
                {BADGE_CONFIG[badge].icon}
                {BADGE_CONFIG[badge].label}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No badges earned yet</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// BADGES TAB
// ============================================================================

interface BadgesTabProps {
  profile: AgentTrustProfile;
  badgeHistory: readonly BadgeHistoryEntry[];
  onRevokeBadge: (badge: Badge) => void;
  isLoading?: boolean;
}

function BadgesTab({ profile, badgeHistory, onRevokeBadge, isLoading }: BadgesTabProps) {
  return (
    <div className="space-y-6">
      {/* Current badges with revoke option */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Current Badges</h3>
        {profile.badges.length > 0 ? (
          <div className="space-y-3">
            {profile.badges.map((badge) => (
              <div
                key={badge}
                className="flex items-center justify-between p-4 bg-card rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    BADGE_CONFIG[badge].color
                  )}>
                    {BADGE_CONFIG[badge].icon}
                  </div>
                  <div>
                    <p className="font-medium">{BADGE_CONFIG[badge].label}</p>
                    <p className="text-sm text-muted-foreground">{BADGE_CONFIG[badge].description}</p>
                  </div>
                </div>
                <button
                  onClick={() => onRevokeBadge(badge)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                  disabled={isLoading}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No active badges</p>
        )}
      </div>

      {/* Badge history */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Badge History</h3>
        {badgeHistory.length > 0 ? (
          <div className="space-y-2">
            {badgeHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {entry.action === 'assigned' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {BADGE_CONFIG[entry.badge].label} - {entry.action === 'assigned' ? 'Assigned' : 'Revoked'}
                    </p>
                    <p className="text-sm text-muted-foreground">{entry.reason}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p>{formatRelativeTime(entry.timestamp)}</p>
                  <p className="text-muted-foreground">
                    {entry.automatic ? 'Automatic' : `Admin: ${entry.adminId}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No badge history</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// VIOLATIONS TAB
// ============================================================================

function ViolationsTab({ violations }: { violations: readonly ViolationEntry[] }) {
  const severityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    low: { color: 'bg-gray-100 text-gray-800', icon: <Info className="h-4 w-4" /> },
    medium: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="h-4 w-4" /> },
    high: { color: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="h-4 w-4" /> },
    critical: { color: 'bg-red-100 text-red-800', icon: <AlertOctagon className="h-4 w-4" /> },
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Violation Timeline</h3>
      {violations.length > 0 ? (
        <div className="space-y-3">
          {violations.map((violation) => (
            <div
              key={violation.id}
              className={cn(
                'p-4 rounded-lg border',
                violation.resolvedAt ? 'bg-muted/30' : 'bg-card'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    severityConfig[violation.severity].color
                  )}>
                    {severityConfig[violation.severity].icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{violation.type.replace(/_/g, ' ')}</p>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs',
                        severityConfig[violation.severity].color
                      )}>
                        {violation.severity}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{violation.description}</p>
                    {violation.bookingId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Booking: {violation.bookingId}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p>{formatDateTime(violation.timestamp)}</p>
                  {violation.resolvedAt ? (
                    <p className="text-green-600">
                      Resolved {formatRelativeTime(violation.resolvedAt)}
                    </p>
                  ) : (
                    <p className="text-red-600">Unresolved</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No violations recorded</p>
        </div>
      )}
    </div>
  );
}
