'use client';

import { useState } from 'react';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CheckCircle,
  Sparkles,
  User,
  Clock,
  Handshake,
  Heart,
  X,
} from 'lucide-react';
import { Button, Card, CardContent, Badge, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type UserReviewData = {
  rating: number;
  categories: {
    communication: number;
    cooperation: number;
    punctuality: number;
    respectfulness: number;
  };
  wouldWorkAgain: boolean | null;
  comment: string;
  quickTags: string[];
};

interface UserReviewExperienceProps {
  travelerName: string;
  destination: string;
  tripDates: string;
  onSubmit: (data: UserReviewData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_TAGS = [
  { id: 'clear_communicator', label: 'Clear Communicator', icon: MessageSquare },
  { id: 'flexible', label: 'Flexible', icon: Handshake },
  { id: 'punctual', label: 'Always On Time', icon: Clock },
  { id: 'respectful', label: 'Respectful', icon: Heart },
  { id: 'decisive', label: 'Quick Decision Maker', icon: CheckCircle },
  { id: 'prepared', label: 'Well Prepared', icon: Star },
];

const CATEGORY_CONFIG = [
  { key: 'communication', label: 'Communication', icon: MessageSquare, description: 'How well did they communicate their needs?' },
  { key: 'cooperation', label: 'Cooperation', icon: Handshake, description: 'Were they easy to work with?' },
  { key: 'punctuality', label: 'Punctuality', icon: Clock, description: 'Did they respond and make decisions promptly?' },
  { key: 'respectfulness', label: 'Respectfulness', icon: Heart, description: 'Were they respectful of your time and expertise?' },
] as const;

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StarRatingInput({
  value,
  onChange,
  size = 'lg',
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hoverValue, setHoverValue] = useState(0);
  const sizeClasses = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-12 w-12' };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors duration-150',
                (hoverValue || value) >= star
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200 hover:fill-amber-200 hover:text-amber-200'
              )}
            />
          </button>
        ))}
      </div>
      {(hoverValue || value) > 0 && (
        <span className={cn(
          'text-sm font-medium transition-opacity',
          hoverValue || value >= 4 ? 'text-emerald-600' : hoverValue || value >= 3 ? 'text-amber-600' : 'text-orange-600'
        )}>
          {RATING_LABELS[hoverValue || value]}
        </span>
      )}
    </div>
  );
}

function CategorySlider({
  label,
  description,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <span className="font-medium text-sm">{label}</span>
        </div>
        <span className="text-sm font-semibold text-blue-600">{value}/5</span>
      </div>
      <p className="text-xs text-slate-500">{description}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'flex-1 h-2 rounded-full transition-all',
              n <= value ? 'bg-blue-500' : 'bg-slate-200 hover:bg-slate-300'
            )}
          />
        ))}
      </div>
    </div>
  );
}

function QuickTagSelector({
  selectedTags,
  onToggle,
}: {
  selectedTags: string[];
  onToggle: (tagId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_TAGS.map((tag) => {
        const isSelected = selectedTags.includes(tag.id);
        const Icon = tag.icon;
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              isSelected
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tag.label}
            {isSelected && <CheckCircle className="h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
}

function WouldWorkAgainToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all',
          value === true
            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
        )}
      >
        <ThumbsUp className={cn('h-5 w-5', value === true && 'fill-emerald-500')} />
        <span className="font-medium">Yes, definitely!</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all',
          value === false
            ? 'border-orange-500 bg-orange-50 text-orange-700'
            : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
        )}
      >
        <ThumbsDown className={cn('h-5 w-5', value === false && 'fill-orange-500')} />
        <span className="font-medium">Maybe not</span>
      </button>
    </div>
  );
}

function ProgressIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            step === currentStep ? 'w-8 bg-blue-600' : step < currentStep ? 'w-2 bg-blue-400' : 'w-2 bg-slate-200'
          )}
        />
      ))}
    </div>
  );
}

function CelebrationOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in-95 duration-300">
        <div className="relative">
          {/* Confetti-like decorations */}
          <div className="absolute -top-4 -left-4 w-8 h-8 bg-amber-400 rounded-full opacity-80 animate-bounce" />
          <div className="absolute -top-2 -right-6 w-6 h-6 bg-emerald-400 rounded-full opacity-80 animate-bounce delay-100" />
          <div className="absolute top-8 -right-4 w-4 h-4 bg-blue-400 rounded-full opacity-80 animate-bounce delay-200" />
          
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Review Submitted!</h3>
        <p className="text-slate-600 mb-4">
          Thank you for your feedback. Your review helps build a trustworthy community.
        </p>
        
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-emerald-700">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">Professional Badge Earned!</span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            You&apos;ve reviewed 10+ travelers
          </p>
        </div>
        
        <Button onClick={onClose} className="w-full">
          Continue
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UserReviewExperience({
  travelerName,
  destination,
  tripDates,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: UserReviewExperienceProps) {
  const [step, setStep] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const [reviewData, setReviewData] = useState<UserReviewData>({
    rating: 0,
    categories: {
      communication: 3,
      cooperation: 3,
      punctuality: 3,
      respectfulness: 3,
    },
    wouldWorkAgain: null,
    comment: '',
    quickTags: [],
  });

  const totalSteps = 4;
  
  const canProceed = () => {
    switch (step) {
      case 1: return reviewData.rating > 0;
      case 2: return true; // Categories have defaults
      case 3: return reviewData.wouldWorkAgain !== null;
      case 4: return true; // Comment is optional
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    await onSubmit(reviewData);
    setShowCelebration(true);
  };

  const handleToggleTag = (tagId: string) => {
    setReviewData(prev => ({
      ...prev,
      quickTags: prev.quickTags.includes(tagId)
        ? prev.quickTags.filter(t => t !== tagId)
        : [...prev.quickTags, tagId],
    }));
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    onCancel(); // Close the review modal
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              <User className="h-3 w-3 mr-1" />
              Rate Traveler
            </Badge>
            <button onClick={onCancel} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-xl font-bold mb-1">How was working with {travelerName}?</h2>
          <p className="text-blue-100 text-sm">
            {destination} • {tripDates}
          </p>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-slate-50 border-b flex items-center justify-between">
          <ProgressIndicator currentStep={step} totalSteps={totalSteps} />
          <span className="text-sm text-slate-500">Step {step} of {totalSteps}</span>
        </div>

        {/* Content */}
        <CardContent className="p-6">
          {/* Step 1: Overall Rating */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Overall Experience</h3>
                <p className="text-slate-500 text-sm mb-6">
                  How would you rate your overall experience working with this traveler?
                </p>
                <StarRatingInput
                  value={reviewData.rating}
                  onChange={(rating) => setReviewData(prev => ({ ...prev, rating }))}
                />
              </div>
            </div>
          )}

          {/* Step 2: Category Ratings */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Rate Specific Areas</h3>
                <p className="text-slate-500 text-sm">
                  Help other agents know what to expect
                </p>
              </div>
              <div className="space-y-6">
                {CATEGORY_CONFIG.map((category) => (
                  <CategorySlider
                    key={category.key}
                    label={category.label}
                    description={category.description}
                    icon={category.icon}
                    value={reviewData.categories[category.key]}
                    onChange={(value) =>
                      setReviewData(prev => ({
                        ...prev,
                        categories: { ...prev.categories, [category.key]: value },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Would Work Again + Quick Tags */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Would you work with them again?</h3>
                <p className="text-slate-500 text-sm">
                  This helps match travelers with the right agents
                </p>
              </div>
              <WouldWorkAgainToggle
                value={reviewData.wouldWorkAgain}
                onChange={(value) => setReviewData(prev => ({ ...prev, wouldWorkAgain: value }))}
              />
              
              <div className="pt-4 border-t">
                <h4 className="font-medium text-slate-900 mb-3">Quick highlights (optional)</h4>
                <QuickTagSelector
                  selectedTags={reviewData.quickTags}
                  onToggle={handleToggleTag}
                />
              </div>
            </div>
          )}

          {/* Step 4: Written Comment */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Share Your Experience</h3>
                <p className="text-slate-500 text-sm">
                  Write a brief note about working with this traveler (optional)
                </p>
              </div>
              
              <div className="space-y-2">
                <Textarea
                  placeholder="e.g., Great communication throughout the planning process. Very clear about their preferences and responsive to suggestions..."
                  value={reviewData.comment}
                  onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                  className="min-h-[120px] resize-none"
                  maxLength={500}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Keep it professional and constructive</span>
                  <span>{reviewData.comment.length}/500</span>
                </div>
              </div>

              {/* Review Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-slate-900">Review Summary</h4>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'h-4 w-4',
                          star <= reviewData.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{reviewData.rating} stars</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {reviewData.wouldWorkAgain ? (
                    <>
                      <ThumbsUp className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-600">Would work again</span>
                    </>
                  ) : (
                    <>
                      <ThumbsDown className="h-4 w-4 text-orange-600" />
                      <span className="text-orange-600">Might not work again</span>
                    </>
                  )}
                </div>
                {reviewData.quickTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {reviewData.quickTags.map((tagId) => {
                      const tag = QUICK_TAGS.find(t => t.id === tagId);
                      return tag ? (
                        <Badge key={tagId} variant="secondary" className="text-xs">
                          {tag.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          )}
        </div>
      </Card>

      {showCelebration && <CelebrationOverlay onClose={handleCelebrationClose} />}
    </>
  );
}

export default UserReviewExperience;
