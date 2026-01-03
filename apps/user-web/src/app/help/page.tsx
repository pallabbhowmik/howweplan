'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  ChevronRight,
  Mail, 
  Phone, 
  MessageCircle,
  Search,
  HelpCircle,
  BookOpen,
  CreditCard,
  Shield,
  Users,
  Calendar,
  PlayCircle,
  FileText,
  Zap,
  Clock,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Globe,
  Headphones,
  Star
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  popular?: boolean;
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

interface VideoTutorial {
  title: string;
  duration: string;
  thumbnail: string;
  category: string;
}

// ============================================================================
// Data
// ============================================================================

const faqs: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I create a travel request?',
    answer: 'To create a travel request, log in to your account and click "Plan Your Trip" on the homepage or navigate to the dashboard. Fill in your destination, travel dates, budget, and preferences. Our expert travel agents will then create personalized itineraries for you within 24-48 hours.',
    popular: true
  },
  {
    category: 'Getting Started',
    question: 'How long does it take to receive itinerary proposals?',
    answer: 'Typically, you will receive itinerary proposals within 24-48 hours after submitting your travel request. Complex trips or peak season requests may take slightly longer. You\'ll receive an email notification as soon as proposals are ready.'
  },
  {
    category: 'Getting Started',
    question: 'What information should I include in my travel request?',
    answer: 'For the best results, include your preferred destinations, travel dates (or flexibility), budget range, number of travelers, accommodation preferences, must-see attractions, dietary requirements, mobility considerations, and any special occasions you\'re celebrating.'
  },
  {
    category: 'Booking',
    question: 'How do I book an itinerary?',
    answer: 'Once you receive proposals from travel agents, review each one carefully. When you find the perfect match, click "Select This Itinerary" and proceed to payment. You can pay the full amount or a deposit to secure your booking.',
    popular: true
  },
  {
    category: 'Booking',
    question: 'Can I modify my booking after confirmation?',
    answer: 'Yes, you can request modifications to your booking up to 24 hours before the modification deadline. A small modification fee may apply depending on the changes. Contact your assigned travel agent through the messaging system to discuss changes.'
  },
  {
    category: 'Booking',
    question: 'How do I compare different itinerary proposals?',
    answer: 'Each proposal shows a detailed breakdown including daily activities, accommodations, transportation, and pricing. Use the comparison view in your dashboard to see proposals side-by-side. You can also message agents directly with questions before making your decision.'
  },
  {
    category: 'Payments',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express, Discover), debit cards, Apple Pay, Google Pay, and bank transfers. All payments are processed securely through Stripe with bank-level encryption.',
    popular: true
  },
  {
    category: 'Payments',
    question: 'What is your refund policy?',
    answer: 'Cancellations made 48+ hours before departure receive a full refund minus processing fees. Cancellations 24-48 hours before departure receive a 50% refund. Cancellations less than 24 hours before departure are non-refundable. Travel insurance is recommended for added protection.'
  },
  {
    category: 'Payments',
    question: 'Can I pay in installments?',
    answer: 'Yes! For bookings over $1,000, you can choose our flexible payment plan. Pay 25% upfront to secure your booking, then split the remaining balance into convenient installments due before your trip departure date.'
  },
  {
    category: 'Account',
    question: 'How do I reset my password?',
    answer: 'Click "Forgot Password" on the login page, enter your email address, and we\'ll send you a password reset link. The link expires after 24 hours for security purposes. If you don\'t receive the email, check your spam folder.'
  },
  {
    category: 'Account',
    question: 'How do I contact my travel agent?',
    answer: 'Once matched with an agent, you can communicate through our built-in messaging system. Go to your dashboard, select the relevant booking or request, and click on "Messages" to start a conversation. Agents typically respond within a few hours.',
    popular: true
  },
  {
    category: 'Account',
    question: 'Can I have multiple travel requests at once?',
    answer: 'Absolutely! You can have as many active travel requests as you like. Each request is handled independently, and you can work with different agents for different trips. Manage all your requests from your dashboard.'
  },
  {
    category: 'Safety',
    question: 'Are your travel agents verified?',
    answer: 'Yes, all travel agents on our platform undergo a thorough verification process including license verification, background checks, and insurance requirements. Look for the verified badge on agent profiles. We also collect and display authentic reviews from past travelers.',
    popular: true
  },
  {
    category: 'Safety',
    question: 'What if I have an issue during my trip?',
    answer: 'Our support team is available 24/7 for emergencies. Contact us through the app, by email at support@howweplan.co, or call our emergency hotline. Your travel agent is also available to assist with any issues during your trip.'
  },
  {
    category: 'Safety',
    question: 'Is my payment information secure?',
    answer: 'Yes, we use industry-standard encryption and never store your full payment details. All transactions are processed through Stripe, a PCI-DSS Level 1 certified payment processor. We also offer secure 2-factor authentication for your account.'
  }
];

