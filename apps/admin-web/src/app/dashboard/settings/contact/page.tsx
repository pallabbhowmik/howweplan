'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Clock,
  Shield,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube
} from 'lucide-react';
import { 
  ContactSettings, 
  defaultContactSettings, 
  getContactSettings, 
  updateContactSettings 
} from '@/lib/api/site-settings';

// ============================================================================
// COMPONENTS
// ============================================================================

function SettingField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'url';
  description?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="max-w-md"
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ListField({
  label,
  items,
  onChange,
  placeholder,
  description,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  description?: string;
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className="max-w-sm"
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
        />
        <Button type="button" variant="outline" size="icon" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <Badge key={index} variant="secondary" className="gap-1 pr-1">
            {item}
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="ml-1 hover:bg-destructive/20 rounded p-0.5"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ContactSettingsPage() {
  const [settings, setSettings] = useState<ContactSettings>(defaultContactSettings);
  const [originalSettings, setOriginalSettings] = useState<ContactSettings>(defaultContactSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getContactSettings();
      setSettings(data);
      setOriginalSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateContactSettings(settings);
      setOriginalSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
  };

  const updateField = <K extends keyof ContactSettings>(field: K, value: ContactSettings[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Settings</h1>
          <p className="text-muted-foreground">
            Manage contact information displayed on the public website
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings saved successfully! Changes will be reflected on the public website.
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="company">
            <Building2 className="h-4 w-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Emails
          </TabsTrigger>
          <TabsTrigger value="phones">
            <Phone className="h-4 w-4 mr-2" />
            Phones
          </TabsTrigger>
          <TabsTrigger value="address">
            <MapPin className="h-4 w-4 mr-2" />
            Address
          </TabsTrigger>
          <TabsTrigger value="social">
            <Globe className="h-4 w-4 mr-2" />
            Social & More
          </TabsTrigger>
        </TabsList>

        {/* Company Info Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Basic company details displayed across the website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingField
                label="Company Name"
                value={settings.companyName}
                onChange={(v) => updateField('companyName', v)}
                placeholder="HowWePlan"
                icon={Building2}
              />
              <SettingField
                label="Tagline"
                value={settings.tagline}
                onChange={(v) => updateField('tagline', v)}
                placeholder="Your journey, expertly crafted"
                description="Short tagline displayed in the header and footer"
              />
              <Separator />
              <SettingField
                label="Business Hours"
                value={settings.businessHours}
                onChange={(v) => updateField('businessHours', v)}
                placeholder="Monday - Friday: 9:00 AM - 6:00 PM EST"
                icon={Clock}
              />
              <SettingField
                label="Support Hours"
                value={settings.supportHours}
                onChange={(v) => updateField('supportHours', v)}
                placeholder="24/7"
                icon={Clock}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle>Email Addresses</CardTitle>
              <CardDescription>
                Contact email addresses for different departments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <SettingField
                  label="General Inquiries"
                  value={settings.generalEmail}
                  onChange={(v) => updateField('generalEmail', v)}
                  type="email"
                  placeholder="hello@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="Customer Support"
                  value={settings.supportEmail}
                  onChange={(v) => updateField('supportEmail', v)}
                  type="email"
                  placeholder="support@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="Billing & Payments"
                  value={settings.billingEmail}
                  onChange={(v) => updateField('billingEmail', v)}
                  type="email"
                  placeholder="billing@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="Agent Relations"
                  value={settings.agentEmail}
                  onChange={(v) => updateField('agentEmail', v)}
                  type="email"
                  placeholder="agents@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="Partnerships"
                  value={settings.partnershipEmail}
                  onChange={(v) => updateField('partnershipEmail', v)}
                  type="email"
                  placeholder="partners@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="Press & Media"
                  value={settings.pressEmail}
                  onChange={(v) => updateField('pressEmail', v)}
                  type="email"
                  placeholder="press@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="Legal"
                  value={settings.legalEmail}
                  onChange={(v) => updateField('legalEmail', v)}
                  type="email"
                  placeholder="legal@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="Privacy & Data Protection"
                  value={settings.privacyEmail}
                  onChange={(v) => updateField('privacyEmail', v)}
                  type="email"
                  placeholder="privacy@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="Data Protection Officer"
                  value={settings.dpoEmail}
                  onChange={(v) => updateField('dpoEmail', v)}
                  type="email"
                  placeholder="dpo@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="Disputes"
                  value={settings.disputesEmail}
                  onChange={(v) => updateField('disputesEmail', v)}
                  type="email"
                  placeholder="disputes@howweplan.com"
                  icon={Mail}
                />
                <SettingField
                  label="DMCA / Copyright"
                  value={settings.dmcaEmail}
                  onChange={(v) => updateField('dmcaEmail', v)}
                  type="email"
                  placeholder="dmca@howweplan.com"
                  icon={Mail}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phones Tab */}
        <TabsContent value="phones">
          <Card>
            <CardHeader>
              <CardTitle>Phone Numbers</CardTitle>
              <CardDescription>
                Contact phone numbers displayed on the website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingField
                label="Main Phone"
                value={settings.mainPhone}
                onChange={(v) => updateField('mainPhone', v)}
                type="tel"
                placeholder="+1 (800) HOW-PLAN"
                icon={Phone}
                description="Primary contact number"
              />
              <SettingField
                label="Support Phone"
                value={settings.supportPhone}
                onChange={(v) => updateField('supportPhone', v)}
                type="tel"
                placeholder="+1 (800) 469-7526"
                icon={Phone}
                description="Customer support line"
              />
              <SettingField
                label="Emergency Travel Line"
                value={settings.emergencyPhone}
                onChange={(v) => updateField('emergencyPhone', v)}
                type="tel"
                placeholder="+1 (888) TRIP-SOS"
                icon={Phone}
                description="24/7 emergency assistance for travelers"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle>Physical Address</CardTitle>
              <CardDescription>
                Corporate headquarters address (can be hidden from public)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ToggleField
                label="Show Address on Website"
                checked={settings.showAddress}
                onChange={(v) => updateField('showAddress', v)}
                description="When disabled, the physical address will be hidden from the contact page"
              />
              
              <Separator />

              <div className="space-y-4">
                <SettingField
                  label="Address Line 1"
                  value={settings.addressLine1}
                  onChange={(v) => updateField('addressLine1', v)}
                  placeholder="350 Fifth Avenue"
                  icon={MapPin}
                />
                <SettingField
                  label="Address Line 2"
                  value={settings.addressLine2}
                  onChange={(v) => updateField('addressLine2', v)}
                  placeholder="Suite 7820"
                />
                <div className="grid md:grid-cols-3 gap-4">
                  <SettingField
                    label="City"
                    value={settings.city}
                    onChange={(v) => updateField('city', v)}
                    placeholder="New York"
                  />
                  <SettingField
                    label="State/Province"
                    value={settings.state}
                    onChange={(v) => updateField('state', v)}
                    placeholder="NY"
                  />
                  <SettingField
                    label="ZIP/Postal Code"
                    value={settings.zipCode}
                    onChange={(v) => updateField('zipCode', v)}
                    placeholder="10118"
                  />
                </div>
                <SettingField
                  label="Country"
                  value={settings.country}
                  onChange={(v) => updateField('country', v)}
                  placeholder="United States"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social & More Tab */}
        <TabsContent value="social">
          <div className="space-y-6">
            {/* Social Links */}
            <Card>
              <CardHeader>
                <CardTitle>Social Media Links</CardTitle>
                <CardDescription>
                  Links to your social media profiles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <SettingField
                    label="Facebook"
                    value={settings.facebookUrl}
                    onChange={(v) => updateField('facebookUrl', v)}
                    type="url"
                    placeholder="https://facebook.com/howweplan"
                    icon={Facebook}
                  />
                  <SettingField
                    label="Twitter / X"
                    value={settings.twitterUrl}
                    onChange={(v) => updateField('twitterUrl', v)}
                    type="url"
                    placeholder="https://twitter.com/howweplan"
                    icon={Twitter}
                  />
                  <SettingField
                    label="Instagram"
                    value={settings.instagramUrl}
                    onChange={(v) => updateField('instagramUrl', v)}
                    type="url"
                    placeholder="https://instagram.com/howweplan"
                    icon={Instagram}
                  />
                  <SettingField
                    label="LinkedIn"
                    value={settings.linkedinUrl}
                    onChange={(v) => updateField('linkedinUrl', v)}
                    type="url"
                    placeholder="https://linkedin.com/company/howweplan"
                    icon={Linkedin}
                  />
                  <SettingField
                    label="YouTube"
                    value={settings.youtubeUrl}
                    onChange={(v) => updateField('youtubeUrl', v)}
                    type="url"
                    placeholder="https://youtube.com/@howweplan"
                    icon={Youtube}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Regulatory Info */}
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Information</CardTitle>
                <CardDescription>
                  Accreditations, licenses, and compliance information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ToggleField
                  label="Show Regulatory Information"
                  checked={settings.showRegulatoryInfo}
                  onChange={(v) => updateField('showRegulatoryInfo', v)}
                  description="Display accreditations and licenses on the contact page"
                />
                
                <Separator />

                <ListField
                  label="Accreditations"
                  items={settings.accreditations}
                  onChange={(v) => updateField('accreditations', v)}
                  placeholder="e.g., ASTA Member, IATA Accredited"
                  description="Industry accreditations and memberships"
                />

                <ListField
                  label="Licenses"
                  items={settings.licenses}
                  onChange={(v) => updateField('licenses', v)}
                  placeholder="e.g., California Seller of Travel #XXXXXXXX"
                  description="State and federal travel licenses"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
