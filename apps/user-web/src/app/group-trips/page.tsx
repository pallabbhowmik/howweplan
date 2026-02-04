'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Ticket,
  MapPin,
  Calendar,
  ChevronRight,
  Sparkles,
  DollarSign,
  Crown,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupTripsProvider, useGroupTrips, GroupTrip, TripStatus } from '@/lib/group-trips';
import { cn } from '@/lib/utils';

const statusColors: Record<TripStatus, { bg: string; text: string; label: string }> = {
  planning: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Planning' },
  voting: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Voting' },
  booked: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Booked' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Progress' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
};

function TripCard({ trip }: { trip: GroupTrip }) {
  const confirmedMembers = trip.members.filter(m => m.status === 'confirmed').length;
  const budgetProgress = trip.budget.total > 0 
    ? (trip.budget.collected / trip.budget.total) * 100 
    : 0;
  const statusStyle = statusColors[trip.status];

  return (
    <Link href={`/group-trip/${trip.id}`}>
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all group overflow-hidden">
        {/* Cover Image */}
        <div className="relative h-40">
          <img
            src={trip.coverImage}
            alt={trip.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          {/* Status Badge */}
          <Badge className={cn(
            "absolute top-3 right-3 border-0",
            statusStyle.bg, statusStyle.text
          )}>
            {statusStyle.label}
          </Badge>

          {/* Trip Info Overlay */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <h3 className="text-lg font-bold truncate">{trip.name}</h3>
            {trip.destination && (
              <div className="flex items-center gap-1 text-white/80 text-sm">
                <MapPin className="h-3 w-3" />
                {trip.destination}
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          {/* Dates */}
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
            <Calendar className="h-4 w-4" />
            {trip.dates.startDate ? (
              <span>
                {new Date(trip.dates.startDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
                {trip.dates.endDate && (
                  <>
                    {' - '}
                    {new Date(trip.dates.endDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </>
                )}
              </span>
            ) : (
              <span className="text-slate-400">Dates not set</span>
            )}
          </div>

          {/* Members */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {trip.members.slice(0, 4).map(member => (
                  <Avatar key={member.id} className="h-7 w-7 border-2 border-white">
                    <AvatarImage src={member.avatar || ''} alt={member.name} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {trip.members.length > 4 && (
                  <div className="h-7 w-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-slate-600">+{trip.members.length - 4}</span>
                  </div>
                )}
              </div>
              <span className="text-sm text-slate-600">
                {confirmedMembers} confirmed
              </span>
            </div>
          </div>

          {/* Budget Progress */}
          {trip.budget.total > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-500">Budget</span>
                <span className="font-medium text-slate-700">
                  ${trip.budget.collected.toLocaleString()} / ${trip.budget.total.toLocaleString()}
                </span>
              </div>
              <Progress value={budgetProgress} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function TripCardSkeleton() {
  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <Skeleton className="h-40 rounded-none" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function GroupTripsContent() {
  const { trips, tripsLoading, refreshTrips, currentUser } = useGroupTrips();

  useEffect(() => {
    refreshTrips();
  }, [refreshTrips]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Group Trip Planning</h1>
              <p className="text-white/80 text-lg">
                Plan trips with friends, vote on destinations, and split expenses effortlessly
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/group-trip/join">
                <Button className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0">
                  <Ticket className="h-4 w-4 mr-2" />
                  Join Trip
                </Button>
              </Link>
              <Link href="/group-trip/new">
                <Button className="bg-white text-indigo-600 hover:bg-slate-100">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Trip
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, label: 'My Trips', value: trips.length, color: 'bg-indigo-500' },
            { icon: Clock, label: 'Planning', value: trips.filter(t => t.status === 'planning' || t.status === 'voting').length, color: 'bg-purple-500' },
            { icon: Sparkles, label: 'Booked', value: trips.filter(t => t.status === 'booked' || t.status === 'in_progress').length, color: 'bg-emerald-500' },
            { icon: DollarSign, label: 'Total Expenses', value: `$${trips.reduce((sum, t) => sum + t.budget.collected, 0).toLocaleString()}`, color: 'bg-amber-500' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-0 shadow-lg">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", stat.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trips Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Your Group Trips</h2>
          <p className="text-slate-500">Manage and collaborate on trips with your friends</p>
        </div>

        {tripsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <TripCardSkeleton key={i} />
            ))}
          </div>
        ) : trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
            
            {/* Create New Card */}
            <Link href="/group-trip/new">
              <Card className="border-2 border-dashed border-slate-200 shadow-none hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer h-full min-h-[280px]">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">Create New Trip</h3>
                  <p className="text-sm text-slate-500 text-center">
                    Start planning your next adventure
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Group Trips Yet</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Create your first group trip or join one using an invite code from a friend.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/group-trip/join">
                  <Button variant="outline">
                    <Ticket className="h-4 w-4 mr-2" />
                    Join with Code
                  </Button>
                </Link>
                <Link href="/group-trip/new">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Trip
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Why Plan Together?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🗳️',
                title: 'Destination Voting',
                description: 'Let everyone vote on where to go. The best ideas win!'
              },
              {
                icon: '💰',
                title: 'Expense Splitting',
                description: 'Track who paid what and split costs fairly among the group'
              },
              {
                icon: '👥',
                title: 'Member Management',
                description: 'Invite friends with a simple code and manage your travel group'
              },
              {
                icon: '📅',
                title: 'Activity Planning',
                description: 'Plan activities together and see who wants to join each one'
              },
              {
                icon: '📊',
                title: 'Budget Tracking',
                description: 'Keep track of your group budget and see progress in real-time'
              },
              {
                icon: '🤝',
                title: 'Settlement Suggestions',
                description: 'Smart suggestions on who should pay whom to settle up'
              },
            ].map(feature => (
              <Card key={feature.title} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="font-semibold text-slate-800 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 mt-12">
          <CardContent className="p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">Ready for Your Next Adventure?</h2>
            <p className="text-white/80 mb-6">
              Start planning with your friends today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/group-trip/new">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-slate-100">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create Group Trip
                </Button>
              </Link>
              <Link href="/travel-advisors">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Browse Travel Advisors
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function GroupTripsPage() {
  return (
    <GroupTripsProvider>
      <GroupTripsContent />
    </GroupTripsProvider>
  );
}
