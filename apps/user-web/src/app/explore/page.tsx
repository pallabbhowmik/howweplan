"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SiteNavigation } from '@/components/navigation/site-navigation';
import { SiteFooter } from '@/components/navigation/site-footer';
import {
  fetchDestinations,
  type Destination,
  type DestinationRegion,
} from '@/lib/api/destinations';
import {
  destinationImageUrl,
  INDIA_DESTINATIONS,
  INDIA_DESTINATIONS_COUNT,
  THEME_GRADIENTS,
  THEME_ICONS,
  type DestinationTheme,
  type IndiaDestination,
  type IndiaRegion,
} from '@/lib/data/india-destinations';

// Unified destination type that works with both API and static data
type UnifiedDestination = {
  id: string;
  name: string;
  state: string;
  region: IndiaRegion;
  themes: string[];
  idealMonths: string;
  suggestedDuration: string;
  highlight: string;
  imageUrl: string | null;
  isFeatured?: boolean;
};

// Convert API destination to unified format
function apiToUnified(d: Destination): UnifiedDestination {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let idealMonths = 'Year-round';
  const months = d.idealMonths;
  if (months && months.length > 0) {
    const first = months[0];
    const last = months[months.length - 1];
    if (first !== undefined && last !== undefined) {
      const startMonth = monthNames[first - 1] || 'Jan';
      const endMonth = monthNames[last - 1] || 'Dec';
      idealMonths = `${startMonth}–${endMonth}`;
    }
  }
  
  return {
    id: d.id,
    name: d.name,
    state: d.state,
    region: d.region as IndiaRegion,
    themes: d.themes,
    idealMonths,
    suggestedDuration: `${d.suggestedDurationMin}–${d.suggestedDurationMax} days`,
    highlight: d.highlight,
    imageUrl: d.imageUrl,
    isFeatured: d.isFeatured,
  };
}

// Convert static destination to unified format
function staticToUnified(d: IndiaDestination): UnifiedDestination {
  return {
    id: d.id,
    name: d.name,
    state: d.stateOrUt,
    region: d.region,
    themes: d.themes,
    idealMonths: d.idealMonths,
    suggestedDuration: d.suggestedDuration,
    highlight: d.highlight,
    imageUrl: null, // Static data uses destinationImageUrl function
  };
}