const categories = [
  { name: 'Getting Started', icon: BookOpen, color: 'sky' },
  { name: 'Booking', icon: Calendar, color: 'violet' },
  { name: 'Payments', icon: CreditCard, color: 'emerald' },
  { name: 'Account', icon: Users, color: 'amber' },
  { name: 'Safety', icon: Shield, color: 'rose' },
];

const quickActions: QuickAction[] = [
  {
    title: 'Create a Trip',
    description: 'Start planning your next adventure',
    href: '/dashboard/requests/new',
    icon: Zap,
    color: 'from-sky-500 to-blue-600'
  },
  {
    title: 'View My Trips',
    description: 'Check your bookings and requests',
    href: '/dashboard',
    icon: Calendar,
    color: 'from-violet-500 to-purple-600'
  },
  {
    title: 'My Messages',
    description: 'Chat with your travel agents',
    href: '/dashboard/messages',
    icon: MessageCircle,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    title: 'Account Settings',
    description: 'Manage your profile and preferences',
    href: '/dashboard/settings',
    icon: Users,
    color: 'from-amber-500 to-orange-600'
  }
];

const videoTutorials: VideoTutorial[] = [
  {
    title: 'Getting Started with HowWePlan',
    duration: '3:45',
    thumbnail: '🎬',
    category: 'Getting Started'
  },
  {
    title: 'How to Create the Perfect Travel Request',
    duration: '5:12',
    thumbnail: '✈️',
    category: 'Getting Started'
  },
  {
    title: 'Understanding Your Itinerary Proposals',
    duration: '4:30',
    thumbnail: '📋',
    category: 'Booking'
  },
  {
    title: 'Communicating with Your Agent',
    duration: '2:58',
    thumbnail: '💬',
    category: 'Account'
  }
];

