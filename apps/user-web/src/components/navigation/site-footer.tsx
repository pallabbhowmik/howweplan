import Link from 'next/link';
import { Plane, Star } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">HowWePlan</span>
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              Connecting travelers with expert travel advisors for unforgettable journeys. 
              Plan smarter, travel better.
            </p>
            <div className="flex items-center gap-1 text-sm">
              {[1,2,3,4,5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2 text-white font-medium">4.9/5</span>
              <span className="text-gray-500">• 12k+ reviews</span>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/requests/new" className="hover:text-white transition-colors">Plan a Trip</Link></li>
              <li><Link href="/explore" className="hover:text-white transition-colors">Destinations</Link></li>
              <li><Link href="/travel-advisors" className="hover:text-white transition-colors">For Travel Advisors</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} HowWePlan. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
