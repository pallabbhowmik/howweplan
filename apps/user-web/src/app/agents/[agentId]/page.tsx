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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
        const response = await fetch(`/api/identity/api/v1/agents/${agentId}/profile`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Agent not found');
          } else {
            setError('Failed to load agent profile');
          }
          return;
        }

        const result = await response.json();
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32" />
            <CardContent className="pt-0">
              <div className="flex flex-col md:flex-row gap-6 -mt-12">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="flex-1 pt-4 space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-32" />
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Agent Not Found</h2>
            <p className="text-slate-500 mb-6">{error || 'The agent profile you are looking for does not exist.'}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${agent.firstName} ${agent.lastName}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/dashboard/messages" className="inline-flex items-center text-slate-600 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Profile Card */}
        <Card className="overflow-hidden shadow-lg border-0">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32 relative">
            {agent.isVerified && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
            )}
          </div>
          <CardContent className="pt-0">
            <div className="flex flex-col md:flex-row gap-6 -mt-12">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {agent.avatarUrl ? (
                  <img 
                    src={agent.avatarUrl} 
                    alt={fullName}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                    {getInitials(agent.firstName, agent.lastName)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 pt-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">{fullName}</h1>
                    {agent.agencyName && (
                      <p className="text-slate-500 flex items-center gap-1 mt-1">
                        <Briefcase className="h-4 w-4" />
                        {agent.agencyName}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        <span className="font-semibold">{agent.rating.toFixed(1)}</span>
                        <span className="text-slate-400">({agent.reviewCount} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => router.push('/dashboard/messages')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </div>

            {/* Bio */}
            {agent.bio && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-slate-800 mb-2">About</h3>
                <p className="text-slate-600">{agent.bio}</p>
              </div>
            )}

            {/* Specializations */}
            {agent.specializations.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-slate-800 mb-2">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {agent.specializations.map((spec, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{agent.tripsCompleted}</p>
              <p className="text-xs text-slate-500">Trips Completed</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{agent.yearsExperience}+</p>
              <p className="text-xs text-slate-500">Years Experience</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{agent.responseTime}</p>
              <p className="text-xs text-slate-500">Avg Response</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <ThumbsUp className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{Math.round(agent.rating * 20)}%</p>
              <p className="text-xs text-slate-500">Satisfaction</p>
            </CardContent>
          </Card>
        </div>

        {/* Languages */}
        {agent.languages.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-5 w-5 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Languages</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {agent.languages.map((lang, idx) => (
                  <Badge key={idx} variant="outline">
                    {lang}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Badges */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">Achievements</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {agent.isVerified && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
                  <Shield className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="font-medium text-slate-800">Verified Agent</p>
                    <p className="text-xs text-slate-500">Identity confirmed</p>
                  </div>
                </div>
              )}
              {agent.reviewCount >= 10 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50">
                  <Star className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="font-medium text-slate-800">Top Rated</p>
                    <p className="text-xs text-slate-500">Highly reviewed</p>
                  </div>
                </div>
              )}
              {agent.tripsCompleted >= 25 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                  <MapPin className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-800">Experienced</p>
                    <p className="text-xs text-slate-500">25+ trips planned</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
