"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  destinationImageUrl,
  INDIA_DESTINATIONS,
  INDIA_DESTINATIONS_COUNT,
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

function DestinationCard({ destination }: { destination: IndiaDestination }) {
  const planHref = `/requests/new?destination=${encodeURIComponent(destination.name)}`;
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/10] bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={destinationImageUrl(destination)}
          alt={destination.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
        <div className="absolute left-4 right-4 bottom-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{destination.region}</Badge>
            <Badge variant="outline">{destination.stateOrUt}</Badge>
          </div>
        </div>
      </div>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold leading-tight">{destination.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{destination.highlight}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {destination.themes.slice(0, 4).map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
          {destination.themes.length > 4 ? (
            <Badge variant="secondary">+{destination.themes.length - 4}</Badge>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border bg-background px-3 py-2">
            <div className="text-xs text-muted-foreground">Best time</div>
            <div className="font-medium">{destination.idealMonths}</div>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <div className="text-xs text-muted-foreground">Suggested</div>
            <div className="font-medium">{destination.suggestedDuration}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="flex-1 min-w-[160px]">
            <Link href={planHref}>Plan this trip</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 min-w-[160px]">
            <Link href="/requests/new">Plan something else</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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

  const filtered = useMemo(() => {
    return INDIA_DESTINATIONS.filter((d) => {
      if (!matchesQuery(d, query)) return false;
      if (region !== 'All' && d.region !== region) return false;
      if (theme !== 'All' && !d.themes.includes(theme)) return false;
      if (stateOrUt !== 'All' && d.stateOrUt !== stateOrUt) return false;
      return true;
    });
  }, [query, region, theme, stateOrUt]);

  const featuredThemes: DestinationTheme[] = ['Mountains', 'Beaches', 'Heritage', 'Wildlife', 'Spiritual', 'Food'];

  function resetFilters() {
    setQuery('');
    setRegion('All');
    setTheme('All');
    setStateOrUt('All');
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border bg-gradient-to-b from-muted/50 to-background p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Explore India</h1>
              <p className="mt-2 text-muted-foreground">
                Browse {Math.max(100, INDIA_DESTINATIONS_COUNT)}+ beautiful places with quick filters, then hit “Plan this
                trip” to pre-fill your request.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/requests/new">Create a request</Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: Jaipur, beaches, Kerala, wildlife…"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="region">
                Region
              </label>
              <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionFilter)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="sr-only" htmlFor="state">
                State / UT
              </label>
              <select
                id="state"
                value={stateOrUt}
                onChange={(e) => setStateOrUt(e.target.value as StateFilter)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Vibes:</span>
              {featuredThemes.map((t) => {
                const active = theme === t;
                return (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={active ? 'secondary' : 'outline'}
                    onClick={() => setTheme(active ? 'All' : t)}
                  >
                    {t}
                  </Button>
                );
              })}
              <div className="hidden md:block">
                <label className="sr-only" htmlFor="theme">
                  Theme
                </label>
              </div>
              <select
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeFilter)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm md:w-[220px]"
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filtered.length}</span>
              </div>
              <Button type="button" variant="ghost" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold">No matches</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try clearing filters or searching with fewer keywords.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button onClick={resetFilters}>Reset filters</Button>
                  <Button asChild variant="outline">
                    <Link href="/requests/new">Plan without browsing</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => (
                <DestinationCard key={d.id} destination={d} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
