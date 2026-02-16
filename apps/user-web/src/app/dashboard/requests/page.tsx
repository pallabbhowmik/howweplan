'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  ChevronRight,
  Globe,
  Plane,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUserSession } from '@/lib/user/session';
import { fetchUserRequests, type TravelRequest } from '@/lib/data/api';
import { useDebounce } from '@/lib/utils/debounce';

import { usePageTitle } from '@/hooks/use-page-title';

export default function RequestsPage() {
  usePageTitle('My Requests');
  const { user, loading: userLoading } = useUserSession();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;

    const loadRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUserRequests(user.userId);
        if (cancelled) return;
        setRequests(data);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading requests:', error);
        setError('Failed to load your travel requests. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRequests();
    return () => { cancelled = true; };
  }, [user?.userId]);

  // Filter requests based on debounced search and status
  const filteredRequests = requests.filter(request => {
    const matchesSearch = debouncedSearchQuery === '' || 
      (request.destination?.label || request.destination?.city || request.title || '')
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase());
    
    const normalizedState = normalizeStatus(request.state);
    const matchesStatus = filterStatus === 'all' || 
      normalizedState === filterStatus ||
      (filterStatus === 'ACTIVE' && ['OPEN', 'SUBMITTED', 'MATCHING', 'MATCHED', 'PROPOSALS_RECEIVED'].includes(normalizedState)) ||
      (filterStatus === 'FINISHED' && ['BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(normalizedState));
    
    return matchesSearch && matchesStatus;
  });

  if (userLoading || loading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        {/* Hero skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-72 bg-slate-100 rounded" />
          </div>
          <div className="h-10 w-40 bg-blue-100 rounded-lg" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-7 w-10 bg-slate-300 rounded" />
            </div>
          ))}
        </div>
        {/* Search + filter skeleton */}
        <div className="flex gap-3">
          <div className="h-10 flex-1 bg-slate-100 rounded-lg" />
          <div className="h-10 w-24 bg-slate-100 rounded-lg" />
          <div className="h-10 w-24 bg-slate-100 rounded-lg" />
        </div>
        {/* Request card skeletons - ticket shape */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="h-1 bg-slate-200" />
            <div className="flex">
              <div className="flex-1 p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                    <div className="space-y-1">
                      <div className="h-2.5 w-20 bg-slate-200 rounded" />
                      <div className="h-2 w-14 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-[52px] h-[52px] bg-slate-200 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2.5 pt-1">
                    <div className="h-6 w-32 bg-slate-200 rounded" />
                    <div className="flex gap-2">
                      <div className="h-6 w-20 bg-slate-100 rounded-md" />
                      <div className="h-6 w-20 bg-slate-100 rounded-md" />
                      <div className="h-6 w-16 bg-blue-50 rounded-md" />
                    </div>
                  </div>
                </div>
                <div className="border-t border-dashed border-slate-100 pt-4 grid grid-cols-3 gap-2.5">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="bg-slate-50 rounded-lg p-2.5 space-y-1.5">
                      <div className="h-2 w-12 bg-slate-200 rounded" />
                      <div className="h-3.5 w-20 bg-slate-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden md:flex flex-col items-center py-4">
                <div className="w-6 h-3 bg-slate-100 rounded-b-full" />
                <div className="flex-1 flex flex-col gap-1.5 py-2 items-center">
                  {[...Array(8)].map((_, j) => <div key={j} className="w-1 h-1 bg-slate-200 rounded-full" />)}
                </div>
                <div className="w-6 h-3 bg-slate-100 rounded-t-full" />
              </div>
              <div className="hidden md:flex flex-col items-center justify-center w-48 bg-slate-50 p-5 gap-3">
                <div className="w-14 h-14 bg-slate-200 rounded-full" />
                <div className="h-3 w-20 bg-slate-200 rounded" />
                <div className="h-8 w-full bg-slate-200 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header - Active Requests Only */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Globe className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">My Travel Requests</h1>
              <p className="text-blue-100 mt-2 text-lg">
                <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                  </span>
                  <span className="font-semibold text-white">
                    {requests.filter(r => ['OPEN', 'SUBMITTED', 'MATCHING', 'MATCHED', 'PROPOSALS_RECEIVED'].includes(normalizeStatus(r.state))).length}
                  </span>
                  <span className="text-blue-100">active request{requests.filter(r => ['OPEN', 'SUBMITTED', 'MATCHING', 'MATCHED', 'PROPOSALS_RECEIVED'].includes(normalizeStatus(r.state))).length !== 1 ? 's' : ''}</span>
                </span>
              </p>
            </div>
          </div>
          <Link href="/requests/new">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold h-12 px-6">
              <Plus className="h-5 w-5 mr-2" />
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search by destination..." 
            className="pl-12 h-12 border-slate-200 bg-white shadow-sm" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All', emoji: '📋', color: 'from-slate-500 to-slate-600' },
            { key: 'ACTIVE', label: 'Active', emoji: '🔵', color: 'from-blue-500 to-indigo-500' },
            { key: 'OPEN', label: 'Open', emoji: '✨', color: 'from-cyan-500 to-blue-500' },
            { key: 'PROPOSALS_RECEIVED', label: 'Has Proposals', emoji: '🔥', color: 'from-amber-500 to-orange-500' },
            { key: 'BOOKED', label: 'Booked', emoji: '🎉', color: 'from-green-500 to-emerald-500' },
            { key: 'CANCELLED', label: 'Cancelled', emoji: '❌', color: 'from-red-500 to-rose-500' },
          ].map((filter) => (
            <Button
              key={filter.key}
              variant={filterStatus === filter.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(filter.key)}
              className={`
                transition-all duration-200 font-medium
                ${filterStatus === filter.key 
                  ? `bg-gradient-to-r ${filter.color} border-0 text-white shadow-lg transform scale-105` 
                  : 'hover:bg-slate-50 hover:scale-102'
                }
              `}
            >
              <span className="mr-1.5">{filter.emoji}</span>
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Requests List - Vivid Boarding Pass */}
      <div className="space-y-6">
        {filteredRequests.map((request) => {
          const tripDays = getTripDuration(request.departureDate, request.returnDate);
          const travelersCount = getTravelersCount(request.travelers);
          const destinationCity = getDestination(request);
          const normalized = normalizeStatus(request.state);
          const depDate = request.departureDate ? new Date(request.departureDate) : null;
          const retDate = request.returnDate ? new Date(request.returnDate) : null;
          
          return (
            <Link key={request.id} href={`/dashboard/requests/${request.id}`} className="block group">
              <div className={`
                relative rounded-2xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1
                border-[2.5px] border-dashed border-amber-400/40
                shadow-[0_4px_24px_rgba(0,0,0,0.12)]
                hover:shadow-[0_12px_44px_rgba(0,0,0,0.2)]
                ${normalized === 'EXPIRED' || normalized === 'CANCELLED' ? 'opacity-85 hover:opacity-100' : ''}
              `}>
                <div className="flex flex-col md:flex-row">
                  {/* === LEFT: Dark Teal Boarding Pass Body === */}
                  <div className={`flex-1 relative min-w-0 overflow-hidden ${getTicketBg(request.state)}`}>
                    {/* Ambient glow layers */}
                    <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                    <div className="absolute top-1/4 -left-10 w-40 h-40 rounded-full bg-teal-300/10 blur-3xl pointer-events-none" />

                    {/* Gold palm leaf decorations */}
                    {/* Trunk */}
                    <div className="absolute right-[15%] bottom-0 w-[3px] h-[55%] bg-gradient-to-t from-amber-600/20 to-amber-500/10 rounded-full rotate-[6deg] pointer-events-none" />
                    {/* Leaves fanning out */}
                    <div className="absolute right-[8%] top-[18%] w-24 h-3 bg-gradient-to-l from-amber-500/15 to-transparent rounded-full -rotate-[30deg] pointer-events-none" />
                    <div className="absolute right-[10%] top-[12%] w-28 h-3 bg-gradient-to-l from-amber-500/12 to-transparent rounded-full -rotate-[50deg] pointer-events-none" />
                    <div className="absolute right-[6%] top-[25%] w-20 h-2.5 bg-gradient-to-l from-amber-500/12 to-transparent rounded-full -rotate-[10deg] pointer-events-none" />
                    <div className="absolute right-[18%] top-[10%] w-24 h-3 bg-gradient-to-r from-amber-500/12 to-transparent rounded-full rotate-[35deg] pointer-events-none" />
                    <div className="absolute right-[22%] top-[15%] w-20 h-2.5 bg-gradient-to-r from-amber-500/10 to-transparent rounded-full rotate-[55deg] pointer-events-none" />
                    {/* Second smaller palm */}
                    <div className="absolute right-[40%] bottom-0 w-[2px] h-[35%] bg-gradient-to-t from-amber-600/15 to-amber-500/5 rounded-full -rotate-[4deg] pointer-events-none" />
                    <div className="absolute right-[35%] top-[38%] w-16 h-2 bg-gradient-to-l from-amber-500/10 to-transparent rounded-full -rotate-[25deg] pointer-events-none" />
                    <div className="absolute right-[42%] top-[35%] w-16 h-2 bg-gradient-to-r from-amber-500/10 to-transparent rounded-full rotate-[30deg] pointer-events-none" />

                    {/* Content */}
                    <div className="relative p-5 md:p-6">
                      {/* "BOARDING PASS" header */}
                      <h2
                        className="text-[22px] md:text-[28px] font-black italic tracking-[0.08em] text-white/90 select-none"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.1)' }}
                      >
                        BOARDING PASS
                      </h2>

                      {/* Plane + DESTINATION */}
                      <div className="flex items-center gap-2 md:gap-3 mt-1 mb-5">
                        <Plane className="h-8 w-8 md:h-10 md:w-10 text-amber-300/60 -rotate-[20deg] shrink-0 drop-shadow-lg" />
                        <h3
                          className="text-[42px] md:text-[56px] font-black text-white tracking-tight leading-none truncate"
                          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3), 0 0 40px rgba(255,255,255,0.08)' }}
                        >
                          {destinationCity.toUpperCase()}
                        </h3>
                      </div>

                      {/* Data fields with colored label badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mb-4">
                        {/* Passengers */}
                        <div>
                          <span className="inline-block bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[9px] font-extrabold tracking-[0.15em] uppercase px-2.5 py-[3px] rounded-[3px] shadow-sm">
                            Passengers:
                          </span>
                          <p className="text-xl font-black text-white mt-1.5 pl-0.5">{travelersCount}</p>
                        </div>
                        {/* Depart */}
                        <div>
                          <span className="inline-block bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-extrabold tracking-[0.15em] uppercase px-2.5 py-[3px] rounded-[3px] shadow-sm">
                            Depart:
                          </span>
                          <p className="text-[13px] font-bold text-white/90 mt-1.5 pl-0.5">
                            {depDate ? depDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </p>
                        </div>
                        {/* Return */}
                        <div>
                          <span className="inline-block bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-extrabold tracking-[0.15em] uppercase px-2.5 py-[3px] rounded-[3px] shadow-sm">
                            Return:
                          </span>
                          <p className="text-[13px] font-bold text-white/90 mt-1.5 pl-0.5">
                            {retDate ? retDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </p>
                        </div>
                        {/* Duration */}
                        <div>
                          <span className="inline-block bg-gradient-to-r from-orange-400 to-amber-500 text-white text-[9px] font-extrabold tracking-[0.15em] uppercase px-2.5 py-[3px] rounded-[3px] shadow-sm">
                            Duration:
                          </span>
                          <p className="text-[13px] font-bold text-white/90 mt-1.5 pl-0.5">
                            {tripDays ? `${tripDays} Day${tripDays !== 1 ? 's' : ''}` : '—'}
                          </p>
                        </div>
                        {/* Budget */}
                        {request.budgetMax && (
                          <div className="col-span-2 sm:col-span-2">
                            <span className="inline-block bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-[9px] font-extrabold tracking-[0.15em] uppercase px-2.5 py-[3px] rounded-[3px] shadow-sm">
                              Budget:
                            </span>
                            <p className="text-[13px] font-bold text-white/90 mt-1.5 pl-0.5">
                              {formatBudget(request.budgetMin, request.budgetMax)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Barcode */}
                      <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                        <div className="flex gap-[1.5px] items-end h-6">
                          {request.id.split('').slice(0, 32).map((char, i) => {
                            const h = 8 + (char.charCodeAt(0) % 14);
                            const w = i % 3 === 0 ? 2.5 : 1.5;
                            return (
                              <div key={i} className="bg-amber-300/30 rounded-[0.5px]" style={{ width: `${w}px`, height: `${h}px` }} />
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Wax Seal Stamp for terminal statuses */}
                    {['EXPIRED', 'CANCELLED', 'COMPLETED', 'CONFIRMED', 'BOOKED'].includes(normalized) && (
                      <div className="absolute bottom-8 right-6 md:bottom-10 md:right-16 pointer-events-none select-none z-10">
                        <div className={`w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full flex items-center justify-center ${getWaxSealBg(normalized)}`}
                          style={{ boxShadow: `inset 0 2px 6px rgba(0,0,0,0.3), inset 0 -1px 3px rgba(255,255,255,0.15), 0 4px 16px ${getWaxSealShadow(normalized)}` }}
                        >
                          <div className="w-[54px] h-[54px] md:w-[66px] md:h-[66px] rounded-full border-2 border-white/20 flex items-center justify-center">
                            <span className="text-[10px] md:text-xs font-black text-white tracking-[0.1em] uppercase text-center leading-tight"
                              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                              {_getStatusLabel(request.state)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* === Perforation (desktop vertical) === */}
                  <div className="relative hidden md:flex flex-col items-center justify-between" style={{ background: 'linear-gradient(to bottom, #d4a843, #c9973a, #d4a843)' }}>
                    <div className="w-6 h-3 rounded-b-full -mt-[1px] z-10" style={{ backgroundColor: 'rgb(248 250 252)' }} />
                    <div className="flex-1 flex flex-col items-center justify-center gap-[5px] py-1">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="w-[4px] h-[4px] rounded-full bg-amber-900/20" />
                      ))}
                    </div>
                    <div className="w-6 h-3 rounded-t-full -mb-[1px] z-10" style={{ backgroundColor: 'rgb(248 250 252)' }} />
                  </div>
                  {/* Mobile horizontal perforation */}
                  <div className="md:hidden relative flex items-center" style={{ background: 'linear-gradient(to right, #d4a843, #c9973a, #d4a843)' }}>
                    <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-3 h-6 rounded-r-full z-10" style={{ backgroundColor: 'rgb(248 250 252)' }} />
                    <div className="flex-1 flex items-center justify-center gap-[5px] px-5 py-1.5">
                      {Array.from({ length: 28 }).map((_, i) => (
                        <div key={i} className="w-[4px] h-[4px] rounded-full bg-amber-900/20 shrink-0" />
                      ))}
                    </div>
                    <div className="absolute -right-[1px] top-1/2 -translate-y-1/2 w-3 h-6 rounded-l-full z-10" style={{ backgroundColor: 'rgb(248 250 252)' }} />
                  </div>

                  {/* === RIGHT: Golden Stub === */}
                  <div className="w-full md:w-52 relative overflow-hidden">
                    {/* Golden gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-200" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-amber-300/20" />

                    <div className="relative flex flex-row md:flex-col items-stretch justify-between gap-3 p-4 md:px-4 md:py-5">
                      {/* Small red status badge on stub */}
                      {['EXPIRED', 'CANCELLED'].includes(normalized) && (
                        <div className="hidden md:flex absolute top-3 right-3 z-20">
                          <span className="bg-red-500 text-white text-[8px] font-black tracking-[0.15em] uppercase px-2 py-0.5 rounded shadow-sm">
                            {_getStatusLabel(request.state)}
                          </span>
                        </div>
                      )}

                      {/* Request details */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-3 w-full md:mt-1">
                        <div>
                          <p className="text-[9px] font-bold tracking-[0.2em] text-amber-700/60 uppercase mb-0.5">Status:</p>
                          <p className="text-base font-black text-amber-950">{_getStatusLabel(request.state)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold tracking-[0.2em] text-amber-700/60 uppercase mb-0.5">Agents:</p>
                          <p className="text-lg font-black text-amber-950">{request.agentsResponded || 0}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold tracking-[0.2em] text-amber-700/60 uppercase mb-0.5">Style:</p>
                          <p className="text-sm font-bold text-amber-950 capitalize">{request.travelStyle || 'Any'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold tracking-[0.2em] text-amber-700/60 uppercase mb-0.5">Country:</p>
                          <p className="text-sm font-bold text-amber-950">India</p>
                        </div>
                      </div>

                      {/* Dashed separator */}
                      <div className="hidden md:block border-t border-dashed border-amber-600/25 w-full my-1" />

                      {/* QR code + View Details */}
                      <div className="flex md:flex-col items-center gap-3 md:gap-2.5 flex-shrink-0">
                        {/* QR code pattern */}
                        <div className="grid grid-cols-7 gap-[1.5px] w-fit shrink-0 mx-auto">
                          {Array.from({ length: 49 }).map((_, i) => {
                            const row = Math.floor(i / 7);
                            const col = i % 7;
                            const isCorner = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
                            const isBorder = row === 0 || row === 6 || col === 0 || col === 6;
                            const fromId = (request.id.charCodeAt(i % request.id.length) + i) % 3 !== 0;
                            const isActive = isCorner || (isBorder && i % 2 === 0) || fromId;
                            return (
                              <div key={i} className={`w-[5px] h-[5px] rounded-[0.5px] ${isActive ? 'bg-amber-900/50' : 'bg-amber-300/30'}`} />
                            );
                          })}
                        </div>

                        <Button
                          size="sm"
                          className="w-full bg-amber-900/85 hover:bg-amber-950 text-amber-50 text-[11px] font-bold shadow-md rounded-lg transition-all duration-200 group-hover:shadow-lg"
                        >
                          {getButtonText(request.state)}
                          <ChevronRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </div>

                      {/* Decorative gold star */}
                      <div className="hidden md:flex absolute bottom-3 right-3 text-amber-500/40 pointer-events-none">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredRequests.length === 0 && !loading && (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            {requests.length === 0 ? (
              <div className="space-y-4">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <Plane className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">No travel requests yet</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Start your journey by creating your first travel request. Our expert agents will help plan your perfect trip!
                </p>
                <Link href="/requests/new">
                  <Button size="lg" className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Request
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                  <Search className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">No matching requests</h3>
                <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
                <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

// Normalize status to handle both Supabase (lowercase) and Docker (uppercase) schemas
function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    // Supabase lowercase statuses
    'open': 'OPEN',
    'draft': 'DRAFT',
    'submitted': 'SUBMITTED',
    'matching': 'MATCHING',
    'matched': 'MATCHED',
    'proposals_received': 'PROPOSALS_RECEIVED',
    'booked': 'BOOKED',
    'confirmed': 'CONFIRMED',
    'completed': 'COMPLETED',
    'cancelled': 'CANCELLED',
    'expired': 'EXPIRED',
    // Already uppercase
    'OPEN': 'OPEN',
    'DRAFT': 'DRAFT',
    'SUBMITTED': 'SUBMITTED',
    'MATCHING': 'MATCHING',
    'MATCHED': 'MATCHED',
    'PROPOSALS_RECEIVED': 'PROPOSALS_RECEIVED',
    'BOOKED': 'BOOKED',
    'CONFIRMED': 'CONFIRMED',
    'COMPLETED': 'COMPLETED',
    'CANCELLED': 'CANCELLED',
    'EXPIRED': 'EXPIRED',
  };
  return statusMap[status] || status.toUpperCase();
}

function _getStatusLabel(status: string): string {
  const normalized = normalizeStatus(status);
  const labels: Record<string, string> = {
    OPEN: 'Open',
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    MATCHING: 'Matching',
    MATCHED: 'Matched',
    PROPOSALS_RECEIVED: 'Proposals',
    BOOKED: 'Booked',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
  };
  return labels[normalized] || status;
}

function getDestination(request: TravelRequest): string {
  if (typeof request.destination === 'string') {
    return request.destination;
  }
  return request.destination?.label || request.destination?.city || request.title || 'Unknown';
}

function getButtonText(status: string): string {
  const normalized = normalizeStatus(status);
  const texts: Record<string, string> = {
    OPEN: 'View Status',
    DRAFT: 'Complete',
    SUBMITTED: 'View Status',
    MATCHING: 'View Status',
    MATCHED: 'View Agents',
    PROPOSALS_RECEIVED: 'Compare Options',
    BOOKED: 'View Details',
    CONFIRMED: 'View Details',
    COMPLETED: 'View Details',
    CANCELLED: 'View Details',
    EXPIRED: 'View Details',
  };
  return texts[normalized] || 'View';
}

function getTicketGradient(status: string): string {
  const normalized = normalizeStatus(status);
  const gradients: Record<string, string> = {
    OPEN: 'from-blue-400 via-blue-500 to-indigo-500',
    DRAFT: 'from-slate-300 via-slate-400 to-slate-500',
    SUBMITTED: 'from-blue-400 via-blue-500 to-indigo-500',
    MATCHING: 'from-indigo-400 via-indigo-500 to-purple-500',
    MATCHED: 'from-purple-400 via-purple-500 to-pink-500',
    PROPOSALS_RECEIVED: 'from-amber-400 via-orange-500 to-red-400',
    BOOKED: 'from-green-400 via-emerald-500 to-teal-500',
    CONFIRMED: 'from-green-400 via-emerald-500 to-teal-500',
    COMPLETED: 'from-emerald-400 via-emerald-500 to-green-500',
    CANCELLED: 'from-red-400 via-red-500 to-rose-500',
    EXPIRED: 'from-slate-300 via-slate-400 to-slate-500',
  };
  return gradients[normalized] || 'from-slate-300 via-slate-400 to-slate-500';
}

function getStatusColor(status: string): string {
  const normalized = normalizeStatus(status);
  const colors: Record<string, string> = {
    OPEN: 'bg-blue-500',
    DRAFT: 'bg-slate-400',
    SUBMITTED: 'bg-blue-500',
    MATCHING: 'bg-indigo-500',
    MATCHED: 'bg-purple-500',
    PROPOSALS_RECEIVED: 'bg-amber-500',
    BOOKED: 'bg-green-500',
    CONFIRMED: 'bg-green-500',
    COMPLETED: 'bg-emerald-500',
    CANCELLED: 'bg-red-500',
    EXPIRED: 'bg-slate-500',
  };
  return colors[normalized] || 'bg-slate-400';
}

function getStatusBgColor(status: string): string {
  const normalized = normalizeStatus(status);
  const colors: Record<string, string> = {
    OPEN: 'bg-blue-100',
    DRAFT: 'bg-slate-100',
    SUBMITTED: 'bg-blue-100',
    MATCHING: 'bg-indigo-100',
    MATCHED: 'bg-purple-100',
    PROPOSALS_RECEIVED: 'bg-amber-100',
    BOOKED: 'bg-green-100',
    CONFIRMED: 'bg-green-100',
    COMPLETED: 'bg-emerald-100',
    CANCELLED: 'bg-red-100',
    EXPIRED: 'bg-slate-100',
  };
  return colors[normalized] || 'bg-slate-100';
}

function getStatusIconColor(status: string): string {
  const normalized = normalizeStatus(status);
  const colors: Record<string, string> = {
    OPEN: 'text-blue-600',
    DRAFT: 'text-slate-600',
    SUBMITTED: 'text-blue-600',
    MATCHING: 'text-indigo-600',
    MATCHED: 'text-purple-600',
    PROPOSALS_RECEIVED: 'text-amber-600',
    BOOKED: 'text-green-600',
    CONFIRMED: 'text-green-600',
    COMPLETED: 'text-emerald-600',
    CANCELLED: 'text-red-600',
    EXPIRED: 'text-slate-600',
  };
  return colors[normalized] || 'text-slate-600';
}

function getTripDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
}

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return 'Dates not set';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
}

function formatBudget(min: number | null, max: number | null): string {
  if (min && max) {
    return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
  }
  if (max) return `Up to ₹${max.toLocaleString('en-IN')}`;
  if (min) return `From ₹${min.toLocaleString('en-IN')}`;
  return 'Flexible';
}

function getTravelersCount(travelers: { adults?: number; children?: number; infants?: number; total?: number }): number {
  if (!travelers) return 1;
  if (travelers.total) return travelers.total;
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0) || 1;
}

// Dark teal/emerald background per status
function getTicketBg(status: string): string {
  const normalized = normalizeStatus(status);
  const bgs: Record<string, string> = {
    OPEN: 'bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800',
    DRAFT: 'bg-gradient-to-br from-slate-600 via-slate-500 to-slate-700',
    SUBMITTED: 'bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800',
    MATCHING: 'bg-gradient-to-br from-indigo-800 via-indigo-700 to-violet-800',
    MATCHED: 'bg-gradient-to-br from-purple-800 via-purple-700 to-indigo-800',
    PROPOSALS_RECEIVED: 'bg-gradient-to-br from-teal-800 via-emerald-700 to-cyan-800',
    BOOKED: 'bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-800',
    CONFIRMED: 'bg-gradient-to-br from-emerald-800 via-green-700 to-teal-800',
    COMPLETED: 'bg-gradient-to-br from-green-800 via-emerald-700 to-teal-800',
    CANCELLED: 'bg-gradient-to-br from-stone-700 via-stone-600 to-stone-700',
    EXPIRED: 'bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900',
  };
  return bgs[normalized] || 'bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800';
}

function getWaxSealBg(normalized: string): string {
  if (['EXPIRED', 'CANCELLED'].includes(normalized)) return 'bg-gradient-to-br from-red-600 via-red-700 to-red-800';
  if (['BOOKED', 'CONFIRMED'].includes(normalized)) return 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700';
  if (normalized === 'COMPLETED') return 'bg-gradient-to-br from-green-500 via-green-600 to-green-700';
  return 'bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700';
}

function getWaxSealShadow(normalized: string): string {
  if (['EXPIRED', 'CANCELLED'].includes(normalized)) return 'rgba(220,38,38,0.4)';
  if (['BOOKED', 'CONFIRMED'].includes(normalized)) return 'rgba(16,185,129,0.4)';
  if (normalized === 'COMPLETED') return 'rgba(22,163,74,0.4)';
  return 'rgba(100,116,139,0.4)';
}

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  
  const config: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    OPEN: { label: 'Open', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    DRAFT: { label: 'Draft', bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
    SUBMITTED: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    MATCHING: { label: 'Matching', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    MATCHED: { label: 'Matched', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    PROPOSALS_RECEIVED: { label: 'Has Proposals', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    BOOKED: { label: 'Booked', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    CONFIRMED: { label: 'Confirmed', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
    EXPIRED: { label: 'Expired', bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' },
  };

  const { label, bg, text, dot } = config[normalized] || { label: status, bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
