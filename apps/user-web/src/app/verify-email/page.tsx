'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plane, 
  CheckCircle, 
  Loader2,
  Mail,
  Shield,
  ArrowRight,
  XCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyEmail, resendVerificationEmail } from '@/lib/api/auth';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const verifyToken = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setError('No verification token provided.');
      return;
    }

    try {
      await verifyEmail(token);
      setIsSuccess(true);
    } catch (err) {
      console.error('Email verification error:', err);
      if (err instanceof Error) {
        if (err.message.includes('expired')) {
          setError('This verification link has expired. Please request a new one.');
        } else if (err.message.includes('invalid') || err.message.includes('not found')) {
          setError('Invalid verification link. Please request a new one.');
        } else if (err.message.includes('already verified')) {
          setIsSuccess(true); // Treat already verified as success
        } else {
          setError(err.message || 'Failed to verify email. Please try again.');
        }
      } else {
        setError('Failed to verify email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setIsResending(true);
    try {
      await resendVerificationEmail(resendEmail);
      setResendSuccess(true);
    } catch (err) {
      console.error('Resend verification error:', err);
      // Still show success to prevent email enumeration
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand & Info */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-32 right-20 w-[600px] h-[600px] bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-indigo-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>
        </div>

        {/* Logo & Tagline */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 mb-6 group cursor-pointer w-fit">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
              <Plane className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">HowWePlan</h1>
              <p className="text-sm text-blue-100">Where Dreams Take Flight</p>
            </div>
          </Link>
        </div>

        {/* Main Content */}
        <div className="relative z-10 space-y-12 max-w-xl">
          <div>
            <h2 className="text-5xl font-bold text-white leading-tight mb-6">
              Verify Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
                Email Address
              </span>
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              Email verification helps keep your account secure and ensures 
              you receive important updates about your trips.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            {[
              {
                icon: Shield,
                title: 'Account Security',
                description: 'Protect your account from unauthorized access'
              },
              {
                icon: Mail,
                title: 'Trip Updates',
                description: 'Receive important notifications about your bookings'
              },
              {
                icon: Sparkles,
                title: 'Full Access',
                description: 'Unlock all features including booking and messaging'
              }
            ].map((item, index) => (
              <div 
                key={index} 
                className="flex items-start gap-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group"
              >
                <div className="mt-1 p-3 rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-sm text-blue-200">© 2024 HowWePlan. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-blue-200 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-blue-200 hover:text-white transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>

      {/* Right Panel - Verification Status */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white relative">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HowWePlan</span>
          </Link>
        </div>

        <div className="w-full max-w-md mt-20 lg:mt-0">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 lg:p-10">
              {isLoading ? (
                /* Loading State */
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
                    <p className="text-gray-600">
                      Please wait while we confirm your email address.
                    </p>
                  </div>
                </div>
              ) : isSuccess ? (
                /* Success State */
                <div className="text-center space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
                    <p className="text-gray-600">
                      Your email has been successfully verified. You now have full access to all HowWePlan features.
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-green-700">
                      ✨ You can now create trip requests, message agents, and book your perfect vacation!
                    </p>
                  </div>

                  <Button 
                    onClick={() => router.push('/dashboard')}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              ) : resendSuccess ? (
                /* Resend Success State */
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="h-10 w-10 text-blue-600" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Inbox!</h2>
                    <p className="text-gray-600">
                      If an account exists with that email, we&apos;ve sent a new verification link.
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 text-left">
                    <p className="text-sm text-blue-800 font-medium mb-2">What to do next:</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Check your inbox (and spam folder)</li>
                      <li>• Click the verification link in the email</li>
                      <li>• Come back and enjoy HowWePlan!</li>
                    </ul>
                  </div>

                  <Button 
                    variant="outline"
                    onClick={() => setResendSuccess(false)}
                    className="w-full h-11 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try different email
                  </Button>
                </div>
              ) : (
                /* Error State with Resend Option */
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-10 w-10 text-red-500" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                    <p className="text-gray-600">
                      {error || 'Something went wrong. Please try again.'}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <p className="text-sm text-gray-500 mb-4">
                      Enter your email to receive a new verification link:
                    </p>
                    <form onSubmit={handleResend} className="space-y-4">
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="pl-12 h-12 text-base border-2 border-gray-200 focus:border-blue-600 rounded-xl transition-all"
                          value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)}
                          required
                        />
                      </div>
                      <Button 
                        type="submit"
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={isResending}
                      >
                        {isResending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-5 w-5" />
                            Resend Verification Email
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              )}

              {/* Help Link */}
              <p className="mt-6 text-center text-xs text-gray-500">
                Need help?{' '}
                <Link href="/contact" className="text-blue-600 hover:underline font-medium">
                  Contact Support
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
