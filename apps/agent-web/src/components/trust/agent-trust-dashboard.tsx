/**
 * Agent Trust Dashboard Component
 * 
 * Shows the agent their current trust status, badges, and what's needed
 * to earn the next badge. Includes explicit warnings about off-platform risks.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Star,
  Clock,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  Info,
  Lock,
  Zap,
  Gift,
  AlertOctagon,
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

/** Agent's view of their own trust profile */
export interface AgentTrustStatus {
  readonly trustLevel: TrustLevel;
  readonly badges: readonly Badge[];
  readonly platformProtectionScore: number;
  readonly platformProtectionEligible: boolean;
  
  // Current stats
  readonly totalBookingsCompleted: number;
  readonly averageRating: number;
  readonly ratingCount: number;
  readonly responseTimeP90: number;
  readonly platformViolationCount: number;
  
  // Verification status
  readonly identityVerified: boolean;
  readonly bankVerified: boolean;
  
  // Progress towards badges
  readonly badgeProgress: readonly BadgeProgress[];
  
  // Active warnings
  readonly activeWarnings: readonly Warning[];
}

export interface BadgeProgress {
  readonly badge: Badge;
  readonly earned: boolean;
  readonly requirements: readonly Requirement[];
  readonly nextSteps?: string;
}

export interface Requirement {
  readonly label: string;
  readonly currentValue: number | boolean;
  readonly targetValue: number | boolean;
  readonly met: boolean;
}

export interface Warning {
  readonly type: 'violation' | 'at_risk' | 'info';
  readonly message: string;
  readonly action?: string;
}

interface AgentTrustDashboardProps {
  readonly status: AgentTrustStatus;
}

// ============================================================================
// BADGE CONFIGURATION
// ============================================================================

const BADGE_CONFIG: Record<Badge, { 
  label: string; 
  icon: React.ReactNode; 
  color: string; 
  earnedColor: string;
  description: string;
  benefits: string[];
}> = {
  VERIFIED_AGENT: {
    label: 'Verified Agent',
    icon: <ShieldCheck className="h-5 w-5" />,
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    earnedColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Complete identity and bank verification',
    benefits: ['Appear in search results', 'Receive travel requests', 'Build reputation'],
  },
  PLATFORM_TRUSTED: {
    label: 'Platform Trusted',
    icon: <Shield className="h-5 w-5" />,
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    earnedColor: 'bg-green-100 text-green-800 border-green-200',
    description: 'Complete 3+ bookings with no violations',
    benefits: ['Higher visibility in matching', 'Platform Protection badge shown to users', 'Priority support'],
  },
  TOP_PLANNER: {
    label: 'Top Planner',
    icon: <Star className="h-5 w-5" />,
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    earnedColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Maintain 4.5+ rating with 5+ reviews',
    benefits: ['Featured placement', 'Premium badge visibility', 'Access to premium requests'],
  },
  ON_TIME_EXPERT: {
    label: 'On-Time Expert',
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    earnedColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Consistently fast response times',
    benefits: ['Response time badge shown to users', 'Higher matching priority'],
  },
  NEWLY_VERIFIED: {
    label: 'Newly Verified',
    icon: <Award className="h-5 w-5" />,
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    earnedColor: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'New agent with verified identity',
    benefits: ['Special visibility for new agents', 'Protected learning period'],
  },
};

