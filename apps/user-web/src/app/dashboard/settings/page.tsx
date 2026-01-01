'use client';

import { useState, useEffect } from 'react';
import { 
  Settings,
  Bell,
  Shield,
  CreditCard,
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
  ToggleLeft,
  ToggleRight,
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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSavedSection(section);
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
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse" />
            <Loader2 className="relative h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          </div>
          <p className="text-slate-500 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
            <Settings className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Settings</h1>
            <p className="text-slate-300 mt-1">Manage your account preferences and security</p>
          </div>
        </div>
      </div>

      {/* Notifications Settings */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <ToggleItem
            icon={<Mail className="h-5 w-5" />}
            title="Email Notifications"
            description="Receive updates via email"
            enabled={settings.emailNotifications}
            onToggle={() => handleToggle('emailNotifications')}
          />
          <ToggleItem
            icon={<Smartphone className="h-5 w-5" />}
            title="Push Notifications"
            description="Browser and mobile notifications"
            enabled={settings.pushNotifications}
            onToggle={() => handleToggle('pushNotifications')}
          />
          <ToggleItem
            icon={<FileText className="h-5 w-5" />}
            title="Proposal Alerts"
            description="Get notified when agents submit proposals"
            enabled={settings.proposalAlerts}
            onToggle={() => handleToggle('proposalAlerts')}
          />
          <ToggleItem
            icon={<MessageSquare className="h-5 w-5" />}
            title="Message Alerts"
            description="Notifications for new messages"
            enabled={settings.messageAlerts}
            onToggle={() => handleToggle('messageAlerts')}
          />
          <ToggleItem
            icon={<Mail className="h-5 w-5" />}
            title="Marketing Emails"
            description="Travel deals and promotional offers"
            enabled={settings.marketingEmails}
            onToggle={() => handleToggle('marketingEmails')}
          />
          <ToggleItem
            icon={<Globe className="h-5 w-5" />}
            title="Weekly Digest"
            description="Summary of your travel activity"
            enabled={settings.weeklyDigest}
            onToggle={() => handleToggle('weeklyDigest')}
          />
          
          <div className="pt-4 border-t">
            <Button 
              onClick={() => handleSave('notifications')}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : savedSection === 'notifications' ? (
                <><Check className="h-4 w-4 mr-2" /> Saved!</>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Eye className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Privacy</CardTitle>
              <CardDescription>Control your privacy and visibility</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <ToggleItem
            icon={<Eye className="h-5 w-5" />}
            title="Profile Visibility"
            description="Allow agents to view your profile details"
            enabled={settings.profileVisible}
            onToggle={() => handleToggle('profileVisible')}
          />
          <ToggleItem
            icon={<Globe className="h-5 w-5" />}
            title="Travel History"
            description="Show past trips to matched agents"
            enabled={settings.showTravelHistory}
            onToggle={() => handleToggle('showTravelHistory')}
          />
          <ToggleItem
            icon={<MessageSquare className="h-5 w-5" />}
            title="Agent Contact"
            description="Allow agents to initiate conversations"
            enabled={settings.allowAgentContact}
            onToggle={() => handleToggle('allowAgentContact')}
          />
          
          <div className="pt-4 border-t">
            <Button 
              onClick={() => handleSave('privacy')}
              disabled={saving}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : savedSection === 'privacy' ? (
                <><Check className="h-4 w-4 mr-2" /> Saved!</>
              ) : (
                'Save Privacy Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Currency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Wallet className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Currency</p>
                <p className="text-sm text-slate-500">Display prices in your preferred currency</p>
              </div>
            </div>
            <select 
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Languages className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Language</p>
                <p className="text-sm text-slate-500">Choose your preferred language</p>
              </div>
            </div>
            <select 
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="ta">தமிழ்</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                {settings.theme === 'light' ? (
                  <Sun className="h-5 w-5 text-slate-600" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-800">Theme</p>
                <p className="text-sm text-slate-500">Choose light or dark mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  settings.theme === 'light' 
                    ? 'bg-white shadow text-slate-800' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  settings.theme === 'dark' 
                    ? 'bg-white shadow text-slate-800' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Moon className="h-4 w-4" />
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
          />
          
          <div className="pt-4 border-t">
            <Button 
              onClick={() => handleSave('preferences')}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : savedSection === 'preferences' ? (
                <><Check className="h-4 w-4 mr-2" /> Saved!</>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Protect your account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Two-Factor Auth */}
          <ToggleItem
            icon={<Lock className="h-5 w-5" />}
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            enabled={settings.twoFactorEnabled}
            onToggle={() => handleToggle('twoFactorEnabled')}
          />

          {/* Change Password */}
          <div className="pt-4 border-t">
            <h4 className="font-medium text-slate-800 mb-4">Change Password</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button 
                onClick={handlePasswordChange}
                disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                Update Password
              </Button>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="pt-4 border-t">
            <h4 className="font-medium text-slate-800 mb-4">Active Sessions</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Globe className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Current Session</p>
                    <p className="text-sm text-slate-500">Chrome on Windows • Active now</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  This device
                </span>
              </div>
            </div>
            <Button variant="outline" className="mt-4 text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out All Other Devices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-200 rounded-xl">
              <HelpCircle className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Help & Support</CardTitle>
              <CardDescription>Get help or learn more about HowWePlan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Link href="/help" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-slate-400" />
              <span className="font-medium text-slate-700">Help Center</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>
          <Link href="/terms" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-slate-400" />
              <span className="font-medium text-slate-700">Terms of Service</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>
          <Link href="/privacy" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-slate-400" />
              <span className="font-medium text-slate-700">Privacy Policy</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>
          <a href="mailto:support@howweplan.com" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-400" />
              <span className="font-medium text-slate-700">Contact Support</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </a>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-0 shadow-lg overflow-hidden border-red-200">
        <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-800">Danger Zone</CardTitle>
              <CardDescription className="text-red-600">Irreversible actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Delete Account</p>
              <p className="text-sm text-slate-500">Permanently delete your account and all data</p>
            </div>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
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
  onToggle 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
        <div>
          <p className="font-medium text-slate-800">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-slate-300'
        }`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
          enabled ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  );
}
