'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  MapPin,
  TrendingUp,
  Award,
  Filter,
  ChevronDown,
  Flag,
  MoreVertical,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Avatar,
  AvatarFallback,
  Progress,
  Skeleton,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { listAgentReviews, type AgentReview } from '@/lib/data/agent';

// ============================================================================
// TYPES
// ============================================================================

type ReviewCardData = {
  id: string;
  client: { firstName: string; lastName: string };
  destination: string;
  tripId: string | null;
  rating: number;
  title: string;
  content: string;
  aspects: {
    communication: number;
    knowledge: number;
    valueForMoney: number;
    responsiveness: number;
  };
  createdAt: string;
  tripDate: string;
  helpful: number;
  response: {
    content: string;
    createdAt: string;
  } | null;
};

type RatingDistribution = {
  stars: number;
  count: number;
  percentage: number;
};

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

function transformReviewToCard(review: AgentReview): ReviewCardData {
  // Parse reviewer name from display name or use placeholder
  const nameParts = (review.reviewerDisplayName || 'Verified Traveler').split(' ');
  const firstName = nameParts[0] || 'Verified';
  const lastName = nameParts.slice(1).join(' ') || 'Traveler';

  return {
    id: review.id,
    client: { firstName, lastName },
    destination: review.destination || 'Trip',
    tripId: review.bookingId,
    rating: review.rating,
    title: review.title || 'Review',
    content: review.content || '',
    aspects: {
      communication: review.aspects?.communication ?? review.rating,
      knowledge: review.aspects?.knowledge ?? review.rating,
      valueForMoney: review.aspects?.valueForMoney ?? review.rating,
      responsiveness: review.aspects?.responsiveness ?? review.rating,
    },
    createdAt: review.createdAt,
    tripDate: review.publishedAt || review.createdAt,
    helpful: 0, // Not tracked in current API
    response: review.response,
  };
}

function calculateRatingDistribution(reviews: ReviewCardData[]): RatingDistribution[] {
  const counts = [0, 0, 0, 0, 0]; // 1-5 stars
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      counts[r.rating - 1]++;
    }
  });
  const total = reviews.length || 1;

  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars - 1],
    percentage: Math.round((counts[stars - 1] / total) * 100),
  }));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClasses[size],
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-200 text-gray-200'
          )}
        />
      ))}
    </div>
  );
}