function picsumUrlForId(id: string, width = 800, height = 500): string {
  const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

// Get image URL - prefer database URL, fallback to static lookup
function getImageUrl(destination: UnifiedDestination): string {
  if (destination.imageUrl) {
    return destination.imageUrl;
  }
  // Fallback: look up in static data
  const staticDest = INDIA_DESTINATIONS.find(d => d.id === destination.id);
  if (staticDest) {
    return destinationImageUrl(staticDest);
  }
  // Final fallback: generate from picsum with consistent seed
  return picsumUrlForId(destination.id, 800, 500);
}

type RegionFilter = IndiaRegion | 'All';
type ThemeFilter = DestinationTheme | 'All';
type StateFilter = string | 'All';

const REGIONS: RegionFilter[] = ['All', 'North', 'South', 'East', 'West', 'Central', 'Northeast'];
const THEMES: ThemeFilter[] = [
  'All',
  'Mountains',
  'Beaches',
  'Heritage',
  'Wildlife',
  'Spiritual',
  'Food',
  'City',
  'Culture',
  'Nightlife',
  'Nature',
  'Adventure',
  'Desert',
];

const REGION_COLORS: Record<IndiaRegion, string> = {
  North: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
  South: 'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400',
  East: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
  West: 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-400',
  Central: 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400',
  Northeast: 'bg-teal-500/10 text-teal-700 border-teal-500/30 dark:text-teal-400',
};

// Inline styles for region badges (CSS-in-JS to avoid Tailwind JIT issues)
const REGION_BADGE_STYLES: Record<IndiaRegion, React.CSSProperties> = {
  North: { backgroundColor: 'rgba(59, 130, 246, 0.9)', color: 'white' },
  South: { backgroundColor: 'rgba(34, 197, 94, 0.9)', color: 'white' },
  East: { backgroundColor: 'rgba(245, 158, 11, 0.9)', color: 'white' },
  West: { backgroundColor: 'rgba(168, 85, 247, 0.9)', color: 'white' },
  Central: { backgroundColor: 'rgba(244, 63, 94, 0.9)', color: 'white' },
  Northeast: { backgroundColor: 'rgba(20, 184, 166, 0.9)', color: 'white' },
};

// Inline gradient styles for theme cards
const THEME_CARD_STYLES: Record<DestinationTheme, React.CSSProperties> = {
  Mountains: { background: 'linear-gradient(135deg, #475569 0%, #1e3a5f 50%, #1e293b 100%)' },
  Beaches: { background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #0d9488 100%)' },
  Heritage: { background: 'linear-gradient(135deg, #b45309 0%, #9a3412 50%, #7f1d1d 100%)' },
  Wildlife: { background: 'linear-gradient(135deg, #15803d 0%, #065f46 50%, #14532d 100%)' },
  Spiritual: { background: 'linear-gradient(135deg, #9333ea 0%, #6d28d9 50%, #4338ca 100%)' },
  Food: { background: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%)' },
  City: { background: 'linear-gradient(135deg, #52525b 0%, #334155 50%, #27272a 100%)' },
  Culture: { background: 'linear-gradient(135deg, #e11d48 0%, #be185d 50%, #a21caf 100%)' },
  Nightlife: { background: 'linear-gradient(135deg, #7c3aed 0%, #6b21a8 50%, #312e81 100%)' },
  Nature: { background: 'linear-gradient(135deg, #16a34a 0%, #0f766e 50%, #047857 100%)' },
  Adventure: { background: 'linear-gradient(135deg, #ea580c 0%, #b45309 50%, #a16207 100%)' },
  Desert: { background: 'linear-gradient(135deg, #ca8a04 0%, #b45309 50%, #c2410c 100%)' },
};

function matchesQuery(destination: UnifiedDestination, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    destination.name.toLowerCase().includes(q) ||
    destination.state.toLowerCase().includes(q) ||
    destination.region.toLowerCase().includes(q) ||
    destination.highlight.toLowerCase().includes(q) ||
    destination.themes.some((t) => t.toLowerCase().includes(q))
  );
}

function DestinationCard({ destination, index }: { destination: UnifiedDestination; index: number }) {
  const planHref = `/requests/new?destination=${encodeURIComponent(destination.name)}`;
  const primaryTheme = destination.themes[0] as DestinationTheme | undefined;
  const gradient = primaryTheme ? THEME_GRADIENTS[primaryTheme] : THEME_GRADIENTS.Nature;
  const initialSrc = useMemo(() => getImageUrl(destination), [destination]);
  const [imageSrc, setImageSrc] = useState<string>(initialSrc);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageSrc(initialSrc);
    setImageError(false);
  }, [initialSrc]);

  const handleImageError = useCallback(() => {
    const fallback = picsumUrlForId(destination.id, 800, 500);
    if (imageSrc !== fallback) {
      setImageSrc(fallback);
      return;
    }
    setImageError(true);
  }, [destination.id, imageSrc]);

  return (
    <Card
      className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-card rounded-2xl h-full flex flex-col"
      style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden flex-shrink-0">
        {/* Gradient fallback */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

        {/* Image */}
        {!imageError && (
          <img
            src={imageSrc}
            alt={destination.name}
            loading="lazy"
            onError={handleImageError}
            className="absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-110"
          />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Theme icon floating */}
        <div className="absolute top-4 right-4 h-11 w-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-lg ring-1 ring-white/20">
          {primaryTheme ? THEME_ICONS[primaryTheme] : '✨'}
        </div>

        {/* Featured badge */}
        {destination.isFeatured && (
          <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-yellow-500/90 text-yellow-950 text-xs font-semibold">
            ⭐ Featured
          </div>
        )}

        {/* Content overlay */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span 
              className="px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-sm shadow-sm"
              style={REGION_BADGE_STYLES[destination.region]}
            >
              {destination.region}
            </span>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/20 text-white backdrop-blur-sm">
              {destination.state}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white drop-shadow-lg">{destination.name}</h3>
        </div>
      </div>

      <CardContent className="p-5 bg-gradient-to-b from-card to-muted/20 flex flex-col flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] leading-relaxed">{destination.highlight}</p>

        {/* Theme pills - fixed height container */}
        <div className="mt-4 flex flex-wrap gap-2 min-h-[68px]">
          {destination.themes.slice(0, 3).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted/80 border border-border/50 text-foreground/80 h-fit"
            >
              <span className="text-sm">{THEME_ICONS[t as DestinationTheme] || '✨'}</span>
              {t}
            </span>
          ))}
          {destination.themes.length > 3 && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-muted/80 border border-border/50 text-muted-foreground h-fit">
              +{destination.themes.length - 3}
            </span>
          )}
        </div>

        {/* Spacer to push content below to bottom */}
        <div className="flex-grow" />

        {/* Info grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 px-3 py-2.5 border border-border/30">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Best time</div>
            <div className="text-sm font-bold mt-0.5 text-foreground">{destination.idealMonths}</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 px-3 py-2.5 border border-border/30">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Duration</div>
            <div className="text-sm font-bold mt-0.5 text-foreground">{destination.suggestedDuration}</div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5">
          <Button asChild className="w-full h-11 group/btn relative overflow-hidden font-semibold">
            <Link href={planHref}>
              <span className="relative z-10 flex items-center justify-center gap-2">
                Plan this trip
                <svg className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturedDestination({ destination }: { destination: UnifiedDestination }) {
  const planHref = `/requests/new?destination=${encodeURIComponent(destination.name)}`;
  const primaryTheme = destination.themes[0] as DestinationTheme | undefined;
  const gradient = primaryTheme ? THEME_GRADIENTS[primaryTheme] : THEME_GRADIENTS.Nature;
  const initialSrc = useMemo(() => getImageUrl(destination), [destination]);
  const [imageSrc, setImageSrc] = useState<string>(initialSrc);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageSrc(initialSrc);
    setImageError(false);
  }, [initialSrc]);

  const handleImageError = useCallback(() => {
    const fallback = picsumUrlForId(destination.id, 800, 500);
    if (imageSrc !== fallback) {
      setImageSrc(fallback);
      return;
    }
    setImageError(true);
  }, [destination.id, imageSrc]);

  return (
    <Link href={planHref} className="group relative rounded-2xl overflow-hidden h-[340px] block shadow-xl shadow-black/10 ring-1 ring-black/5">
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {!imageError && (
        <img
          src={imageSrc}
          alt={destination.name}
          loading="lazy"
          onError={handleImageError}
          className="absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Featured badge */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-lg">
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Featured
      </div>

      {/* Hover arrow */}
      <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl drop-shadow-lg">{primaryTheme ? THEME_ICONS[primaryTheme] : '✨'}</span>
          <span className="px-2.5 py-1 text-xs font-medium text-white/90 uppercase tracking-wider bg-white/15 backdrop-blur-sm rounded-full">{destination.region}</span>
        </div>
        <h3 className="text-2xl font-bold text-white group-hover:text-amber-200 transition-colors">{destination.name}</h3>
        <p className="text-sm text-white/70 mt-1">{destination.state}</p>
        <p className="text-sm text-white/80 mt-2 line-clamp-2">{destination.highlight}</p>
        
        {/* Theme pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {destination.themes.slice(0, 3).map((t) => (
            <span
              key={t}
              className="px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-xs"
            >
              {THEME_ICONS[t as DestinationTheme]} {t}
            </span>
          ))}
        </div>
        
        <span className="mt-4 inline-flex items-center text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
          Plan this trip
          <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

// Featured Destinations Carousel with auto-scroll
function FeaturedCarousel({ featured }: { featured: UnifiedDestination[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Auto-scroll effect
  useEffect(() => {
    if (isPaused || featured.length <= 4) return;
    
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const maxScroll = scrollWidth - clientWidth;
        
        if (scrollLeft >= maxScroll - 10) {
          // Reset to start
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Scroll one card width
          scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, featured.length]);

  // Update arrow visibility on scroll
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">Featured Destinations</h2>
          </div>
          <p className="text-muted-foreground text-lg">Handpicked places for unforgettable experiences</p>
        </div>
        {/* Navigation arrows for desktop */}
        {featured.length > 4 && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={scrollLeft}
              disabled={!showLeftArrow}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                showLeftArrow 
                  ? 'border-primary/30 hover:border-primary hover:bg-primary/10 text-foreground' 
                  : 'border-border text-muted-foreground opacity-50 cursor-not-allowed'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={scrollRight}
              disabled={!showRightArrow}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                showRightArrow 
                  ? 'border-primary/30 hover:border-primary hover:bg-primary/10 text-foreground' 
                  : 'border-border text-muted-foreground opacity-50 cursor-not-allowed'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Scrollable container */}
      <div 
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {featured.map((d) => (
            <div key={d.id} className="flex-shrink-0 w-[300px] snap-start">
              <FeaturedDestination destination={d} />
            </div>
          ))}
        </div>
        
        {/* Gradient fade edges */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-slate-50 dark:from-background to-transparent pointer-events-none" />
        )}
        {showRightArrow && featured.length > 4 && (
          <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-slate-50 dark:from-background to-transparent pointer-events-none" />
        )}
      </div>
    </section>
  );
}

