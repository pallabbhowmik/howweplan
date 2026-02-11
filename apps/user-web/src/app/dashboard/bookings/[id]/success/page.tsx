'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight, MessageSquare, Calendar, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function BookingSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="max-w-lg w-full shadow-xl border-0">
        <CardContent className="p-8 text-center">
          {/* Success Animation */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
            <div className="relative flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-slate-500 mb-8">
            Your trip has been booked successfully. Your travel advisor will reach out shortly with next steps.
          </p>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => router.push(`/dashboard/bookings/${bookingId}`)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Booking Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/dashboard/messages')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Your Advisor
            </Button>

            <Link href="/dashboard" className="block">
              <Button variant="ghost" className="w-full text-slate-500">
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Booking Reference */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Booking Reference: <span className="font-mono text-slate-500">{bookingId?.slice(0, 8).toUpperCase()}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
