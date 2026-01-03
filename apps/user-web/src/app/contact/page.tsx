'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';
import { 
  Plane, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Send, 
  Loader2,
  CheckCircle,
  HelpCircle,
  Shield,
  FileText,
  AlertTriangle,
  Building2,
  Globe,
  Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ContactSettings, defaultContactSettings, getContactSettings } from '@/lib/api/site-settings';

export default function ContactPage() {
  const [settings, setSettings] = useState<ContactSettings>(defaultContactSettings);
  const [, setIsLoadingSettings] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getContactSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'booking', label: 'Booking Support' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'agent', label: 'Travel Agent Support' },
    { value: 'privacy', label: 'Privacy & Data Request' },
    { value: 'legal', label: 'Legal Inquiry' },
    { value: 'partnership', label: 'Partnership Opportunity' },
    { value: 'complaint', label: 'Complaint / Dispute' },
  ];

  // Format full address if available
  const getFullAddress = () => {
    if (!settings.showAddress) return null;
    const parts = [
      settings.addressLine1,
      settings.addressLine2,
      [settings.city, settings.state, settings.zipCode].filter(Boolean).join(', '),
      settings.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts : null;
  };

  const fullAddress = getFullAddress();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {settings.companyName}
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            We&apos;re here to help. Reach out to our team for support, inquiries, or feedback.
          </p>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-12">
        {/* Quick Contact Cards */}
        <div className="grid md:grid-cols-3 gap-6 -mt-20 mb-16 relative z-20">
          <Card className="shadow-xl border-0 bg-white hover:shadow-2xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Customer Support</h3>
              <p className="text-sm text-muted-foreground mb-3">Available {settings.supportHours} for urgent travel matters</p>
              <a href={`mailto:${settings.supportEmail}`} className="text-blue-600 font-medium hover:underline">
                {settings.supportEmail}
              </a>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white hover:shadow-2xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Phone Support</h3>
              <p className="text-sm text-muted-foreground mb-3">{settings.businessHours}</p>
              <a href={`tel:${settings.mainPhone.replace(/[^+\d]/g, '')}`} className="text-blue-600 font-medium hover:underline">
                {settings.mainPhone}
              </a>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white hover:shadow-2xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-3">Get instant help in your dashboard</p>
              <Link href="/dashboard" className="text-blue-600 font-medium hover:underline">
                Start Chat →
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-2xl">Send Us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we&apos;ll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Thank you for reaching out. Our team will review your message and respond within 24 hours.
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Reference ID: <span className="font-mono font-medium">HWP-{Date.now().toString(36).toUpperCase()}</span>
                    </p>
                    <Button onClick={() => setIsSubmitted(false)} variant="outline">
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="John Smith"
                          value={formData.name}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <select
                          id="category"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          required
                        >
                          {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          placeholder="Brief description of your inquiry"
                          value={formData.subject}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, subject: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <textarea
                        id="message"
                        className="w-full min-h-[150px] px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                        placeholder="Please provide as much detail as possible so we can assist you better..."
                        value={formData.message}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-muted-foreground">
                      <p>
                        By submitting this form, you agree to our{' '}
                        <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                        {' '}and consent to being contacted regarding your inquiry.
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact Information Sidebar */}
          <div className="space-y-6">
            {/* Office Info - Only show if address is visible or has business hours */}
            {(fullAddress || settings.businessHours) && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {settings.companyName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fullAddress && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{settings.companyName}, Inc.</p>
                        <p className="text-sm text-muted-foreground">
                          {fullAddress.map((line, i) => (
                            <span key={i}>
                              {line}
                              {i < fullAddress.length - 1 && <br />}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                  )}
                  {settings.businessHours && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Business Hours</p>
                        <p className="text-sm text-muted-foreground">
                          {settings.businessHours}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Department Contacts */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Department Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {settings.supportEmail && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">General Support</span>
                      <a href={`mailto:${settings.supportEmail}`} className="text-sm text-blue-600 hover:underline">
                        {settings.supportEmail}
                      </a>
                    </div>
                  )}
                  {settings.billingEmail && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">Billing Inquiries</span>
                      <a href={`mailto:${settings.billingEmail}`} className="text-sm text-blue-600 hover:underline">
                        {settings.billingEmail}
                      </a>
                    </div>
                  )}
                  {settings.agentEmail && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">Agent Support</span>
                      <a href={`mailto:${settings.agentEmail}`} className="text-sm text-blue-600 hover:underline">
                        {settings.agentEmail}
                      </a>
                    </div>
                  )}
                  {settings.privacyEmail && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">Privacy & Data</span>
                      <a href={`mailto:${settings.privacyEmail}`} className="text-sm text-blue-600 hover:underline">
                        {settings.privacyEmail}
                      </a>
                    </div>
                  )}
                  {settings.legalEmail && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">Legal Department</span>
                      <a href={`mailto:${settings.legalEmail}`} className="text-sm text-blue-600 hover:underline">
                        {settings.legalEmail}
                      </a>
                    </div>
                  )}
                  {settings.pressEmail && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">Press & Media</span>
                      <a href={`mailto:${settings.pressEmail}`} className="text-sm text-blue-600 hover:underline">
                        {settings.pressEmail}
                      </a>
                    </div>
                  )}
                  {settings.partnershipEmail && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium">Partnerships</span>
                      <a href={`mailto:${settings.partnershipEmail}`} className="text-sm text-blue-600 hover:underline">
                        {settings.partnershipEmail}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {settings.emergencyPhone && (
              <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Travel Emergency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    For urgent travel emergencies while on your trip (flight cancellations, stranded travelers, medical emergencies):
                  </p>
                  <a 
                    href={`tel:${settings.emergencyPhone.replace(/[^+\d]/g, '')}`}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    <Phone className="h-5 w-5" />
                    {settings.emergencyPhone}
                  </a>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Available 24/7 for active travelers
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mt-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find quick answers to common questions. For more detailed help, visit our{' '}
              <Link href="/help" className="text-blue-600 hover:underline">Help Center</Link>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: HelpCircle,
                question: 'How do I cancel or modify my booking?',
                answer: 'Log in to your dashboard, navigate to your booking, and select "Modify" or "Cancel". Cancellation policies vary by booking.'
              },
              {
                icon: Shield,
                question: 'Is my payment information secure?',
                answer: 'Yes. We use bank-level encryption and never store your full card details. Payments are processed through PCI-DSS compliant providers.'
              },
              {
                icon: Globe,
                question: 'What if I need help while traveling abroad?',
                answer: 'Call our 24/7 emergency line or use the in-app chat. We provide assistance for flight changes, rebooking, and emergency situations.'
              },
              {
                icon: FileText,
                question: 'How do I request my personal data?',
                answer: `Email ${settings.privacyEmail} or submit a request through your account settings. We respond to GDPR/CCPA requests within 30 days.`
              },
            ].map((faq, index) => (
              <Card key={index} className="shadow border-0">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <faq.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{faq.question}</h3>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Regulatory Information - Only show if enabled */}
        {settings.showRegulatoryInfo && (settings.accreditations.length > 0 || settings.licenses.length > 0) && (
          <section className="mt-16 bg-slate-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Regulatory & Compliance Information</h2>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Business Registration</h3>
                <p className="text-muted-foreground">
                  {settings.companyName}, Inc. is a registered corporation in the State of Delaware, USA.
                </p>
              </div>
              {settings.licenses.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Travel Seller Registration</h3>
                  <p className="text-muted-foreground">
                    {settings.licenses.map((license: string, i: number) => (
                      <span key={i}>
                        {license}
                        {i < settings.licenses.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
              )}
              {settings.accreditations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Accreditations</h3>
                  <p className="text-muted-foreground">
                    {settings.accreditations.join(' • ')}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Plane className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold">{settings.companyName}</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                {settings.tagline || 'Connecting travelers with expert travel agents for personalized trip planning.'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About Us</Link></li>
                <li><Link href="/how-it-works" className="hover:text-foreground">How It Works</Link></li>
                <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
                <li><Link href="/press" className="hover:text-foreground">Press</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/cookies" className="hover:text-foreground">Cookie Policy</Link></li>
                <li><Link href="/accessibility" className="hover:text-foreground">Accessibility</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/help" className="hover:text-foreground">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact Us</Link></li>
                <li><Link href="/safety" className="hover:text-foreground">Trust & Safety</Link></li>
                <li><Link href="/sitemap" className="hover:text-foreground">Sitemap</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {settings.companyName}, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
