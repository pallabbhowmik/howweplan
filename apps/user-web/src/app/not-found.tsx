import Link from 'next/link';
import { Plane, Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated 404 Illustration */}
        <div className="relative mb-8">
          <div className="text-[160px] md:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-bounce-slow">
              <Plane className="h-10 w-10 text-white -rotate-45" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Lost in transit
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
          Looks like this page took a wrong turn. Let&rsquo;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
          >
            <Search className="h-4 w-4" />
            Explore Destinations
          </Link>
        </div>

        <div className="mt-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go back to previous page
          </button>
        </div>
      </div>
    </div>
  );
}
