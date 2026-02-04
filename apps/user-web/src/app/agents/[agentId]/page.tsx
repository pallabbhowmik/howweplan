'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  Award, 
  Shield, 
  Clock, 
  CheckCircle,
  Globe,
  Users,
  Briefcase,
  ThumbsUp,
  Heart,
  Sparkles,
  TrendingUp,
  BadgeCheck,
  Plane,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { identityApi } from '@/lib/api/client';

interface AgentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  agencyName: string | null;
  bio: string | null;
  specializations: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  yearsExperience: number;
  tripsCompleted: number;
  responseTime: string;
  languages: string[];
}

export default function AgentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAgent() {
      try {
        setLoading(true);
        const result: any = await identityApi.getAgentProfile(agentId);
        const data = result.data || result;
        
        setAgent({
          id: data.id || agentId,
          userId: data.userId || data.user_id || '',
          firstName: data.firstName || data.first_name || 'Travel',
          lastName: data.lastName || data.last_name || 'Agent',
          email: data.email || '',
          avatarUrl: data.avatarUrl || data.avatar_url || null,
          agencyName: data.agencyName || data.agency_name || null,
          bio: data.bio || 'Experienced travel professional dedicated to creating unforgettable journeys.',
          specializations: data.specializations || ['Adventure', 'Luxury', 'Cultural'],
          rating: data.rating || 4.8,
          reviewCount: data.reviewCount || data.review_count || 0,
          isVerified: data.isVerified || data.is_verified || false,
          yearsExperience: data.yearsExperience || 5,
          tripsCompleted: data.tripsCompleted || data.trips_completed || 50,
          responseTime: data.responseTime || '< 2 hours',
          languages: data.languages || ['English'],
        });
      } catch (err) {
        console.error('Error loading agent:', err);
        setError('Failed to load agent profile');
      } finally {
        setLoading(false);
      }
    }

    if (agentId) {
      loadAgent();
    }
  }, [agentId]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 h-64" />
        <div className="max-w-5xl mx-auto px-6 -mt-32">
          <Card className="overflow-hidden shadow-2xl border-0">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <Skeleton className="w-32 h-32 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2 pt-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardContent className="p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center mx-auto mb-6">
              <Users className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Agent Not Found</h2>
            <p className="text-slate-500 mb-8">{error || 'The travel advisor you\'re looking for doesn\'t exist or has been removed.'}</p>
            <Button onClick={() => router.back()} size="lg" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${agent.firstName} ${agent.lastName}`;
  const satisfactionRate = Math.round(agent.rating * 20);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white" />
          <div className="absolute top-32 right-20 w-24 h-24 rounded-full bg-white" />
          <div className="absolute bottom-10 left-1/3 w-40 h-40 rounded-full bg-white" />
        </div>
        
        {/* Back Button */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-6">
          <Link 
            href="/dashboard/messages" 
            className="inline-flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Link>
        </div>
        
        <div className="h-40" />
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 -mt-24 pb-12 relative z-10">
        {/* Profile Card */}
        <Card className="overflow-hidden shadow-2xl border-0 mb-8">
          <CardContent className="p-0">
            <div className="p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Avatar Section */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    {agent.avatarUrl ? (
                      <img 
                        src={agent.avatarUrl} 
                        alt={fullName}
                        className="w-32 h-32 rounded-2xl shadow-xl object-cover ring-4 ring-white"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-2xl shadow-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white">
                        {getInitials(agent.firstName, agent.lastName)}
                      </div>
                    )}
                    {agent.isVerified && (
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg ring-4 ring-white">
                        <BadgeCheck className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-800">{fullName}</h1>
                        {agent.isVerified && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            <Shield className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      {agent.agencyName && (
                        <p className="text-slate-500 flex items-center gap-2 mb-3">
                          <Briefcase className="h-4 w-4" />
                          {agent.agencyName}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="font-bold text-amber-700">{agent.rating.toFixed(1)}</span>
                          <span className="text-amber-600">({agent.reviewCount} reviews)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="h-4 w-4" />
                          <span>Responds {agent.responseTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button 
                        variant="outline"
                        size="lg"
                        className="border-2"
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button 
                        size="lg" 
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
                        onClick={() => router.push('/dashboard/messages')}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                    </div>
                  </div>

                  {/* Specializations */}
                  {agent.specializations.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex flex-wrap gap-2">
                        {agent.specializations.map((spec, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200 px-3 py-1"
                          >
                            <Sparkles className="h-3 w-3 mr-1.5" />
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 mb-2">
                    <Plane className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{agent.tripsCompleted}</p>
                  <p className="text-xs text-slate-500 font-medium">Trips Planned</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 mb-2">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{agent.yearsExperience}+</p>
                  <p className="text-xs text-slate-500 font-medium">Years Experience</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 mb-2">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{agent.responseTime}</p>
                  <p className="text-xs text-slate-500 font-medium">Response Time</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 mb-2">
                    <TrendingUp className="h-6 w-6 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{satisfactionRate}%</p>
                  <p className="text-xs text-slate-500 font-medium">Satisfaction</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  About {agent.firstName}
                </h2>
                <p className="text-slate-600 leading-relaxed">{agent.bio}</p>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600" />
                  Achievements & Badges
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {agent.isVerified && (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Verified Agent</p>
                        <p className="text-sm text-slate-500">Identity & credentials confirmed</p>
                      </div>
                    </div>
                  )}
                  {agent.tripsCompleted >= 25 && (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Expert Planner</p>
                        <p className="text-sm text-slate-500">{agent.tripsCompleted}+ trips planned</p>
                      </div>
                    </div>
                  )}
                  {agent.rating >= 4.5 && (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Star className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Top Rated</p>
                        <p className="text-sm text-slate-500">{agent.rating.toFixed(1)} average rating</p>
                      </div>
                    </div>
                  )}
                  {agent.yearsExperience >= 3 && (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Experienced Pro</p>
                        <p className="text-sm text-slate-500">{agent.yearsExperience}+ years in travel</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Languages */}
            {agent.languages.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-600" />
                    Languages
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {agent.languages.map((lang, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline"
                        className="px-3 py-1.5 text-sm font-medium"
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Contact */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold mb-2">Ready to plan your trip?</h2>
                <p className="text-white/80 text-sm mb-4">
                  {agent.firstName} typically responds within {agent.responseTime}
                </p>
                <Button 
                  size="lg" 
                  className="w-full bg-white text-indigo-600 hover:bg-slate-100"
                  onClick={() => router.push('/dashboard/messages')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Conversation
                </Button>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  Why Book With Us
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Secure Payments</p>
                      <p className="text-xs text-slate-500">Your payment is protected</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Direct Communication</p>
                      <p className="text-xs text-slate-500">Chat directly with your agent</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <ThumbsUp className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Satisfaction Guarantee</p>
                      <p className="text-xs text-slate-500">We stand behind our agents</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
