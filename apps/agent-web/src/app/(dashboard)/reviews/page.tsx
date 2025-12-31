'use client';

import { useState } from 'react';
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
} from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockReviews = [
  {
    id: 'rev-1',
    client: { firstName: 'Amit', lastName: 'Patel' },
    destination: 'Andaman Islands',
    tripId: 'BK-2024-079',
    rating: 5,
    title: 'Absolutely Perfect Trip!',
    content: 'Our agent exceeded all expectations. Every detail was meticulously planned, from the beach resort to the scuba diving experience. The local seafood restaurant recommendations were spot-on, and the sunset at Radhanagar Beach was unforgettable.',
    aspects: {
      communication: 5,
      knowledge: 5,
      valueForMoney: 5,
      responsiveness: 5,
    },
    createdAt: '2024-10-15',
    tripDate: '2024-10-01',
    helpful: 12,
    response: {
      content: 'Thank you so much for your kind words, Amit! It was a pleasure planning your Andaman adventure. I hope to help you with your next trip soon!',
      createdAt: '2024-10-16',
    },
  },
  {
    id: 'rev-2',
    client: { firstName: 'Rahul', lastName: 'Verma' },
    destination: 'Ladakh, India',
    tripId: 'BK-2024-082',
    rating: 5,
    title: 'Family Trip of a Lifetime',
    content: 'Traveling with kids to Ladakh seemed daunting, but our agent made it seamless. The mix of adventure activities with cultural experiences was perfect. Pangong Lake was a highlight, and the local Ladakhi cuisine in Leh was amazing.',
    aspects: {
      communication: 5,
      knowledge: 5,
      valueForMoney: 4,
      responsiveness: 5,
    },
    createdAt: '2024-12-05',
    tripDate: '2024-11-20',
    helpful: 8,
    response: null,
  },
  {
    id: 'rev-3',
    client: { firstName: 'Sneha', lastName: 'Gupta' },
    destination: 'Ranthambore Safari',
    tripId: 'BK-2024-085',
    rating: 4,
    title: 'Great Safari Experience',
    content: 'The safari experience was incredible - we spotted tigers on our very first safari! The luxury resort was beyond expectations. Only minor hiccup was some vehicle issues that caused a delay, but the agent handled it professionally.',
    aspects: {
      communication: 4,
      knowledge: 5,
      valueForMoney: 4,
      responsiveness: 4,
    },
    createdAt: '2024-03-15',
    tripDate: '2024-03-01',
    helpful: 6,
    response: {
      content: 'Thank you for the wonderful review, Sneha! I apologize for the vehicle delay - it was beyond our control but I\'m glad we could adjust the itinerary smoothly. Looking forward to your next adventure!',
      createdAt: '2024-03-16',
    },
  },
  {
    id: 'rev-4',
    client: { firstName: 'Priya', lastName: 'Sharma' },
    destination: 'Rajasthan, India',
    tripId: 'BK-2024-087',
    rating: 5,
    title: 'Romantic Rajasthan Getaway',
    content: 'This trip was for our anniversary and it couldn\'t have been more perfect. The heritage haveli in Udaipur was charming, the private palace dinner was magical, and the desert camp in Jaisalmer was a dream.',
    aspects: {
      communication: 5,
      knowledge: 5,
      valueForMoney: 5,
      responsiveness: 5,
    },
    createdAt: '2024-02-20',
    tripDate: '2024-02-10',
    helpful: 15,
    response: null,
  },
];

const ratingDistribution = [
  { stars: 5, count: 42, percentage: 78 },
  { stars: 4, count: 8, percentage: 15 },
  { stars: 3, count: 3, percentage: 5 },
  { stars: 2, count: 1, percentage: 2 },
  { stars: 1, count: 0, percentage: 0 },
];

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

function RatingOverview() {
  const averageRating = 4.8;
  const totalReviews = 54;

  return (
    <Card className="p-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Average Rating */}
        <div className="text-center lg:text-left lg:pr-8 lg:border-r lg:border-gray-100">
          <div className="text-5xl font-bold text-gray-900 mb-2">{averageRating}</div>
          <RatingStars rating={Math.round(averageRating)} size="md" />
          <p className="text-sm text-gray-500 mt-2">{totalReviews} reviews</p>
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
            <p className="text-2xl font-bold text-emerald-700">92%</p>
            <p className="text-xs text-emerald-600">Would recommend</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-indigo-50">
            <TrendingUp className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-indigo-700">+0.2</p>
            <p className="text-xs text-indigo-600">vs. last quarter</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReviewCard({ review, onRespond }: { review: typeof mockReviews[0]; onRespond: () => void }) {
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
// MAIN PAGE
// ============================================================================

export default function ReviewsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const filteredReviews = mockReviews.filter((review) => {
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

  const pendingCount = mockReviews.filter((r) => !r.response).length;

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
      <RatingOverview />

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
