'use client';

/**
 * Agent Option Card Component
 * 
 * Displays agent reputation without revealing identity (pre-payment).
 * 
 * PRIVACY RULES ENFORCED:
 * - NO name, company, phone, email, photo, or links shown
 * - ONLY reputation metrics and badges visible
 * - Clear messaging about post-payment reveal
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Star,
  Clock,
  CheckCircle,
  Shield,
  Award,
  TrendingUp,
  Users,
  Zap,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponseTimeIndicator, type ResponseTimeDisplay } from './ResponseTimeIndicator';

// =============================================================================
// TYPES (mirrors shared types)
// =============================================================================

export type TrustLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export type AgentBadge =
  | 'VERIFIED_AGENT'
  | 'PLATFORM_TRUSTED'
  | 'TOP_PLANNER'
  | 'ON_TIME_EXPERT'
  | 'NEWLY_VERIFIED';

export type ResponseTimeLabel = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'SLOW' | null;

export type ProposalActivityLevel = 'NEW' | 'ACTIVE' | 'VERY_ACTIVE' | 'TOP_PERFORMER';

export interface AgentPublicProfile {
  agentId: string;
  averageRating: number | null;
  ratingCount: number;
  completedBookings: number;
  proposalActivityLevel: ProposalActivityLevel;
  responseTimeLabel: ResponseTimeLabel;
  trustLevel: TrustLevel;
  badges: AgentBadge[];
  platformProtectionEligible: boolean;
  specializations: string[];
  isVerified: boolean;
  /** New: Enhanced response time metrics */
  responseTimeMetrics?: ResponseTimeDisplay | null;
}

export interface AgentOptionCardProps {
  agent: AgentPublicProfile;
  proposalPrice?: number;
  currency?: string;
  onSelect?: (agentId: string) => void;
  isSelected?: boolean;
  className?: string;
  /** Show enhanced response time indicator */
  showEnhancedResponseTime?: boolean;
}

// =============================================================================
// BADGE CONFIGURATION
// =============================================================================

const BADGE_CONFIG: Record<AgentBadge, { label: string; icon: React.ElementType; color: string; tooltip: string }> = {
  VERIFIED_AGENT: {
    label: 'Verified',
    icon: CheckCircle,
    color: 'bg-green-500',
    tooltip: 'Identity and payment verified',
  },
  PLATFORM_TRUSTED: {
    label: 'Trusted',
    icon: Shield,
    color: 'bg-blue-500',
    tooltip: '3+ successful bookings with no violations',
  },
  TOP_PLANNER: {
    label: 'Top Planner',
    icon: Award,
    color: 'bg-yellow-500',
    tooltip: 'Consistently rated 4.5+ stars',
  },
  ON_TIME_EXPERT: {
    label: 'Fast Response',
    icon: Zap,
    color: 'bg-purple-500',
    tooltip: 'Responds within 2 hours',
  },
  NEWLY_VERIFIED: {
    label: 'New',
    icon: TrendingUp,
    color: 'bg-teal-500',
    tooltip: 'Newly verified agent building reputation',
  },
};

const TRUST_LEVEL_CONFIG: Record<TrustLevel, { label: string; color: string }> = {
  LEVEL_1: { label: 'Verified', color: 'text-gray-600' },
  LEVEL_2: { label: 'Established', color: 'text-blue-600' },
  LEVEL_3: { label: 'Premier', color: 'text-yellow-600' },
};

const RESPONSE_TIME_CONFIG: Record<NonNullable<ResponseTimeLabel>, { label: string; color: string }> = {
  EXCELLENT: { label: 'Usually responds in < 30 min', color: 'text-green-600' },
  GOOD: { label: 'Usually responds in < 1 hour', color: 'text-blue-600' },
  AVERAGE: { label: 'Usually responds in < 3 hours', color: 'text-yellow-600' },
  SLOW: { label: 'May take longer to respond', color: 'text-gray-500' },
};

const ACTIVITY_LEVEL_CONFIG: Record<ProposalActivityLevel, string> = {
  NEW: 'New to platform',
  ACTIVE: 'Active planner',
  VERY_ACTIVE: 'Highly active',
  TOP_PERFORMER: 'Top performer',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function AgentOptionCard({
  agent,
  proposalPrice,
  currency = 'INR',
  onSelect,
  isSelected = false,
  className,
  showEnhancedResponseTime = true,
}: AgentOptionCardProps) {
  return (
    <Card
      className={cn(
        'relative transition-all duration-200 hover:shadow-lg',
        isSelected && 'ring-2 ring-primary',
        className
      )}
    >
      <CardHeader className="pb-3">
        {/* Trust Level & Activity Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-medium', TRUST_LEVEL_CONFIG[agent.trustLevel].color)}>
              {TRUST_LEVEL_CONFIG[agent.trustLevel].label} Agent
            </span>
            {agent.platformProtectionEligible && (
              <Badge variant="success" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Platform Protected
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {ACTIVITY_LEVEL_CONFIG[agent.proposalActivityLevel]}
          </span>
        </div>

        {/* Star Rating */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="ml-1 font-semibold text-lg">
              {agent.averageRating !== null ? agent.averageRating.toFixed(1) : 'New'}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {agent.ratingCount > 0 ? `(${agent.ratingCount} review${agent.ratingCount !== 1 ? 's' : ''})` : 'No reviews yet'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {agent.completedBookings} booking{agent.completedBookings !== 1 ? 's' : ''} completed
            </span>
          </div>
          {/* Enhanced Response Time Display */}
          {showEnhancedResponseTime && agent.responseTimeMetrics ? (
            <ResponseTimeIndicator
              metrics={agent.responseTimeMetrics}
              variant="compact"
              showTrend={true}
            />
          ) : agent.responseTimeLabel && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={cn('text-sm', RESPONSE_TIME_CONFIG[agent.responseTimeLabel].color)}>
                {RESPONSE_TIME_CONFIG[agent.responseTimeLabel].label}
              </span>
            </div>
          )}
        </div>

        {/* Badges */}
        {agent.badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {agent.badges.map((badge) => {
              const config = BADGE_CONFIG[badge];
              const Icon = config.icon;
              return (
                <div
                  key={badge}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs',
                    config.color
                  )}
                  title={config.tooltip}
                >
                  <Icon className="h-3 w-3" />
                  <span>{config.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Specializations (generic, non-identifying) */}
        {agent.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {agent.specializations.slice(0, 4).map((spec) => (
              <Badge key={spec} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
            {agent.specializations.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{agent.specializations.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Price (if proposal exists) */}
        {proposalPrice && (
          <div className="flex items-center justify-between py-2 border-t">
            <span className="text-sm text-muted-foreground">Proposal Price</span>
            <span className="text-lg font-semibold">
              {currency === 'INR' ? '₹' : '$'}
              {proposalPrice.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-0">
        {/* Privacy Notice */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md w-full">
          <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Agent details are revealed after secure payment confirmation.
          </p>
        </div>

        {/* Action Button */}
        {onSelect && (
          <Button
            onClick={() => onSelect(agent.agentId)}
            variant={isSelected ? 'default' : 'outline'}
            className="w-full"
          >
            {isSelected ? 'Selected' : 'View Proposal'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// =============================================================================
// SKELETON LOADER
// =============================================================================

export function AgentOptionCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-6 w-12 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
        <div className="flex gap-2 mb-4">
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-0">
        <div className="h-12 w-full bg-muted rounded-md" />
        <div className="h-10 w-full bg-muted rounded" />
      </CardFooter>
    </Card>
  );
}

// =============================================================================
// EXPORT
// =============================================================================

export default AgentOptionCard;