const TRUST_LEVEL_CONFIG: Record<TrustLevel, { 
  label: string; 
  color: string; 
  icon: React.ReactNode;
  description: string;
  perks: string[];
}> = {
  LEVEL_1: {
    label: 'Level 1',
    color: 'from-gray-400 to-gray-600',
    icon: <Shield className="h-6 w-6" />,
    description: 'New Agent',
    perks: ['Receive up to 5 requests/day', 'Standard commission rates', 'Email support'],
  },
  LEVEL_2: {
    label: 'Level 2',
    color: 'from-blue-400 to-blue-600',
    icon: <ShieldCheck className="h-6 w-6" />,
    description: 'Established Agent',
    perks: ['Receive up to 15 requests/day', 'Reduced commission rates', 'Priority support'],
  },
  LEVEL_3: {
    label: 'Level 3',
    color: 'from-purple-400 to-purple-600',
    icon: <Award className="h-6 w-6" />,
    description: 'Premium Agent',
    perks: ['Unlimited requests', 'Lowest commission rates', 'Dedicated account manager', 'Early access to features'],
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AgentTrustDashboard({ status }: AgentTrustDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Critical Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertOctagon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Protect Your Reputation</h3>
            <p className="text-sm text-amber-800 mt-1">
              <strong>Off-platform dealings permanently remove platform reputation.</strong>{' '}
              All bookings, payments, and communications must stay on-platform to maintain
              your trust badges and protection eligibility.
            </p>
          </div>
        </div>
      </div>

      {/* Active Warnings */}
      {status.activeWarnings.length > 0 && (
        <div className="space-y-2">
          {status.activeWarnings.map((warning, index) => (
            <WarningBanner key={index} warning={warning} />
          ))}
        </div>
      )}

      {/* Trust Level Card */}
      <TrustLevelCard trustLevel={status.trustLevel} />

      {/* Platform Protection Score */}
      <PlatformProtectionCard 
        score={status.platformProtectionScore}
        eligible={status.platformProtectionEligible}
        violationCount={status.platformViolationCount}
      />

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Completed Bookings"
          value={status.totalBookingsCompleted}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
        />
        <StatCard
          label="Average Rating"
          value={status.averageRating > 0 ? status.averageRating.toFixed(1) : 'N/A'}
          icon={<Star className="h-5 w-5 text-yellow-500" />}
          subtext={status.ratingCount > 0 ? `${status.ratingCount} reviews` : undefined}
        />
        <StatCard
          label="Response Time (P90)"
          value={`${Math.round(status.responseTimeP90 / 60)}min`}
          icon={<Clock className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label="Violations"
          value={status.platformViolationCount}
          icon={<AlertTriangle className={cn(
            'h-5 w-5',
            status.platformViolationCount > 0 ? 'text-red-600' : 'text-green-600'
          )} />}
          warning={status.platformViolationCount > 0}
        />
      </div>

      {/* Badge Progress */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5" />
          Badges & Progress
        </h3>
        
        <div className="grid gap-4">
          {status.badgeProgress.map((progress) => (
            <BadgeProgressCard key={progress.badge} progress={progress} />
          ))}
        </div>
      </div>

      {/* How to Improve */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          How to Improve Your Trust Score
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <ImprovementTip
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            title="Complete More Bookings"
            description="Each completed booking increases your trust level and unlocks new badges."
          />
          <ImprovementTip
            icon={<Star className="h-5 w-5 text-yellow-500" />}
            title="Deliver Excellent Service"
            description="High ratings from travelers unlock the Top Planner badge."
          />
          <ImprovementTip
            icon={<Clock className="h-5 w-5 text-blue-600" />}
            title="Respond Quickly"
            description="Fast response times earn the On-Time Expert badge."
          />
          <ImprovementTip
            icon={<Shield className="h-5 w-5 text-purple-600" />}
            title="Stay On-Platform"
            description="Keep all communications and payments on-platform to maintain eligibility."
          />
        </div>
      </div>

      {/* What to Avoid */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-900">
          <AlertTriangle className="h-5 w-5" />
          Actions That Risk Badge Loss
        </h3>
        
        <ul className="space-y-2 text-sm text-red-800">
          <li className="flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Sharing phone numbers, emails, or UPI IDs in messages</span>
          </li>
          <li className="flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Including external links or contact details in itineraries before payment</span>
          </li>
          <li className="flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Cancelling confirmed bookings without valid reason</span>
          </li>
          <li className="flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Losing disputes due to misrepresentation</span>
          </li>
          <li className="flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Attempting to conduct business outside the platform</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function WarningBanner({ warning }: { warning: Warning }) {
  const config = {
    violation: {
      bg: 'bg-red-50 border-red-200',
      icon: <AlertOctagon className="h-5 w-5 text-red-600" />,
      textColor: 'text-red-800',
    },
    at_risk: {
      bg: 'bg-amber-50 border-amber-200',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      textColor: 'text-amber-800',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <Info className="h-5 w-5 text-blue-600" />,
      textColor: 'text-blue-800',
    },
  }[warning.type];

  return (
    <div className={cn('rounded-lg border p-3 flex items-start gap-3', config.bg)}>
      {config.icon}
      <div className="flex-1">
        <p className={cn('text-sm font-medium', config.textColor)}>{warning.message}</p>
        {warning.action && (
          <p className={cn('text-xs mt-1', config.textColor)}>{warning.action}</p>
        )}
      </div>
    </div>
  );
}

function TrustLevelCard({ trustLevel }: { trustLevel: TrustLevel }) {
  const config = TRUST_LEVEL_CONFIG[trustLevel];
  
  return (
    <div className="relative overflow-hidden rounded-lg border bg-card">
      <div className={cn('absolute inset-0 bg-gradient-to-r opacity-10', config.color)} />
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'p-3 rounded-full bg-gradient-to-r text-white',
              config.color
            )}>
              {config.icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Trust Level</p>
              <h2 className="text-2xl font-bold">{config.label}</h2>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium mb-2">Level Perks:</p>
          <ul className="grid md:grid-cols-2 gap-2">
            {config.perks.map((perk, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gift className="h-4 w-4 text-green-600" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PlatformProtectionCard({ 
  score, 
  eligible,
  violationCount,
}: { 
  score: number; 
  eligible: boolean;
  violationCount: number;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-6',
      eligible ? 'bg-green-50 border-green-200' : 'bg-gray-50'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-full',
            eligible ? 'bg-green-100' : 'bg-gray-200'
          )}>
            <ShieldCheck className={cn(
              'h-6 w-6',
              eligible ? 'text-green-600' : 'text-gray-500'
            )} />
          </div>
          <div>
            <h3 className="font-semibold">Platform Protection Score</h3>
            <p className="text-sm text-muted-foreground">
              {eligible 
                ? 'Eligible for Platform Protection badge'
                : 'Not yet eligible for Platform Protection'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-3xl font-bold">{score}%</p>
          {eligible ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
              <CheckCircle className="h-3 w-3" /> Eligible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
              <Lock className="h-3 w-3" /> Locked
            </span>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={cn(
              'h-3 rounded-full transition-all',
              score >= 80 ? 'bg-green-500' :
              score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>0%</span>
          <span>80% required</span>
          <span>100%</span>
        </div>
      </div>
      
      {violationCount > 0 && (
        <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 inline mr-1" />
          {violationCount} violation{violationCount > 1 ? 's' : ''} affecting your score
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  subtext,
  warning,
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
  subtext?: string;
  warning?: boolean;
}) {
  return (
    <div className={cn(
      'p-4 rounded-lg border bg-card',
      warning && 'border-red-200 bg-red-50'
    )}>
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}

function BadgeProgressCard({ progress }: { progress: BadgeProgress }) {
  const config = BADGE_CONFIG[progress.badge];
  const completedRequirements = progress.requirements.filter(r => r.met).length;
  const totalRequirements = progress.requirements.length;
  const progressPercent = (completedRequirements / totalRequirements) * 100;

  return (
    <div className={cn(
      'p-4 rounded-lg border',
      progress.earned ? config.earnedColor : 'bg-card'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            progress.earned ? config.earnedColor : config.color
          )}>
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{config.label}</h4>
              {progress.earned && (
                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">
                  EARNED
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="mt-4 space-y-2">
        {progress.requirements.map((req, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {req.met ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className={req.met ? 'text-green-700' : 'text-muted-foreground'}>
                {req.label}
              </span>
            </div>
            <span className={cn(
              'font-mono text-xs',
              req.met ? 'text-green-700' : 'text-muted-foreground'
            )}>
              {typeof req.currentValue === 'boolean' 
                ? (req.currentValue ? '✓' : '✗')
                : req.currentValue} / {typeof req.targetValue === 'boolean' 
                  ? (req.targetValue ? '✓' : '—')
                  : req.targetValue}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar for unearned badges */}
      {!progress.earned && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {completedRequirements}/{totalRequirements} requirements met
          </p>
        </div>
      )}

      {/* Next steps */}
      {!progress.earned && progress.nextSteps && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
          <Zap className="h-4 w-4 inline mr-1" />
          {progress.nextSteps}
        </div>
      )}

      {/* Benefits when earned */}
      {progress.earned && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium mb-1">Benefits:</p>
          <ul className="space-y-1">
            {config.benefits.map((benefit, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                <Gift className="h-3 w-3" /> {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ImprovementTip({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
