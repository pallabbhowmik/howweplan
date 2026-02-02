'use client';

/**
 * Agent Profile Card Component
 * 
 * Displays comprehensive agent profile information including:
 * - Ratings and reviews
 * - Response time metrics
 * - Specializations and badges
 * - Trust indicators
 * - Traveler remarks highlights
 * 
 * Used in proposals list to help travelers make informed decisions.
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  Clock,
  CheckCircle,
  Shield,
  Award,
  TrendingUp,
  Users,
  Zap,
  MessageCircle,
  Globe,
  ThumbsUp,
  Heart,
  Sparkles,
  MapPin,
  Calendar,
  Quote,
  ChevronRight,
  BadgeCheck,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentReview {
  id: string;
  rating: number;
  title: string;
  content: string;
  tripType: string;
  destination: string;
  createdAt: string;
  helpful: number;
  travelerName?: string;
}

export interface AgentStats {
  totalTripsPlanned: number;
  repeatClients: number;
  averageResponseMinutes: number;
  onTimeDeliveryRate: number;
  satisfactionRate: number;
}

export interface AgentProfile {
  id: string;
  displayName: string;
  avatarInitials?: string;
  bio: string;
  specializations: string[];
  languages: string[];
  destinations: string[];
  yearsOfExperience: number;
  tier: 'star' | 'bench' | 'premium';
  rating: number;
  totalReviews: number;
  completedBookings: number;
  responseTimeMinutes: number;
  isVerified: boolean;
  badges: string[];
  stats: AgentStats;
  highlightedReviews?: AgentReview[];
  strengthTags?: string[];
}

export interface AgentProfileCardProps {
  agent: AgentProfile;
  proposalPrice?: number;
  currency?: string;
  variant?: 'full' | 'compact' | 'mini';
  onSelect?: () => void;
  onViewDetails?: () => void;
  isSelected?: boolean;
  className?: string;
}

// =============================================================================
// BADGE CONFIGURATION
// =============================================================================

const BADGE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; description: string }> = {
  'VERIFIED': {
    label: 'Verified Agent',
    icon: BadgeCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    description: 'Identity and credentials verified',
  },
  'TOP_RATED': {
    label: 'Top Rated',
    icon: Star,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    description: 'Consistently rated 4.8+ stars',
  },
  'FAST_RESPONDER': {
    label: 'Lightning Fast',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'Responds within 30 minutes',
  },
  'EXPERT_PLANNER': {
    label: 'Expert Planner',
    icon: Award,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: '50+ successful trips planned',
  },
  'RISING_STAR': {
    label: 'Rising Star',
    icon: TrendingUp,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    description: 'Fast-growing reputation',
  },
  'PLATFORM_TRUSTED': {
    label: 'Platform Trusted',
    icon: Shield,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    description: 'Zero violations, fully insured',
  },
  'REPEAT_FAVORITE': {
    label: 'Repeat Favorite',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    description: 'High repeat client rate',
  },
  'HOT_STREAK': {
    label: 'On Fire!',
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    description: '5+ bookings this month',
  },
};

const TIER_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  'star': { label: 'Star Agent', color: 'text-amber-600', bgColor: 'bg-gradient-to-r from-amber-50 to-yellow-50', icon: Star },
  'premium': { label: 'Premium', color: 'text-purple-600', bgColor: 'bg-gradient-to-r from-purple-50 to-pink-50', icon: Sparkles },
  'bench': { label: 'Verified', color: 'text-slate-600', bgColor: 'bg-slate-50', icon: CheckCircle },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getResponseTimeLabel(minutes: number): { label: string; color: string } {
  if (minutes <= 30) return { label: 'Usually < 30 min', color: 'text-emerald-600' };
  if (minutes <= 60) return { label: 'Usually < 1 hour', color: 'text-blue-600' };
  if (minutes <= 180) return { label: 'Usually < 3 hours', color: 'text-amber-600' };
  return { label: 'May take longer', color: 'text-slate-500' };
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function RatingStars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' };
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClasses[size],
            i < fullStars ? 'fill-amber-400 text-amber-400' :
            i === fullStars && hasHalfStar ? 'fill-amber-400/50 text-amber-400' :
            'text-slate-200'
          )}
        />
      ))}
    </div>
  );
}

function StatBar({ label, value, max = 100, color = 'bg-blue-500' }: { label: string; value: number; max?: number; color?: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ReviewHighlight({ review }: { review: AgentReview }) {
  return (
    <div className="relative bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-4 border border-slate-100">
      <Quote className="absolute top-2 right-2 h-6 w-6 text-blue-200" />
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
          {review.travelerName?.charAt(0) || 'T'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <RatingStars rating={review.rating} size="sm" />
            <span className="text-xs text-muted-foreground">{formatTimeAgo(review.createdAt)}</span>
          </div>
          <p className="text-sm font-medium text-slate-900 mb-1 line-clamp-1">{review.title}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">{review.content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {review.destination}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {review.helpful} found helpful
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AgentProfileCard({
  agent,
  proposalPrice,
  currency = 'INR',
  variant = 'full',
  onSelect,
  onViewDetails,
  isSelected = false,
  className,
}: AgentProfileCardProps) {
  const tierConfig = TIER_CONFIG[agent.tier] ?? TIER_CONFIG.bench;
  const TierIcon = tierConfig!.icon;
  const responseTime = getResponseTimeLabel(agent.responseTimeMinutes);

  // Compact variant for list views
  if (variant === 'compact') {
    return (
      <Card className={cn(
        'hover:shadow-lg transition-all duration-300 cursor-pointer border-2',
        isSelected ? 'border-blue-500 shadow-blue-100' : 'border-transparent hover:border-blue-200',
        className
      )} onClick={onSelect}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold',
                tierConfig!.bgColor, tierConfig!.color
              )}>
                {agent.avatarInitials || agent.displayName.charAt(0)}
              </div>
              {agent.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 truncate">{agent.displayName}</h3>
                <Badge variant="outline" className={cn('text-xs', tierConfig!.color)}>
                  <TierIcon className="h-3 w-3 mr-1" />
                  {tierConfig!.label}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <RatingStars rating={agent.rating} size="sm" />
                  <span className="font-medium text-sm">{agent.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({agent.totalReviews})</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {agent.specializations.slice(0, 3).map((spec) => (
                  <Badge key={spec} variant="secondary" className="text-xs px-2 py-0">{spec}</Badge>
                ))}
              </div>
            </div>

            {/* Price */}
            {proposalPrice && (
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  ₹{proposalPrice.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground">total price</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant with all details
  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-300',
      isSelected ? 'ring-2 ring-blue-500 shadow-xl' : 'hover:shadow-xl',
      className
    )}>
      {/* Header with gradient */}
      <CardHeader className={cn('relative pb-4', tierConfig!.bgColor)}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg',
              'bg-white', tierConfig!.color
            )}>
              {agent.avatarInitials || agent.displayName.charAt(0)}
            </div>
            {agent.isVerified && (
              <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                <BadgeCheck className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-slate-900">{agent.displayName}</h3>
              <Badge className={cn('text-xs', tierConfig!.bgColor, tierConfig!.color, 'border-current')}>
                <TierIcon className="h-3 w-3 mr-1" />
                {tierConfig!.label}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{agent.bio}</p>

            {/* Quick Stats Row */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <RatingStars rating={agent.rating} />
                <span className="font-semibold">{agent.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({agent.totalReviews} reviews)</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className={responseTime.color}>{responseTime.label}</span>
              </div>
            </div>
          </div>

          {/* Price (if provided) */}
          {proposalPrice && (
            <div className="text-right bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">
                ₹{proposalPrice.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground">Total Price</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Badges Row */}
        {agent.badges && agent.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              {agent.badges.map((badgeKey) => {
                const badge = BADGE_CONFIG[badgeKey];
                if (!badge) return null;
                const Icon = badge.icon;
                return (
                  <Tooltip key={badgeKey}>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-help',
                        badge.bgColor, badge.color
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                        {badge.label}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{badge.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{agent.completedBookings}</p>
            <p className="text-xs text-muted-foreground mt-1">Trips Completed</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{agent.stats?.satisfactionRate || 98}%</p>
            <p className="text-xs text-muted-foreground mt-1">Satisfaction Rate</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">Performance Metrics</h4>
          <StatBar label="On-Time Delivery" value={agent.stats?.onTimeDeliveryRate || 95} color="bg-emerald-500" />
          <StatBar label="Response Rate" value={98} color="bg-blue-500" />
          <StatBar label="Repeat Clients" value={Math.min((agent.stats?.repeatClients || 0) * 10, 100)} color="bg-purple-500" />
        </div>

        {/* Specializations */}
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Specializations</h4>
          <div className="flex flex-wrap gap-2">
            {agent.specializations.map((spec) => (
              <Badge key={spec} variant="outline" className="text-xs">{spec}</Badge>
            ))}
          </div>
        </div>

        {/* Destinations */}
        {agent.destinations && agent.destinations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Expert Destinations
            </h4>
            <div className="flex flex-wrap gap-2">
              {agent.destinations.slice(0, 5).map((dest) => (
                <Badge key={dest} variant="secondary" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {dest}
                </Badge>
              ))}
              {agent.destinations.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{agent.destinations.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Highlighted Reviews */}
        {agent.highlightedReviews && agent.highlightedReviews.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              What Travelers Say
            </h4>
            <div className="space-y-3">
              {agent.highlightedReviews.slice(0, 2).map((review) => (
                <ReviewHighlight key={review.id} review={review} />
              ))}
            </div>
          </div>
        )}

        {/* Strength Tags */}
        {agent.strengthTags && agent.strengthTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {agent.strengthTags.map((tag) => (
              <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                ✨ {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-slate-50 p-4 flex gap-3">
        {onViewDetails && (
          <Button variant="outline" className="flex-1" onClick={onViewDetails}>
            View Full Profile
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
        {onSelect && (
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={onSelect}>
            {isSelected ? 'Selected ✓' : 'Select This Agent'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function AgentProfileCardSkeleton({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-5 bg-slate-200 rounded w-16" />
                <div className="h-5 bg-slate-200 rounded w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-pulse overflow-hidden">
      <CardHeader className="bg-slate-100 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex gap-2">
          <div className="h-6 bg-slate-200 rounded-full w-24" />
          <div className="h-6 bg-slate-200 rounded-full w-24" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-slate-200 rounded-xl" />
          <div className="h-24 bg-slate-200 rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-slate-200 rounded w-full" />
          <div className="h-2 bg-slate-200 rounded w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default AgentProfileCard;
