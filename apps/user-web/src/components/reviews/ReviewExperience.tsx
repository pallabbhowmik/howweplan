'use client';

/**
 * Innovative Review Experience Component
 * 
 * A gamified, engaging review experience featuring:
 * - Step-by-step review wizard with CSS animations
 * - Emoji-based quick reactions
 * - Interactive rating sliders
 * - Highlight memory cards
 * - Trust points earned indicator
 * 
 * No external animation library required - uses Tailwind CSS animations.
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Star,
  ThumbsUp,
  MessageSquare,
  Clock,
  MapPin,
  Smile,
  Meh,
  Frown,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewData {
  overallRating: number;
  categoryRatings: {
    communication: number;
    expertise: number;
    value: number;
    responsiveness: number;
  };
  reactions: string[];
  review: string;
  isAnonymous: boolean;
}

interface ReviewExperienceProps {
  bookingId: string;
  agentId: string;
  agentName: string;
  tripDestination: string;
  tripDates: string;
  onSubmit: (review: ReviewData) => Promise<void>;
  onClose: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATING_CATEGORIES = [
  { key: 'communication', label: 'Communication', icon: MessageSquare, description: 'How well did they communicate?' },
  { key: 'expertise', label: 'Local Expertise', icon: MapPin, description: 'Knowledge of destination' },
  { key: 'value', label: 'Value for Money', icon: Star, description: 'Was it worth the price?' },
  { key: 'responsiveness', label: 'Response Time', icon: Clock, description: 'How quickly did they reply?' },
];

const QUICK_REACTIONS = [
  { id: 'amazing', emoji: '🤩', label: 'Amazing!' },
  { id: 'smooth', emoji: '✨', label: 'Smooth planning' },
  { id: 'helpful', emoji: '💪', label: 'Super helpful' },
  { id: 'creative', emoji: '🎨', label: 'Creative ideas' },
  { id: 'reliable', emoji: '🎯', label: 'Very reliable' },
  { id: 'friendly', emoji: '😊', label: 'Friendly' },
  { id: 'patient', emoji: '🙏', label: 'Patient' },
  { id: 'professional', emoji: '👔', label: 'Professional' },
  { id: 'budget-savvy', emoji: '💰', label: 'Budget-savvy' },
  { id: 'detail-oriented', emoji: '🔍', label: 'Detail-oriented' },
  { id: 'flexible', emoji: '🤸', label: 'Flexible' },
  { id: 'knowledgeable', emoji: '📚', label: 'Knowledgeable' },
];

const REVIEW_PROMPTS = [
  "What made this trip special?",
  "How did your agent go above and beyond?",
  "What would you tell a friend about this experience?",
  "What's your favorite memory from this trip?",
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StarRatingInput({ 
  value, 
  onChange, 
  size = 'lg',
  showLabel = true 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;
  
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];
  const colors = ['', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-lime-500', 'text-emerald-500'];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(null)}
            onClick={() => onChange(star)}
            className="focus:outline-none transform transition-all duration-150 hover:scale-125 active:scale-95"
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-all duration-150',
                star <= displayValue 
                  ? 'fill-amber-400 text-amber-400 drop-shadow-md' 
                  : 'text-slate-200 hover:text-amber-200'
              )}
            />
          </button>
        ))}
      </div>
      {showLabel && displayValue > 0 && (
        <span className={cn('text-lg font-semibold animate-in fade-in duration-200', colors[displayValue])}>
          {labels[displayValue]}
        </span>
      )}
    </div>
  );
}

function EmojiReactionPicker({ 
  reactions, 
  selectedIds, 
  onToggle 
}: { 
  reactions: typeof QUICK_REACTIONS; 
  selectedIds: string[]; 
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {reactions.map((reaction) => {
        const isSelected = selectedIds.includes(reaction.id);
        return (
          <button
            key={reaction.id}
            type="button"
            onClick={() => onToggle(reaction.id)}
            className={cn(
              'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200',
              'hover:scale-105 active:scale-95',
              isSelected 
                ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200' 
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
            )}
          >
            <span className="text-2xl transform transition-transform duration-200 hover:scale-110">
              {reaction.emoji}
            </span>
            <span className="text-xs text-center text-slate-600 font-medium line-clamp-1">
              {reaction.label}
            </span>
            {isSelected && (
              <CheckCircle className="h-4 w-4 text-blue-500 absolute top-1 right-1" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function CategoryRatingSlider({
  category,
  value,
  onChange,
}: {
  category: typeof RATING_CATEGORIES[0];
  value: number;
  onChange: (value: number) => void;
}) {
  const Icon = category.icon;
  const faces = [null, Frown, Frown, Meh, Smile, Smile];
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];
  const FaceIcon = faces[value] || Meh;

  return (
    <div className="space-y-2 p-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium">{category.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {value > 0 && (
            <FaceIcon 
              className={cn(
                'h-5 w-5 transition-all duration-300', 
                value <= 2 ? 'text-red-500' : value === 3 ? 'text-yellow-500' : 'text-emerald-500'
              )} 
            />
          )}
          <span className="text-sm font-bold w-4">{value || '-'}</span>
        </div>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={cn(
              'flex-1 h-3 rounded-full transition-all duration-200 active:scale-95',
              level <= value ? colors[value] : 'bg-slate-200 hover:bg-slate-300'
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{category.description}</p>
    </div>
  );
}

function ProgressIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            index === currentStep ? 'w-8 bg-blue-500' : 'w-2',
            index < currentStep ? 'bg-blue-500' : index > currentStep ? 'bg-slate-200' : ''
          )}
        />
      ))}
    </div>
  );
}

function CelebrationOverlay({ show, onComplete }: { show: boolean; onComplete: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-8 text-center max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-7xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
        <p className="text-slate-600 mb-4">
          Your review helps other travelers find great agents and helps agents improve.
        </p>
        <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-full py-2 px-4">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">+50 Trust Points Earned!</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReviewExperience({
  agentName,
  tripDestination,
  tripDates,
  onSubmit,
  onClose,
}: ReviewExperienceProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  // Review data state
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState({
    communication: 0,
    expertise: 0,
    value: 0,
    responsiveness: 0,
  });
  const [selectedReactions, setSelectedReactions] = useState<string[]>([]);
  const [review, setReview] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const totalSteps = 4;
  const currentPrompt = REVIEW_PROMPTS[promptIndex % REVIEW_PROMPTS.length];

  // Handlers
  const handleReactionToggle = (id: string) => {
    setSelectedReactions(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleCategoryRating = (key: string, value: number) => {
    setCategoryRatings(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return overallRating > 0;
      case 1: return true; // Category ratings optional
      case 2: return true; // Reactions optional
      case 3: return review.length >= 20;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        overallRating,
        categoryRatings,
        reactions: selectedReactions,
        review,
        isAnonymous,
      });
      setShowCelebration(true);
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    onClose();
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 0: // Overall Rating
        return (
          <div key="step-0" className="space-y-8 text-center animate-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                How was your experience with {agentName}?
              </h2>
              <p className="text-slate-600">
                Your trip to <span className="font-medium">{tripDestination}</span> • {tripDates}
              </p>
            </div>

            <StarRatingInput value={overallRating} onChange={setOverallRating} size="lg" />

            {overallRating > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <p className="font-medium text-slate-900">Would you recommend {agentName}?</p>
                <div className="flex justify-center gap-4">
                  <Button
                    variant={wouldRecommend === true ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setWouldRecommend(true)}
                    className={cn(
                      'transition-all duration-200',
                      wouldRecommend === true && 'bg-emerald-500 hover:bg-emerald-600'
                    )}
                  >
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    Yes, definitely!
                  </Button>
                  <Button
                    variant={wouldRecommend === false ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setWouldRecommend(false)}
                    className={cn(
                      'transition-all duration-200',
                      wouldRecommend === false && 'bg-slate-500 hover:bg-slate-600'
                    )}
                  >
                    <ThumbsUp className="h-5 w-5 mr-2 rotate-180" />
                    Not really
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 1: // Category Ratings
        return (
          <div key="step-1" className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Rate specific areas
              </h2>
              <p className="text-slate-600">Help others know what to expect (optional)</p>
            </div>

            <div className="space-y-2">
              {RATING_CATEGORIES.map((category) => (
                <CategoryRatingSlider
                  key={category.key}
                  category={category}
                  value={categoryRatings[category.key as keyof typeof categoryRatings]}
                  onChange={(value) => handleCategoryRating(category.key, value)}
                />
              ))}
            </div>
          </div>
        );

      case 2: // Quick Reactions
        return (
          <div key="step-2" className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Quick reactions ✨
              </h2>
              <p className="text-slate-600">Pick what describes your experience best</p>
            </div>

            <EmojiReactionPicker
              reactions={QUICK_REACTIONS}
              selectedIds={selectedReactions}
              onToggle={handleReactionToggle}
            />

            {selectedReactions.length > 0 && (
              <div className="text-center text-sm text-emerald-600 animate-in fade-in duration-200">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                {selectedReactions.length} reaction{selectedReactions.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        );

      case 3: // Written Review
        return (
          <div key="step-3" className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Share your story 📝
              </h2>
              <p className="text-slate-600 italic">"{currentPrompt}"</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPromptIndex(prev => prev + 1)}
                className="mt-2"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Different prompt
              </Button>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Tell us about your experience with this agent..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={5}
                className="resize-none text-base"
              />
              
              <div className="flex items-center justify-between text-sm">
                <span className={cn(
                  'transition-colors',
                  review.length < 20 ? 'text-red-500' : 'text-emerald-600'
                )}>
                  {review.length < 20 
                    ? `${20 - review.length} more characters needed` 
                    : '✓ Looking good!'}
                </span>
                <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-slate-600">Post anonymously</span>
                </label>
              </div>
            </div>

            {/* Summary of selections */}
            {selectedReactions.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Your selected reactions:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedReactions.map(id => {
                    const reaction = QUICK_REACTIONS.find(r => r.id === id);
                    return reaction && (
                      <Badge key={id} variant="secondary" className="text-xs bg-white">
                        {reaction.emoji} {reaction.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <CelebrationOverlay show={showCelebration} onComplete={handleCelebrationComplete} />
      
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Review Your Experience</h3>
                  <p className="text-sm text-muted-foreground">{tripDestination}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ProgressIndicator currentStep={step} totalSteps={totalSteps} />
                <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-slate-200">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 overflow-y-auto max-h-[60vh]">
            {renderStepContent()}
          </CardContent>

          <CardFooter className="border-t bg-slate-50 p-4 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 0}
              className="transition-opacity"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {step < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

export default ReviewExperience;
