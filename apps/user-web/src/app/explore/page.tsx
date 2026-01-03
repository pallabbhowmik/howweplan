"use client";

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

function matchesQuery(destination: IndiaDestination, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    destination.name.toLowerCase().includes(q) ||
    destination.stateOrUt.toLowerCase().includes(q) ||
    destination.region.toLowerCase().includes(q) ||
    destination.highlight.toLowerCase().includes(q) ||
    destination.themes.some((t) => t.toLowerCase().includes(q))
  );
}

function DestinationCard({ destination, index }: { destination: IndiaDestination; index: number }) {
  const planHref = `/requests/new?destination=${encodeURIComponent(destination.name)}`;
  const primaryTheme = destination.themes[0] as DestinationTheme | undefined;
  const gradient = primaryTheme ? THEME_GRADIENTS[primaryTheme] : THEME_GRADIENTS.Nature;
  const [imageError, setImageError] = useState(false);

  return (
    <Card
      className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 bg-card"
      style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* Gradient fallback */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

        {/* Image */}
        {!imageError && (
          <img
            src={destinationImageUrl(destination)}
            alt={destination.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Theme icon floating */}
        <div className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg">
          {primaryTheme ? THEME_ICONS[primaryTheme] : '✨'}
        </div>

        {/* Content overlay */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border backdrop-blur-sm ${REGION_COLORS[destination.region]}`}>
              {destination.region}
            </span>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/20 text-white backdrop-blur-sm">
              {destination.stateOrUt}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white drop-shadow-lg">{destination.name}</h3>
        </div>
      </div>

      <CardContent className="p-5 bg-gradient-to-b from-card to-muted/30">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{destination.highlight}</p>

        {/* Theme pills */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {destination.themes.slice(0, 3).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-muted border border-border"
            >
              <span className="text-[10px]">{THEME_ICONS[t]}</span>
              {t}
            </span>
          ))}
          {destination.themes.length > 3 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-muted border border-border text-muted-foreground">
              +{destination.themes.length - 3}
            </span>
          )}
        </div>

        {/* Info grid */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 px-3 py-2 border border-border/50">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Best time</div>
            <div className="text-sm font-semibold mt-0.5">{destination.idealMonths}</div>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 border border-border/50">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration</div>
            <div className="text-sm font-semibold mt-0.5">{destination.suggestedDuration}</div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5">
          <Button asChild className="w-full group/btn relative overflow-hidden">
            <Link href={planHref}>
              <span className="relative z-10">Plan this trip</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturedDestination({ destination }: { destination: IndiaDestination }) {
  const planHref = `/requests/new?destination=${encodeURIComponent(destination.name)}`;
  const primaryTheme = destination.themes[0] as DestinationTheme | undefined;
  const gradient = primaryTheme ? THEME_GRADIENTS[primaryTheme] : THEME_GRADIENTS.Nature;
  const [imageError, setImageError] = useState(false);

  return (
    <Link href={planHref} className="group relative rounded-2xl overflow-hidden h-[280px] block">
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {!imageError && (
        <img
          src={destinationImageUrl(destination, 600, 400)}
          alt={destination.name}
          loading="lazy"
          onError={() => setImageError(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{primaryTheme ? THEME_ICONS[primaryTheme] : '✨'}</span>
          <span className="text-xs font-medium text-white/80 uppercase tracking-wider">{destination.region}</span>
        </div>
        <h3 className="text-2xl font-bold text-white">{destination.name}</h3>
        <p className="text-sm text-white/80 mt-1 line-clamp-2">{destination.highlight}</p>
        <span className="mt-4 inline-flex items-center text-sm font-medium text-white group-hover:underline">
          Plan this trip
          <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function ThemeCard({ theme, count, active, onClick }: { theme: DestinationTheme; count: number; active: boolean; onClick: () => void }) {
  const gradient = THEME_GRADIENTS[theme];
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl p-4 text-left transition-all duration-300 overflow-hidden group ${
        active ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'hover:scale-105'
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
      <div className="relative z-10">
        <span className="text-3xl">{THEME_ICONS[theme]}</span>
        <div className="mt-2 text-white font-semibold text-sm">{theme}</div>
        <div className="text-white/70 text-xs">{count} places</div>
      </div>
    </button>
  );
}

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<RegionFilter>('All');
  const [theme, setTheme] = useState<ThemeFilter>('All');
  const [stateOrUt, setStateOrUt] = useState<StateFilter>('All');

  const states = useMemo(() => {
    const set = new Set<string>();
    for (const d of INDIA_DESTINATIONS) set.add(d.stateOrUt);
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))] as StateFilter[];
  }, []);

  const themeCounts = useMemo(() => {
    const counts: Partial<Record<DestinationTheme, number>> = {};
    for (const d of INDIA_DESTINATIONS) {
      for (const t of d.themes) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    return INDIA_DESTINATIONS.filter((d) => {
      if (!matchesQuery(d, query)) return false;
      if (region !== 'All' && d.region !== region) return false;
      if (theme !== 'All' && !d.themes.includes(theme)) return false;
      if (stateOrUt !== 'All' && d.stateOrUt !== stateOrUt) return false;
      return true;
    });
  }, [query, region, theme, stateOrUt]);

  const featured = useMemo(() => {
    const picks = ['in-jaipur', 'in-kerala-munnar', 'in-leh', 'in-goa'];
    return INDIA_DESTINATIONS.filter((d) => picks.includes(d.id));
  }, []);

  const resetFilters = useCallback(() => {
    setQuery('');
    setRegion('All');
    setTheme('All');
    setStateOrUt('All');
  }, []);

  const hasActiveFilters = query || region !== 'All' || theme !== 'All' || stateOrUt !== 'All';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {INDIA_DESTINATIONS_COUNT}+ destinations to explore
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Discover India
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl">
              From the snow-capped Himalayas to the tropical beaches of Kerala — find your perfect destination and let our expert agents craft your dream trip.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-lg shadow-primary/25">
                <Link href="/requests/new">
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create a trip request
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        {/* Featured Destinations */}
        {!hasActiveFilters && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Featured Destinations</h2>
                <p className="text-muted-foreground">Handpicked places for unforgettable experiences</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((d) => (
                <FeaturedDestination key={d.id} destination={d} />
              ))}
            </div>
          </section>
        )}

        {/* Theme Quick Filters */}
        {!hasActiveFilters && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-2">What kind of trip?</h2>
            <p className="text-muted-foreground mb-6">Choose a vibe to filter destinations</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
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
        <section className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50 -mx-4 px-4 py-4 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                placeholder="Search places, states, or vibes…"
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[120px]"
              >
                <option value="All">All Regions</option>
                {REGIONS.filter((r) => r !== 'All').map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select
                value={stateOrUt}
                onChange={(e) => setStateOrUt(e.target.value as StateFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"
              >
                <option value="All">All States</option>
                {states.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[120px]"
              >
                <option value="All">All Vibes</option>
                {THEMES.filter((t) => t !== 'All').map((t) => (
                  <option key={t} value={t}>{THEME_ICONS[t]} {t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <div className="text-sm">
                <span className="text-muted-foreground">Showing</span>{' '}
                <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
                <span className="text-muted-foreground">of {INDIA_DESTINATIONS_COUNT}</span>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
        <section>
          {filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">No destinations found</h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Try adjusting your filters or search terms. India has so many beautiful places — let's find the right one for you!
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button onClick={resetFilters}>Reset all filters</Button>
                  <Button asChild variant="outline">
                    <Link href="/requests/new">Skip browsing — create request</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((d, i) => (
                <DestinationCard key={d.id} destination={d} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        {filtered.length > 0 && (
          <section className="mt-16 text-center">
            <div className="inline-flex flex-col items-center p-8 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
              <h3 className="text-xl font-semibold">Can't decide?</h3>
              <p className="mt-2 text-muted-foreground max-w-md">
                Tell us your dates and preferences — our expert agents will suggest perfect destinations for you.
              </p>
              <Button asChild size="lg" className="mt-6">
                <Link href="/requests/new">Create a trip request</Link>
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
