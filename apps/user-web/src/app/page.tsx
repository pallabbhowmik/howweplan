'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import {
  Plane,
  Calendar,
  MessageSquare,
  CreditCard,
  Star,
  Shield,
  ChevronRight,
  Globe,
  Users,
  Award,
  Sparkles,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Play,
  Quote,
  Zap,
  Heart,
  TrendingUp,
  Clock,
  Menu,
  X,
  ChevronDown,
  Eye,
  Wallet,
  Target,
  Search,
  HelpCircle,
  IndianRupee,
  Lock,
  Headphones,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const popularDestinations = [
  { name: 'Rajasthan', image: '🏰', tag: 'Heritage', price: 'from ₹45,000', travelers: 2340, rating: 4.9 },
  { name: 'Kerala', image: '🌴', tag: 'Backwaters', price: 'from ₹35,000', travelers: 1890, rating: 4.8 },
  { name: 'Goa', image: '🏖️', tag: 'Beaches', price: 'from ₹25,000', travelers: 3200, rating: 4.7 },
  { name: 'Ladakh', image: '🏔️', tag: 'Adventure', price: 'from ₹55,000', travelers: 1560, rating: 4.9 },
  { name: 'Andaman', image: '🌊', tag: 'Islands', price: 'from ₹48,000', travelers: 980, rating: 4.8 },
  { name: 'Ranthambore', image: '🐅', tag: 'Wildlife', price: 'from ₹40,000', travelers: 720, rating: 4.9 },
];

const testimonials = [
  {
    name: 'Priya M.',
    location: 'Mumbai',
    avatar: 'PM',
    text: 'Our honeymoon to Udaipur was absolutely perfect! Our agent knew exactly what we wanted.',
    rating: 5,
    trip: 'Rajasthan Honeymoon',
    savings: '₹18,000',
  },
  {
    name: 'Rahul & Neha S.',
    location: 'Delhi',
    avatar: 'RS',
    text: 'The competition between agents meant we got amazing options to choose from. Saved over ₹20,000!',
    rating: 5,
    trip: 'Kerala Family Trip',
    savings: '₹20,000',
  },
  {
    name: 'Vikram T.',
    location: 'Bangalore',
    avatar: 'VT',
    text: 'Finally, a platform that protects travelers! The obfuscated options helped me choose purely on value.',
    rating: 5,
    trip: 'Ladakh Adventure',
    savings: '₹15,000',
  },
  {
    name: 'Ananya K.',
    location: 'Hyderabad',
    avatar: 'AK',
    text: 'I was skeptical at first, but the agent competition feature is a game-changer. Got 5 unique proposals within 24 hours!',
    rating: 5,
    trip: 'Goa Beach Getaway',
    savings: '₹12,000',
  },
];

const stats = [
  { value: '50K+', label: 'Happy Travelers', icon: Users },
  { value: '2,500+', label: 'Expert Agents', icon: Award },
  { value: '98%', label: 'Satisfaction Rate', icon: Heart },
  { value: '₹12Cr+', label: 'Saved for Travelers', icon: TrendingUp },
];

// Partner logos for trust section
const partnerLogos = [
  { name: 'TripAdvisor', icon: '⭐' },
  { name: 'MakeMyTrip', icon: '✈️' },
  { name: 'Booking.com', icon: '🏨' },
  { name: 'IATA Certified', icon: '🛫' },
  { name: 'TAAI Member', icon: '🏛️' },
];

// Trip types for quick filter
const tripTypes = [
  { name: 'Honeymoon', emoji: '💑', color: 'from-pink-500 to-rose-500' },
  { name: 'Family', emoji: '👨‍👩‍👧‍👦', color: 'from-blue-500 to-cyan-500' },
  { name: 'Adventure', emoji: '🏔️', color: 'from-orange-500 to-amber-500' },
  { name: 'Beach', emoji: '🏖️', color: 'from-cyan-500 to-teal-500' },
  { name: 'Heritage', emoji: '🏰', color: 'from-purple-500 to-indigo-500' },
  { name: 'Wildlife', emoji: '🐅', color: 'from-green-500 to-emerald-500' },
];

