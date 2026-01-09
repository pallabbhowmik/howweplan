'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Plane, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // TODO: Implement password reset API call
      // await requestPasswordReset({ email });
      
      // For now, simulate success after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-32 right-20 w-[600px] h-[600px] bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Plane className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">HowWePlan</h1>
              <p className="text-sm text-emerald-100">Agent Portal</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8 max-w-xl">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Reset Your Password
            </h2>
            <p className="text-xl text-emerald-100 leading-relaxed">
              Enter your email address and we will send you instructions to reset your password.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-emerald-200 text-sm">
            © {new Date().getFullYear()} HowWePlan. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">HowWePlan</span>
          </div>

          <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900">
            <CardContent className="p-8">
              {isSubmitted ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    Check Your Email
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
                  </p>
                  <Link href="/login">
                    <Button variant="outline" className="mt-4">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                      Forgot Password?
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      No worries, we will send you reset instructions.
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      {error}
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="agent@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-11 h-12"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <Link 
                      href="/login" 
                      className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Login
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
