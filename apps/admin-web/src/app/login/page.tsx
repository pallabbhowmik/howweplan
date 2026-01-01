'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2,
  AlertTriangle,
  Activity,
  Users,
  BarChart3,
  Settings,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Admin Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 left-20 w-[600px] h-[600px] bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Logo & Tagline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">HowWePlan</h1>
              <p className="text-sm text-red-300 font-medium">Admin Control Center</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 space-y-12 max-w-xl">
          <div>
            <h2 className="text-5xl font-bold text-white leading-tight mb-6">
              Manage Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                Platform Ecosystem
              </span>
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed">
              Access comprehensive controls and insights to manage users, 
              monitor operations, and ensure platform integrity.
            </p>
          </div>

          {/* Admin Features */}
          <div className="space-y-4">
            {[
              {
                icon: Users,
                title: 'User Management',
                description: 'Full control over user accounts, roles, and permissions'
              },
              {
                icon: Activity,
                title: 'Real-time Monitoring',
                description: 'Track system health, performance, and activity logs'
              },
              {
                icon: BarChart3,
                title: 'Analytics & Reports',
                description: 'Comprehensive insights into platform metrics and KPIs'
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="mt-1 p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 group-hover:from-red-500/30 group-hover:to-orange-500/30 transition-colors">
                  <feature.icon className="h-6 w-6 text-red-300" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">{feature.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Security Notice */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-2">Security Notice</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  This is a restricted admin area. All actions are logged and monitored 
                  for security and compliance purposes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-slate-400">
          © 2024 HowWePlan Admin. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white relative">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HowWePlan Admin</span>
        </div>

        <div className="w-full max-w-md mt-20 lg:mt-0">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 lg:p-10">
              {/* Header with Icon */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 mb-4 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Access</h2>
                <p className="text-gray-600">Sign in to the control center</p>
              </div>

              {/* Security Badge */}
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-800 font-medium">
                  Authorized personnel only. Your session is monitored.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert className="mb-6 bg-red-50 border-red-200">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </Alert>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Admin Email
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@howweplan.com"
                      className="pl-12 h-12 text-base border-2 border-gray-200 focus:border-red-600 rounded-xl transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter admin password"
                      className="pl-12 pr-12 h-12 text-base border-2 border-gray-200 focus:border-red-600 rounded-xl transition-all"
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

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-5 w-5" />
                      Access Admin Panel
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              {/* Help Text */}
              <div className="mt-8 text-center">
                <p className="text-xs text-gray-500">
                  Forgot your credentials? Contact the{' '}
                  <a href="mailto:tech@howweplan.com" className="text-red-600 hover:underline font-medium">
                    system administrator
                  </a>
                </p>
              </div>

              {/* Footer Notice */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Settings className="h-3 w-3" />
                  <span>Protected by enterprise-grade security</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
