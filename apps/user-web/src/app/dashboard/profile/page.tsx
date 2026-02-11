'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Bell, CreditCard, Shield, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import { fetchUser, updateUser, type User as UserType } from '@/lib/data/api';

export default function ProfilePage() {
  const { user: sessionUser, loading: sessionLoading } = useUserSession();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
  });

  useEffect(() => {
    if (!sessionUser?.userId) return;
    let cancelled = false;

    const loadUser = async () => {
      setLoading(true);
      try {
        const data = await fetchUser(sessionUser.userId);
        if (cancelled) return;
        if (data) {
          setUserData(data);
          setFormData({
            fullName: data.fullName || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || '',
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading user:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadUser();
    return () => { cancelled = true; };
  }, [sessionUser?.userId]);

  const handleSave = async () => {
    if (!sessionUser?.userId) return;
    
    setSaving(true);
    setSaveMessage(null);
    try {
      const success = await updateUser(sessionUser.userId, {
        fullName: formData.fullName,
        phone: formData.phone,
        location: formData.location,
      });
      
      if (success) {
        // Refresh user data
        const data = await fetchUser(sessionUser.userId);
        if (data) setUserData(data);
        setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Generate avatar initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format member since date
  const formatMemberSince = (dateStr?: string) => {
    if (!dateStr) return 'Recently joined';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get preferences from user data
  const preferences = userData?.preferences || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-4">
                {userData?.fullName ? getInitials(userData.fullName) : 'U'}
              </div>
              <h2 className="text-xl font-semibold">{userData?.fullName || 'User'}</h2>
              <p className="text-sm text-muted-foreground">{userData?.email}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Member since {formatMemberSince(userData?.createdAt)}
              </p>
              
              <div className="flex gap-4 mt-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{userData?.tripsTaken || 0}</p>
                  <p className="text-xs text-muted-foreground">Trips Taken</p>
                </div>
              </div>

              <Button variant="outline" className="mt-4">
                Change Photo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    className="pl-10"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              {saveMessage && (
                <p className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {saveMessage.text}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Travel Preferences */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Travel Preferences</CardTitle>
            <CardDescription>Help us match you with the right travel agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Travel Style</Label>
                <p className="font-medium">{preferences.travelStyle || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Budget Preference</Label>
                <p className="font-medium">{preferences.budget || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Interests</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {preferences.interests && preferences.interests.length > 0 ? (
                    preferences.interests.map((interest: string) => (
                      <Badge key={interest} variant="secondary">{interest}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No interests set</span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline">Edit Preferences</Button>
          </CardContent>
        </Card>

        {/* Settings Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Email notifications</span>
              <Badge variant="outline">{userData?.emailNotifications ? 'On' : 'Off'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SMS alerts</span>
              <Badge variant="outline">{userData?.smsNotifications ? 'On' : 'Off'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Marketing emails</span>
              <Badge variant="outline">{userData?.marketingEmails ? 'On' : 'Off'}</Badge>
            </div>
            <Button variant="outline" className="w-full mt-2">Manage Notifications</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {userData?.paymentMethods && userData.paymentMethods.length > 0 ? (
              userData.paymentMethods.map((method, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-6 bg-slate-200 rounded flex items-center justify-center text-xs">
                      {method.type?.toUpperCase() || 'CARD'}
                    </div>
                    <span className="text-sm">•••• {method.last4 || '****'}</span>
                  </div>
                  {method.isDefault && <Badge variant="outline">Default</Badge>}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No payment methods saved</p>
            )}
            <Button variant="outline" className="w-full">Add Payment Method</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Two-factor auth</span>
              <Badge variant="secondary">{userData?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</Badge>
            </div>
            <Button variant="outline" className="w-full">Change Password</Button>
            <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
