'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  X, 
  Star, 
  Check, 
  Minus,
  MapPin, 
  Clock, 
  Award,
  MessageSquare,
  Languages,
  Shield,
  TrendingUp,
  Calendar,
  DollarSign,
  Heart,
  Plus,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Globe,
  Users,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Sample agents data (in production, fetch from API)
const sampleAgents = [
  {
    id: 'agent-1',
    name: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    title: 'Luxury Travel Specialist',
    location: 'San Francisco, CA',
    rating: 4.9,
    reviews: 287,
    tripsPlanned: 456,
    yearsExperience: 8,
    responseTime: '< 2 hours',
    languages: ['English', 'Mandarin', 'Spanish'],
    specializations: ['Luxury', 'Honeymoon', 'Asia', 'Europe'],
    priceRange: '$$$',
    averageBooking: 8500,
    verified: true,
    topPicks: ['Maldives', 'Bali', 'Santorini'],
    description: 'Creating once-in-a-lifetime luxury experiences with personal touches.',
    availability: 'Available this week',
    successRate: 98,
    features: {
      '24/7Support': true,
      'FlexiblePayment': true,
      'CancellationProtection': true,
      'PersonalConcierge': true,
      'VIPAccess': true,
      'GroupDiscounts': false,
    }
  },
  {
    id: 'agent-2',
    name: 'Marco Rossi',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
    title: 'Adventure Travel Expert',
    location: 'Denver, CO',
    rating: 4.8,
    reviews: 342,
    tripsPlanned: 612,
    yearsExperience: 12,
    responseTime: '< 4 hours',
    languages: ['English', 'Italian', 'Portuguese'],
    specializations: ['Adventure', 'Hiking', 'South America', 'Africa'],
    priceRange: '$$',
    averageBooking: 4200,
    verified: true,
    topPicks: ['Patagonia', 'Safari Kenya', 'Peru'],
    description: 'Specializing in off-the-beaten-path adventures and eco-tourism.',
    availability: 'Available next week',
    successRate: 96,
    features: {
      '24/7Support': true,
      'FlexiblePayment': true,
      'CancellationProtection': true,
      'PersonalConcierge': false,
      'VIPAccess': false,
      'GroupDiscounts': true,
    }
  },
  {
    id: 'agent-3',
    name: 'Emily Thompson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    title: 'Family Travel Specialist',
    location: 'Chicago, IL',
    rating: 4.9,
    reviews: 198,
    tripsPlanned: 324,
    yearsExperience: 6,
    responseTime: '< 1 hour',
    languages: ['English', 'French'],
    specializations: ['Family', 'Theme Parks', 'Beach', 'Cruises'],
    priceRange: '$$',
    averageBooking: 5800,
    verified: true,
    topPicks: ['Orlando', 'Caribbean', 'Hawaii'],
    description: 'Making family vacations stress-free and magical for all ages.',
    availability: 'Available today',
    successRate: 99,
    features: {
      '24/7Support': true,
      'FlexiblePayment': true,
      'CancellationProtection': true,
      'PersonalConcierge': true,
      'VIPAccess': false,
      'GroupDiscounts': true,
    }
  },
  {
    id: 'agent-4',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    title: 'Budget Travel Expert',
    location: 'Austin, TX',
    rating: 4.7,
    reviews: 521,
    tripsPlanned: 892,
    yearsExperience: 10,
    responseTime: '< 3 hours',
    languages: ['English', 'Korean', 'Japanese'],
    specializations: ['Budget', 'Backpacking', 'Southeast Asia', 'Europe'],
    priceRange: '$',
    averageBooking: 1800,
    verified: true,
    topPicks: ['Thailand', 'Vietnam', 'Portugal'],
    description: 'Proving that amazing travel experiences don\'t need to break the bank.',
    availability: 'Available this week',
    successRate: 94,
    features: {
      '24/7Support': false,
      'FlexiblePayment': true,
      'CancellationProtection': false,
      'PersonalConcierge': false,
      'VIPAccess': false,
      'GroupDiscounts': true,
    }
  },
  {
    id: 'agent-5',
    name: 'Isabella Martinez',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    title: 'Romantic Getaway Specialist',
    location: 'Miami, FL',
    rating: 5.0,
    reviews: 156,
    tripsPlanned: 234,
    yearsExperience: 5,
    responseTime: '< 2 hours',
    languages: ['English', 'Spanish', 'Italian'],
    specializations: ['Honeymoon', 'Anniversary', 'Europe', 'Caribbean'],
    priceRange: '$$$',
    averageBooking: 7200,
    verified: true,
    topPicks: ['Paris', 'Amalfi Coast', 'Maldives'],
    description: 'Curating romantic escapes that create lasting memories.',
    availability: 'Available today',
    successRate: 100,
    features: {
      '24/7Support': true,
      'FlexiblePayment': true,
      'CancellationProtection': true,
      'PersonalConcierge': true,
      'VIPAccess': true,
      'GroupDiscounts': false,
    }
  },
];