function RatingOverview({ reviews, ratingDistribution }: { reviews: ReviewCardData[]; ratingDistribution: RatingDistribution[] }) {
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : 0;
  
  // Calculate "would recommend" as percentage of 4+ star reviews
  const wouldRecommend = totalReviews > 0
    ? Math.round((reviews.filter((r) => r.rating >= 4).length / totalReviews) * 100)
    : 0;

  return (
    <Card className="p-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Average Rating */}
        <div className="text-center lg:text-left lg:pr-8 lg:border-r lg:border-gray-100">
          <div className="text-5xl font-bold text-gray-900 mb-2">{averageRating || '-'}</div>
          <RatingStars rating={Math.round(averageRating)} size="md" />
          <p className="text-sm text-gray-500 mt-2">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-2">
          {ratingDistribution.map((item) => (
            <div key={item.stars} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-12">{item.stars} star</span>
              <Progress value={item.percentage} className="flex-1 h-2" />
              <span className="text-sm text-gray-500 w-12 text-right">{item.count}</span>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 lg:pl-8 lg:border-l lg:border-gray-100">
          <div className="text-center p-4 rounded-lg bg-emerald-50">
            <Award className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-700">{wouldRecommend}%</p>
            <p className="text-xs text-emerald-600">Would recommend</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-indigo-50">
            <TrendingUp className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-indigo-700">{totalReviews}</p>
            <p className="text-xs text-indigo-600">Total reviews</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReviewCard({ review, onRespond }: { review: ReviewCardData; onRespond: () => void }) {
  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <Avatar size="md">
              <AvatarFallback>
                {review.client.firstName[0]}{review.client.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">
                  {review.client.firstName} {review.client.lastName}
                </h4>
                <Badge variant="secondary" className="text-xs">Verified Trip</Badge>
              </div>
              <p className="text-sm text-gray-500">
                {review.destination} • {formatDate(review.tripDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RatingStars rating={review.rating} />
            <button className="text-gray-400 hover:text-gray-600 p-1">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Review Content */}
        <h3 className="font-medium text-gray-900 mb-2">{review.title}</h3>
        <p className="text-gray-600 mb-4 leading-relaxed">{review.content}</p>

        {/* Aspect Ratings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Communication</p>
            <RatingStars rating={review.aspects.communication} size="sm" />
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Knowledge</p>
            <RatingStars rating={review.aspects.knowledge} size="sm" />
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Value</p>
            <RatingStars rating={review.aspects.valueForMoney} size="sm" />
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Responsiveness</p>
            <RatingStars rating={review.aspects.responsiveness} size="sm" />
          </div>
        </div>

        {/* Agent Response */}
        {review.response ? (
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="info" className="text-xs">Your Response</Badge>
              <span className="text-xs text-gray-500">{getRelativeTime(review.response.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-700">{review.response.content}</p>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">No response yet</span>
            </div>
            <Button size="sm" variant="outline" onClick={onRespond}>
              Respond
            </Button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{getRelativeTime(review.createdAt)}</span>
            <button className="flex items-center gap-1 hover:text-gray-700">
              <ThumbsUp className="h-4 w-4" />
              {review.helpful} found helpful
            </button>
          </div>
          <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500">
            <Flag className="h-4 w-4" />
            Report
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function ReviewCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-5 w-64 mb-2" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ReviewsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reviews on mount
  useEffect(() => {
    async function loadReviews() {
      try {
        setIsLoading(true);
        setError(null);
        const apiReviews = await listAgentReviews();
        setReviews(apiReviews.map(transformReviewToCard));
      } catch (err) {
        console.error('Failed to load reviews:', err);
        setError('Failed to load reviews. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    loadReviews();
  }, []);

  const ratingDistribution = calculateRatingDistribution(reviews);

  const filteredReviews = reviews.filter((review) => {
    if (activeTab === 'responded' && !review.response) return false;
    if (activeTab === 'pending' && review.response) return false;
    if (activeTab === '5star' && review.rating !== 5) return false;
    return true;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      case 'helpful':
        return b.helpful - a.helpful;
      default:
        return 0;
    }
  });

  const pendingCount = reviews.filter((r) => !r.response).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Reviews</h1>
          <p className="mt-1 text-gray-500">
            See what your clients are saying about their trips
          </p>
        </div>
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:pr-8">
              <Skeleton className="h-16 w-16 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-96" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Reviews</h1>
          <p className="mt-1 text-gray-500">
            See what your clients are saying about their trips
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error loading reviews</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Reviews</h1>
        <p className="mt-1 text-gray-500">
          See what your clients are saying about their trips
        </p>
      </div>

      {/* Rating Overview */}
      <RatingOverview reviews={reviews} ratingDistribution={ratingDistribution} />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Reviews</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending Response
                  {pendingCount > 0 && (
                    <Badge variant="warning" className="ml-2">{pendingCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="responded">Responded</TabsTrigger>
                <TabsTrigger value="5star">5 Star</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="highest">Highest Rated</SelectItem>
                <SelectItem value="lowest">Lowest Rated</SelectItem>
                <SelectItem value="helpful">Most Helpful</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {sortedReviews.length > 0 ? (
        <div className="space-y-4">
          {sortedReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onRespond={() => {
                router.push('/messages');
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Star className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews found</h3>
            <p className="text-gray-500">
              {activeTab === 'pending'
                ? 'All reviews have been responded to!'
                : 'Reviews from your clients will appear here'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
