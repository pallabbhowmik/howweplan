'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  PartyPopper,
  Rocket,
  Clock,
  Loader2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type AnimationType = 
  | 'success' 
  | 'error' 
  | 'accepted' 
  | 'declined' 
  | 'submitted'
  | 'saved'
  | 'loading';

export interface SuccessAnimationProps {
  type: AnimationType;
  isVisible: boolean;
  message?: string;
  subMessage?: string;
  onComplete?: () => void;
  duration?: number;
  fullScreen?: boolean;
  className?: string;
}

// ============================================================================
// Animation Configuration
// ============================================================================

const ANIMATION_CONFIG: Record<AnimationType, {
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  defaultMessage: string;
}> = {
  success: {
    icon: <CheckCircle className="h-16 w-16" />,
    bgColor: 'bg-emerald-500',
    iconColor: 'text-white',
    defaultMessage: 'Success!',
  },
  error: {
    icon: <XCircle className="h-16 w-16" />,
    bgColor: 'bg-red-500',
    iconColor: 'text-white',
    defaultMessage: 'Something went wrong',
  },
  accepted: {
    icon: <PartyPopper className="h-16 w-16" />,
    bgColor: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    iconColor: 'text-white',
    defaultMessage: 'Request Accepted!',
  },
  declined: {
    icon: <XCircle className="h-16 w-16" />,
    bgColor: 'bg-gray-500',
    iconColor: 'text-white',
    defaultMessage: 'Request Declined',
  },
  submitted: {
    icon: <Rocket className="h-16 w-16" />,
    bgColor: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    iconColor: 'text-white',
    defaultMessage: 'Sent to Client!',
  },
  saved: {
    icon: <CheckCircle className="h-12 w-12" />,
    bgColor: 'bg-blue-500',
    iconColor: 'text-white',
    defaultMessage: 'Saved',
  },
  loading: {
    icon: <Loader2 className="h-16 w-16 animate-spin" />,
    bgColor: 'bg-blue-500',
    iconColor: 'text-white',
    defaultMessage: 'Loading...',
  },
};

// ============================================================================
// SuccessAnimation Component
// ============================================================================

export function SuccessAnimation({
  type,
  isVisible,
  message,
  subMessage,
  onComplete,
  duration = 2000,
  fullScreen = false,
  className,
}: SuccessAnimationProps) {
  const [isShowing, setIsShowing] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const config = ANIMATION_CONFIG[type];

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      setIsLeaving(false);

      // Auto-hide after duration (unless it's loading)
      if (type !== 'loading' && duration > 0) {
        const hideTimer = setTimeout(() => {
          setIsLeaving(true);
          setTimeout(() => {
            setIsShowing(false);
            onComplete?.();
          }, 300);
        }, duration);

        return () => clearTimeout(hideTimer);
      }
    } else {
      setIsLeaving(true);
      setTimeout(() => setIsShowing(false), 300);
    }
  }, [isVisible, duration, type, onComplete]);

  if (!isShowing) return null;

  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          'bg-black/50 backdrop-blur-sm',
          'transition-opacity duration-300',
          isLeaving ? 'opacity-0' : 'opacity-100',
          className
        )}
      >
        <div
          className={cn(
            'flex flex-col items-center p-8 rounded-3xl shadow-2xl',
            config.bgColor,
            'transform transition-all duration-300',
            isLeaving ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
            'animate-in zoom-in-75'
          )}
        >
          <div className={cn('mb-4', config.iconColor)}>
            {config.icon}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {message || config.defaultMessage}
          </h2>
          {subMessage && (
            <p className="text-white/80 text-sm">{subMessage}</p>
          )}
          
          {/* Confetti effect for celebration types */}
          {(type === 'accepted' || type === 'submitted') && !isLeaving && (
            <Confetti />
          )}
        </div>
      </div>
    );
  }

  // Inline/mini version
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
        config.bgColor,
        'transform transition-all duration-300',
        isLeaving ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
        className
      )}
    >
      <span className={cn('text-sm', config.iconColor)}>
        {type === 'saved' ? (
          <CheckCircle className="h-5 w-5" />
        ) : type === 'loading' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          config.icon
        )}
      </span>
      <span className="text-white font-medium">
        {message || config.defaultMessage}
      </span>
    </div>
  );
}

// ============================================================================
// Confetti Effect
// ============================================================================

function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            animationDelay: `${Math.random() * 1}s`,
            animationDuration: `${1.5 + Math.random() * 1}s`,
          }}
        >
          <div
            className="w-2 h-2 rounded-sm"
            style={{
              backgroundColor: [
                '#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', 
                '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'
              ][Math.floor(Math.random() * 8)],
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// useSuccessAnimation Hook
// ============================================================================

export interface UseSuccessAnimationReturn {
  show: (type: AnimationType, message?: string, subMessage?: string) => void;
  hide: () => void;
  isVisible: boolean;
  currentType: AnimationType | null;
  SuccessAnimationPortal: () => JSX.Element | null;
}

export function useSuccessAnimation(options?: {
  duration?: number;
  fullScreen?: boolean;
}): UseSuccessAnimationReturn {
  const [state, setState] = useState<{
    isVisible: boolean;
    type: AnimationType | null;
    message?: string;
    subMessage?: string;
  }>({
    isVisible: false,
    type: null,
  });

  const show = useCallback((
    type: AnimationType, 
    message?: string, 
    subMessage?: string
  ) => {
    setState({
      isVisible: true,
      type,
      message,
      subMessage,
    });
  }, []);

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const SuccessAnimationPortal = useCallback(() => {
    if (!state.type) return null;
    
    return (
      <SuccessAnimation
        type={state.type}
        isVisible={state.isVisible}
        message={state.message}
        subMessage={state.subMessage}
        onComplete={hide}
        duration={options?.duration}
        fullScreen={options?.fullScreen}
      />
    );
  }, [state, hide, options?.duration, options?.fullScreen]);

  return {
    show,
    hide,
    isVisible: state.isVisible,
    currentType: state.type,
    SuccessAnimationPortal,
  };
}

// ============================================================================
// Transition Components for Smooth Updates
// ============================================================================

export interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
}

export function FadeTransition({
  show,
  children,
  duration = 200,
  className,
}: FadeTransitionProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        'transition-all',
        show ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

export interface SlideTransitionProps {
  show: boolean;
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  className?: string;
}

export function SlideTransition({
  show,
  children,
  direction = 'up',
  duration = 200,
  className,
}: SlideTransitionProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  const translateClass = {
    up: show ? 'translate-y-0' : 'translate-y-4',
    down: show ? 'translate-y-0' : '-translate-y-4',
    left: show ? 'translate-x-0' : 'translate-x-4',
    right: show ? 'translate-x-0' : '-translate-x-4',
  }[direction];

  return (
    <div
      className={cn(
        'transition-all transform',
        show ? 'opacity-100' : 'opacity-0',
        translateClass,
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Pulse Highlight Effect
// ============================================================================

export interface PulseHighlightProps {
  isActive: boolean;
  color?: 'blue' | 'green' | 'amber' | 'red';
  children: React.ReactNode;
  className?: string;
}

export function PulseHighlight({
  isActive,
  color = 'blue',
  children,
  className,
}: PulseHighlightProps) {
  const ringColors = {
    blue: 'ring-blue-400',
    green: 'ring-emerald-400',
    amber: 'ring-amber-400',
    red: 'ring-red-400',
  };

  return (
    <div
      className={cn(
        'relative transition-all duration-300',
        isActive && `ring-2 ${ringColors[color]} animate-pulse rounded-lg`,
        className
      )}
    >
      {children}
    </div>
  );
}