const featureLabels: Record<string, { label: string; icon: typeof Check }> = {
  '24/7Support': { label: '24/7 Support', icon: Clock },
  'FlexiblePayment': { label: 'Flexible Payment', icon: DollarSign },
  'CancellationProtection': { label: 'Cancellation Protection', icon: Shield },
  'PersonalConcierge': { label: 'Personal Concierge', icon: Briefcase },
  'VIPAccess': { label: 'VIP Access', icon: Star },
  'GroupDiscounts': { label: 'Group Discounts', icon: Users },
};

export default function CompareAgentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const selectedAgentData = selectedAgents.map(id => sampleAgents.find(a => a.id === id)!).filter(Boolean);
  const availableAgents = sampleAgents.filter(a => 
    !selectedAgents.includes(a.id) &&
    (a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     a.specializations.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const addAgent = (agentId: string) => {
    if (selectedAgents.length < 3) {
      setSelectedAgents([...selectedAgents, agentId]);
      setShowSelector(false);
      setSearchQuery('');
    }
  };

  const removeAgent = (agentId: string) => {
    setSelectedAgents(selectedAgents.filter(id => id !== agentId));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-white" />
          <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-white" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-16 text-center">
          <Badge className="bg-white/20 text-white border-0 mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Smart Comparison Tool
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Compare Travel Advisors
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Compare up to 3 travel advisors side-by-side to find your perfect match
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Agent Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[0, 1, 2].map((slot) => {
            const agent = selectedAgentData[slot];
            
            if (agent) {
              return (
                <Card key={slot} className="border-2 border-indigo-200 bg-white shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={agent.avatar} 
                          alt={agent.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-indigo-100"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-800">{agent.name}</h3>
                            {agent.verified && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                <Check className="h-3 w-3 mr-0.5" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{agent.title}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeAgent(agent.id)}
                        className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="font-semibold">{agent.rating}</span>
                        <span className="text-slate-400">({agent.reviews})</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="h-4 w-4" />
                        <span>{agent.location}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card 
                key={slot} 
                className={cn(
                  "border-2 border-dashed cursor-pointer transition-all",
                  showSelector && slot === selectedAgents.length
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                )}
                onClick={() => setShowSelector(true)}
              >
                <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                    <Plus className="h-6 w-6 text-indigo-600" />
                  </div>
                  <p className="font-medium text-slate-800">Add Advisor</p>
                  <p className="text-sm text-slate-500">Click to select</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Agent Selector Dropdown */}
        {showSelector && selectedAgents.length < 3 && (
          <Card className="mb-8 border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Select a Travel Advisor</h3>
                <button 
                  onClick={() => setShowSelector(false)}
                  className="p-2 rounded-full hover:bg-slate-100"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search by name or specialization..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {availableAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => addAgent(agent.id)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                  >
                    <img 
                      src={agent.avatar} 
                      alt={agent.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 truncate">{agent.name}</span>
                        {agent.verified && (
                          <Shield className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{agent.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-medium">{agent.rating}</span>
                        </div>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">{agent.reviews} reviews</span>
                      </div>
                    </div>
                    <Plus className="h-5 w-5 text-indigo-600" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison Table */}
        {selectedAgentData.length >= 2 && (
          <Card className="border-0 shadow-xl overflow-hidden mb-8">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Side-by-Side Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-4 bg-slate-50 font-medium text-slate-600 w-48">
                        Criteria
                      </th>
                      {selectedAgentData.map(agent => (
                        <th key={agent.id} className="text-center p-4 bg-slate-50 min-w-[200px]">
                          <div className="flex flex-col items-center">
                            <img 
                              src={agent.avatar} 
                              alt={agent.name}
                              className="w-10 h-10 rounded-full object-cover mb-2"
                            />
                            <span className="font-semibold text-slate-800">{agent.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Rating */}
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-slate-400" />
                          Rating
                        </div>
                      </td>
                      {selectedAgentData.map(agent => {
                        const isHighest = agent.rating === Math.max(...selectedAgentData.map(a => a.rating));
                        return (
                          <td key={agent.id} className="p-4 text-center">
                            <div className={cn(
                              "inline-flex items-center gap-1 px-3 py-1 rounded-full",
                              isHighest ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                            )}>
                              <Star className="h-4 w-4 fill-current" />
                              <span className="font-bold">{agent.rating}</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">{agent.reviews} reviews</p>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Experience */}
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="p-4 font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-slate-400" />
                          Experience
                        </div>
                      </td>
                      {selectedAgentData.map(agent => {
                        const isHighest = agent.yearsExperience === Math.max(...selectedAgentData.map(a => a.yearsExperience));
                        return (
                          <td key={agent.id} className="p-4 text-center">
                            <span className={cn(
                              "font-bold text-lg",
                              isHighest ? "text-emerald-600" : "text-slate-700"
                            )}>
                              {agent.yearsExperience} years
                            </span>
                            <p className="text-sm text-slate-500">{agent.tripsPlanned} trips planned</p>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Response Time */}
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          Response Time
                        </div>
                      </td>
                      {selectedAgentData.map(agent => (
                        <td key={agent.id} className="p-4 text-center">
                          <span className="font-semibold text-slate-700">{agent.responseTime}</span>
                          <Badge className={cn(
                            "ml-2 text-xs",
                            agent.availability.includes('today') 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-amber-100 text-amber-700"
                          )}>
                            {agent.availability}
                          </Badge>
                        </td>
                      ))}
                    </tr>

                    {/* Price Range */}
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="p-4 font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          Price Range
                        </div>
                      </td>
                      {selectedAgentData.map(agent => (
                        <td key={agent.id} className="p-4 text-center">
                          <span className="font-bold text-lg text-slate-700">{agent.priceRange}</span>
                          <p className="text-sm text-slate-500">Avg. ${agent.averageBooking.toLocaleString()}/trip</p>
                        </td>
                      ))}
                    </tr>

                    {/* Languages */}
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                          <Languages className="h-4 w-4 text-slate-400" />
                          Languages
                        </div>
                      </td>
                      {selectedAgentData.map(agent => (
                        <td key={agent.id} className="p-4 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {agent.languages.map(lang => (
                              <Badge key={lang} variant="outline" className="text-xs">
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Specializations */}
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="p-4 font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-slate-400" />
                          Specializations
                        </div>
                      </td>
                      {selectedAgentData.map(agent => (
                        <td key={agent.id} className="p-4 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {agent.specializations.map(spec => (
                              <Badge key={spec} className="bg-indigo-100 text-indigo-700 text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Success Rate */}
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-slate-400" />
                          Success Rate
                        </div>
                      </td>
                      {selectedAgentData.map(agent => {
                        const isHighest = agent.successRate === Math.max(...selectedAgentData.map(a => a.successRate));
                        return (
                          <td key={agent.id} className="p-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <div className={cn(
                                "h-2 w-20 rounded-full bg-slate-200 overflow-hidden"
                              )}>
                                <div 
                                  className={cn(
                                    "h-full rounded-full",
                                    isHighest ? "bg-emerald-500" : "bg-indigo-500"
                                  )}
                                  style={{ width: `${agent.successRate}%` }}
                                />
                              </div>
                              <span className={cn(
                                "font-bold",
                                isHighest ? "text-emerald-600" : "text-slate-700"
                              )}>
                                {agent.successRate}%
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Features */}
                    {Object.entries(featureLabels).map(([key, { label, icon: Icon }]) => (
                      <tr key={key} className="border-b border-slate-100 even:bg-slate-50/50">
                        <td className="p-4 font-medium text-slate-600">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-slate-400" />
                            {label}
                          </div>
                        </td>
                        {selectedAgentData.map(agent => (
                          <td key={agent.id} className="p-4 text-center">
                            {agent.features[key as keyof typeof agent.features] ? (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
                                <Check className="h-5 w-5 text-emerald-600" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100">
                                <Minus className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Action Row */}
                    <tr className="bg-gradient-to-r from-slate-50 to-indigo-50">
                      <td className="p-4 font-medium text-slate-600">
                        Contact
                      </td>
                      {selectedAgentData.map(agent => (
                        <td key={agent.id} className="p-4 text-center">
                          <div className="flex flex-col gap-2">
                            <Link href={`/agents/${agent.id}`}>
                              <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                View Profile
                              </Button>
                            </Link>
                            <Link href="/requests/new">
                              <Button variant="outline" className="w-full">
                                Request Quote
                              </Button>
                            </Link>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {selectedAgentData.length < 2 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Select at least 2 advisors to compare
              </h2>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                Add travel advisors using the cards above to see a detailed side-by-side comparison of their ratings, experience, specializations, and services.
              </p>
              <Link href="/travel-advisors">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                  Browse All Advisors
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Browse Section */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Quick Add Popular Advisors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleAgents.filter(a => !selectedAgents.includes(a.id)).slice(0, 3).map(agent => (
              <Card key={agent.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <img 
                      src={agent.avatar} 
                      alt={agent.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-800">{agent.name}</h3>
                        {agent.verified && (
                          <Shield className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{agent.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="font-semibold text-sm">{agent.rating}</span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <span className="text-sm text-slate-500">{agent.reviews} reviews</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{agent.description}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {agent.specializations.slice(0, 3).map(spec => (
                      <Badge key={spec} variant="outline" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>

                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => addAgent(agent.id)}
                    disabled={selectedAgents.length >= 3}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Comparison
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
