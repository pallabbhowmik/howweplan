/**
 * Review Management Component
 * 
 * Admin component for managing reviews with soft-hide capability.
 * All actions are logged to the audit service.
 */

'use client';

import React, { useState } from 'react';
import { formatDateTime, formatRelativeTime, cn } from '@/lib/utils';
import { ReasonDialog } from './reason-dialog';
import {
  Star,
  Eye,
  EyeOff,
  MessageSquare,
  Clock,
  Target,
  ThumbsUp,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface Review {
  readonly reviewId: string;
  readonly bookingId: string;
  readonly agentId: string;
  readonly userId: string;
  readonly userDisplayName: string;
  
  // Ratings
  readonly rating: number;
  readonly planningQuality: number;
  readonly responsiveness: number;
  readonly accuracyVsPromise: number;
  
  // Content
  readonly comment?: string;
  
  // Metadata
  readonly createdAt: string;
  readonly hidden: boolean;
  readonly hiddenAt?: string;
  readonly hiddenBy?: string;
  readonly hiddenReason?: string;
}

interface ReviewManagementProps {
  readonly reviews: readonly Review[];
  readonly onHideReview: (reviewId: string, reason: string) => Promise<void>;
  readonly onUnhideReview: (reviewId: string, reason: string) => Promise<void>;
  readonly isLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReviewManagement({
  reviews,
  onHideReview,
  onUnhideReview,
  isLoading,
}: ReviewManagementProps) {
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [actionType, setActionType] = useState<'hide' | 'unhide'>('hide');

  const handleActionClick = (review: Review, type: 'hide' | 'unhide') => {
    setSelectedReview(review);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const handleActionConfirm = async (reason: string) => {
    if (!selectedReview) return;
    
    if (actionType === 'hide') {
      await onHideReview(selectedReview.reviewId, reason);
    } else {
      await onUnhideReview(selectedReview.reviewId, reason);
    }
    
    setActionDialogOpen(false);
    setSelectedReview(null);
  };

  const visibleReviews = reviews.filter(r => !r.hidden);
  const hiddenReviews = reviews.filter(r => r.hidden);

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Reviews"
          value={reviews.length}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard
          label="Visible Reviews"
          value={visibleReviews.length}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          label="Hidden Reviews"
          value={hiddenReviews.length}
          icon={<EyeOff className="h-5 w-5" />}
          warning={hiddenReviews.length > 0}
        />
        <StatCard
          label="Average Rating"
          value={visibleReviews.length > 0 
            ? (visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length).toFixed(1)
            : 'N/A'}
          icon={<Star className="h-5 w-5" />}
        />
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">All Reviews</h3>
        
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.reviewId}
                review={review}
                onHide={() => handleActionClick(review, 'hide')}
                onUnhide={() => handleActionClick(review, 'unhide')}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action dialog */}
      <ReasonDialog
        isOpen={actionDialogOpen}
        onClose={() => {
          setActionDialogOpen(false);
          setSelectedReview(null);
        }}
        onConfirm={handleActionConfirm}
        title={actionType === 'hide' ? 'Hide Review' : 'Unhide Review'}
        description={
          actionType === 'hide'
            ? 'This review will be hidden from public view. The original content is preserved for audit purposes.'
            : 'This review will be visible to the public again.'
        }
        requireReason={true}
        isLoading={isLoading}
      />
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  warning?: boolean;
}

function StatCard({ label, value, icon, warning }: StatCardProps) {
  return (
    <div className={cn(
      'p-4 rounded-lg border bg-card',
      warning && 'border-yellow-300 bg-yellow-50'
    )}>
      <div className="flex items-center justify-between">
        <span className={cn(
          'text-muted-foreground',
          warning && 'text-yellow-700'
        )}>{icon}</span>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================================================
// REVIEW CARD
// ============================================================================

interface ReviewCardProps {
  review: Review;
  onHide: () => void;
  onUnhide: () => void;
  isLoading?: boolean;
}

function ReviewCard({ review, onHide, onUnhide, isLoading }: ReviewCardProps) {
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      review.hidden ? 'bg-red-50 border-red-200' : 'bg-card'
    )}>
      {/* Hidden banner */}
      {review.hidden && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700 font-medium">
            Hidden by {review.hiddenBy} - {review.hiddenReason}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{review.userDisplayName}</p>
            <p className="text-sm text-muted-foreground">Booking: {review.bookingId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <span className="font-bold">{review.rating}</span>
          </div>
          
          {review.hidden ? (
            <button
              onClick={onUnhide}
              className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
              disabled={isLoading}
            >
              <Eye className="h-4 w-4 inline mr-1" />
              Unhide
            </button>
          ) : (
            <button
              onClick={onHide}
              className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
              disabled={isLoading}
            >
              <EyeOff className="h-4 w-4 inline mr-1" />
              Hide
            </button>
          )}
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <RatingItem
          label="Planning Quality"
          value={review.planningQuality}
          icon={<Target className="h-4 w-4" />}
        />
        <RatingItem
          label="Responsiveness"
          value={review.responsiveness}
          icon={<Clock className="h-4 w-4" />}
        />
        <RatingItem
          label="Accuracy vs Promise"
          value={review.accuracyVsPromise}
          icon={<ThumbsUp className="h-4 w-4" />}
        />
      </div>

      {/* Comment */}
      {review.comment && (
        <div className="mt-4 p-3 bg-muted/50 rounded">
          <p className="text-sm italic">"{review.comment}"</p>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>{formatDateTime(review.createdAt)}</span>
        <span>•</span>
        <span>{formatRelativeTime(review.createdAt)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// RATING ITEM
// ============================================================================

interface RatingItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function RatingItem({ label, value, icon }: RatingItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'h-3 w-3',
                star <= value ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
