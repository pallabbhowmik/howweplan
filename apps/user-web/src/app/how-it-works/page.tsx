import Link from 'next/link';
import { Plane, Search, Users, FileText, CreditCard, MessageSquare, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Submit Your Request',
    description: 'Tell us about your dream trip - destination, dates, budget, and preferences. The more details you provide, the better our agents can tailor your experience.',
  },
  {
    number: '02',
    icon: Users,
    title: 'Get Matched with Agents',
    description: 'Our platform matches your request with specialized travel agents who have expertise in your destination and travel style.',
  },
  {
    number: '03',
    icon: Search,
    title: 'Review Itineraries',
    description: 'Receive personalized itinerary proposals from multiple agents. Compare options, ask questions, and request modifications.',
  },
  {
    number: '04',
    icon: MessageSquare,
    title: 'Chat & Refine',
    description: 'Communicate directly with agents through our secure messaging system. Fine-tune every detail until your trip is perfect.',
  },
  {
    number: '05',
    icon: CreditCard,
    title: 'Book with Confidence',
    description: 'Once you\'ve chosen your itinerary, complete your booking through our secure payment system with buyer protection.',
  },
  {
    number: '06',
    icon: CheckCircle,
    title: 'Travel & Enjoy',
    description: 'Set off on your adventure! Your agent remains available throughout your trip for support and last-minute changes.',
  },
];

const benefits = [
  {
    title: 'Expert Knowledge',
    description: 'Our agents have first-hand experience with destinations and can provide insider tips.',
  },
  {
    title: 'Time Savings',
    description: 'Let professionals handle the research and planning while you focus on the excitement.',
  },
  {
    title: 'Personalization',
    description: 'Every itinerary is crafted specifically for you, not a one-size-fits-all package.',
  },
  {
    title: 'Secure Payments',
    description: 'Your payment is protected until you confirm the booking meets your expectations.',
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
        <section className="py-16 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How HowWePlan Works
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From dream to destination in six simple steps. Our platform connects you with 
              expert travel agents who craft personalized itineraries just for you.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {steps.map((step, index) => (
                <div key={step.number} className="relative">
                  {/* Connection line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 top-20 w-0.5 h-24 bg-blue-100 hidden md:block" />
                  )}
                  
                  <div className="flex gap-6 mb-12">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <step.icon className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 pt-2">
                      <span className="text-sm font-bold text-blue-600">STEP {step.number}</span>
                      <h3 className="text-2xl font-bold mt-1 mb-3">{step.title}</h3>
                      <p className="text-muted-foreground text-lg">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-slate-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose HowWePlan?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {benefits.map((benefit) => (
                <Card key={benefit.title}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Planning?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Create your first travel request and let our expert agents craft your perfect trip.
            </p>
            <Link href="/requests/new">
              <Button size="lg" className="gap-2">
                Create Your Request <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 HowWePlan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
