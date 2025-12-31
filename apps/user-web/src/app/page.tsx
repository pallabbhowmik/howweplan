'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const popularDestinations = [
  { name: 'Rajasthan', image: '🏰', tag: 'Heritage', price: 'from ₹45,000' },
  { name: 'Kerala', image: '🌴', tag: 'Backwaters', price: 'from ₹35,000' },
  { name: 'Goa', image: '🏖️', tag: 'Beaches', price: 'from ₹25,000' },
  { name: 'Ladakh', image: '🏔️', tag: 'Adventure', price: 'from ₹55,000' },
  { name: 'Andaman', image: '🌊', tag: 'Islands', price: 'from ₹48,000' },
  { name: 'Ranthambore', image: '🐅', tag: 'Wildlife', price: 'from ₹40,000' },
];

const testimonials = [
  {
    name: 'Priya M.',
    location: 'Mumbai',
    text: 'Our honeymoon to Udaipur was absolutely perfect! Our agent knew exactly what we wanted.',
    rating: 5,
    trip: 'Rajasthan Honeymoon',
  },
  {
    name: 'Rahul & Neha S.',
    location: 'Delhi',
    text: 'The competition between agents meant we got amazing options to choose from. Saved over ₹20,000!',
    rating: 5,
    trip: 'Kerala Family Trip',
  },
  {
    name: 'Vikram T.',
    location: 'Bangalore',
    text: 'Finally, a platform that protects travelers! The obfuscated options helped me choose purely on value.',
    rating: 5,
    trip: 'Ladakh Adventure',
  },
];

const stats = [
  { value: '50K+', label: 'Happy Travelers', icon: Users },
  { value: '2,500+', label: 'Expert Agents', icon: Award },
  { value: '98%', label: 'Satisfaction Rate', icon: Heart },
  { value: '₹12Cr+', label: 'Saved for Travelers', icon: TrendingUp },
];

export default function Home() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              HowWePlan
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              How It Works
            </Link>
            <Link href="#destinations" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Destinations
            </Link>
            <Link href="#testimonials" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Reviews
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="font-medium">Sign In</Button>
            </Link>
            <Link href="/requests/new">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 font-medium">
                Start Planning
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 px-4 py-2 bg-blue-100 text-blue-700 border-0 text-sm font-medium">
              <Sparkles className="h-4 w-4 mr-2" />
              Trusted by 50,000+ travelers worldwide
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Your Dream Trip,
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Crafted by Experts
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Connect with verified travel agents who compete to create your perfect itinerary. 
              Compare options transparently and book with confidence.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/requests/new">
                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-blue-500/30 group">
                  <MapPin className="mr-2 h-5 w-5" />
                  Start Planning Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 group">
                <Play className="mr-2 h-5 w-5" />
                Watch How It Works
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <span className="font-medium">2,500+ agents ready to help</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-gray-300" />
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="font-medium">4.9/5 from 12,000+ reviews</span>
              </div>
            </div>
          </div>
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

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-purple-100 text-purple-700 border-0">
              Simple Process
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How HowWePlan Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From dream to destination in 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: '01',
                icon: Calendar,
                title: 'Share Your Vision',
                description: 'Tell us where you want to go, when, and what experiences matter most to you.',
                color: 'from-blue-500 to-blue-600',
              },
              {
                step: '02',
                icon: Users,
                title: 'Agents Compete',
                description: 'Verified travel experts create custom itineraries tailored just for you.',
                color: 'from-purple-500 to-purple-600',
              },
              {
                step: '03',
                icon: Shield,
                title: 'Compare Fairly',
                description: 'Review obfuscated options to choose based on value, not brand names.',
                color: 'from-pink-500 to-pink-600',
              },
              {
                step: '04',
                icon: Plane,
                title: 'Book & Travel',
                description: 'Secure payment, direct agent communication, and full trip protection.',
                color: 'from-green-500 to-green-600',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-gray-300 to-transparent" />
                )}
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 relative">
                  <div className="text-6xl font-bold text-gray-100 absolute top-4 right-4">
                    {item.step}
                  </div>
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${item.color} text-white mb-6 shadow-lg`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
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
        </div>
      </section>

      {/* Popular Destinations */}
      <section id="destinations" className="py-24 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-white/10 text-white border-0 backdrop-blur">
              <Globe className="h-4 w-4 mr-2" />
              Popular Destinations
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Where Will You Go?
            </h2>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">
              Discover trending destinations our travelers love
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {popularDestinations.map((dest, i) => (
              <Link href="/requests/new" key={i}>
                <div className="group relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-5xl">{dest.image}</div>
                    <Badge className="bg-white/20 text-white border-0 text-xs">
                      {dest.tag}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{dest.name}</h3>
                  <p className="text-blue-200 text-sm mb-4">{dest.price}</p>
                  <div className="flex items-center text-sm text-blue-300 group-hover:text-white transition-colors">
                    Plan this trip
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-green-100 text-green-700 border-0">
              <Star className="h-4 w-4 mr-2 fill-current" />
              Loved by Travelers
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              What Our Travelers Say
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white rounded-3xl shadow-2xl p-10 md:p-14">
              <Quote className="absolute top-6 left-6 h-12 w-12 text-blue-100" />
              
              <div className="relative">
                <div className="flex mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-2xl md:text-3xl text-gray-800 mb-8 leading-relaxed font-medium">
                  &ldquo;{testimonials[currentTestimonial].text}&rdquo;
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{testimonials[currentTestimonial].name}</p>
                    <p className="text-gray-500">{testimonials[currentTestimonial].location}</p>
                    <p className="text-blue-600 text-sm font-medium mt-1">
                      {testimonials[currentTestimonial].trip}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {testimonials.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentTestimonial(i)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          i === currentTestimonial 
                            ? 'bg-blue-600 w-8' 
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready for Your Next Adventure?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of happy travelers who found their perfect trip through HowWePlan.
            It&apos;s free to start!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/requests/new">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 shadow-xl group">
                <MapPin className="mr-2 h-5 w-5" />
                Create Free Request
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 border-white text-white hover:bg-white/10">
                View Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Free to compare options
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Plane className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">HowWePlan</span>
              </Link>
              <p className="text-sm leading-relaxed">
                Connecting travelers with expert agents for unforgettable journeys. 
                Plan smarter, travel better.
              </p>
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
            <p className="text-sm">© 2025 HowWePlan. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="text-sm">Made with ❤️ for travelers worldwide</span>
            </div>
          </div>
        </div>
      </footer>
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
