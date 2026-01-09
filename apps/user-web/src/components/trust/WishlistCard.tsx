'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  Calendar,
  MapPin,
  DollarSign,
  Tag,
  Trash2,
  Edit3,
  ExternalLink,
  Bell,
  BellOff,
  Star,
  Clock,
  MoreVertical,
  MessageSquare,
  User,
  ChevronRight,
} from 'lucide-react';
import type { WishlistItem, WishlistItemType } from './WishlistButton';

// ============================================================================
// TYPES
// ============================================================================

export interface WishlistCardProps {
  item: WishlistItem;
  onRemove?: (item: WishlistItem) => void;
  onEdit?: (item: WishlistItem) => void;
  onToggleNotify?: (item: WishlistItem) => void;
  onViewDetails?: (item: WishlistItem) => void;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTimeSinceAdded(dateString: string): string {
  const now = new Date();
  const added = new Date(dateString);
  const diffMs = now.getTime() - added.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Added today';
  if (diffDays === 1) return 'Added yesterday';
  if (diffDays < 7) return `Added ${diffDays} days ago`;
  if (diffDays < 30) return `Added ${Math.floor(diffDays / 7)} weeks ago`;
  return `Added ${Math.floor(diffDays / 30)} months ago`;
}

function getItemTypeConfig(type: WishlistItemType) {
  const configs = {
    destination: {
      icon: MapPin,
      color: 'text-emerald-600 bg-emerald-50',
      label: 'Destination',
      href: '/explore',
    },
    proposal: {
      icon: MessageSquare,
      color: 'text-blue-600 bg-blue-50',
      label: 'Proposal',
      href: '/dashboard/proposals',
    },
    itinerary: {
      icon: Calendar,
      color: 'text-purple-600 bg-purple-50',
      label: 'Itinerary',
      href: '/dashboard/trips',
    },
    agent: {
      icon: User,
      color: 'text-orange-600 bg-orange-50',
      label: 'Agent',
      href: '/agents',
    },
  };
  return configs[type];
}

// ============================================================================
// WISHLIST CARD COMPONENT
// ============================================================================

export function WishlistCard({
  item,
  onRemove,
  onEdit,
  onToggleNotify,
  onViewDetails,
  variant = 'default',
  className = '',
}: WishlistCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const typeConfig = useMemo(() => getItemTypeConfig(item.itemType), [item.itemType]);
  const TypeIcon = typeConfig.icon;

  // Priority stars renderer
  const renderPriority = () => {
    if (!item.priority) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            className={`${
              star <= (item.priority || 0)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Tags renderer
  const renderTags = () => {
    if (!item.tags || item.tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {item.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
          >
            <Tag size={10} />
            {tag}
          </span>
        ))}
        {item.tags.length > 3 && (
          <span className="text-xs text-gray-400">+{item.tags.length - 3} more</span>
        )}
      </div>
    );
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        className={`
          flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200
          hover:border-gray-300 hover:shadow-sm transition-all duration-200
          ${className}
        `}
      >
        {/* Image */}
        {item.itemImageUrl && (
          <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
            <Image
              src={item.itemImageUrl}
              alt={item.itemName}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`p-1 rounded ${typeConfig.color}`}>
              <TypeIcon size={12} />
            </span>
            <h4 className="font-medium text-gray-900 truncate text-sm">
              {item.itemName}
            </h4>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {getTimeSinceAdded(item.createdAt)}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {item.notifyOnDeals && (
            <Bell size={14} className="text-blue-500" />
          )}
          <button
            onClick={() => onRemove?.(item)}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove from wishlist"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div
        className={`
          bg-white rounded-xl border border-gray-200 overflow-hidden
          hover:shadow-lg transition-all duration-300
          ${className}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Header */}
        <div className="relative h-48">
          {item.itemImageUrl ? (
            <Image
              src={item.itemImageUrl}
              alt={item.itemName}
              fill
              className={`object-cover transition-transform duration-500 ${isHovered ? 'scale-105' : ''}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <TypeIcon size={48} className="text-gray-300" />
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Type badge */}
          <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
            <span className="flex items-center gap-1.5">
              <TypeIcon size={12} />
              {typeConfig.label}
            </span>
          </div>
          
          {/* Remove button */}
          <button
            onClick={() => onRemove?.(item)}
            className="absolute top-3 right-3 p-2 bg-white/90 rounded-full text-gray-600 hover:text-red-500 hover:bg-white transition-all shadow-sm"
            title="Remove from wishlist"
          >
            <Heart size={16} className="fill-red-500 text-red-500" />
          </button>
          
          {/* Title on image */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-white font-semibold text-lg drop-shadow-md">
              {item.itemName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {renderPriority()}
              {item.notifyOnDeals && (
                <span className="flex items-center gap-1 text-xs text-blue-200">
                  <Bell size={10} />
                  Deal alerts on
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Planned dates and budget */}
          <div className="flex flex-wrap gap-3 text-sm">
            {(item.plannedDateStart || item.plannedDateEnd) && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Calendar size={14} className="text-gray-400" />
                {item.plannedDateStart && formatDate(item.plannedDateStart)}
                {item.plannedDateEnd && ` - ${formatDate(item.plannedDateEnd)}`}
              </div>
            )}
            {item.estimatedBudget && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <DollarSign size={14} className="text-gray-400" />
                {formatCurrency(item.estimatedBudget)}
              </div>
            )}
          </div>
          
          {/* Notes */}
          {item.notes && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-2">
              {item.notes}
            </p>
          )}
          
          {/* Tags */}
          {renderTags()}
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock size={12} />
              {getTimeSinceAdded(item.createdAt)}
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleNotify?.(item)}
                className={`p-2 rounded-lg transition-colors ${
                  item.notifyOnDeals
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title={item.notifyOnDeals ? 'Turn off deal alerts' : 'Get deal alerts'}
              >
                {item.notifyOnDeals ? <Bell size={16} /> : <BellOff size={16} />}
              </button>
              <button
                onClick={() => onEdit?.(item)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                title="Edit notes"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => onViewDetails?.(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
              >
                View
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200 overflow-hidden
        hover:border-gray-300 hover:shadow-md transition-all duration-200
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
    >
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
          {item.itemImageUrl ? (
            <Image
              src={item.itemImageUrl}
              alt={item.itemName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <TypeIcon size={32} className="text-gray-300" />
            </div>
          )}
          
          {/* Wishlist heart overlay */}
          <div className="absolute top-1.5 right-1.5">
            <Heart size={16} className="fill-red-500 text-red-500 drop-shadow" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                <TypeIcon size={10} />
                {typeConfig.label}
              </span>
              <h3 className="font-semibold text-gray-900 mt-1.5 line-clamp-1">
                {item.itemName}
              </h3>
            </div>
            
            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={() => { onViewDetails?.(item); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink size={14} />
                    View Details
                  </button>
                  <button
                    onClick={() => { onEdit?.(item); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 size={14} />
                    Edit Notes
                  </button>
                  <button
                    onClick={() => { onToggleNotify?.(item); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {item.notifyOnDeals ? <BellOff size={14} /> : <Bell size={14} />}
                    {item.notifyOnDeals ? 'Disable Alerts' : 'Enable Alerts'}
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => { onRemove?.(item); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
            {item.estimatedBudget && (
              <span className="flex items-center gap-1">
                <DollarSign size={12} />
                {formatCurrency(item.estimatedBudget)}
              </span>
            )}
            {item.plannedDateStart && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(item.plannedDateStart)}
              </span>
            )}
            {item.notifyOnDeals && (
              <span className="flex items-center gap-1 text-blue-500">
                <Bell size={12} />
                Alerts on
              </span>
            )}
          </div>
          
          {/* Notes preview */}
          {item.notes && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-1">
              {item.notes}
            </p>
          )}
          
          {/* Tags */}
          {renderTags()}
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">
              {getTimeSinceAdded(item.createdAt)}
            </span>
            {renderPriority()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WISHLIST EMPTY STATE COMPONENT
// ============================================================================

export interface WishlistEmptyProps {
  type?: WishlistItemType | 'all';
  onExplore?: () => void;
  className?: string;
}

export function WishlistEmpty({
  type = 'all',
  onExplore,
  className = '',
}: WishlistEmptyProps) {
  const getEmptyMessage = () => {
    switch (type) {
      case 'destination':
        return {
          title: 'No saved destinations',
          description: 'Explore destinations and save the ones you\'re interested in for your next trip!',
          action: 'Explore Destinations',
          href: '/explore',
        };
      case 'proposal':
        return {
          title: 'No saved proposals',
          description: 'When you receive proposals from agents, save the ones you want to consider later.',
          action: 'View Proposals',
          href: '/dashboard/proposals',
        };
      case 'itinerary':
        return {
          title: 'No saved itineraries',
          description: 'Save itineraries that catch your eye for future reference.',
          action: 'Browse Itineraries',
          href: '/dashboard/trips',
        };
      case 'agent':
        return {
          title: 'No saved agents',
          description: 'Find and save agents you\'d like to work with in the future.',
          action: 'Find Agents',
          href: '/agents',
        };
      default:
        return {
          title: 'Your wishlist is empty',
          description: 'Start exploring and save destinations, proposals, or agents you\'re interested in!',
          action: 'Start Exploring',
          href: '/explore',
        };
    }
  };

  const message = getEmptyMessage();

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      {/* Illustration */}
      <div className="relative w-32 h-32 mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-pink-100 rounded-full animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Heart size={48} className="text-red-300" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
          <Star size={16} className="text-amber-400" />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {message.title}
      </h3>
      <p className="text-gray-500 text-center max-w-md mb-6">
        {message.description}
      </p>

      {/* CTA */}
      {onExplore ? (
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
        >
          {message.action}
          <ChevronRight size={18} />
        </button>
      ) : (
        <Link
          href={message.href}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
        >
          {message.action}
          <ChevronRight size={18} />
        </Link>
      )}
    </div>
  );
}

export default WishlistCard;
