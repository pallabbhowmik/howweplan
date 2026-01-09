'use client';

import React, { useState, useCallback } from 'react';
import { Heart, Loader2, Check, Bookmark, BookmarkCheck } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type WishlistItemType = 'destination' | 'proposal' | 'itinerary' | 'agent';

export interface WishlistItem {
  id: string;
  itemType: WishlistItemType;
  itemId: string;
  itemName: string;
  itemImageUrl?: string;
  itemMetadata?: Record<string, unknown>;
  notes?: string;
  tags?: string[];
  priority?: number;
  plannedDateStart?: string;
  plannedDateEnd?: string;
  estimatedBudget?: number;
  notifyOnDeals?: boolean;
  createdAt: string;
}

export interface WishlistButtonProps {
  itemType: WishlistItemType;
  itemId: string;
  itemName: string;
  itemImageUrl?: string;
  itemMetadata?: Record<string, unknown>;
  isWishlisted?: boolean;
  onToggle?: (isWishlisted: boolean) => void;
  variant?: 'heart' | 'bookmark' | 'text';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  disabled?: boolean;
}

// ============================================================================
// WISHLIST BUTTON COMPONENT
// ============================================================================

export function WishlistButton({
  itemType,
  itemId,
  itemName,
  itemImageUrl,
  itemMetadata = {},
  isWishlisted: initialWishlisted = false,
  onToggle,
  variant = 'heart',
  size = 'md',
  showLabel = false,
  className = '',
  disabled = false,
}: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: { icon: 16, button: 'h-8 w-8', text: 'text-xs' },
    md: { icon: 20, button: 'h-10 w-10', text: 'text-sm' },
    lg: { icon: 24, button: 'h-12 w-12', text: 'text-base' },
  };

  const config = sizeConfig[size];

  const handleToggle = useCallback(async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    
    try {
      // Simulating API call - replace with actual API integration
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newState = !isWishlisted;
      setIsWishlisted(newState);
      
      // Show success animation briefly
      if (newState) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1000);
      }
      
      onToggle?.(newState);
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isWishlisted, isLoading, disabled, onToggle]);

  // Render heart variant
  const renderHeart = () => (
    <button
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={`
        group relative flex items-center justify-center rounded-full
        transition-all duration-300 ease-out
        ${showLabel ? 'gap-2 px-4' : config.button}
        ${isWishlisted 
          ? 'bg-red-50 text-red-500 hover:bg-red-100' 
          : 'bg-white/80 text-gray-400 hover:text-red-400 hover:bg-red-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        shadow-sm hover:shadow-md border border-gray-200
        ${className}
      `}
      aria-label={isWishlisted ? `Remove ${itemName} from wishlist` : `Add ${itemName} to wishlist`}
      title={isWishlisted ? 'Remove from wishlist' : 'Save for later'}
    >
      {isLoading ? (
        <Loader2 size={config.icon} className="animate-spin" />
      ) : showSuccess ? (
        <Check size={config.icon} className="text-green-500 animate-bounce" />
      ) : (
        <Heart
          size={config.icon}
          className={`
            transition-all duration-300
            ${isWishlisted ? 'fill-red-500 scale-110' : 'fill-transparent group-hover:scale-110'}
          `}
        />
      )}
      {showLabel && (
        <span className={config.text}>
          {isWishlisted ? 'Saved' : 'Save'}
        </span>
      )}
      
      {/* Ripple effect on click */}
      {showSuccess && (
        <span className="absolute inset-0 rounded-full animate-ping bg-red-200 opacity-30" />
      )}
    </button>
  );

  // Render bookmark variant
  const renderBookmark = () => (
    <button
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={`
        group relative flex items-center justify-center rounded-lg
        transition-all duration-300 ease-out
        ${showLabel ? 'gap-2 px-4 py-2' : config.button}
        ${isWishlisted 
          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
          : 'bg-white/80 text-gray-400 hover:text-blue-500 hover:bg-blue-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        shadow-sm hover:shadow-md border border-gray-200
        ${className}
      `}
      aria-label={isWishlisted ? `Remove ${itemName} from saved` : `Save ${itemName}`}
      title={isWishlisted ? 'Remove from saved' : 'Save for later'}
    >
      {isLoading ? (
        <Loader2 size={config.icon} className="animate-spin" />
      ) : isWishlisted ? (
        <BookmarkCheck
          size={config.icon}
          className="fill-blue-500 transition-transform duration-300"
        />
      ) : (
        <Bookmark
          size={config.icon}
          className="transition-transform duration-300 group-hover:scale-110"
        />
      )}
      {showLabel && (
        <span className={config.text}>
          {isWishlisted ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );

  // Render text button variant
  const renderText = () => (
    <button
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={`
        group flex items-center gap-2 px-4 py-2 rounded-lg
        transition-all duration-300 ease-out
        ${isWishlisted 
          ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' 
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-red-500 border-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        border ${config.text}
        ${className}
      `}
      aria-label={isWishlisted ? `Remove ${itemName} from wishlist` : `Add ${itemName} to wishlist`}
    >
      {isLoading ? (
        <Loader2 size={config.icon - 4} className="animate-spin" />
      ) : (
        <Heart
          size={config.icon - 4}
          className={`
            transition-all duration-300
            ${isWishlisted ? 'fill-red-500' : 'fill-transparent group-hover:fill-red-200'}
          `}
        />
      )}
      <span>{isWishlisted ? 'Saved to Wishlist' : 'Save for Later'}</span>
    </button>
  );

  switch (variant) {
    case 'bookmark':
      return renderBookmark();
    case 'text':
      return renderText();
    default:
      return renderHeart();
  }
}

// ============================================================================
// WISHLIST CONTEXT (Optional - for global state management)
// ============================================================================

interface WishlistContextType {
  items: WishlistItem[];
  isLoading: boolean;
  addItem: (item: Omit<WishlistItem, 'id' | 'createdAt'>) => Promise<void>;
  removeItem: (itemType: WishlistItemType, itemId: string) => Promise<void>;
  isWishlisted: (itemType: WishlistItemType, itemId: string) => boolean;
  getItemsByType: (type: WishlistItemType) => WishlistItem[];
}

const WishlistContext = React.createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addItem = useCallback(async (item: Omit<WishlistItem, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    try {
      // API call would go here
      const newItem: WishlistItem = {
        ...item,
        id: `wishlist-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setItems(prev => [...prev, newItem]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (itemType: WishlistItemType, itemId: string) => {
    setIsLoading(true);
    try {
      // API call would go here
      setItems(prev => prev.filter(item => !(item.itemType === itemType && item.itemId === itemId)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isWishlisted = useCallback((itemType: WishlistItemType, itemId: string) => {
    return items.some(item => item.itemType === itemType && item.itemId === itemId);
  }, [items]);

  const getItemsByType = useCallback((type: WishlistItemType) => {
    return items.filter(item => item.itemType === type);
  }, [items]);

  return (
    <WishlistContext.Provider value={{ items, isLoading, addItem, removeItem, isWishlisted, getItemsByType }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = React.useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

export default WishlistButton;
