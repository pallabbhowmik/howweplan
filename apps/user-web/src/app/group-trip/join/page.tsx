'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Ticket,
  UserPlus,
  Check,
  AlertCircle,
  Sparkles,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GroupTripsProvider, useGroupTrips, GroupTrip } from '@/lib/group-trips';

function JoinGroupTripForm() {
  const router = useRouter();
  const { joinTripByCode } = useGroupTrips();
  
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundTrip, setFoundTrip] = useState<GroupTrip | null>(null);
  const [joined, setJoined] = useState(false);

  const handleLookup = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Lookup trip first (we'll actually join when user confirms)
      const result = await joinTripByCode(inviteCode.trim().toUpperCase());
      setFoundTrip(result.trip);
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToTrip = () => {
    if (foundTrip) {
      router.push(`/group-trip/${foundTrip.id}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !joined) {
      handleLookup();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/group-trip">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Join Group Trip</h1>
              <p className="text-sm text-slate-500">Enter your invite code to join</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {!joined ? (
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="h-8 w-8 text-indigo-600" />
              </div>
              <CardTitle className="text-2xl">Enter Invite Code</CardTitle>
              <p className="text-slate-500 mt-2">
                Your group organizer should have shared a 6-character code with you
              </p>
            </CardHeader>
            <CardContent className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <Input
                    placeholder="e.g., ABC123"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    className="text-center text-3xl font-mono tracking-[0.5em] h-16 uppercase"
                    maxLength={8}
                  />
                </div>

                <Button
                  onClick={handleLookup}
                  disabled={loading || !inviteCode.trim()}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {loading ? (
                    <span className="animate-pulse">Looking up...</span>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      Join Group Trip
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <p className="text-sm text-slate-500 text-center">
                  Don't have a code?{' '}
                  <Link href="/group-trip/new" className="text-indigo-600 hover:underline">
                    Create your own group trip
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : foundTrip ? (
          <Card className="border-0 shadow-xl overflow-hidden">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold">You're In!</h2>
              <p className="text-white/80 mt-1">You've successfully joined the group trip</p>
            </div>

            {/* Trip Details */}
            <CardContent className="p-6">
              <div className="relative h-40 rounded-xl overflow-hidden mb-6">
                <img
                  src={foundTrip.coverImage}
                  alt={foundTrip.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-bold">{foundTrip.name}</h3>
                  {foundTrip.destination && (
                    <div className="flex items-center gap-1 mt-1 text-white/80">
                      <MapPin className="h-4 w-4" />
                      {foundTrip.destination}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Travelers</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-800">
                    {foundTrip.members.length} people
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Dates</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-800">
                    {foundTrip.dates.isFlexible 
                      ? 'Flexible' 
                      : foundTrip.dates.startDate 
                        ? new Date(foundTrip.dates.startDate).toLocaleDateString()
                        : 'TBD'
                    }
                  </p>
                </div>
              </div>

              {/* Members */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-600 mb-3">Your Fellow Travelers</h4>
                <div className="flex flex-wrap gap-3">
                  {foundTrip.members.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center gap-2 bg-slate-100 rounded-full py-1 px-3"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar || ''} alt={member.name} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-700">{member.name}</span>
                      {member.role === 'organizer' && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                          Organizer
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGoToTrip}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Go to Trip Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Help Section */}
        <div className="mt-8 p-6 bg-white rounded-xl shadow-lg">
          <h3 className="font-semibold text-slate-800 mb-4">How it works</h3>
          <div className="space-y-4">
            {[
              { step: 1, text: 'Get an invite code from your trip organizer' },
              { step: 2, text: 'Enter the code above to join the group' },
              { step: 3, text: 'Vote on destinations, split expenses, and plan together' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                  {item.step}
                </div>
                <span className="text-slate-600">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinGroupTripPage() {
  return (
    <GroupTripsProvider>
      <JoinGroupTripForm />
    </GroupTripsProvider>
  );
}
