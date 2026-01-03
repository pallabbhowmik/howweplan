import Link from 'next/link';
import { Plane, Shield, Mail, FileText, Globe, Lock, Eye, Database, Users, Bell, Cookie, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Privacy Policy | HowWePlan',
  description: 'Learn how HowWePlan collects, uses, and protects your personal information. GDPR and CCPA compliant.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 3, 2026';
  const effectiveDate = 'January 3, 2026';

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
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-6">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-blue-200">
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
                { href: '#information-collected', label: 'Information We Collect' },
                { href: '#how-we-use', label: 'How We Use Data' },
                { href: '#sharing', label: 'Information Sharing' },
                { href: '#your-rights', label: 'Your Rights' },
                { href: '#security', label: 'Security' },
                { href: '#cookies', label: 'Cookies' },
                { href: '#international', label: 'International Transfers' },
                { href: '#contact', label: 'Contact Us' },
              ].map((item) => (
                <a 
                  key={item.href}
                  href={item.href} 
                  className="px-4 py-2 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-full text-sm font-medium transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Introduction */}
        <section className="mb-12 bg-blue-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            Introduction
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              HowWePlan, Inc. (&quot;HowWePlan,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy and ensuring transparency about how we handle your personal information. This Privacy Policy describes our practices concerning the information we collect from you when you use our website at howweplan.com and related mobile applications (collectively, the &quot;Service&quot;).
            </p>
            <p>
              This policy applies to all users of our Service, including travelers (&quot;Users&quot;) and travel agents (&quot;Agents&quot;). By using our Service, you agree to the collection and use of information in accordance with this policy.
            </p>
            <p className="font-medium text-foreground">
              HowWePlan, Inc. is the data controller for the purposes of GDPR and applicable data protection laws.
            </p>
          </div>
        </section>

        {/* Section 1: Information We Collect */}
        <section id="information-collected" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Database className="h-6 w-6 text-blue-600" />
            1. Information We Collect
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">1.1 Information You Provide Directly</h3>
              <div className="bg-white rounded-xl border p-6 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Account Information</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                    <li>Full name, email address, phone number</li>
                    <li>Password (stored in encrypted form)</li>
                    <li>Profile photo (optional)</li>
                    <li>Date of birth (for age verification and travel requirements)</li>
                    <li>Nationality and passport country (for visa requirements)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Travel Request Information</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                    <li>Destination preferences and travel dates</li>
                    <li>Budget range and accommodation preferences</li>
                    <li>Special requirements (dietary, accessibility, medical)</li>
                    <li>Traveler details (names, ages of companions)</li>
                    <li>Travel interests and activity preferences</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Payment Information</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                    <li>Credit/debit card details (processed by our PCI-DSS compliant payment processor)</li>
                    <li>Billing address</li>
                    <li>Payment history and transaction records</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Communications</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                    <li>Messages exchanged with travel agents through our platform</li>
                    <li>Customer support interactions</li>
                    <li>Reviews and feedback you provide</li>
                    <li>Survey responses</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">For Travel Agents</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                    <li>Business name and registration details</li>
                    <li>Professional certifications and licenses</li>
                    <li>Tax identification numbers</li>
                    <li>Bank account details for payouts</li>
                    <li>Insurance documentation</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">1.2 Information Collected Automatically</h3>
              <div className="bg-white rounded-xl border p-6 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Device and Technical Information</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                    <li>IP address and approximate geolocation</li>
                    <li>Device type, operating system, and browser type</li>
                    <li>Unique device identifiers</li>
                    <li>Mobile network information</li>
                    <li>Time zone and language settings</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Usage Information</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                    <li>Pages visited and features used</li>
                    <li>Search queries and filters applied</li>
                    <li>Time spent on pages and click patterns</li>
                    <li>Referring and exit pages</li>
                    <li>Dates and times of access</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Cookies and Similar Technologies</h4>
                  <p className="text-muted-foreground text-sm">
                    We use cookies, pixels, beacons, and local storage to collect information. See Section 8 (Cookies) for detailed information about our cookie practices.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">1.3 Information from Third Parties</h3>
              <div className="bg-white rounded-xl border p-6 space-y-4">
                <ul className="list-disc list-inside text-muted-foreground space-y-2 text-sm">
                  <li><strong>Social Login Providers:</strong> If you sign up using Google, Facebook, or Apple, we receive your name, email, and profile photo as permitted by your privacy settings</li>
                  <li><strong>Identity Verification Services:</strong> Results from identity verification checks for fraud prevention</li>
                  <li><strong>Payment Processors:</strong> Transaction confirmations and fraud indicators from Stripe and other payment partners</li>
                  <li><strong>Travel Agents:</strong> Information they provide about your bookings and travel arrangements</li>
                  <li><strong>Public Sources:</strong> Business registration databases for agent verification</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: How We Use Your Information */}
        <section id="how-we-use" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Eye className="h-6 w-6 text-blue-600" />
            2. How We Use Your Information
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">2.1 To Provide and Improve Our Service</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Create and manage your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Match you with appropriate travel agents based on your requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Process bookings, payments, and refunds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Facilitate communication between users and agents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Provide customer support and respond to inquiries</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Analyze usage patterns to improve our Service</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Develop new features and services</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">2.2 To Communicate With You</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-start gap-2">
                  <Bell className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Send booking confirmations and travel updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bell className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Notify you of messages from travel agents</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bell className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Send important account and security notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bell className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Deliver marketing communications (with your consent)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bell className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Request feedback and conduct surveys</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">2.3 For Security and Legal Purposes</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Detect, prevent, and investigate fraud and unauthorized access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Verify identity and prevent account abuse</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Enforce our Terms of Service and policies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Comply with legal obligations and respond to lawful requests</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Protect the rights, property, and safety of our users and others</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <h3 className="text-lg font-semibold mb-3 text-amber-800">Legal Basis for Processing (GDPR)</h3>
              <p className="text-sm text-amber-700 mb-4">
                For users in the European Economic Area (EEA) and UK, we process your data based on:
              </p>
              <ul className="space-y-2 text-sm text-amber-700">
                <li><strong>Contract Performance:</strong> Processing necessary to fulfill our agreement with you</li>
                <li><strong>Legitimate Interests:</strong> For fraud prevention, security, and service improvement</li>
                <li><strong>Legal Obligations:</strong> When required by law (e.g., tax records, legal requests)</li>
                <li><strong>Consent:</strong> For marketing communications and non-essential cookies</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Information Sharing */}
        <section id="sharing" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Users className="h-6 w-6 text-blue-600" />
            3. How We Share Your Information
          </h2>

          <div className="space-y-6">
            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <p className="font-semibold text-green-800 mb-2">
                We do not sell your personal information to third parties.
              </p>
              <p className="text-sm text-green-700">
                We share your information only as described below and only to the extent necessary to provide our Service.
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-6">
              <div>
                <h4 className="font-semibold mb-2">3.1 With Travel Agents</h4>
                <p className="text-sm text-muted-foreground">
                  When you submit a travel request or accept an agent&apos;s proposal, we share your travel requirements, preferences, and contact information with the matched agent to facilitate itinerary creation and booking. Agents are contractually obligated to protect your data.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.2 With Service Providers</h4>
                <p className="text-sm text-muted-foreground mb-2">We share data with trusted third parties who assist in operating our Service:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Payment Processors:</strong> Stripe, PayPal for payment processing</li>
                  <li><strong>Cloud Infrastructure:</strong> AWS, Vercel, Supabase for hosting and data storage</li>
                  <li><strong>Email Services:</strong> Resend, SendGrid for transactional emails</li>
                  <li><strong>Analytics:</strong> Google Analytics, Mixpanel for usage analysis</li>
                  <li><strong>Customer Support:</strong> Intercom, Zendesk for support tickets</li>
                  <li><strong>Identity Verification:</strong> Stripe Identity for fraud prevention</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.3 For Legal Reasons</h4>
                <p className="text-sm text-muted-foreground">We may disclose information when required by law or when we believe in good faith that disclosure is necessary to:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                  <li>Comply with legal process, court orders, or government requests</li>
                  <li>Enforce our Terms of Service and other agreements</li>
                  <li>Protect the rights, property, or safety of HowWePlan, our users, or others</li>
                  <li>Detect, prevent, or address fraud, security, or technical issues</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.4 Business Transfers</h4>
                <p className="text-sm text-muted-foreground">
                  If HowWePlan is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you via email and/or prominent notice on our Service before your information becomes subject to a different privacy policy.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.5 With Your Consent</h4>
                <p className="text-sm text-muted-foreground">
                  We may share information with third parties when you explicitly consent to such sharing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Your Rights */}
        <section id="your-rights" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Lock className="h-6 w-6 text-blue-600" />
            4. Your Privacy Rights
          </h2>

          <div className="space-y-6">
            <p className="text-muted-foreground">
              Depending on your location, you have certain rights regarding your personal information. We honor these rights for all users, regardless of jurisdiction.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: 'Access', desc: 'Request a copy of the personal data we hold about you' },
                { title: 'Correction', desc: 'Request correction of inaccurate or incomplete data' },
                { title: 'Deletion', desc: 'Request deletion of your personal data ("right to be forgotten")' },
                { title: 'Portability', desc: 'Receive your data in a structured, machine-readable format' },
                { title: 'Restriction', desc: 'Request restriction of processing in certain circumstances' },
                { title: 'Objection', desc: 'Object to processing based on legitimate interests or for marketing' },
                { title: 'Withdraw Consent', desc: 'Withdraw consent at any time where we rely on consent' },
                { title: 'Non-Discrimination', desc: 'We will not discriminate against you for exercising your rights' },
              ].map((right) => (
                <Card key={right.title} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-blue-700 mb-1">{right.title}</h4>
                    <p className="text-sm text-muted-foreground">{right.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-blue-50 rounded-xl p-6">
              <h4 className="font-semibold mb-3">How to Exercise Your Rights</h4>
              <p className="text-sm text-muted-foreground mb-4">
                You can exercise most rights directly from your account settings. For other requests:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>• Email: <a href="mailto:privacy@howweplan.com" className="text-blue-600 hover:underline">privacy@howweplan.com</a></li>
                <li>• Mail: HowWePlan, Inc., Attn: Privacy Team, 350 Fifth Avenue, Suite 7820, New York, NY 10118</li>
                <li>• Online: Use the data request form in your account settings</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                We will respond to verified requests within 30 days (or 45 days for complex requests with notice). You may be asked to verify your identity before we process your request.
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-6">
              <h4 className="font-semibold mb-3 text-purple-800">California Residents (CCPA/CPRA)</h4>
              <p className="text-sm text-purple-700 mb-3">
                California residents have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
              </p>
              <ul className="text-sm text-purple-700 space-y-2">
                <li>• Right to know what personal information is collected, used, and shared</li>
                <li>• Right to delete personal information held by businesses</li>
                <li>• Right to opt-out of the sale or sharing of personal information</li>
                <li>• Right to correct inaccurate personal information</li>
                <li>• Right to limit use of sensitive personal information</li>
                <li>• Right to non-discrimination for exercising CCPA rights</li>
              </ul>
              <p className="text-sm text-purple-700 mt-3">
                To exercise these rights, contact us at <a href="mailto:privacy@howweplan.com" className="underline">privacy@howweplan.com</a> or call 1-800-HOW-PLAN.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Data Security */}
        <section id="security" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Shield className="h-6 w-6 text-blue-600" />
            5. Data Security
          </h2>

          <div className="space-y-6">
            <p className="text-muted-foreground">
              We implement comprehensive technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-3">Technical Safeguards</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• TLS 1.3 encryption for all data in transit</li>
                    <li>• AES-256 encryption for data at rest</li>
                    <li>• Secure password hashing (bcrypt)</li>
                    <li>• Regular security assessments and penetration testing</li>
                    <li>• Web Application Firewall (WAF) protection</li>
                    <li>• DDoS mitigation</li>
                    <li>• Intrusion detection and monitoring</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-3">Organizational Measures</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Role-based access controls (least privilege principle)</li>
                    <li>• Employee security training and awareness programs</li>
                    <li>• Background checks for employees with data access</li>
                    <li>• Vendor security assessments</li>
                    <li>• Incident response procedures</li>
                    <li>• Regular security audits and compliance reviews</li>
                    <li>• Data Protection Officer oversight</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm bg-slate-50">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3">Payment Security</h4>
                <p className="text-sm text-muted-foreground">
                  All payment information is processed through PCI-DSS Level 1 compliant payment processors. We never store your full credit card number on our servers. Payment data is tokenized and encrypted by our payment partners (Stripe).
                </p>
              </CardContent>
            </Card>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800 mb-2">Data Breach Notification</h4>
                  <p className="text-sm text-amber-700">
                    In the event of a data breach that affects your personal information, we will notify you and relevant authorities as required by law. For users in the EEA, we will notify the supervisory authority within 72 hours of becoming aware of a breach and notify affected individuals without undue delay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Data Retention */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Clock className="h-6 w-6 text-blue-600" />
            6. Data Retention
          </h2>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              We retain your personal information only for as long as necessary to fulfill the purposes described in this policy, unless a longer retention period is required by law.
            </p>

            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Data Type</th>
                    <th className="text-left p-4 font-semibold">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-4">Account Information</td>
                    <td className="p-4 text-muted-foreground">Duration of account + 3 years after deletion</td>
                  </tr>
                  <tr>
                    <td className="p-4">Booking Records</td>
                    <td className="p-4 text-muted-foreground">7 years (tax and legal compliance)</td>
                  </tr>
                  <tr>
                    <td className="p-4">Payment Information</td>
                    <td className="p-4 text-muted-foreground">7 years (financial regulations)</td>
                  </tr>
                  <tr>
                    <td className="p-4">Messages with Agents</td>
                    <td className="p-4 text-muted-foreground">3 years after last interaction</td>
                  </tr>
                  <tr>
                    <td className="p-4">Support Tickets</td>
                    <td className="p-4 text-muted-foreground">2 years after resolution</td>
                  </tr>
                  <tr>
                    <td className="p-4">Server Logs</td>
                    <td className="p-4 text-muted-foreground">90 days</td>
                  </tr>
                  <tr>
                    <td className="p-4">Analytics Data</td>
                    <td className="p-4 text-muted-foreground">26 months (anonymized thereafter)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-muted-foreground">
              When you delete your account, we will delete or anonymize your personal information within 30 days, except for data we are required to retain for legal, tax, or fraud prevention purposes.
            </p>
          </div>
        </section>

        {/* Section 7: International Data Transfers */}
        <section id="international" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Globe className="h-6 w-6 text-blue-600" />
            7. International Data Transfers
          </h2>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              HowWePlan is headquartered in the United States, and we process and store data primarily in the US. If you are located outside the US, your information will be transferred to and processed in the US.
            </p>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h4 className="font-semibold">Safeguards for International Transfers</h4>
              <p className="text-sm text-muted-foreground">
                For transfers from the EEA, UK, and Switzerland, we rely on:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• <strong>EU-US Data Privacy Framework:</strong> We are certified under the EU-US Data Privacy Framework</li>
                <li>• <strong>Standard Contractual Clauses:</strong> We use EU-approved Standard Contractual Clauses for transfers to third parties</li>
                <li>• <strong>Adequacy Decisions:</strong> Where applicable, transfers to countries with adequacy decisions from the European Commission</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                You may request a copy of the safeguards we use for international transfers by contacting <a href="mailto:privacy@howweplan.com" className="text-blue-600 hover:underline">privacy@howweplan.com</a>.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8: Cookies */}
        <section id="cookies" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Cookie className="h-6 w-6 text-blue-600" />
            8. Cookies and Tracking Technologies
          </h2>

          <div className="space-y-6">
            <p className="text-muted-foreground">
              We use cookies and similar technologies to enhance your experience, analyze usage, and deliver personalized content.
            </p>

            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Cookie Type</th>
                    <th className="text-left p-4 font-semibold">Purpose</th>
                    <th className="text-left p-4 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-4 font-medium">Essential</td>
                    <td className="p-4 text-muted-foreground">Required for site functionality, security, authentication</td>
                    <td className="p-4 text-muted-foreground">Session / 1 year</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Functional</td>
                    <td className="p-4 text-muted-foreground">Remember preferences, language, region</td>
                    <td className="p-4 text-muted-foreground">1 year</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Analytics</td>
                    <td className="p-4 text-muted-foreground">Understand usage patterns, improve service</td>
                    <td className="p-4 text-muted-foreground">26 months</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Marketing</td>
                    <td className="p-4 text-muted-foreground">Personalized ads, measure campaign effectiveness</td>
                    <td className="p-4 text-muted-foreground">90 days - 2 years</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 rounded-xl p-6">
              <h4 className="font-semibold mb-3">Managing Your Cookie Preferences</h4>
              <p className="text-sm text-muted-foreground mb-4">
                You can manage your cookie preferences at any time:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>• Use our cookie consent banner when you first visit</li>
                <li>• Update preferences in the &quot;Cookie Settings&quot; link in the footer</li>
                <li>• Configure your browser to block or delete cookies</li>
                <li>• Use browser extensions to manage tracking</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Note: Blocking essential cookies may affect site functionality. For analytics opt-out, visit <a href="https://tools.google.com/dlpage/gaoptout" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out</a>.
              </p>
            </div>
          </div>
        </section>

        {/* Section 9: Children's Privacy */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            9. Children&apos;s Privacy
          </h2>

          <div className="bg-white rounded-xl border p-6">
            <p className="text-muted-foreground mb-4">
              Our Service is not directed to children under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18 without parental consent, we will take steps to delete that information.
            </p>
            <p className="text-muted-foreground">
              If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:privacy@howweplan.com" className="text-blue-600 hover:underline">privacy@howweplan.com</a>.
            </p>
          </div>
        </section>

        {/* Section 10: Changes to This Policy */}
        <section className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            10. Changes to This Privacy Policy
          </h2>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.
            </p>
            <p className="text-muted-foreground">
              When we make material changes, we will:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Update the &quot;Last Updated&quot; date at the top of this policy</li>
              <li>Provide notice through the Service or via email</li>
              <li>For significant changes, require affirmative consent where required by law</li>
            </ul>
            <p className="text-muted-foreground">
              We encourage you to review this Privacy Policy periodically for the latest information on our privacy practices.
            </p>
          </div>
        </section>

        {/* Section 11: Contact Us */}
        <section id="contact" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pb-2 border-b">
            <Mail className="h-6 w-6 text-blue-600" />
            11. Contact Us
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-4">Data Protection Officer</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  For privacy-related questions, data requests, or concerns:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>Email: <a href="mailto:dpo@howweplan.com" className="text-blue-600 hover:underline">dpo@howweplan.com</a></li>
                  <li>Phone: +1 (800) HOW-PLAN</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-4">Mailing Address</h4>
                <p className="text-sm text-muted-foreground">
                  HowWePlan, Inc.<br />
                  Attn: Privacy Team<br />
                  350 Fifth Avenue, Suite 7820<br />
                  New York, NY 10118<br />
                  United States
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 bg-slate-50 rounded-xl p-6">
            <h4 className="font-semibold mb-3">EU/EEA Representative</h4>
            <p className="text-sm text-muted-foreground mb-2">
              For users in the European Union, our EU representative is:
            </p>
            <p className="text-sm text-muted-foreground">
              HowWePlan EU Representative<br />
              [EU Representative Address]<br />
              Email: <a href="mailto:eu-privacy@howweplan.com" className="text-blue-600 hover:underline">eu-privacy@howweplan.com</a>
            </p>
          </div>

          <div className="mt-6 bg-slate-50 rounded-xl p-6">
            <h4 className="font-semibold mb-3">Supervisory Authority</h4>
            <p className="text-sm text-muted-foreground">
              If you are located in the EEA and believe we have not adequately addressed your concerns, you have the right to lodge a complaint with your local data protection authority. A list of EU data protection authorities is available at{' '}
              <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                https://edpb.europa.eu
              </a>.
            </p>
          </div>
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
              <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-foreground font-medium text-foreground">Privacy Policy</Link>
              <Link href="/contact" className="hover:text-foreground">Contact Us</Link>
              <Link href="/cookies" className="hover:text-foreground">Cookie Settings</Link>
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