function ThemeCard({ theme, count, active, onClick }: { theme: DestinationTheme; count: number; active: boolean; onClick: () => void }) {
  const cardStyle = THEME_CARD_STYLES[theme] || { background: 'linear-gradient(135deg, #4b5563 0%, #374151 50%, #1f2937 100%)' };
  
  return (
    <button
      onClick={onClick}
      className={`relative rounded-2xl p-4 text-left transition-all duration-300 overflow-hidden group min-h-[110px] ${
        active 
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-xl' 
          : 'hover:scale-105 hover:shadow-xl shadow-lg'
      }`}
      style={cardStyle}
    >
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <span className="text-3xl drop-shadow-lg">{THEME_ICONS[theme]}</span>
        <div className="mt-auto">
          <div className="text-white font-bold text-sm drop-shadow-md">{theme}</div>
          <div className="text-white/80 text-xs font-medium">{count} {count === 1 ? 'place' : 'places'}</div>
        </div>
      </div>
      
      {/* Active checkmark */}
      {active && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
          <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
}

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<RegionFilter>('All');
  const [theme, setTheme] = useState<ThemeFilter>('All');
  const [stateOrUt, setStateOrUt] = useState<StateFilter>('All');

  // Database destinations state
  const [destinations, setDestinations] = useState<UnifiedDestination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  // Fetch from database on mount
  useEffect(() => {
    async function loadDestinations() {
      setIsLoading(true);
      try {
        const data = await fetchDestinations();
        if (data.length > 0) {
          setDestinations(data.map(apiToUnified));
          setUsingFallback(false);
        } else {
          // No data from API, use static fallback
          setDestinations(INDIA_DESTINATIONS.map(staticToUnified));
          setUsingFallback(true);
        }
      } catch (error) {
        console.warn('Failed to fetch destinations, using static fallback:', error);
        setDestinations(INDIA_DESTINATIONS.map(staticToUnified));
        setUsingFallback(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadDestinations();
  }, []);

  const totalCount = destinations.length || INDIA_DESTINATIONS_COUNT;

  const states = useMemo(() => {
    const set = new Set<string>();
    for (const d of destinations) set.add(d.state);
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))] as StateFilter[];
  }, [destinations]);

  const themeCounts = useMemo(() => {
    const counts: Partial<Record<DestinationTheme, number>> = {};
    for (const d of destinations) {
      for (const t of d.themes) {
        counts[t as DestinationTheme] = (counts[t as DestinationTheme] || 0) + 1;
      }
    }
    return counts;
  }, [destinations]);

  const filtered = useMemo(() => {
    return destinations.filter((d) => {
      if (!matchesQuery(d, query)) return false;
      if (region !== 'All' && d.region !== region) return false;
      if (theme !== 'All' && !d.themes.includes(theme)) return false;
      if (stateOrUt !== 'All' && d.state !== stateOrUt) return false;
      return true;
    });
  }, [destinations, query, region, theme, stateOrUt]);

  const featured = useMemo(() => {
    // First try to get featured from database - return ALL featured items
    const dbFeatured = destinations.filter(d => d.isFeatured);
    if (dbFeatured.length > 0) {
      return dbFeatured;
    }
    // Fallback to hardcoded picks if no featured in database
    const picks = ['in-jaipur', 'in-kerala-munnar', 'in-leh', 'in-goa'];
    return destinations.filter((d) => picks.includes(d.id));
  }, [destinations]);

  const resetFilters = useCallback(() => {
    setQuery('');
    setRegion('All');
    setTheme('All');
    setStateOrUt('All');
  }, []);

  const hasActiveFilters = query || region !== 'All' || theme !== 'All' || stateOrUt !== 'All';

  return (
    <div>
      <SiteNavigation />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 dark:from-background dark:via-background dark:to-muted/20">
      {/* Hero Section - Enhanced with better visuals */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 right-0 w-72 h-72 bg-blue-400/15 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTJoLTJ2Mmgyem0tNCA2aC0ydi00aDJ2NHptMC02di0yaC0ydjJoMnoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-40" />

        <div className="container mx-auto px-4 py-16 md:py-24 lg:py-28 relative">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium mb-8 border border-white/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              <span className="text-white/90">{totalCount}+ curated destinations</span>
              {usingFallback && <span className="text-xs text-white/60 ml-1">(offline)</span>}
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white">
              Discover{' '}
              <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent">
                India
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
              From majestic mountains to sun-kissed shores, ancient temples to vibrant cities — your perfect adventure awaits. Let our expert agents craft an unforgettable journey just for you.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-white/90 shadow-xl shadow-black/20 font-semibold px-8 h-12">
                <Link href="/requests/new">
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Start Planning
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-white/20 text-white border-2 border-white/40 hover:bg-white/30 backdrop-blur-sm h-12 font-semibold">
                <Link href="/dashboard">View Dashboard</Link>
              </Button>
            </div>

            {/* Quick stats */}
            <div className="mt-12 flex flex-wrap gap-8 text-white/70">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm">Verified by locals</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">Expert curated</span>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-16 md:h-24 text-slate-50 dark:text-background" viewBox="0 0 1440 74" fill="currentColor" preserveAspectRatio="none">
            <path d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,42.7C960,43,1056,53,1152,53.3C1248,53,1344,43,1392,37.3L1440,32L1440,74L1392,74C1344,74,1248,74,1152,74C1056,74,960,74,864,74C768,74,672,74,576,74C480,74,384,74,288,74C192,74,96,74,48,74L0,74Z" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading destinations...</span>
          </div>
        )}

        {!isLoading && (
          <>
        {/* Featured Destinations - Horizontal Scroll Carousel */}
        {!hasActiveFilters && featured.length > 0 && (
          <FeaturedCarousel featured={featured} />
        )}

        {/* Theme Quick Filters */}
        {!hasActiveFilters && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">What kind of trip?</h2>
            </div>
            <p className="text-muted-foreground text-lg mb-8">Choose a vibe to filter destinations</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {(Object.keys(THEME_ICONS) as DestinationTheme[]).map((t) => (
                <ThemeCard
                  key={t}
                  theme={t}
                  count={themeCounts[t] || 0}
                  active={theme === t as ThemeFilter}
                  onClick={() => setTheme((theme === t as ThemeFilter) ? 'All' : t)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Filters Bar */}
        <section className="sticky top-0 z-20 bg-white/80 dark:bg-background/80 backdrop-blur-xl border-b border-border/40 -mx-4 px-4 py-5 mb-10 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                placeholder="Search places, states, or vibes…"
                className="pl-12 h-12 text-base border-2 focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionFilter)}
                className="h-11 rounded-lg border-2 border-input bg-background px-4 text-sm font-medium min-w-[140px] hover:border-primary/50 transition-colors focus:outline-none focus:border-primary"
              >
                <option value="All">🌍 All Regions</option>
                {REGIONS.filter((r) => r !== 'All').map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select
                value={stateOrUt}
                onChange={(e) => setStateOrUt(e.target.value as StateFilter)}
                className="h-11 rounded-lg border-2 border-input bg-background px-4 text-sm font-medium min-w-[160px] hover:border-primary/50 transition-colors focus:outline-none focus:border-primary"
              >
                <option value="All">📍 All States</option>
                {states.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeFilter)}
                className="h-11 rounded-lg border-2 border-input bg-background px-4 text-sm font-medium min-w-[140px] hover:border-primary/50 transition-colors focus:outline-none focus:border-primary"
              >
                <option value="All">✨ All Vibes</option>
                {THEMES.filter((t) => t !== 'All').map((t) => (
                  <option key={t} value={t}>{THEME_ICONS[t]} {t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <div className="px-4 py-2 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Showing</span>{' '}
                <span className="font-bold text-foreground">{filtered.length}</span>{' '}
                <span className="text-muted-foreground">of {totalCount}</span>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="h-10 gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
        <section>
          {filtered.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-16 text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-6">
                  <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">No destinations found</h2>
                <p className="mt-3 text-muted-foreground max-w-md mx-auto text-lg">
                  Try adjusting your filters or search terms. India has so many beautiful places — let's find the right one for you!
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Button onClick={resetFilters} size="lg">Reset all filters</Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/requests/new">Skip browsing — create request</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((d, i) => (
                <DestinationCard key={d.id} destination={d} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        {filtered.length > 0 && (
          <section className="mt-20 text-center">
            <div className="relative inline-flex flex-col items-center p-10 md:p-12 rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white overflow-hidden shadow-2xl shadow-violet-500/25">
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 mx-auto">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold">Can't decide?</h3>
                <p className="mt-3 text-white/80 max-w-lg text-lg">
                  Tell us your dates and preferences — our expert agents will suggest perfect destinations for you.
                </p>
                <Button asChild size="lg" className="mt-8 bg-white text-violet-700 hover:bg-white/90 font-semibold px-8 shadow-xl">
                  <Link href="/requests/new">Create a trip request</Link>
                </Button>
              </div>
            </div>
          </section>
        )}
          </>
        )}
      </div>
    </div>
    <SiteFooter />
    </div>
  );
}
