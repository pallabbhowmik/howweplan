'use client';

import { useState } from 'react';
import { 
  Settings,
  Bell,
  Shield,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Check,
  ChevronRight,
  Trash2,
  LogOut,
  HelpCircle,
  FileText,
  MessageSquare,
  Wallet,
  Languages,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Heart,
  Star,
  Crown,
  Fingerprint,
  Laptop,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserSession } from '@/lib/user/session';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, loading: userLoading } = useUserSession();
  const [saving, setSaving] = useState(false);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    proposalAlerts: true,
    messageAlerts: true,
    marketingEmails: false,
    weeklyDigest: true,
    
    // Privacy
    profileVisible: true,
    showTravelHistory: false,
    allowAgentContact: true,
    
    // Preferences
    currency: 'INR',
    language: 'en',
    theme: 'light',
    soundEnabled: true,
    
    // Security
    twoFactorEnabled: false,
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (section: string) => {
    setSaving(true);
    setActiveSection(section);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSavedSection(section);
    setActiveSection(null);
    setTimeout(() => setSavedSection(null), 2000);
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    alert('Password updated successfully!');
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-full blur-2xl opacity-40 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-xl opacity-30 animate-pulse animation-delay-150" />
            <div className="relative bg-white/80 backdrop-blur-sm rounded-full p-6 shadow-xl">
              <Loader2 className="h-12 w-12 animate-spin text-violet-600 mx-auto" />
            </div>
          </div>
          <p className="text-slate-600 font-medium mt-6">Preparing your settings...</p>
          <p className="text-slate-400 text-sm mt-1">Just a moment ✨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Hero Header - Stunning Gradient */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
        
        {/* Floating Orbs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse animation-delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />
        
        {/* Sparkle Effects */}
        <div className="absolute top-8 right-12 text-white/30 animate-pulse">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="absolute bottom-12 right-24 text-white/20 animate-pulse animation-delay-500">
          <Star className="h-5 w-5" />
        </div>
        <div className="absolute top-16 left-1/3 text-white/20 animate-pulse animation-delay-300">
          <Zap className="h-4 w-4" />
        </div>
        
        <div className="relative p-8 md:p-10 text-white">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-lg" />
              <div className="relative p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
                <Settings className="h-10 w-10 md:h-12 md:w-12" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/20">
                  Pro
                </span>
              </div>
              <p className="text-white/70 text-lg">Customize your HowWePlan experience</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                <Shield className="h-4 w-4" />
                <span>Security</span>
              </div>
              <p className="text-xl font-bold text-white">{settings.twoFactorEnabled ? 'Strong' : 'Good'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                <Bell className="h-4 w-4" />
                <span>Alerts</span>
              </div>
              <p className="text-xl font-bold text-white">Active</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                <Heart className="h-4 w-4" />
                <span>Status</span>
              </div>
              <p className="text-xl font-bold text-white">Verified</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: Bell, label: 'Notifications', color: 'blue' },
          { icon: Eye, label: 'Privacy', color: 'emerald' },
          { icon: Globe, label: 'Preferences', color: 'violet' },
          { icon: Shield, label: 'Security', color: 'amber' },
          { icon: HelpCircle, label: 'Help', color: 'slate' },
        ].map(({ icon: Icon, label, color }) => (
          <button
            key={label}
            onClick={() => document.getElementById(label.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95
              bg-${color}-50 text-${color}-700 hover:bg-${color}-100 border border-${color}-200`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Notifications Settings */}
      <Card id="notifications" className="group border-0 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
        <CardHeader className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Notifications</CardTitle>
              <CardDescription className="text-blue-100">Stay updated on what matters to you</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-1">
          <ToggleItem
            icon={<Mail className="h-5 w-5" />}
            title="Email Notifications"
            description="Receive updates via email"
            enabled={settings.emailNotifications}
            onToggle={() => handleToggle('emailNotifications')}
            color="blue"
          />
          <ToggleItem
            icon={<Smartphone className="h-5 w-5" />}
            title="Push Notifications"
            description="Browser and mobile notifications"
            enabled={settings.pushNotifications}
            onToggle={() => handleToggle('pushNotifications')}
            color="blue"
          />
          <ToggleItem
            icon={<FileText className="h-5 w-5" />}
            title="Proposal Alerts"
            description="Get notified when agents submit proposals"
            enabled={settings.proposalAlerts}
            onToggle={() => handleToggle('proposalAlerts')}
            color="blue"
          />
          <ToggleItem
            icon={<MessageSquare className="h-5 w-5" />}
            title="Message Alerts"
            description="Notifications for new messages"
            enabled={settings.messageAlerts}
            onToggle={() => handleToggle('messageAlerts')}
            color="blue"
          />
          <ToggleItem
            icon={<Sparkles className="h-5 w-5" />}
            title="Marketing Emails"
            description="Travel deals and promotional offers"
            enabled={settings.marketingEmails}
            onToggle={() => handleToggle('marketingEmails')}
            color="blue"
          />
          <ToggleItem
            icon={<Globe className="h-5 w-5" />}
            title="Weekly Digest"
            description="Summary of your travel activity"
            enabled={settings.weeklyDigest}
            onToggle={() => handleToggle('weeklyDigest')}
            color="blue"
          />
          
          <div className="pt-6 border-t mt-4">
            <Button 
              onClick={() => handleSave('notifications')}
              disabled={saving && activeSection === 'notifications'}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              {saving && activeSection === 'notifications' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : savedSection === 'notifications' ? (
                <><Check className="h-4 w-4 mr-2" /> Saved!</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card id="privacy" className="group border-0 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
        <CardHeader className="relative bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 text-white p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Privacy</CardTitle>
              <CardDescription className="text-emerald-100">Control who sees your information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-1">
          <ToggleItem
            icon={<Eye className="h-5 w-5" />}
            title="Profile Visibility"
            description="Allow agents to view your profile details"
            enabled={settings.profileVisible}
            onToggle={() => handleToggle('profileVisible')}
            color="emerald"
          />
          <ToggleItem
            icon={<Globe className="h-5 w-5" />}
            title="Travel History"
            description="Show past trips to matched agents"
            enabled={settings.showTravelHistory}
            onToggle={() => handleToggle('showTravelHistory')}
            color="emerald"
          />
          <ToggleItem
            icon={<MessageSquare className="h-5 w-5" />}
            title="Agent Contact"
            description="Allow agents to initiate conversations"
            enabled={settings.allowAgentContact}
            onToggle={() => handleToggle('allowAgentContact')}
            color="emerald"
          />
          
          <div className="pt-6 border-t mt-4">
            <Button 
              onClick={() => handleSave('privacy')}
              disabled={saving && activeSection === 'privacy'}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              {saving && activeSection === 'privacy' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : savedSection === 'privacy' ? (
                <><Check className="h-4 w-4 mr-2" /> Saved!</>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Save Privacy Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card id="preferences" className="group border-0 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
        <CardHeader className="relative bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-600 text-white p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Preferences</CardTitle>
              <CardDescription className="text-violet-100">Personalize your experience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Currency */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100 hover:border-violet-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Currency</p>
                <p className="text-sm text-slate-500">Display prices in your preferred currency</p>
              </div>
            </div>
            <select 
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="px-4 py-2.5 border-2 border-violet-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 cursor-pointer hover:border-violet-300 transition-colors"
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl border border-purple-100 hover:border-purple-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl text-white shadow-lg">
                <Languages className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Language</p>
                <p className="text-sm text-slate-500">Choose your preferred language</p>
              </div>
            </div>
            <select 
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="px-4 py-2.5 border-2 border-purple-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer hover:border-purple-300 transition-colors"
            >
              <option value="en">🇺🇸 English</option>
              <option value="hi">🇮🇳 हिंदी</option>
              <option value="ta">🇮🇳 தமிழ்</option>
              <option value="te">🇮🇳 తెలుగు</option>
            </select>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-fuchsia-50 to-pink-50 rounded-xl border border-fuchsia-100 hover:border-fuchsia-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl text-white shadow-lg">
                {settings.theme === 'light' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-800">Theme</p>
                <p className="text-sm text-slate-500">Choose light or dark mode</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-inner border border-slate-200">
              <button
                onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  settings.theme === 'light' 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span className="text-sm font-medium">Light</span>
              </button>
              <button
                onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  settings.theme === 'dark' 
                    ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span className="text-sm font-medium">Dark</span>
              </button>
            </div>
          </div>

          {/* Sound */}
          <ToggleItem
            icon={settings.soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            title="Sound Effects"
            description="Play sounds for notifications"
            enabled={settings.soundEnabled}
            onToggle={() => handleToggle('soundEnabled')}
            color="violet"
          />
          
          <div className="pt-6 border-t">
            <Button 
              onClick={() => handleSave('preferences')}
              disabled={saving && activeSection === 'preferences'}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              {saving && activeSection === 'preferences' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : savedSection === 'preferences' ? (
                <><Check className="h-4 w-4 mr-2" /> Saved!</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card id="security" className="group border-0 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
        <CardHeader className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Security</CardTitle>
              <CardDescription className="text-amber-100">Protect your account and data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Two-Factor Auth */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            settings.twoFactorEnabled 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
              : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl text-white shadow-lg ${
                  settings.twoFactorEnabled 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                    : 'bg-gradient-to-br from-amber-500 to-orange-600'
                }`}>
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">Two-Factor Authentication</p>
                    {settings.twoFactorEnabled ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Enabled</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Recommended</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('twoFactorEnabled')}
                className={`relative w-14 h-7 rounded-full transition-all shadow-inner ${
                  settings.twoFactorEnabled 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                    : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                  settings.twoFactorEnabled ? 'left-8' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-slate-800">Change Password</h4>
            </div>
            <div className="space-y-4 bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-slate-700 font-medium">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="pr-10 bg-white border-2 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-700 font-medium">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="pr-10 bg-white border-2 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pr-10 bg-white border-2 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handlePasswordChange}
                disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Lock className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Laptop className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-slate-800">Active Sessions</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white shadow-lg">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">Current Session</p>
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">Chrome on Windows • Active now</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold border border-green-200">
                  This device
                </span>
              </div>
            </div>
            <Button variant="outline" className="mt-4 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out All Other Devices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card id="help" className="group border-0 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
        <CardHeader className="relative bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 text-white p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Help & Support</CardTitle>
              <CardDescription className="text-slate-300">Get help or learn more about HowWePlan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Link href="/help" className="flex items-center justify-between p-5 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 transition-all border-b group/link">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 group-hover/link:bg-slate-200 transition-colors">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-slate-700 group-hover/link:text-slate-900">Help Center</span>
                <p className="text-sm text-slate-500">Browse FAQs and guides</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover/link:text-slate-600 group-hover/link:translate-x-1 transition-all" />
          </Link>
          <Link href="/terms" className="flex items-center justify-between p-5 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 transition-all border-b group/link">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 group-hover/link:bg-slate-200 transition-colors">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-slate-700 group-hover/link:text-slate-900">Terms of Service</span>
                <p className="text-sm text-slate-500">Review our terms and conditions</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover/link:text-slate-600 group-hover/link:translate-x-1 transition-all" />
          </Link>
          <Link href="/privacy" className="flex items-center justify-between p-5 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 transition-all border-b group/link">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 group-hover/link:bg-slate-200 transition-colors">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-slate-700 group-hover/link:text-slate-900">Privacy Policy</span>
                <p className="text-sm text-slate-500">Learn how we protect your data</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover/link:text-slate-600 group-hover/link:translate-x-1 transition-all" />
          </Link>
          <a href="mailto:support@howweplan.com" className="flex items-center justify-between p-5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all group/link">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 group-hover/link:bg-blue-200 transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-slate-700 group-hover/link:text-blue-700">Contact Support</span>
                <p className="text-sm text-slate-500">support@howweplan.com</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover/link:text-blue-600 group-hover/link:translate-x-1 transition-all" />
          </a>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="group border-2 border-red-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm hover:border-red-300">
        <CardHeader className="relative bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 text-white p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Danger Zone</CardTitle>
              <CardDescription className="text-red-100">Irreversible and destructive actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border-2 border-dashed border-red-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg text-red-600 mt-0.5">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-red-800">Delete Account</p>
                <p className="text-sm text-red-600 mt-1">Permanently delete your account and all associated data. This action cannot be undone.</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="text-red-600 border-2 border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all whitespace-nowrap shadow-sm hover:shadow-lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function ToggleItem({ 
  icon, 
  title, 
  description, 
  enabled, 
  onToggle,
  color = 'blue'
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  color?: 'blue' | 'emerald' | 'violet' | 'amber';
}) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-indigo-500',
      iconBg: 'bg-blue-50 group-hover/toggle:bg-blue-100',
      iconText: 'text-blue-600',
    },
    emerald: {
      bg: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-50 group-hover/toggle:bg-emerald-100',
      iconText: 'text-emerald-600',
    },
    violet: {
      bg: 'from-violet-500 to-fuchsia-500',
      iconBg: 'bg-violet-50 group-hover/toggle:bg-violet-100',
      iconText: 'text-violet-600',
    },
    amber: {
      bg: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-50 group-hover/toggle:bg-amber-100',
      iconText: 'text-amber-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="group/toggle flex items-center justify-between py-3 px-4 rounded-xl hover:bg-slate-50 transition-all cursor-pointer" onClick={onToggle}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl transition-colors ${colors.iconBg} ${colors.iconText}`}>
          {icon}
        </div>
        <div>
          <p className="font-semibold text-slate-800 group-hover/toggle:text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`relative w-14 h-7 rounded-full transition-all shadow-inner ${
          enabled ? `bg-gradient-to-r ${colors.bg}` : 'bg-slate-300'
        }`}
      >
        <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all flex items-center justify-center ${
          enabled ? 'left-8' : 'left-1'
        }`}>
          {enabled && <Check className="h-3 w-3 text-green-600" />}
        </span>
      </button>
    </div>
  );
}
