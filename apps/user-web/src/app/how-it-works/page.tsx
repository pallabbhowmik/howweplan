import Link from 'next/link';
import { Plane, Search, Users, FileText, CreditCard, MessageSquare, CheckCircle, ArrowRight, Shield, Clock, Sparkles, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Submit Your Request',
    description: 'Tell us about your dream trip - destination, dates, budget, and preferences. The more details you provide, the better our travel advisors can tailor your experience.',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50',
  },
  {
    number: '02',
    icon: Users,
    title: 'Get Matched with Travel Advisors',
    description: 'Our platform matches your request with specialized travel advisors who have expertise in your destination and travel style.',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
  },
  {
    number: '03',
    icon: Search,
    title: 'Review Itineraries',
    description: 'Receive personalized itinerary proposals from multiple travel advisors. Compare options, ask questions, and request modifications.',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50',
  },
  {
    number: '04',
    icon: MessageSquare,
    title: 'Chat & Refine',
    description: 'Communicate directly with travel advisors through our secure messaging system. Fine-tune every detail until your trip is perfect.',
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-gradient-to-br from-orange-50 to-amber-50',
  },
  {
    number: '05',
    icon: CreditCard,
    title: 'Book with Confidence',
    description: 'Once you\'ve chosen your itinerary, complete your booking through our secure payment system with buyer protection.',
    color: 'from-rose-500 to-red-500',
    bgColor: 'bg-gradient-to-br from-rose-50 to-red-50',
  },
  {
    number: '06',
    icon: CheckCircle,
    title: 'Travel & Enjoy',
    description: 'Set off on your adventure! Your travel advisor remains available throughout your trip for support and last-minute changes.',
    color: 'from-indigo-500 to-violet-500',
    bgColor: 'bg-gradient-to-br from-indigo-50 to-violet-50',
  },
];

const benefits = [
  {
    icon: Sparkles,
    title: 'Expert Knowledge',
    description: 'Our travel advisors have first-hand experience with destinations and can provide insider tips.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Clock,
    title: 'Time Savings',
    description: 'Let professionals handle the research and planning while you focus on the excitement.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    icon: HeartHandshake,
    title: 'Personalization',
    description: 'Every itinerary is crafted specifically for you, not a one-size-fits-all package.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Your payment is protected until you confirm the booking meets your expectations.',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">HowWePlan</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-90" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6TTYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-block mb-6 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white font-medium">
              ✨ Your Journey Starts Here
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white drop-shadow-lg">
              How HowWePlan Works
            </h1>
            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto leading-relaxed drop-shadow">
              From dream to destination in six simple steps. Our platform connects you with 
              expert travel advisors who craft personalized itineraries just for you.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Path to the Perfect Trip</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Follow these simple steps to turn your travel dreams into reality
                </p>
              </div>
              
              {steps.map((step, index) => (
                <div key={step.number} className="relative group">
                  {/* Connection line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 md:left-12 top-24 w-0.5 h-32 bg-gradient-to-b from-gray-200 to-gray-100 hidden md:block" />
                  )}
                  
                  <div className={`flex flex-col md:flex-row gap-6 mb-16 md:mb-20 ${step.bgColor} p-6 md:p-8 rounded-2xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}>
                    <div className="flex-shrink-0 flex items-start gap-4 md:gap-6">
                      <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                        <step.icon className="h-8 w-8 md:h-10 md:w-10 text-white" />
                      </div>
                      <div className="flex-1 md:hidden">
                        <span className="text-xs font-bold text-gray-500 tracking-wider">STEP {step.number}</span>
                        <h3 className="text-xl font-bold mt-1">{step.title}</h3>
                      </div>
                    </div>
                    
                    <div className="flex-1 md:pt-2">
                      <div className="hidden md:block">
                        <span className="text-sm font-bold text-gray-500 tracking-wider">STEP {step.number}</span>
                        <h3 className="text-2xl md:text-3xl font-bold mt-2 mb-4">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed mt-3 md:mt-0">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose HowWePlan?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We make travel planning effortless and enjoyable
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="border-2 hover:border-gray-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                  <CardContent className="pt-8 pb-6 text-center">
                    <div className={`w-16 h-16 ${benefit.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                      <benefit.icon className={`h-8 w-8 ${benefit.color}`} />
                    </div>
                    <h3 className="font-bold text-xl mb-3">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-95" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djEwaC00VjM0aDR6bTAtMjB2MTBoLTRWMTRoNHptMCAxMGgyMHY0SDM2di00em0tMjAtMTB2MTBoLTRWMTRoNHptMC0xMGgxMHY0SDE2VjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-3xl mx-auto">
              <div className="inline-block mb-6 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white font-medium">
                🚀 Start Your Journey
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white drop-shadow-lg">
                Ready to Start Planning?
              </h2>
              <p className="text-lg md:text-xl text-white/95 mb-10 leading-relaxed drop-shadow">
                Create your first travel request and let our expert agents craft your perfect trip. 
                It only takes a few minutes to get started!
              </p>
              <Link href="/requests/new">
                <Button size="lg" className="gap-2 bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                  Create Your Request <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <p className="mt-8 text-white/80 text-sm">
                No credit card required • Free to browse • Expert support included
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">HowWePlan</span>
            </div>
            <div className="text-sm text-muted-foreground text-center md:text-left">
              <p>© 2025 HowWePlan. All rights reserved.</p>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link href="/help" className="hover:text-foreground transition-colors">Help</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
