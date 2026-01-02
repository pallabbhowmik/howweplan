import Link from 'next/link';
import { Plane, FileText, Shield, AlertTriangle, Scale, CreditCard, Ban, Users, Globe, Clock, Mail, CheckCircle, XCircle, AlertCircle, Gavel, BookOpen, Building, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Terms of Service | HowWePlan',
  description: 'HowWePlan Terms of Service - Your agreement with us when using our travel planning platform.',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'January 3, 2026';
  const effectiveDate = 'January 3, 2026';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
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
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-6">
            <Scale className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
          <p className="text-indigo-100 max-w-2xl mx-auto">
            Please read these terms carefully before using our platform. By using HowWePlan, you agree to be bound by these terms.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-indigo-200">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>Effective: {effectiveDate}</span>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <div className="container mx-auto px-4 -mt-8">
        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { href: '#acceptance', label: 'Acceptance' },
                { href: '#service-description', label: 'Service Description' },
                { href: '#accounts', label: 'Accounts' },
                { href: '#bookings', label: 'Bookings & Payments' },
                { href: '#cancellation', label: 'Cancellation' },
                { href: '#user-conduct', label: 'User Conduct' },
                { href: '#liability', label: 'Liability' },
                { href: '#disputes', label: 'Disputes' },
                { href: '#contact', label: 'Contact' },
              ].map((item) => (
                <a 
                  key={item.href}
                  href={item.href} 
                  className="px-4 py-2 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-full text-sm font-medium transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Important Notice */}
        <section className="mb-12 bg-amber-50 border border-amber-200 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-8 w-8 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-amber-800 mb-2">Important Legal Notice</h2>
              <p className="text-amber-700 text-sm mb-3">
                PLEASE READ THESE TERMS OF SERVICE CAREFULLY. BY ACCESSING OR USING THE HOWWEPLAN SERVICE, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE TO ALL OF THESE TERMS, DO NOT ACCESS OR USE THE SERVICE.
              </p>
              <p className="text-amber-700 text-sm">
                These Terms contain an arbitration agreement and class action waiver that affect your legal rights. Please review Sections 17 and 18 carefully.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: Acceptance of Terms */}
        <section id="acceptance" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <CheckCircle className="h-6 w-6 text-indigo-600" />
            1. Acceptance of Terms
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;you,&quot; &quot;your,&quot; or &quot;User&quot;) and HowWePlan, Inc., a Delaware corporation (&quot;HowWePlan,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), governing your access to and use of the HowWePlan website, mobile applications, and related services (collectively, the &quot;Service&quot;).
            </p>
            <p>
              By creating an account, clicking &quot;I Agree,&quot; or otherwise accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference.
            </p>
            <p>
              If you are using the Service on behalf of an organization or entity, you represent and warrant that you have the authority to bind such organization to these Terms, in which case &quot;you&quot; and &quot;your&quot; shall refer to such organization.
            </p>
          </div>
        </section>

        {/* Section 2: Definitions */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            2. Definitions
          </h2>
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <div className="grid gap-4">
              <div className="flex gap-3">
                <span className="font-semibold text-indigo-600 w-36 flex-shrink-0">&quot;Agent&quot;</span>
                <span className="text-muted-foreground">A travel professional who has registered on the Platform to provide travel planning and booking services.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-indigo-600 w-36 flex-shrink-0">&quot;Booking&quot;</span>
                <span className="text-muted-foreground">Any travel arrangement, reservation, or purchase made through an Agent via the Platform.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-indigo-600 w-36 flex-shrink-0">&quot;Content&quot;</span>
                <span className="text-muted-foreground">All text, images, videos, data, and other materials uploaded, posted, or transmitted through the Service.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-indigo-600 w-36 flex-shrink-0">&quot;Itinerary&quot;</span>
                <span className="text-muted-foreground">A travel plan created by an Agent in response to a User&apos;s travel request.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-indigo-600 w-36 flex-shrink-0">&quot;Platform&quot;</span>
                <span className="text-muted-foreground">The HowWePlan website, mobile applications, and all related technology and services.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-indigo-600 w-36 flex-shrink-0">&quot;Service Fee&quot;</span>
                <span className="text-muted-foreground">The fee charged by HowWePlan for facilitating transactions between Users and Agents.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-indigo-600 w-36 flex-shrink-0">&quot;Travel Request&quot;</span>
                <span className="text-muted-foreground">A submission by a User describing their desired travel experience and requirements.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Service Description */}
        <section id="service-description" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <FileText className="h-6 w-6 text-indigo-600" />
            3. Description of Service
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              HowWePlan operates an online platform that connects travelers with professional travel agents. Our Service allows Users to:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">For Travelers</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Submit travel requests with preferences and requirements</li>
                    <li>• Receive customized itineraries from qualified Agents</li>
                    <li>• Compare proposals from multiple Agents</li>
                    <li>• Book and pay for travel arrangements securely</li>
                    <li>• Communicate with Agents through our messaging system</li>
                    <li>• Leave reviews and ratings for Agents</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">For Travel Agents</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Access qualified travel leads from interested travelers</li>
                    <li>• Create and submit customized itinerary proposals</li>
                    <li>• Manage bookings and client relationships</li>
                    <li>• Receive secure payments through the platform</li>
                    <li>• Build reputation through reviews and ratings</li>
                    <li>• Access business analytics and insights</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <div className="bg-blue-50 rounded-xl p-6">
              <h4 className="font-semibold mb-2 text-blue-800">Platform Role</h4>
              <p className="text-sm text-blue-700">
                HowWePlan acts as an intermediary platform connecting Users and Agents. We do not operate as a travel agency and do not directly provide travel services. The travel services are provided by independent Agents who use our Platform. We facilitate the connection, communication, and transaction between Users and Agents but are not a party to any agreement between you and an Agent.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Eligibility */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <UserCheck className="h-6 w-6 text-indigo-600" />
            4. Eligibility
          </h2>
          <div className="bg-white rounded-xl border p-6 space-y-4 text-muted-foreground">
            <p>To use the Service, you must:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Be at least 18 years of age</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Have the legal capacity to enter into binding contracts</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Not be barred from using the Service under applicable laws</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Not be located in a country subject to US government embargo or designated as a &quot;terrorist supporting&quot; country</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Not be on any US government list of prohibited or restricted parties</span>
              </li>
            </ul>
            <p className="text-sm">
              For Agents: You must additionally hold all required licenses, certifications, and insurance to legally operate as a travel agent in your jurisdiction, and you must comply with all applicable travel industry regulations.
            </p>
          </div>
        </section>

        {/* Section 5: Account Registration */}
        <section id="accounts" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Users className="h-6 w-6 text-indigo-600" />
            5. Account Registration and Security
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">5.1 Registration Requirements</h3>
              <p className="text-sm text-muted-foreground">
                To access certain features of the Service, you must create an account. When registering, you agree to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Provide accurate, current, and complete information</li>
                <li>• Maintain and promptly update your information</li>
                <li>• Keep your password confidential and secure</li>
                <li>• Accept responsibility for all activities under your account</li>
                <li>• Immediately notify us of any unauthorized access</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">5.2 Account Types</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">User Account</h4>
                  <p className="text-sm text-muted-foreground">
                    For travelers seeking trip planning and booking services.
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Agent Account</h4>
                  <p className="text-sm text-muted-foreground">
                    For travel professionals. Requires verification of credentials and acceptance of Agent Terms.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-semibold text-amber-800 mb-2">5.3 Account Termination</h3>
              <p className="text-sm text-amber-700">
                We may suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or conduct that we determine to be harmful to other users, Agents, or HowWePlan. You may terminate your account at any time by contacting us, subject to completion of any pending transactions.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Bookings and Payments */}
        <section id="bookings" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            6. Bookings and Payments
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">6.1 Booking Process</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>User submits a travel request with requirements and budget</li>
                <li>Matched Agents receive the request and create itinerary proposals</li>
                <li>User reviews proposals and selects an Agent</li>
                <li>Agent and User finalize itinerary details</li>
                <li>User confirms booking and makes payment</li>
                <li>Agent processes bookings with travel suppliers</li>
                <li>User receives booking confirmations and travel documents</li>
              </ol>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">6.2 Pricing and Fees</h3>
              <p className="text-sm text-muted-foreground mb-3">All prices displayed include:</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>• Travel service costs (flights, hotels, tours, etc.)</li>
                <li>• Agent service fee (as disclosed in each proposal)</li>
                <li>• HowWePlan service fee (clearly itemized before payment)</li>
                <li>• Applicable taxes (where required by law)</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Additional fees may apply for booking modifications, special requests, or currency conversion. All fees are disclosed before you confirm your booking.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">6.3 Payment Terms</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• <strong>Payment Methods:</strong> We accept major credit cards, debit cards, and other payment methods as displayed at checkout</li>
                <li>• <strong>Currency:</strong> Prices are displayed in USD unless otherwise indicated. Currency conversion may apply additional fees</li>
                <li>• <strong>Payment Schedule:</strong> Depending on the booking, full payment or a deposit may be required at the time of booking, with remaining balance due as specified</li>
                <li>• <strong>Payment Processing:</strong> Payments are processed securely by our third-party payment processor (Stripe). We do not store your full payment card details</li>
                <li>• <strong>Payment Hold:</strong> Funds may be held until the Agent confirms the booking</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-800 mb-2">6.4 Payment Protection</h3>
              <p className="text-sm text-green-700">
                Your payments are protected through our escrow-style payment system. Funds are not released to Agents until your booking is confirmed with the travel supplier, providing protection against fraud and non-delivery of services.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Cancellation and Refunds */}
        <section id="cancellation" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Clock className="h-6 w-6 text-indigo-600" />
            7. Cancellation and Refund Policy
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">7.1 Cancellation by User</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Cancellation policies vary based on the travel suppliers involved. General guidelines:
              </p>
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-1">Before Booking Confirmation</h4>
                  <p className="text-xs text-muted-foreground">Full refund, less any non-refundable deposits specified</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-1">After Confirmation (30+ days before travel)</h4>
                  <p className="text-xs text-muted-foreground">Refund per supplier policies, HowWePlan service fee is non-refundable</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-1">Within 30 days of travel</h4>
                  <p className="text-xs text-muted-foreground">Subject to supplier cancellation penalties, may result in partial or no refund</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-1">No-show</h4>
                  <p className="text-xs text-muted-foreground">No refund unless covered by travel insurance</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">7.2 Cancellation by Agent or Supplier</h3>
              <p className="text-sm text-muted-foreground">
                If an Agent or travel supplier cancels your booking, you are entitled to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Full refund of amounts paid through the Platform</li>
                <li>• Assistance in finding alternative arrangements (where possible)</li>
                <li>• Refund of HowWePlan service fee if no alternative is acceptable</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">7.3 Refund Processing</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Refunds are processed within 5-10 business days of approval</li>
                <li>• Refunds are returned to the original payment method</li>
                <li>• Bank processing times may vary (typically 5-10 additional business days)</li>
                <li>• Currency conversion differences may result in different refund amounts</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-800 mb-2">7.4 Travel Insurance Recommendation</h3>
              <p className="text-sm text-blue-700">
                We strongly recommend purchasing comprehensive travel insurance that covers trip cancellation, interruption, medical emergencies, and other unforeseen circumstances. Travel insurance may provide coverage beyond what is offered by suppliers&apos; cancellation policies.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">7.5 Force Majeure</h3>
              <p className="text-sm text-muted-foreground">
                Neither HowWePlan nor Agents shall be liable for cancellations or changes caused by events beyond reasonable control, including but not limited to: natural disasters, pandemics, government actions, war, terrorism, civil unrest, strikes, or travel advisories. In such cases, we will work with Agents and suppliers to secure the best possible outcome for affected Users.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8: User Conduct */}
        <section id="user-conduct" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Ban className="h-6 w-6 text-indigo-600" />
            8. User Conduct and Prohibited Activities
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm bg-red-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Prohibited Actions</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Provide false or misleading information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Impersonate any person or entity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Engage in fraudulent transactions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Circumvent or disable security features</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Use automated systems to access the Service</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Scrape, mine, or collect user data</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-red-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Prohibited Content</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Harassing, abusive, or threatening content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Content that violates others&apos; rights</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Spam, advertisements, or solicitations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Malware, viruses, or harmful code</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>Illegal or objectionable material</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>False reviews or ratings</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <h4 className="font-semibold mb-2">Off-Platform Transactions</h4>
              <p className="text-sm text-muted-foreground">
                Users and Agents are prohibited from soliciting or conducting transactions outside the Platform to avoid Service fees. Off-platform transactions are not protected by HowWePlan&apos;s payment protection, dispute resolution, or other safeguards. Violation may result in account termination.
              </p>
            </div>
          </div>
        </section>

        {/* Section 9: Intellectual Property */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Shield className="h-6 w-6 text-indigo-600" />
            9. Intellectual Property Rights
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">9.1 HowWePlan&apos;s Intellectual Property</h3>
              <p className="text-sm text-muted-foreground">
                The Service and its original content (excluding User Content), features, and functionality are and will remain the exclusive property of HowWePlan, Inc. and its licensors. The Service is protected by copyright, trademark, patent, trade secret, and other intellectual property laws. Our trademarks may not be used without our prior written consent.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">9.2 User Content</h3>
              <p className="text-sm text-muted-foreground mb-3">
                You retain ownership of any content you submit, post, or display on or through the Service (&quot;User Content&quot;). By submitting User Content, you grant HowWePlan a worldwide, non-exclusive, royalty-free license to use, copy, modify, create derivative works, distribute, publicly display, and publicly perform your User Content in connection with operating and improving the Service.
              </p>
              <p className="text-sm text-muted-foreground">
                You represent and warrant that you own or have the necessary rights to use and authorize the use of User Content, and that your User Content does not violate any third party&apos;s rights.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">9.3 DMCA Compliance</h3>
              <p className="text-sm text-muted-foreground">
                We respect the intellectual property rights of others. If you believe that material on our Service infringes your copyright, please contact our designated agent at: <a href="mailto:dmca@howweplan.com" className="text-indigo-600 hover:underline">dmca@howweplan.com</a>
              </p>
            </div>
          </div>
        </section>

        {/* Section 10: Third-Party Services */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Building className="h-6 w-6 text-indigo-600" />
            10. Third-Party Services and Travel Suppliers
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">10.1 Travel Suppliers</h3>
              <p className="text-sm text-muted-foreground">
                The travel services booked through our Platform (flights, hotels, tours, car rentals, etc.) are provided by independent third-party suppliers. These suppliers are solely responsible for providing the services. Their own terms and conditions, including cancellation policies, apply to your bookings.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">10.2 Third-Party Links and Services</h3>
              <p className="text-sm text-muted-foreground">
                Our Service may contain links to third-party websites or services not owned or controlled by HowWePlan. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites or services. You acknowledge and agree that HowWePlan shall not be responsible or liable for any damage or loss caused by your use of any third-party services.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-semibold text-amber-800 mb-2">10.3 Travel Advisories and Requirements</h3>
              <p className="text-sm text-amber-700">
                You are responsible for reviewing and complying with travel requirements, including visa requirements, health advisories, vaccination requirements, and travel restrictions for your destinations. HowWePlan and Agents provide information for convenience only and are not liable for denied entry, delays, or other issues resulting from non-compliance with travel requirements.
              </p>
            </div>
          </div>
        </section>

        {/* Section 11: Disclaimers */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <AlertCircle className="h-6 w-6 text-indigo-600" />
            11. Disclaimers
          </h2>
          <div className="bg-slate-100 rounded-xl p-6 space-y-4">
            <p className="text-sm text-muted-foreground font-medium uppercase">
              THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT ANY WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
            </p>
            <p className="text-sm text-muted-foreground">
              TO THE FULLEST EXTENT PERMITTED BY LAW, HOWWEPLAN DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Implied warranties of merchantability and fitness for a particular purpose</li>
              <li>• Warranties that the Service will be uninterrupted, timely, secure, or error-free</li>
              <li>• Warranties regarding the accuracy or reliability of any information obtained through the Service</li>
              <li>• Warranties that defects will be corrected</li>
              <li>• Warranties regarding the quality of any services or content obtained through the Service</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              We do not warrant, endorse, guarantee, or assume responsibility for any product or service advertised or offered by a third party through the Service, and we will not be a party to or in any way be responsible for monitoring any transaction between you and any third-party providers.
            </p>
          </div>
        </section>

        {/* Section 12: Limitation of Liability */}
        <section id="liability" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Shield className="h-6 w-6 text-indigo-600" />
            12. Limitation of Liability
          </h2>
          <div className="bg-slate-100 rounded-xl p-6 space-y-4">
            <p className="text-sm text-muted-foreground font-medium uppercase">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
            </p>
            <p className="text-sm text-muted-foreground">
              IN NO EVENT SHALL HOWWEPLAN, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Your access to or use of (or inability to access or use) the Service</li>
              <li>• Any conduct or content of any third party on the Service</li>
              <li>• Any content obtained from the Service</li>
              <li>• Unauthorized access, use, or alteration of your transmissions or content</li>
              <li>• Actions or omissions of travel suppliers or Agents</li>
            </ul>
            <p className="text-sm text-muted-foreground font-medium mt-4">
              IN NO EVENT SHALL HOWWEPLAN&apos;S TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO HOWWEPLAN IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED DOLLARS ($100).
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF INCIDENTAL OR CONSEQUENTIAL DAMAGES, SO THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.
            </p>
          </div>
        </section>

        {/* Section 13: Indemnification */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            13. Indemnification
          </h2>
          <div className="bg-white rounded-xl border p-6">
            <p className="text-sm text-muted-foreground">
              You agree to defend, indemnify, and hold harmless HowWePlan, its affiliates, licensors, and service providers, and its and their respective officers, directors, employees, contractors, agents, licensors, suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys&apos; fees) arising out of or relating to:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mt-3">
              <li>• Your violation of these Terms</li>
              <li>• Your User Content</li>
              <li>• Your use of the Service</li>
              <li>• Your violation of any third-party right, including intellectual property or privacy rights</li>
              <li>• Your violation of any applicable law, rule, or regulation</li>
            </ul>
          </div>
        </section>

        {/* Section 14-15: Agent Terms */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            14. Additional Terms for Travel Agents
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              In addition to these Terms, Agents must agree to and comply with the HowWePlan Agent Terms, which govern the Agent-Platform relationship, including:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <h4 className="font-medium mb-2">Agent Responsibilities</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Maintain required licenses and insurance</li>
                  <li>• Provide accurate pricing and availability</li>
                  <li>• Honor accepted bookings and proposals</li>
                  <li>• Respond to Users promptly and professionally</li>
                  <li>• Comply with all applicable laws and regulations</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <h4 className="font-medium mb-2">Commission and Payments</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Platform commission rates as specified in Agent Terms</li>
                  <li>• Payment disbursement schedule</li>
                  <li>• Chargeback and refund responsibilities</li>
                  <li>• Tax reporting obligations</li>
                  <li>• Performance requirements and metrics</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 16: Governing Law */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Globe className="h-6 w-6 text-indigo-600" />
            15. Governing Law
          </h2>
          <div className="bg-white rounded-xl border p-6">
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. You agree that any legal action or proceeding between you and HowWePlan arising out of or relating to these Terms shall be brought exclusively in the federal or state courts located in Wilmington, Delaware, and you hereby consent to the personal jurisdiction and venue of such courts.
            </p>
          </div>
        </section>

        {/* Section 17: Dispute Resolution */}
        <section id="disputes" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Gavel className="h-6 w-6 text-indigo-600" />
            16. Dispute Resolution and Arbitration
          </h2>
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-semibold text-amber-800 mb-2">PLEASE READ THIS SECTION CAREFULLY – IT MAY SIGNIFICANTLY AFFECT YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT</h3>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">16.1 Informal Resolution</h3>
              <p className="text-sm text-muted-foreground">
                Before initiating any arbitration or court proceeding, you agree to first contact us at <a href="mailto:disputes@howweplan.com" className="text-indigo-600 hover:underline">disputes@howweplan.com</a> to attempt to resolve any dispute informally. We will attempt to resolve disputes within 60 days of receipt of notice.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">16.2 Binding Arbitration</h3>
              <p className="text-sm text-muted-foreground mb-3">
                If informal resolution fails, any dispute arising from or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the JAMS Streamlined Arbitration Rules and Procedures. The arbitration shall be conducted in Delaware by a single arbitrator.
              </p>
              <p className="text-sm text-muted-foreground">
                YOU UNDERSTAND AND AGREE THAT BY AGREEING TO THESE TERMS, YOU AND HOWWEPLAN ARE EACH WAIVING THE RIGHT TO A TRIAL BY JURY OR TO PARTICIPATE IN A CLASS ACTION.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">16.3 Class Action Waiver</h3>
              <p className="text-sm text-muted-foreground">
                ALL CLAIMS MUST BE BROUGHT IN THE PARTIES&apos; INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. You agree that you may only bring claims against HowWePlan in your individual capacity and not as a plaintiff or class member in any purported class or collective proceeding.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">16.4 Exceptions</h3>
              <p className="text-sm text-muted-foreground">
                Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of a party&apos;s intellectual property rights. Claims within the jurisdiction of small claims court may also be brought there.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">16.5 Opt-Out</h3>
              <p className="text-sm text-muted-foreground">
                You may opt out of this arbitration agreement by sending a written notice to us within 30 days of first accepting these Terms. The notice must include your name, address, email, and a statement that you opt out of the arbitration provision. Send to: HowWePlan, Inc., 350 Fifth Avenue, Suite 7820, New York, NY 10118, Attn: Arbitration Opt-Out.
              </p>
            </div>
          </div>
        </section>

        {/* Section 18: Changes to Terms */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            17. Changes to Terms
          </h2>
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <p className="text-muted-foreground">
              We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
            <p className="text-muted-foreground">
              By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you must stop using the Service.
            </p>
          </div>
        </section>

        {/* Section 19: Miscellaneous */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            18. Miscellaneous
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <div>
                <h4 className="font-semibold mb-1">18.1 Entire Agreement</h4>
                <p className="text-sm text-muted-foreground">
                  These Terms, together with the Privacy Policy and any other agreements expressly incorporated by reference, constitute the entire agreement between you and HowWePlan concerning the Service.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">18.2 Severability</h4>
                <p className="text-sm text-muted-foreground">
                  If any provision of these Terms is held to be unenforceable, the remaining provisions will remain in effect.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">18.3 Waiver</h4>
                <p className="text-sm text-muted-foreground">
                  No waiver of any term of these Terms shall be deemed a further or continuing waiver of such term or any other term.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">18.4 Assignment</h4>
                <p className="text-sm text-muted-foreground">
                  You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">18.5 Notices</h4>
                <p className="text-sm text-muted-foreground">
                  We may provide notices to you via email, posting on the Service, or other reasonable means. You may provide notice to us only through the contact methods specified in these Terms.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">18.6 No Third-Party Beneficiaries</h4>
                <p className="text-sm text-muted-foreground">
                  These Terms do not create any third-party beneficiary rights.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 20: Contact Us */}
        <section id="contact" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Mail className="h-6 w-6 text-indigo-600" />
            19. Contact Information
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-4">General Inquiries</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>Email: <a href="mailto:legal@howweplan.com" className="text-indigo-600 hover:underline">legal@howweplan.com</a></li>
                  <li>Phone: +1 (800) HOW-PLAN</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-4">Mailing Address</h4>
                <p className="text-sm text-muted-foreground">
                  HowWePlan, Inc.<br />
                  Attn: Legal Department<br />
                  350 Fifth Avenue, Suite 7820<br />
                  New York, NY 10118<br />
                  United States
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <h5 className="font-medium text-sm mb-1">Disputes</h5>
              <a href="mailto:disputes@howweplan.com" className="text-indigo-600 text-sm hover:underline">disputes@howweplan.com</a>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <h5 className="font-medium text-sm mb-1">Copyright/DMCA</h5>
              <a href="mailto:dmca@howweplan.com" className="text-indigo-600 text-sm hover:underline">dmca@howweplan.com</a>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <h5 className="font-medium text-sm mb-1">Privacy Concerns</h5>
              <a href="mailto:privacy@howweplan.com" className="text-indigo-600 text-sm hover:underline">privacy@howweplan.com</a>
            </div>
          </div>
        </section>

        {/* Acknowledgment */}
        <section className="mb-12 bg-indigo-50 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-indigo-800 mb-4 text-center">Acknowledgment</h3>
          <p className="text-indigo-700 text-center">
            BY USING THE HOWWEPLAN SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, YOU ARE NOT AUTHORIZED TO USE THE SERVICE.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Plane className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold">HowWePlan</span>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground font-medium text-foreground">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link href="/contact" className="hover:text-foreground">Contact Us</Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} HowWePlan, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
