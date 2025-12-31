'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Phone, 
  MessageCircle,
  Search,
  HelpCircle,
  BookOpen,
  CreditCard,
  Shield,
  Users,
  Calendar
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I create a travel request?',
    answer: 'To create a travel request, log in to your account and click "Plan Your Trip" on the homepage or navigate to the dashboard. Fill in your destination, travel dates, budget, and preferences. Our expert travel agents will then create personalized itineraries for you.'
  },
  {
    category: 'Getting Started',
    question: 'How long does it take to receive itinerary proposals?',
    answer: 'Typically, you will receive itinerary proposals within 24-48 hours after submitting your travel request. Complex trips or peak season requests may take slightly longer.'
  },
  {
    category: 'Booking',
    question: 'How do I book an itinerary?',
    answer: 'Once you receive proposals from travel agents, review each one carefully. When you find the perfect match, click "Select This Itinerary" and proceed to payment. You can pay the full amount or a deposit to secure your booking.'
  },
  {
    category: 'Booking',
    question: 'Can I modify my booking after confirmation?',
    answer: 'Yes, you can request modifications to your booking up to 24 hours before the modification deadline. A small modification fee may apply. Contact your assigned travel agent through the messaging system to discuss changes.'
  },
  {
    category: 'Payments',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), debit cards, and bank transfers. All payments are processed securely through our payment partner.'
  },
  {
    category: 'Payments',
    question: 'What is your refund policy?',
    answer: 'Cancellations made 48+ hours before departure receive a full refund minus processing fees. Cancellations 24-48 hours before departure receive a 50% refund. Cancellations less than 24 hours before departure are non-refundable.'
  },
  {
    category: 'Account',
    question: 'How do I reset my password?',
    answer: 'Click "Forgot Password" on the login page, enter your email address, and we\'ll send you a password reset link. The link expires after 24 hours for security purposes.'
  },
  {
    category: 'Account',
    question: 'How do I contact my travel agent?',
    answer: 'Once matched with an agent, you can communicate through our built-in messaging system. Go to your dashboard, select the relevant booking or request, and click on "Messages" to start a conversation.'
  },
  {
    category: 'Safety',
    question: 'Are your travel agents verified?',
    answer: 'Yes, all travel agents on our platform undergo a thorough verification process including license verification, background checks, and insurance requirements. Look for the verified badge on agent profiles.'
  },
  {
    category: 'Safety',
    question: 'What if I have an issue during my trip?',
    answer: 'Our support team is available 24/7 for emergencies. Contact us through the app, by email at support@tripcomposer.com, or call our emergency hotline. Your travel agent is also available to assist with any issues.'
  }
];

const categories = [
  { name: 'Getting Started', icon: BookOpen },
  { name: 'Booking', icon: Calendar },
  { name: 'Payments', icon: CreditCard },
  { name: 'Account', icon: Users },
  { name: 'Safety', icon: Shield },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
          <p className="text-xl text-sky-100 mb-8">
            Find answers to common questions or get in touch with our support team
          </p>
          
          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-sky-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All Topics
          </button>
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedCategory === category.name
                    ? 'bg-sky-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="text-gray-600 mt-1">
              {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'} found
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredFaqs.map((faq, index) => (
              <div key={index} className="p-6">
                <button
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  className="w-full flex items-start justify-between text-left gap-4"
                >
                  <div>
                    <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-1 rounded-full">
                      {faq.category}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">
                      {faq.question}
                    </h3>
                  </div>
                  {expandedIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0 mt-6" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 mt-6" />
                  )}
                </button>
                {expandedIndex === index && (
                  <p className="mt-4 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>

          {filteredFaqs.length === 0 && (
            <div className="p-12 text-center">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No results found. Try a different search term.</p>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-sky-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-gray-600 text-sm mb-4">Get help via email within 24 hours</p>
            <a 
              href="mailto:support@tripcomposer.com" 
              className="text-sky-600 font-medium hover:text-sky-700"
            >
              support@tripcomposer.com
            </a>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-gray-600 text-sm mb-4">Chat with our support team</p>
            <button className="text-green-600 font-medium hover:text-green-700">
              Start Chat
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
            <p className="text-gray-600 text-sm mb-4">Available Mon-Fri, 9am-6pm EST</p>
            <a 
              href="tel:+1-800-TRIP-NOW" 
              className="text-purple-600 font-medium hover:text-purple-700"
            >
              1-800-TRIP-NOW
            </a>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link 
            href="/" 
            className="text-sky-600 hover:text-sky-700 font-medium inline-flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
