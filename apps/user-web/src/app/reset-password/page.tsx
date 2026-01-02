'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plane, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Loader2,
  KeyRound,
  Shield,
  ArrowRight,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword } from '@/lib/api/auth';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet the requirements.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(token, password);
      setIsSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      if (err instanceof Error) {
        // Use the server's error message directly as it's now more specific
        const message = err.message.toLowerCase();
        if (message.includes('already been used')) {
          setError('This reset link has already been used. Please request a new one.');
        } else if (message.includes('expired')) {
          setError('This reset link has expired. Please request a new one.');
        } else if (message.includes('revoked')) {
          setError('This reset link is no longer valid. Please request a new one.');
        } else if (message.includes('invalid')) {
          setError('Invalid reset link. Please request a new password reset.');
        } else {
          setError(err.message || 'Failed to reset password. Please try again.');
        }
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${met ? 'text-green-600' : 'text-gray-400'}`}>
      {met ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
      )}
      <span>{text}</span>
    </div>
  );

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
              Create a New
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
                Secure Password
              </span>
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              Choose a strong password to keep your account safe and secure.
            </p>
          </div>

          {/* Security Tips */}
          <div className="space-y-4">
            {[
              {
                icon: Shield,
                title: 'Use a Strong Password',
                description: 'Mix uppercase, lowercase, numbers, and special characters'
              },
              {
                icon: KeyRound,
                title: 'Make it Unique',
                description: 'Don\'t reuse passwords from other websites'
              },
              {
                icon: Lock,
                title: 'Keep it Secret',
                description: 'Never share your password with anyone'
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
              {isSuccess ? (
                /* Success State */
                <div className="text-center space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
                    <p className="text-gray-600">
                      Your password has been successfully updated. You can now sign in with your new password.
                    </p>
                  </div>

                  <Button 
                    onClick={() => router.push('/login')}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    Sign in now
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              ) : !token ? (
                /* Invalid Token State */
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-10 w-10 text-red-500" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
                    <p className="text-gray-600">
                      This password reset link is invalid or has expired. Please request a new one.
                    </p>
                  </div>

                  <Link href="/forgot-password">
                    <Button className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      Request New Link
                    </Button>
                  </Link>
                </div>
              ) : (
                /* Form State */
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                      <KeyRound className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Create new password</h2>
                    <p className="text-gray-600">
                      Your new password must be different from previously used passwords
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                        New Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          className="pl-12 pr-12 h-12 text-base border-2 border-gray-200 focus:border-blue-600 rounded-xl transition-all"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Requirements */}
                    {password.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Password Requirements</p>
                        <PasswordRequirement met={hasMinLength} text="At least 8 characters" />
                        <PasswordRequirement met={hasUppercase} text="One uppercase letter" />
                        <PasswordRequirement met={hasLowercase} text="One lowercase letter" />
                        <PasswordRequirement met={hasNumber} text="One number" />
                        <PasswordRequirement met={hasSpecial} text="One special character (optional)" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                        Confirm Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          className={`pl-12 pr-12 h-12 text-base border-2 rounded-xl transition-all ${
                            confirmPassword.length > 0
                              ? passwordsMatch
                                ? 'border-green-500 focus:border-green-600'
                                : 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-blue-600'
                          }`}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isLoading}
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && !passwordsMatch && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <XCircle className="h-4 w-4" />
                          Passwords do not match
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50" 
                      disabled={isLoading || !isPasswordValid || !passwordsMatch}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Resetting password...
                        </>
                      ) : (
                        <>
                          Reset Password
                          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