// FAQ items
const faqItems = [
  {
    question: 'Is it really free to post a trip request?',
    answer: 'Yes, absolutely! Posting a request and receiving proposals from agents is completely free. You only pay when you decide to book a trip you love.',
    icon: IndianRupee,
  },
  {
    question: 'How is my payment protected?',
    answer: 'We hold your payment in secure escrow until your trip is completed. If anything goes wrong, you\'re fully protected with our money-back guarantee.',
    icon: Lock,
  },
  {
    question: 'What if I\'m not happy with the proposals?',
    answer: 'You\'re under no obligation to book! If none of the proposals fit, simply let them expire. You can also request modifications or post a new request anytime.',
    icon: RefreshCcw,
  },
  {
    question: 'How do I know agents are trustworthy?',
    answer: 'Every agent on HowWePlan is verified and vetted. You can see their ratings, reviews, and track record before choosing. Star agents have proven excellence.',
    icon: Shield,
  },
  {
    question: 'What support do I get during my trip?',
    answer: 'Our support team is available 24/7. You can reach your agent directly and our team is always here to help resolve any issues.',
    icon: Headphones,
  },
];

export default function Home() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTravelers, setActiveTravelers] = useState(127);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Handle scroll for sticky nav enhancement
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Testimonial auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Simulate live activity counter
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTravelers(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Navigation - Optimized for Conversion */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100' 
          : 'bg-white/80 backdrop-blur-xl border-b border-gray-100'
      }`}>
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <Plane className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              HowWePlan
            </span>
          </Link>

          {/* Desktop Navigation - Only show after scroll */}
          <div className={`hidden lg:flex items-center gap-6 transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">
              How It Works
            </Link>
            <Link href="#testimonials" className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">
              Reviews
            </Link>
          </div>

          {/* CTA Buttons - Primary Dominant */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="font-medium text-gray-600 hover:text-gray-900">
                Sign In
              </Button>
            </Link>
            <Link href="/requests/new">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 font-semibold text-sm md:text-base px-4 md:px-6 transition-all duration-300 animate-pulse-subtle"
              >
                <span className="hidden sm:inline">Start Planning Free</span>
                <span className="sm:hidden">Start Free</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            
            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 py-4 px-4 shadow-lg">
            <div className="flex flex-col gap-3">
              <Link 
                href="#how-it-works" 
                className="text-gray-600 hover:text-gray-900 font-medium py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link 
                href="#testimonials" 
                className="text-gray-600 hover:text-gray-900 font-medium py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Reviews
              </Link>
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 font-medium py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Enhanced Value Proposition */}
      <section className="relative pt-24 md:pt-32 pb-16 md:pb-20 overflow-hidden min-h-[90vh] md:min-h-[85vh] flex items-center">
        {/* Hero Background with Travel Imagery Mosaic */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        
        {/* Animated background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-[1]" />
        
        {/* Floating destination cards - creates travel emotion */}
        <div className="absolute top-24 left-2 md:left-8 w-24 h-32 md:w-36 md:h-44 rounded-2xl overflow-hidden shadow-2xl rotate-6 opacity-40 md:opacity-60 border-4 border-white transform hover:scale-105 transition-transform">
          <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-end p-2 md:p-3">
            <div className="text-white">
              <div className="text-3xl md:text-4xl mb-1">🏰</div>
              <p className="text-xs md:text-sm font-bold">Rajasthan</p>
            </div>
          </div>
        </div>
        
        <div className="absolute top-40 md:top-32 right-2 md:right-12 w-20 h-28 md:w-32 md:h-40 rounded-2xl overflow-hidden shadow-2xl -rotate-12 opacity-40 md:opacity-60 border-4 border-white">
          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-end p-2 md:p-3">
            <div className="text-white">
              <div className="text-2xl md:text-3xl mb-1">🏝️</div>
              <p className="text-xs md:text-sm font-bold">Andaman</p>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-32 md:bottom-24 left-4 md:left-16 w-20 h-24 md:w-28 md:h-36 rounded-xl overflow-hidden shadow-xl rotate-12 opacity-40 md:opacity-60 border-4 border-white">
          <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-end p-2">
            <div className="text-white">
              <div className="text-2xl md:text-3xl mb-1">🌴</div>
              <p className="text-xs font-bold">Kerala</p>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-40 md:bottom-32 right-4 md:right-20 w-22 h-28 md:w-32 md:h-40 rounded-2xl overflow-hidden shadow-2xl -rotate-6 opacity-40 md:opacity-60 border-4 border-white">
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-end p-2 md:p-3">
            <div className="text-white">
              <div className="text-2xl md:text-3xl mb-1">🏔️</div>
              <p className="text-xs md:text-sm font-bold">Ladakh</p>
            </div>
          </div>
        </div>
        
        {/* Additional floating elements for depth */}
        <div className="absolute top-1/3 left-1/4 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 opacity-20 blur-sm animate-float" />
        <div className="absolute bottom-1/3 right-1/3 w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 opacity-20 blur-sm animate-float animation-delay-2000" />
        
        {/* Animated blob backgrounds */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-5xl mx-auto text-center">
            {/* Live Activity Badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full text-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-green-700 font-medium">
                {activeTravelers} travelers planning trips right now
              </span>
            </div>
            
            {/* Main Headline - Clear Value Proposition */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Custom Itineraries from
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Competing Expert Agents
              </span>
            </h1>
            
            {/* Sub-headline - Quantified benefit */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-3 max-w-3xl mx-auto leading-relaxed">
              Travelers save an average of <span className="text-green-600 font-bold">₹16,500</span> per trip when agents compete for their business.
            </p>
            
            {/* How it works in one line */}
            <p className="text-base text-gray-500 mb-6 max-w-2xl mx-auto">
              Post your trip → Agents compete → Compare anonymously → Book with confidence
            </p>
            
            {/* Trust indicators under headline */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 mb-8">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>No upfront payment</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Avg. 5 proposals per request</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>24hr response guarantee</span>
              </div>
            </div>
            
            {/* CTA Buttons - Single Primary Focus */}
            <div className="flex flex-col items-center gap-4 mb-8">
              {/* Directional Arrow */}
              <div className="hidden md:flex flex-col items-center text-blue-500 animate-bounce-slow">
                <span className="text-sm font-medium mb-1">Get started here</span>
                <ArrowRight className="h-5 w-5 rotate-90" />
              </div>
              
              <Link href="/requests/new">
                <Button 
                  size="lg" 
                  className="text-base md:text-lg px-10 md:px-14 py-7 md:py-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 group font-bold transition-all duration-300 hover:scale-105 animate-pulse-subtle"
                >
                  <MapPin className="mr-2 h-6 w-6" />
                  Start Planning — It&apos;s Free
                  <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              {/* Secondary CTA - Much quieter text link */}
              <button 
                onClick={() => setIsVideoPlaying(true)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm group mt-2"
              >
                <Play className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                <span className="underline-offset-2 group-hover:underline">See how it works</span>
                <span className="text-gray-400">(90 sec)</span>
              </button>
            </div>
            
            {/* Quick Trip Type Selector - Above the Fold Engagement */}
            <div className="mb-10">
              <p className="text-sm text-gray-500 mb-4">Or start with a trip type:</p>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                {tripTypes.map((type, i) => (
                  <Link 
                    key={i}
                    href={`/requests/new?type=${type.name.toLowerCase()}`}
                    className="group flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-md border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <span className="text-lg">{type.emoji}</span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{type.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Hero Social Proof - Redesigned */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur rounded-full py-2 px-4 shadow-lg border border-gray-100">
                <div className="flex -space-x-3">
                  {['P', 'R', 'V', 'A', 'S'].map((letter, i) => (
                    <div 
                      key={i} 
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-sm font-bold shadow-md"
                    >
                      {letter}
                    </div>
                  ))}
                  <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-bold shadow-md">
                    +50K
                  </div>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="font-bold text-gray-900 ml-1">4.9</span>
                  </div>
                  <p className="text-xs text-gray-500">from 12,000+ reviews</p>
                </div>
              </div>
            </div>
            
            {/* Partner Trust Logos */}
            <div className="pt-8 border-t border-gray-200">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Trusted by travelers who&apos;ve used</p>
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                {partnerLogos.map((partner, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <span className="text-2xl opacity-70">{partner.icon}</span>
                    <span className="text-sm font-medium hidden sm:inline">{partner.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
          <ChevronDown className="h-6 w-6 text-gray-400" />
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center text-white">
                <stat.icon className="h-8 w-8 mx-auto mb-3 opacity-80" />
                <div className="text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-blue-100 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Enhanced with better visuals */}
      <section id="how-it-works" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 px-4 py-2 bg-purple-100 text-purple-700 border-0">
              <Clock className="h-4 w-4 mr-2" />
              Takes just 5 minutes
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              How HowWePlan Works
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              From dream to destination in 4 simple steps
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
            {[
              {
                step: '01',
                icon: Target,
                title: 'Share Your Vision',
                bullets: [
                  'Where & when you want to go',
                  'Budget & travel style',
                  'Must-have experiences'
                ],
                color: 'from-blue-500 to-blue-600',
                time: '2 min',
              },
              {
                step: '02',
                icon: Users,
                title: 'Agents Compete',
                bullets: [
                  'Avg. 5 proposals received',
                  '24hr response guarantee',
                  'Only verified experts'
                ],
                color: 'from-purple-500 to-purple-600',
                time: '24 hrs',
              },
              {
                step: '03',
                icon: Eye,
                title: 'Compare Fairly',
                bullets: [
                  'Anonymous proposals',
                  'Pure value comparison',
                  'No brand bias'
                ],
                color: 'from-pink-500 to-pink-600',
                time: 'Your pace',
              },
              {
                step: '04',
                icon: Wallet,
                title: 'Book & Travel',
                bullets: [
                  'Secure escrow payment',
                  'Direct agent chat',
                  'Full trip protection'
                ],
                color: 'from-green-500 to-green-600',
                time: 'Done!',
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                {i < 3 && (
                  <div className="hidden lg:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-gray-300 to-transparent" />
                )}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 relative h-full group-hover:-translate-y-1">
                  {/* Step number watermark */}
                  <div className="text-6xl md:text-7xl font-bold text-gray-100 absolute top-2 right-4 select-none">
                    {item.step}
                  </div>
                  
                  {/* Time badge */}
                  <div className="absolute top-4 right-4 text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                    {item.time}
                  </div>
                  
                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${item.color} text-white mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  
                  <h3 className="text-lg md:text-xl font-bold mb-4">{item.title}</h3>
                  
                  {/* Bullet points instead of paragraph */}
                  <ul className="space-y-2">
                    {item.bullets.map((bullet, j) => (
                      <li key={j} className="flex items-start gap-2 text-gray-600 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          
          {/* CTA after How It Works */}
          <div className="text-center mt-12">
            <Link href="/requests/new">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-blue-500/30 font-semibold text-lg px-8 py-6"
              >
                Start Your Free Request
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-3">No credit card required • Free to compare</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 border-0">
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Travel Planning, Reimagined
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We've solved the biggest problems in travel booking
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Agents Compete For You"
              description="Multiple experts create proposals, driving better prices and more creative itineraries."
              gradient="from-yellow-500 to-orange-500"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Transparent Comparison"
              description="Vendor details hidden until payment, so you choose on pure merit and value."
              gradient="from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={<CreditCard className="h-6 w-6" />}
              title="Secure Payments"
              description="Funds held safely until your trip. Full protection if anything goes wrong."
              gradient="from-blue-500 to-cyan-500"
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Direct Communication"
              description="Chat seamlessly with your agent to customize every detail of your trip."
              gradient="from-purple-500 to-pink-500"
            />
            <FeatureCard
              icon={<Award className="h-6 w-6" />}
              title="Verified Experts"
              description="Every agent is vetted. Star agents have proven track records and fast response times."
              gradient="from-amber-500 to-red-500"
            />
            <FeatureCard
              icon={<Heart className="h-6 w-6" />}
              title="24/7 Support"
              description="Our team is here before, during, and after your trip. Disputes handled fairly."
              gradient="from-rose-500 to-pink-500"
            />
          </div>
          
          {/* CTA after Features */}
          <div className="text-center mt-12">
            <Link href="/requests/new">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-blue-500/30 font-semibold text-lg px-8 py-6"
              >
                Get Your Custom Proposals
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-3">Average ₹16,500 saved per trip</p>
          </div>
        </div>
      </section>

      {/* Popular Destinations - Enhanced with more details */}
      <section id="destinations" className="py-16 md:py-24 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wMyIvPjwvZz48L3N2Zz4=')] opacity-50" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 px-4 py-2 bg-white/10 text-white border-0 backdrop-blur">
              <Globe className="h-4 w-4 mr-2" />
              Trending Now
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Popular with Travelers Like You
            </h2>
            <p className="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto">
              These destinations are getting the most requests this month
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
            {popularDestinations.map((dest, i) => (
              <Link href="/requests/new" key={i}>
                <div className="group relative bg-white/10 backdrop-blur-sm rounded-2xl p-5 md:p-6 border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 cursor-pointer hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl md:text-5xl">{dest.image}</div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-white/20 text-white border-0 text-xs">
                        {dest.tag}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-yellow-200">{dest.rating}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-1">{dest.name}</h3>
                  <p className="text-blue-200 text-sm mb-2">{dest.price}</p>
                  
                  {/* Live activity indicator */}
                  <div className="flex items-center justify-between text-xs text-blue-300 mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {dest.travelers.toLocaleString()} travelers
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-blue-300 group-hover:text-white transition-colors font-medium">
                    Plan this trip
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link href="/requests/new">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-xl">
                <Sparkles className="mr-2 h-5 w-5" />
                Plan Your Custom Trip
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials - Enhanced with photos and savings */}
      <section id="testimonials" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 px-4 py-2 bg-green-100 text-green-700 border-0">
              <Star className="h-4 w-4 mr-2 fill-current" />
              Real Stories from Real Travelers
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Join 50,000+ Happy Travelers
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See why travelers choose HowWePlan over traditional booking
            </p>
          </div>

          {/* Featured Testimonial Card */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="relative bg-white rounded-3xl shadow-2xl p-8 md:p-12 overflow-hidden">
              <Quote className="absolute top-6 left-6 h-16 w-16 text-blue-100" />
              
              <div className="relative">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-xl md:text-2xl lg:text-3xl text-gray-800 mb-8 leading-relaxed font-medium">
                  &ldquo;{testimonials[currentTestimonial]?.text ?? ''}&rdquo;
                </p>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar with photo placeholder */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                      {testimonials[currentTestimonial]?.avatar ?? ''}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{testimonials[currentTestimonial]?.name ?? ''}</p>
                      <p className="text-gray-500">{testimonials[currentTestimonial]?.location ?? ''}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-blue-50 text-blue-700 text-xs border-0">
                          {testimonials[currentTestimonial]?.trip ?? ''}
                        </Badge>
                        <Badge className="bg-green-50 text-green-700 text-xs border-0">
                          Saved {testimonials[currentTestimonial]?.savings ?? ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {testimonials.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentTestimonial(i)}
                        className={`h-3 rounded-full transition-all duration-300 ${
                          i === currentTestimonial 
                            ? 'bg-blue-600 w-8' 
                            : 'bg-gray-300 hover:bg-gray-400 w-3'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial Grid - Additional social proof */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.slice(0, 3).map((testimonial, i) => (
              <div 
                key={i} 
                className={`bg-white rounded-xl p-6 shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl ${
                  i === currentTestimonial ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
                onClick={() => setCurrentTestimonial(i)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.location}</p>
                  </div>
                </div>
                <div className="flex mb-2">
                  {[1,2,3,4,5].map((j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm line-clamp-3">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-green-600 font-medium">💰 Saved {testimonial.savings}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* CTA after Testimonials */}
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">Ready to save on your next trip?</p>
            <Link href="/requests/new">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-blue-500/30 font-semibold text-lg px-8 py-6"
              >
                <MapPin className="mr-2 h-5 w-5" />
                Start Your Free Request
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section - Address Common Concerns */}
      <section id="faq" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 px-4 py-2 bg-amber-100 text-amber-700 border-0">
              <HelpCircle className="h-4 w-4 mr-2" />
              Common Questions
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Questions? We&apos;ve Got Answers
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to know before you start planning
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {faqItems.map((faq, i) => (
                <div 
                  key={i}
                  className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                      <faq.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{faq.question}</h3>
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Additional help link */}
            <div className="text-center mt-8">
              <p className="text-gray-500 mb-4">Still have questions?</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/help">
                  <Button variant="outline" className="font-medium">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Visit Help Center
                  </Button>
                </Link>
                <Link href="/requests/new">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold">
                    Start Planning Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - More compelling */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="container mx-auto px-4 text-center relative">
          {/* Urgency element */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-sm text-white/90">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>{activeTravelers} people are planning trips right now</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready for Your Next Adventure?
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of happy travelers who saved time and money on their perfect trips.
            <span className="block mt-2 font-semibold">It&apos;s completely free to get started!</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/requests/new">
              <Button 
                size="lg" 
                variant="secondary" 
                className="w-full sm:w-auto text-base md:text-lg px-8 py-6 shadow-xl group font-semibold hover:scale-105 transition-transform"
              >
                <MapPin className="mr-2 h-5 w-5" />
                Create Your Free Request
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-8 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-300" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-300" />
              Free to compare options
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-300" />
              No obligation to book
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            <div className="sm:col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Plane className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">HowWePlan</span>
              </Link>
              <p className="text-sm leading-relaxed mb-4">
                Connecting travelers with expert agents for unforgettable journeys. 
                Plan smarter, travel better.
              </p>
              <div className="flex items-center gap-1 text-sm">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2 text-white font-medium">4.9/5</span>
                <span className="text-gray-500">• 12k+ reviews</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/requests/new" className="hover:text-white transition-colors">Plan a Trip</Link></li>
                <li><Link href="#destinations" className="hover:text-white transition-colors">Destinations</Link></li>
                <li><Link href="/agents" className="hover:text-white transition-colors">For Agents</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/press" className="hover:text-white transition-colors">Press</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/safety" className="hover:text-white transition-colors">Safety</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2026 HowWePlan. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="text-sm">Made with ❤️ for travelers worldwide</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl z-40 md:hidden">
        <Link href="/requests/new" className="block">
          <Button 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg font-semibold py-6 text-base"
          >
            <MapPin className="mr-2 h-5 w-5" />
            Start Planning — Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
        <p className="text-center text-xs text-gray-500 mt-2">No credit card required</p>
      </div>

      {/* Video Modal Placeholder */}
      {isVideoPlaying && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsVideoPlaying(false)}
        >
          <div className="relative bg-white rounded-2xl overflow-hidden max-w-4xl w-full aspect-video shadow-2xl">
            <button 
              className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              onClick={() => setIsVideoPlaying(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <div className="text-center p-8">
                <Play className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">How HowWePlan Works</h3>
                <p className="text-gray-600">Video coming soon! In the meantime, start your free request to see it in action.</p>
                <Link href="/requests/new">
                  <Button className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600">
                    Try It Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
      <CardContent className="p-8">
        <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${gradient} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
