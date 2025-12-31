'use client';

import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Palette,
  Mail,
  Smartphone,
  Moon,
  Sun,
  Save,
  Camera,
  MapPin,
  Languages,
  DollarSign,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Avatar,
  AvatarFallback,
  Tabs,
  TabsList,
  TabsTrigger,
  Alert,
} from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPONENTS
// ============================================================================

function ProfileSection() {
  const [isEditing, setIsEditing] = useState(false);
  const [timezone, setTimezone] = useState('pst');

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative">
            <Avatar size="lg" className="h-24 w-24">
              <AvatarFallback className="text-2xl">JD</AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-gray-900">John Doe</h2>
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" />
                Verified
              </Badge>
            </div>
            <p className="text-gray-500 mb-2">Star Agent • Member since March 2022</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Adventure Specialist</Badge>
              <Badge variant="secondary">Beach & Islands</Badge>
              <Badge variant="secondary">Luxury Travel</Badge>
            </div>
          </div>
          <Button variant={isEditing ? 'default' : 'outline'} onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            ) : (
              'Edit Profile'
            )}
          </Button>
        </div>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">First Name</label>
              <Input defaultValue="John" className="mt-1" disabled={!isEditing} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <Input defaultValue="Doe" className="mt-1" disabled={!isEditing} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input defaultValue="john.doe@travelagent.com" className="mt-1" disabled />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input defaultValue="+1 (555) 123-4567" className="mt-1" disabled={!isEditing} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Bio</label>
            <Textarea
              defaultValue="Passionate travel consultant with 8+ years of experience crafting unforgettable journeys. Specializing in luxury adventure travel and honeymoon packages."
              className="mt-1 h-24"
              disabled={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location & Languages */}
      <Card>
        <CardHeader>
          <CardTitle>Location & Languages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Location</label>
              <div className="mt-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input defaultValue="San Francisco, CA" className="pl-10" disabled={!isEditing} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Timezone</label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                  <SelectItem value="mst">Mountain Time (MT)</SelectItem>
                  <SelectItem value="cst">Central Time (CT)</SelectItem>
                  <SelectItem value="est">Eastern Time (ET)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Languages Spoken</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {['English (Native)', 'Spanish (Fluent)', 'French (Basic)'].map((lang) => (
                <Badge key={lang} variant="secondary" className="gap-1">
                  <Languages className="h-3 w-3" />
                  {lang}
                </Badge>
              ))}
              {isEditing && (
                <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                  + Add Language
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const [emailNotifs, setEmailNotifs] = useState({
    newRequests: true,
    messages: true,
    bookingUpdates: true,
    reviews: true,
    marketing: false,
  });

  const [pushNotifs, setPushNotifs] = useState({
    newRequests: true,
    messages: true,
    bookingUpdates: false,
    reviews: false,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-500" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(emailNotifs).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm text-gray-500">
                  {key === 'newRequests' && 'Get notified when new travel requests match your profile'}
                  {key === 'messages' && 'Receive email when clients send you messages'}
                  {key === 'bookingUpdates' && 'Updates about booking status changes'}
                  {key === 'reviews' && 'Know when clients leave reviews'}
                  {key === 'marketing' && 'Tips, news, and promotional content'}
                </p>
              </div>
              <button
                onClick={() => setEmailNotifs({ ...emailNotifs, [key]: !value })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  value ? 'bg-indigo-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    value ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-gray-500" />
            <CardTitle>Push Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(pushNotifs).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
              </div>
              <button
                onClick={() => setPushNotifs({ ...pushNotifs, [key]: !value })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  value ? 'bg-indigo-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    value ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentSection() {
  const [currency, setCurrency] = useState('inr');
  const [minPayout, setMinPayout] = useState('100');
  
  return (
    <div className="space-y-6">
      <Alert variant="info" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <div className="ml-2">
          <p className="font-medium">Payout Information</p>
          <p className="text-sm">Your commission payments are processed every Monday for the previous week's completed trips.</p>
        </div>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bank Account</CardTitle>
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" />
              Verified
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Chase Bank</p>
                <p className="text-sm text-gray-500">****4521 • Checking</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Update Account</Button>
              <Button variant="outline" size="sm">Add Backup</Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Preferred Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inr">INR - Indian Rupee</SelectItem>
                  <SelectItem value="eur">EUR - Euro</SelectItem>
                  <SelectItem value="gbp">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Minimum Payout</label>
              <Select value={minPayout} onValueChange={setMinPayout}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5000">₹5,000</SelectItem>
                  <SelectItem value="10000">₹10,000</SelectItem>
                  <SelectItem value="25000">₹25,000</SelectItem>
                  <SelectItem value="50000">₹50,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">W-9 Form</p>
              <p className="text-sm text-gray-500">Submitted on Jan 15, 2024</p>
            </div>
            <Badge variant="success">Complete</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">Last changed 45 days ago</p>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Current Password</label>
              <Input type="password" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <Input type="password" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
              <Input type="password" className="mt-1" />
            </div>
          </div>
          <Button>Update Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">2FA is enabled</p>
                <p className="text-sm text-gray-500">Using authenticator app</p>
              </div>
            </div>
            <Button variant="outline">Manage</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { device: 'MacBook Pro', location: 'San Francisco, CA', current: true },
            { device: 'iPhone 14', location: 'San Francisco, CA', current: false },
          ].map((session, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{session.device}</p>
                  {session.current && <Badge variant="success">Current</Badge>}
                </div>
                <p className="text-sm text-gray-500">{session.location}</p>
              </div>
              {!session.current && (
                <Button variant="outline" size="sm">Revoke</Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState('light');
  const [defaultView, setDefaultView] = useState('overview');
  const [itemsPerPage, setItemsPerPage] = useState('10');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'light', icon: Sun, label: 'Light' },
              { value: 'dark', icon: Moon, label: 'Dark' },
              { value: 'system', icon: Globe, label: 'System' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-center',
                  theme === option.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <option.icon className={cn(
                  'h-6 w-6 mx-auto mb-2',
                  theme === option.value ? 'text-indigo-600' : 'text-gray-400'
                )} />
                <p className={cn(
                  'font-medium',
                  theme === option.value ? 'text-indigo-600' : 'text-gray-600'
                )}>{option.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Layout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Default Dashboard View</label>
            <Select value={defaultView} onValueChange={setDefaultView}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="requests">New Requests</SelectItem>
                <SelectItem value="bookings">Active Bookings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Items per Page</label>
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 items</SelectItem>
                <SelectItem value="25">25 items</SelectItem>
                <SelectItem value="50">50 items</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <Card className="lg:w-64 h-fit">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSection />}
          {activeTab === 'notifications' && <NotificationsSection />}
          {activeTab === 'payment' && <PaymentSection />}
          {activeTab === 'security' && <SecuritySection />}
          {activeTab === 'appearance' && <AppearanceSection />}
        </div>
      </div>
    </div>
  );
}
