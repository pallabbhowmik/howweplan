'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Plane, 
  Mail, 
  ArrowLeft, 
  CheckCircle, 
  Loader2,
  KeyRound,
  Shield,
  Clock,
  RefreshCw,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await forgotPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      // Don't reveal if email exists or not for security
      // Still show success to prevent email enumeration
      console.error('Forgot password error:', err);
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setIsSubmitted(false);
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
              Forgot Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
                Password?
              </span>
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              No worries! It happens to the best of us. We&apos;ll help you 
              get back to planning your next adventure in no time.
            </p>
          </div>

          {/* Info Cards */}
          <div className="space-y-4">
            {[
              {
                icon: Mail,
                title: 'Check Your Email',
                description: 'We\'ll send a secure reset link to your registered email address'
              },
              {
                icon: Clock,
                title: 'Act Quickly',
                description: 'The reset link expires in 1 hour for your security'
              },
              {
                icon: Shield,
                title: 'Secure Process',
                description: 'Your account security is our top priority'
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

      {/* Right Panel - Reset Form */}
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
              {isSubmitted ? (
                /* Success State */
                <div className="text-center space-y-6">
                  {/* Success Animation */}
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox!</h2>
                    <p className="text-gray-600">
                      We&apos;ve sent a password reset link to
                    </p>
                    <p className="font-semibold text-gray-900 mt-1">{email}</p>
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-50 rounded-xl p-4 text-left space-y-3">
                    <h4 className="font-semibold text-blue-900 text-sm">What to do next:</h4>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-700">1</span>
                        </span>
                        <span>Open your email and look for a message from HowWePlan</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-700">2</span>
                        </span>
                        <span>Click the &ldquo;Reset Password&rdquo; button in the email</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-700">3</span>
                        </span>
                        <span>Create a strong new password</span>
                      </li>
                    </ul>
                  </div>

                  {/* Didn't receive email */}
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-3">
                      Didn&apos;t receive the email? Check your spam folder or
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={handleResend}
                      className="w-full h-11 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition-all group"
                    >
                      <RefreshCw className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                      Try again with different email
                    </Button>
                  </div>
                </div>
              ) : (
                /* Form State */
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                      <KeyRound className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset password</h2>
                    <p className="text-gray-600">
                      Enter your email and we&apos;ll send you a link to reset your password
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                        Email Address
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-12 h-12 text-base border-2 border-gray-200 focus:border-blue-600 rounded-xl transition-all"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Sending reset link...
                        </>
                      ) : (
                        <>
                          Send reset link
                          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-4 text-gray-500 font-medium">
                        Remember your password?
                      </span>
                    </div>
                  </div>

                  {/* Back to Login */}
                  <Link href="/login">
                    <Button 
                      variant="outline" 
                      className="w-full h-12 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition-all group"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                      Back to sign in
                    </Button>
                  </Link>
                </>
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