// ============================================================================
// Component
// ============================================================================

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesSearch = searchQuery === '' || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === null || faq.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const popularFaqs = useMemo(() => faqs.filter(f => f.popular), []);
  
  const displayedFaqs = searchQuery || selectedCategory || showAllFaqs 
    ? filteredFaqs 
    : filteredFaqs.slice(0, 6);

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || 'sky';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white/90 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              We're here to help 24/7
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              How can we help you?
            </h1>
            <p className="text-xl text-sky-100 mb-10 max-w-2xl mx-auto">
              Find answers instantly, explore guides, or connect with our support team
            </p>
            
            {/* Search */}
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-2xl" />
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-2xl text-lg"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Popular Searches */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <span className="text-sky-200 text-sm">Popular:</span>
              {['refund policy', 'contact agent', 'payment methods'].map((term) => (
                <button
                  key={term}
                  onClick={() => setSearchQuery(term)}
                  className="text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#F9FAFB"/>
          </svg>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-10 justify-center">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === null
                ? 'bg-gray-900 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
            }`}
          >
            All Topics
          </button>
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.name;
            return (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(isSelected ? null : category.name)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* FAQ Section - Main Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
                    <p className="text-gray-500 mt-1">
                      {filteredFaqs.length} {filteredFaqs.length === 1 ? 'article' : 'articles'} {searchQuery && 'matching your search'}
                    </p>
                  </div>
                  <HelpCircle className="w-10 h-10 text-sky-500/20" />
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {displayedFaqs.map((faq, index) => {
                  const isExpanded = expandedIndex === index;
                  const colorClass = getCategoryColor(faq.category);
                  
                  return (
                    <div 
                      key={index} 
                      className={`transition-colors ${isExpanded ? 'bg-gray-50/50' : 'hover:bg-gray-50/50'}`}
                    >
                      <button
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                        className="w-full p-6 md:p-8 flex items-start justify-between text-left gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-${colorClass}-50 text-${colorClass}-600`}>
                              {faq.category}
                            </span>
                            {faq.popular && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                                <Star className="w-3 h-3" fill="currentColor" />
                                Popular
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 pr-4">
                            {faq.question}
                          </h3>
                        </div>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isExpanded ? 'bg-sky-100 rotate-90' : 'bg-gray-100'
                        }`}>
                          <ChevronRight className={`w-5 h-5 transition-colors ${isExpanded ? 'text-sky-600' : 'text-gray-400'}`} />
                        </div>
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
                        <div className="px-6 md:px-8 pb-6 md:pb-8">
                          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                            <p className="text-gray-600 leading-relaxed">
                              {faq.answer}
                            </p>
                            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                              <span className="text-sm text-gray-400">Was this helpful?</span>
                              <div className="flex gap-2">
                                <button className="text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 px-3 py-1 rounded-full hover:bg-emerald-50 transition-colors">
                                  <CheckCircle2 className="w-4 h-4" /> Yes
                                </button>
                                <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors">
                                  No
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredFaqs.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500 mb-4">Try searching with different keywords</p>
                  <button 
                    onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                    className="text-sky-600 font-medium hover:text-sky-700"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {!searchQuery && !selectedCategory && filteredFaqs.length > 6 && (
                <div className="p-6 border-t border-gray-100 text-center">
                  <button
                    onClick={() => setShowAllFaqs(!showAllFaqs)}
                    className="inline-flex items-center gap-2 text-sky-600 font-medium hover:text-sky-700 transition-colors"
                  >
                    {showAllFaqs ? 'Show less' : `View all ${filteredFaqs.length} questions`}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllFaqs ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Video Tutorials */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                    <PlayCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Video Tutorials</h3>
                    <p className="text-sm text-gray-500">Learn how it works</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {videoTutorials.map((video, index) => (
                  <button 
                    key={index}
                    className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
                      {video.thumbnail}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{video.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{video.duration}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-300" />
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Questions */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-3xl p-6 border border-sky-100">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-amber-500" fill="currentColor" />
                <h3 className="font-bold text-gray-900">Most Asked</h3>
              </div>
              <div className="space-y-3">
                {popularFaqs.slice(0, 4).map((faq, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearchQuery('');
                      const faqIndex = faqs.findIndex(f => f.question === faq.question);
                      setExpandedIndex(faqIndex);
                      setShowAllFaqs(true);
                    }}
                    className="w-full text-left p-3 bg-white rounded-xl hover:shadow-md transition-all text-sm text-gray-700 hover:text-sky-600"
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Resources</h3>
              <div className="space-y-3">
                <Link href="/terms" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-sky-500" />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Terms of Service</span>
                </Link>
                <Link href="/privacy" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <Shield className="w-5 h-5 text-gray-400 group-hover:text-sky-500" />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Privacy Policy</span>
                </Link>
                <Link href="/about" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <Globe className="w-5 h-5 text-gray-400 group-hover:text-sky-500" />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">About Us</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Still need help?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Our support team is available around the clock to assist you with any questions
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="group bg-white rounded-3xl p-8 border border-gray-200 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100/50 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Email Support</h3>
              <p className="text-gray-500 mb-6">Get a detailed response within 24 hours</p>
              <a 
                href="mailto:support@howweplan.co" 
                className="inline-flex items-center gap-2 text-sky-600 font-semibold hover:text-sky-700 group-hover:gap-3 transition-all"
              >
                support@howweplan.co
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="group bg-white rounded-3xl p-8 border border-gray-200 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Live Chat</h3>
              <p className="text-gray-500 mb-6">Chat with our team in real-time</p>
              <button className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 group-hover:gap-3 transition-all">
                Start a conversation
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="group bg-white rounded-3xl p-8 border border-gray-200 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Headphones className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Phone Support</h3>
              <p className="text-gray-500 mb-6">Available Mon-Fri, 9am-6pm EST</p>
              <a 
                href="tel:+1-800-969-7526" 
                className="inline-flex items-center gap-2 text-violet-600 font-semibold hover:text-violet-700 group-hover:gap-3 transition-all"
              >
                1-800-969-PLAN
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-16 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
