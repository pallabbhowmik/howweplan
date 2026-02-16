'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  Loader2,
  MapPin,
  Wallet,
  ChevronRight,
  Sparkles,
  Clock,
  Globe,
  Plane,
  AlertTriangle,
  ArrowRight,
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
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-12 bg-slate-100 rounded" />
                    <div className="h-5 w-24 bg-slate-200 rounded" />
                  </div>
                  <div className="w-28 flex items-center gap-1">
                    <div className="h-2 w-2 bg-slate-200 rounded-full" />
                    <div className="flex-1 h-px bg-slate-200" />
                    <div className="h-4 w-4 bg-slate-200 rounded-full" />
                    <div className="flex-1 h-px bg-slate-200" />
                    <div className="h-2 w-2 bg-slate-200 rounded-full" />
                  </div>
                  <div className="flex-1 space-y-1.5 text-right">
                    <div className="h-2 w-14 bg-slate-100 rounded ml-auto" />
                    <div className="h-6 w-28 bg-slate-200 rounded ml-auto" />
                  </div>
                </div>
                <div className="border-t border-dashed border-slate-100 pt-4 grid grid-cols-4 gap-2.5">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="bg-slate-50 rounded-lg p-2.5 space-y-1.5">
                      <div className="h-2 w-8 bg-slate-200 rounded" />
                      <div className="h-3.5 w-16 bg-slate-200 rounded" />
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

      {/* Requests List - Premium Boarding Pass Style */}
      <div className="space-y-6">
        {filteredRequests.map((request) => {
          const tripDays = getTripDuration(request.departureDate, request.returnDate);
          const travelersCount = getTravelersCount(request.travelers);
          const departureCity = request.departureLocation?.city || null;
          const destinationCity = getDestination(request);
          const normalized = normalizeStatus(request.state);
          const depDate = request.departureDate ? new Date(request.departureDate) : null;
          const retDate = request.returnDate ? new Date(request.returnDate) : null;
          const hasDeparture = !!departureCity;
          
          return (
            <Link key={request.id} href={`/dashboard/requests/${request.id}`} className="block group">
              <div className={`
                relative rounded-2xl transition-all duration-300 overflow-hidden group-hover:-translate-y-1
                bg-white border border-slate-200/60
                shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06)]
                hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_12px_40px_rgba(0,0,0,0.1)]
                ${normalized === 'EXPIRED' || normalized === 'CANCELLED' ? 'opacity-75 hover:opacity-100' : ''}
              `}>
                {/* Subtle ticket texture overlay */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23000\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")'}} />
                
                {/* Gradient accent top edge */}
                <div className={`h-1 bg-gradient-to-r ${getTicketGradient(request.state)}`} />
                
                <div className="flex flex-col md:flex-row">
                  {/* === LEFT: Main Ticket Body === */}
                  <div className="flex-1 relative min-w-0">
                    {/* Watermark plane */}
                    <div className="absolute top-4 right-4 opacity-[0.03] pointer-events-none">
                      <Plane className="h-32 w-32 text-slate-900" />
                    </div>
                    
                    <div className="p-5 md:p-6 pb-0 relative">
                      {/* Header: Brand + Status + Request ID */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getTicketGradient(request.state)} flex items-center justify-center shadow-sm ring-1 ring-black/5`}>
                            <Plane className="h-4 w-4 text-white -rotate-45" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase block leading-none">HowWePlan</span>
                            <span className="text-[9px] tracking-[0.15em] text-slate-300 uppercase font-medium">Boarding Pass</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-mono text-slate-300 hidden sm:block tracking-wider">#{request.id.slice(0, 8).toUpperCase()}</span>
                          <StatusBadge status={request.state} />
                        </div>
                      </div>

                      {/* === Route Section === */}
                      {hasDeparture ? (
                        <div className="flex items-stretch gap-3 md:gap-5 mb-5">
                          {/* Departure */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-1">Departure</p>
                            <p className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight truncate">{departureCity}</p>
                            {depDate && (
                              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                                {depDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                          
                          {/* Flight path */}
                          <div className="flex flex-col items-center justify-center shrink-0 w-28 md:w-36 pt-3">
                            <div className="flex items-center w-full gap-0.5">
                              <div className="h-[7px] w-[7px] rounded-full border-2 border-blue-400 bg-white shrink-0" />
                              <div className="flex-1 relative h-[2px]">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-blue-300 rounded-full" />
                                <div className="absolute inset-0 rounded-full" style={{background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 3px, white 3px, white 5px)'}} />
                              </div>
                              <div className="shrink-0 bg-blue-50 rounded-full p-1">
                                <Plane className="h-3.5 w-3.5 text-blue-500" />
                              </div>
                              <div className="flex-1 relative h-[2px]">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-300 to-indigo-200 rounded-full" />
                                <div className="absolute inset-0 rounded-full" style={{background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 3px, white 3px, white 5px)'}} />
                              </div>
                              <div className="h-[7px] w-[7px] rounded-full bg-indigo-500 shrink-0" />
                            </div>
                            {tripDays && (
                              <span className="text-[10px] text-slate-400 font-semibold mt-1.5 bg-slate-50 px-2 py-0.5 rounded-full">
                                {tripDays}D{tripDays > 1 ? ` / ${tripDays - 1}N` : ''}
                              </span>
                            )}
                          </div>
                          
                          {/* Destination */}
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-1">Destination</p>
                            <p className="text-lg md:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">{destinationCity}</p>
                            {retDate && (
                              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                                {retDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Destination-hero layout */
                        <div className="flex items-center gap-4 mb-5">
                          <div className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${getTicketGradient(request.state)} flex items-center justify-center shadow-lg ring-1 ring-black/5`}>
                            <MapPin className="h-7 w-7 text-white drop-shadow-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate leading-tight">
                              {destinationCity}
                            </p>
                            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                              {depDate && retDate && (
                                <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                                  {depDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {' '}&ndash;{' '}
                                  {retDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              )}
                              {tripDays && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[11px] font-bold text-blue-600 ring-1 ring-blue-100">
                                  {tripDays}D{tripDays > 1 ? ` / ${tripDays - 1}N` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Info Cells — boarding pass style with icons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-dashed border-slate-200">
                        <div className="bg-gradient-to-b from-slate-50 to-white rounded-lg px-3 py-2.5 ring-1 ring-slate-100">
                          <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            Date
                          </p>
                          <p className="text-[13px] font-bold text-slate-700">
                            {formatDateRange(request.departureDate, request.returnDate)}
                          </p>
                        </div>
                        <div className="bg-gradient-to-b from-slate-50 to-white rounded-lg px-3 py-2.5 ring-1 ring-slate-100">
                          <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            Passengers
                          </p>
                          <p className="text-[13px] font-bold text-slate-700">
                            {travelersCount} pax
                          </p>
                        </div>
                        <div className="bg-gradient-to-b from-slate-50 to-white rounded-lg px-3 py-2.5 ring-1 ring-slate-100">
                          <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <Wallet className="h-2.5 w-2.5" />
                            Budget
                          </p>
                          <p className="text-[13px] font-bold text-slate-700 truncate">
                            {request.budgetMax ? formatBudget(request.budgetMin, request.budgetMax) : 'Flexible'}
                          </p>
                        </div>
                        <div className="bg-gradient-to-b from-slate-50 to-white rounded-lg px-3 py-2.5 ring-1 ring-slate-100">
                          <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            Duration
                          </p>
                          <p className="text-[13px] font-bold text-slate-700">
                            {tripDays ? `${tripDays} day${tripDays !== 1 ? 's' : ''}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Barcode strip */}
                    <div className="px-5 md:px-6 py-3 flex items-center justify-between">
                      <div className="flex gap-[1.5px] items-end h-5 opacity-15">
                        {request.id.split('').slice(0, 24).map((char, i) => {
                          const h = 6 + (char.charCodeAt(0) % 12);
                          const w = i % 3 === 0 ? 2.5 : 1.5;
                          return (
                            <div
                              key={i}
                              className="bg-slate-900 rounded-[0.5px]"
                              style={{ width: `${w}px`, height: `${h}px` }}
                            />
                          );
                        })}
                      </div>
                      <span className="text-[9px] font-mono text-slate-300 tracking-widest select-none">{request.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* === Perforated Divider === */}
                  <div className="relative hidden md:flex flex-col items-center justify-between py-0">
                    {/* Top semicircle cutout */}
                    <div className="w-6 h-3 bg-slate-50 rounded-b-full -mt-[1px] relative z-10 border-b border-x border-slate-200/60" />
                    {/* Perforation dots */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-[6px] py-2">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="w-[5px] h-[5px] rounded-full bg-slate-200/80" />
                      ))}
                    </div>
                    {/* Bottom semicircle cutout */}
                    <div className="w-6 h-3 bg-slate-50 rounded-t-full -mb-[1px] relative z-10 border-t border-x border-slate-200/60" />
                  </div>
                  {/* Mobile horizontal divider */}
                  <div className="md:hidden relative flex items-center mx-0 my-0">
                    <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-50 rounded-r-full border-r border-y border-slate-200/60 z-10" />
                    <div className="flex-1 flex items-center justify-center gap-[6px] px-6">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="w-[5px] h-[5px] rounded-full bg-slate-200/80 shrink-0" />
                      ))}
                    </div>
                    <div className="absolute -right-[1px] top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-50 rounded-l-full border-l border-y border-slate-200/60 z-10" />
                  </div>

                  {/* === RIGHT: Stub / Tear-off === */}
                  <div className="w-full md:w-48 flex flex-row md:flex-col items-center md:items-center justify-between md:justify-center gap-3 p-5 md:p-5 bg-gradient-to-b from-slate-50/80 to-slate-100/60 md:bg-gradient-to-br">
                    {!['DRAFT', 'CANCELLED', 'EXPIRED'].includes(normalized) ? (
                      <div className="text-center">
                        <div className="relative inline-block mb-2">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 flex items-center justify-center ring-2 ring-amber-200/50">
                            <Sparkles className="h-6 w-6 text-amber-500" />
                          </div>
                          {(request.agentsResponded || 0) > 0 && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-white">
                              <span className="text-[10px] font-black text-white">{request.agentsResponded}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-2xl font-black bg-gradient-to-b from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-none block">
                            {request.agentsResponded || 0}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-semibold tracking-wide uppercase leading-tight">
                            agent{(request.agentsResponded || 0) !== 1 ? 's' : ''} responded
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-2 ring-2 ring-slate-200/50 ${getStatusBgColor(request.state)}`}>
                          <MapPin className={`h-6 w-6 ${getStatusIconColor(request.state)}`} />
                        </div>
                        <p className="text-xs text-slate-400 font-semibold capitalize">{_getStatusLabel(request.state)}</p>
                      </div>
                    )}
                    <Button 
                      size="sm"
                      variant={normalized === 'PROPOSALS_RECEIVED' ? 'default' : 'outline'}
                      className={`text-xs font-semibold w-full transition-all duration-200 rounded-lg ${
                        normalized === 'PROPOSALS_RECEIVED' 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-500/20' 
                          : 'bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 shadow-sm ring-1 ring-slate-200/60'
                      }`}
                    >
                      {getButtonText(request.state)}
                      <ChevronRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </div>

                {/* Hover shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent" />
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
