import Link from 'next/link';
import { Plane } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">HowWePlan</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 29, 2025</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using HowWePlan (&quot;the Service&quot;), you accept and agree to be bound by 
              the terms and conditions of this agreement. If you do not agree to these terms, please 
              do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              HowWePlan is a platform that connects travelers with professional travel agents. 
              We facilitate the creation of custom travel itineraries, communication between users 
              and agents, and secure payment processing for bookings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Booking and Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you book a trip through HowWePlan:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-2">
              <li>Payment is processed securely through our payment partners</li>
              <li>Funds are held until services are confirmed</li>
              <li>Cancellation policies vary by booking and agent</li>
              <li>Refunds are subject to individual booking terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. User Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Harass, abuse, or harm other users or agents</li>
              <li>Share false or misleading information</li>
              <li>Attempt to circumvent the platform for direct transactions</li>
              <li>Interfere with the proper functioning of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by 
              HowWePlan and are protected by international copyright, trademark, patent, 
              trade secret, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              HowWePlan acts as an intermediary between travelers and travel agents. We are 
              not responsible for the actions, omissions, or quality of service provided by 
              travel agents or third-party service providers. Our liability is limited to the 
              fees paid to us for our platform services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              We provide a dispute resolution process for issues between travelers and agents. 
              Users agree to first attempt resolution through our platform before pursuing 
              external legal remedies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of 
              significant changes via email or through the Service. Continued use after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@howweplan.com" className="text-blue-600 hover:underline">
                legal@howweplan.com
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/how-it-works" className="hover:underline">How It Works</Link>
          </div>
          <p>© 2025 HowWePlan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
