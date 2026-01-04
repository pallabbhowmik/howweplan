import Link from 'next/link';
import { Plane, Users, Shield, Globe, Heart, Star, Award, ArrowRight, Target, Sparkles, MapPin, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'About Us | HowWePlan',
  description: 'Learn about HowWePlan - the platform connecting travelers with expert travel advisors for personalized trip planning.',
};

export default function AboutPage() {
  const stats = [
    { value: '50,000+', label: 'Happy Travelers' },
    { value: '2,500+', label: 'Travel Advisors' },
    { value: '120+', label: 'Countries Covered' },
    { value: '4.9/5', label: 'Average Rating' },
  ];

  const values = [
    {
      icon: Heart,
      title: 'Traveler First',
      description: 'Every decision we make starts with one question: "Is this best for our travelers?"',
      color: 'from-rose-500 to-pink-500',
    },
    {
      icon: Shield,
      title: 'Trust & Safety',
      description: 'Secure payments, verified advisors, and 24/7 support ensure peace of mind.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Users,
      title: 'Expert Network',
      description: 'We partner with passionate travel experts who have real destination knowledge.',
      color: 'from-purple-500 to-indigo-500',
    },
    {
      icon: Sparkles,
      title: 'Innovation',
      description: 'We constantly improve our platform to make trip planning easier and more enjoyable.',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  const team = [
    { name: 'Alex Chen', role: 'CEO & Co-Founder', image: '👨‍💼' },
    { name: 'Priya Sharma', role: 'CTO & Co-Founder', image: '👩‍💻' },
    { name: 'Marcus Johnson', role: 'Head of Operations', image: '👨‍🔧' },
    { name: 'Sofia Rodriguez', role: 'Head of Advisor Relations', image: '👩‍💼' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">HowWePlan</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">How It Works</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
            <Link href="/requests/new">
              <Button size="sm">Start Planning</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djEwaC00VjM0aDR6bTAtMjB2MTBoLTRWMTRoNHptMCAxMGgyMHY0SDM2di00em0tMjAtMTB2MTBoLTRWMTRoNHptMC0xMGgxMHY0SDE2VjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge className="mb-6 px-4 py-2 bg-white/20 text-white border-0 backdrop-blur-sm">
            🌍 Reimagining Travel Planning
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            About HowWePlan
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            We believe everyone deserves a perfect trip. That's why we connect travelers with expert advisors who craft personalized itineraries just for you.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600">{stat.value}</div>
                <div className="text-gray-600 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 border-0">Our Story</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why We Started HowWePlan</h2>
            </div>
            
            <div className="prose prose-lg max-w-none">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-10 mb-8">
                <p className="text-gray-700 mb-6 leading-relaxed">
                  It started with a frustrating experience. Our founders spent weeks planning what was supposed to be the perfect honeymoon, only to end up at an overcrowded resort that looked nothing like the photos. That's when they realized: <strong>travel planning is broken</strong>.
                </p>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  The problem? Most travelers either spend endless hours researching online (only to make the wrong choice) or pay hefty fees to traditional travel agents who offer cookie-cutter packages. There had to be a better way.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  <strong>HowWePlan was born from a simple idea:</strong> What if travelers could post their dream trip and have multiple expert advisors compete to plan it? What if the advisors had to prove their worth through great itineraries, not flashy marketing? What if the whole process was transparent, secure, and actually fun?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It's Different */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 px-4 py-2 bg-purple-100 text-purple-700 border-0">Our Approach</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Makes Us Different</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">We've reimagined every part of the travel planning experience</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Advisors Compete</h3>
                <p className="text-gray-600 text-sm">Multiple experts bid on your trip, driving better prices and more creative itineraries.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Anonymous Until Payment</h3>
                <p className="text-gray-600 text-sm">Advisor identities are hidden until you book, so you choose purely on merit.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Secure Escrow</h3>
                <p className="text-gray-600 text-sm">Payments are held safely until your trip. Full protection if anything goes wrong.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Star className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Verified Experts</h3>
                <p className="text-gray-600 text-sm">Every advisor is vetted for expertise, and star advisors have proven track records.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Local Knowledge</h3>
                <p className="text-gray-600 text-sm">Advisors specialize in specific destinations and have first-hand experience.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Free to Post</h3>
                <p className="text-gray-600 text-sm">Post your trip request for free. No hidden fees, no obligations.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 px-4 py-2 bg-rose-100 text-rose-700 border-0">Our Values</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What We Stand For</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className={`w-14 h-14 bg-gradient-to-br ${value.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <value.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 px-4 py-2 bg-indigo-100 text-indigo-700 border-0">Our Team</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet the Team</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Passionate travelers building tools for travelers</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl mb-4">{member.image}</div>
                  <h3 className="font-bold">{member.name}</h3>
                  <p className="text-gray-500 text-sm">{member.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djEwaC00VjM0aDR6bTAtMjB2MTBoLTRWMTRoNHptMCAxMGgyMHY0SDM2di00em0tMjAtMTB2MTBoLTRWMTRoNHptMC0xMGgxMHY0SDE2VjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Plan Your Dream Trip?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of travelers who've found their perfect trip through HowWePlan
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/requests/new">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 shadow-xl">
                Start Planning Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent text-white border-white/50 hover:bg-white/10">
                See How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">HowWePlan</span>
            </Link>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
              <Link href="/travel-advisors" className="hover:text-white transition-colors">For Travel Advisors</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} HowWePlan, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
