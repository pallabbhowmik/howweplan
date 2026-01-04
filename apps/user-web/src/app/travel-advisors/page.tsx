'use client';

import React from 'react';
import Link from 'next/link';
import { Award, Shield, Clock, Star, Users, MessageSquare, Globe, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiteNavigation } from '@/components/navigation/site-navigation';
import { SiteFooter } from '@/components/navigation/site-footer';

const advisorQualities = [
  {
    icon: Award,
    title: 'Verified Expertise',
    description: 'Every travel advisor is vetted and verified with proven industry credentials',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Globe,
    title: 'Destination Specialists',
    description: 'Matched with advisors who have first-hand experience with your destination',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    icon: Clock,
    title: 'Fast Response',
    description: 'Most advisors respond within 4 hours with personalized proposals',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Star,
    title: 'Rated & Reviewed',
    description: 'Transparent ratings from real travelers help you choose with confidence',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
];

const stats = [
  { value: '2,500+', label: 'Travel Advisors', sublabel: 'Ready to help' },
  { value: '98%', label: 'Satisfaction Rate', sublabel: 'Happy travelers' },
  { value: '4 hrs', label: 'Avg Response', sublabel: 'Fast turnaround' },
  { value: '50K+', label: 'Trips Planned', sublabel: 'And counting' },
];

export default function TravelAdvisorsPage() {
  return (
    <>
      <SiteNavigation />
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6TTYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge className="mb-6 bg-white/20 backdrop-blur-sm text-white border-white/30">
            <Sparkles className="w-3 h-3 mr-1" />
            Meet Your Travel Experts
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg">
            Expert Travel Advisors
          </h1>
          <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto leading-relaxed drop-shadow">
            Our network of verified travel advisors brings decades of experience and insider knowledge to craft your perfect journey.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-gray-900">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Our Advisors Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Our Travel Advisors Stand Out</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We carefully vet every travel advisor to ensure you receive expert guidance and exceptional service
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {advisorQualities.map((quality) => (
              <Card key={quality.title} className="border-2 hover:border-gray-300 transition-all duration-300 hover:shadow-xl group">
                <CardContent className="pt-8 pb-6">
                  <div className={`w-16 h-16 ${quality.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <quality.icon className={`h-8 w-8 ${quality.color}`} />
                  </div>
                  <h3 className="font-bold text-2xl mb-3">{quality.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{quality.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How Matching Works */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How We Match You</h2>
              <p className="text-lg text-muted-foreground">
                Our smart matching system connects you with the perfect travel advisor for your trip
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Users className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">1. Share Your Vision</h3>
                <p className="text-muted-foreground">Tell us about your destination, dates, and travel style preferences</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">2. Smart Matching</h3>
                <p className="text-muted-foreground">We match you with advisors who specialize in your type of trip</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <MessageSquare className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">3. Receive Proposals</h3>
                <p className="text-muted-foreground">Compare personalized itineraries and choose your favorite</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <Shield className="h-16 w-16 text-white mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to Meet Your Perfect Travel Advisor?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Create a trip request and get matched with expert advisors who will compete to plan your perfect journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100 shadow-xl text-lg px-8">
                <Link href="/requests/new">Create Trip Request</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-2 border-white text-white hover:bg-white/10 text-lg px-8">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
            <p className="text-white/80 text-sm mt-6">
              ✓ Free to post  ✓ No obligation  ✓ Compare multiple proposals
            </p>
          </div>
        </div>
      </section>
    </div>
    <SiteFooter />
    </>
  );
}
