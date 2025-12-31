'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

// ============================================================================
// TYPES
// ============================================================================

interface Setting {
  id: string;
  category: string;
  key: string;
  value: any;
  description: string;
  is_public: boolean;
  updated_at: string;
}

interface SettingsCategory {
  name: string;
  description: string;
  icon: string;
  settings: Setting[];
}

// ============================================================================
// MOCK DATA (Replace with API calls)
// ============================================================================

const mockSettings: Record<string, any> = {
  booking: {
    cancellation_policy: {
      free_cancellation_hours: 48,
      partial_refund_hours: 24,
      partial_refund_percentage: 50,
      no_refund_hours: 12,
      cancellation_fee_percentage: 10,
    },
    modification_policy: {
      allow_modifications: true,
      modification_fee_percentage: 5,
      modification_deadline_hours: 24,
      max_modifications_allowed: 3,
    },
    payment_policy: {
      deposit_percentage: 25,
      deposit_deadline_hours: 24,
      full_payment_deadline_days: 7,
      allow_installments: true,
      max_installments: 4,
    },
  },
  agent: {
    commission_rates: {
      default_rate: 10,
      premium_rate: 8,
      new_agent_rate: 12,
      max_rate: 15,
      min_rate: 5,
    },
    verification_requirements: {
      background_check_required: true,
      minimum_experience_years: 1,
      insurance_required: true,
    },
    response_requirements: {
      max_response_time_hours: 24,
      proposal_validity_days: 7,
      min_proposals_per_request: 1,
      max_proposals_per_request: 3,
    },
  },
  user: {
    account_settings: {
      require_email_verification: true,
      require_phone_verification: false,
      session_timeout_minutes: 60,
      max_login_attempts: 5,
      lockout_duration_minutes: 30,
    },
    request_limits: {
      max_active_requests: 5,
      request_expiry_days: 30,
      min_days_advance_booking: 3,
      max_days_advance_booking: 365,
    },
  },
  dispute: {
    filing_rules: {
      filing_deadline_days: 14,
      auto_escalation_days: 7,
      max_resolution_days: 30,
    },
    resolution_policy: {
      mediation_first: true,
      allow_partial_refunds: true,
      compensation_max_percentage: 100,
      admin_review_required_amount: 1000,
    },
  },
  platform: {
    service_fees: {
      platform_fee_percentage: 5,
      payment_processing_fee: 2.9,
      tax_inclusive: false,
    },
    communication_settings: {
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      push_notifications_enabled: true,
      newsletter_default_optin: false,
      marketing_emails_allowed: true,
    },
  },
  review: {
    submission_rules: {
      allow_anonymous_reviews: false,
      review_deadline_days: 30,
      min_rating: 1,
      max_rating: 5,
      require_comment: true,
      min_comment_length: 20,
      max_comment_length: 2000,
    },
    moderation_rules: {
      auto_publish: false,
      profanity_filter: true,
      spam_detection: true,
      allow_agent_response: true,
      response_deadline_days: 7,
    },
  },
  insurance: {
    travel_insurance: {
      offer_insurance: true,
      basic_coverage_percentage: 2.5,
      premium_coverage_percentage: 4.5,
      mandatory_for_international: false,
    },
  },
};

// ============================================================================
// SETTINGS COMPONENTS
// ============================================================================

function SettingInput({
  label,
  value,
  onChange,
  type = 'text',
  suffix = '',
  description = '',
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'boolean' | 'textarea';
  suffix?: string;
  description?: string;
}) {
  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-3 border-b last:border-b-0">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <Switch
          checked={value}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div className="space-y-2 py-3 border-b last:border-b-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          className="w-24 text-right"
        />
        {suffix && <span className="text-sm text-muted-foreground w-8">{suffix}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS SECTIONS
// ============================================================================

function BookingSettings({
  settings,
  onChange,
}: {
  settings: typeof mockSettings.booking;
  onChange: (key: string, subKey: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cancellation Policy</CardTitle>
          <CardDescription>
            Configure how cancellations are handled and refund percentages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Free Cancellation Window"
            value={settings.cancellation_policy.free_cancellation_hours}
            onChange={(v) => onChange('cancellation_policy', 'free_cancellation_hours', v)}
            type="number"
            suffix="hours"
            description="Hours before trip when full refund is available"
          />
          <SettingInput
            label="Partial Refund Window"
            value={settings.cancellation_policy.partial_refund_hours}
            onChange={(v) => onChange('cancellation_policy', 'partial_refund_hours', v)}
            type="number"
            suffix="hours"
          />
          <SettingInput
            label="Partial Refund Percentage"
            value={settings.cancellation_policy.partial_refund_percentage}
            onChange={(v) => onChange('cancellation_policy', 'partial_refund_percentage', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="No Refund Window"
            value={settings.cancellation_policy.no_refund_hours}
            onChange={(v) => onChange('cancellation_policy', 'no_refund_hours', v)}
            type="number"
            suffix="hours"
          />
          <SettingInput
            label="Cancellation Fee"
            value={settings.cancellation_policy.cancellation_fee_percentage}
            onChange={(v) => onChange('cancellation_policy', 'cancellation_fee_percentage', v)}
            type="number"
            suffix="%"
          />
        </CardContent>
      </Card>

      {/* Modification Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modification Policy</CardTitle>
          <CardDescription>
            Rules for booking modifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Allow Modifications"
            value={settings.modification_policy.allow_modifications}
            onChange={(v) => onChange('modification_policy', 'allow_modifications', v)}
            type="boolean"
          />
          <SettingInput
            label="Modification Fee"
            value={settings.modification_policy.modification_fee_percentage}
            onChange={(v) => onChange('modification_policy', 'modification_fee_percentage', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Modification Deadline"
            value={settings.modification_policy.modification_deadline_hours}
            onChange={(v) => onChange('modification_policy', 'modification_deadline_hours', v)}
            type="number"
            suffix="hours"
          />
          <SettingInput
            label="Max Modifications"
            value={settings.modification_policy.max_modifications_allowed}
            onChange={(v) => onChange('modification_policy', 'max_modifications_allowed', v)}
            type="number"
          />
        </CardContent>
      </Card>

      {/* Payment Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Policy</CardTitle>
          <CardDescription>
            Payment requirements and installment options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Deposit Percentage"
            value={settings.payment_policy.deposit_percentage}
            onChange={(v) => onChange('payment_policy', 'deposit_percentage', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Deposit Deadline"
            value={settings.payment_policy.deposit_deadline_hours}
            onChange={(v) => onChange('payment_policy', 'deposit_deadline_hours', v)}
            type="number"
            suffix="hours"
          />
          <SettingInput
            label="Full Payment Deadline"
            value={settings.payment_policy.full_payment_deadline_days}
            onChange={(v) => onChange('payment_policy', 'full_payment_deadline_days', v)}
            type="number"
            suffix="days"
          />
          <SettingInput
            label="Allow Installments"
            value={settings.payment_policy.allow_installments}
            onChange={(v) => onChange('payment_policy', 'allow_installments', v)}
            type="boolean"
          />
          <SettingInput
            label="Max Installments"
            value={settings.payment_policy.max_installments}
            onChange={(v) => onChange('payment_policy', 'max_installments', v)}
            type="number"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AgentSettings({
  settings,
  onChange,
}: {
  settings: typeof mockSettings.agent;
  onChange: (key: string, subKey: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Commission Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission Rates</CardTitle>
          <CardDescription>
            Platform commission settings for agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Default Commission Rate"
            value={settings.commission_rates.default_rate}
            onChange={(v) => onChange('commission_rates', 'default_rate', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Premium Agent Rate"
            value={settings.commission_rates.premium_rate}
            onChange={(v) => onChange('commission_rates', 'premium_rate', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="New Agent Rate"
            value={settings.commission_rates.new_agent_rate}
            onChange={(v) => onChange('commission_rates', 'new_agent_rate', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Maximum Rate"
            value={settings.commission_rates.max_rate}
            onChange={(v) => onChange('commission_rates', 'max_rate', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Minimum Rate"
            value={settings.commission_rates.min_rate}
            onChange={(v) => onChange('commission_rates', 'min_rate', v)}
            type="number"
            suffix="%"
          />
        </CardContent>
      </Card>

      {/* Verification Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification Requirements</CardTitle>
          <CardDescription>
            Requirements for agent verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Background Check Required"
            value={settings.verification_requirements.background_check_required}
            onChange={(v) => onChange('verification_requirements', 'background_check_required', v)}
            type="boolean"
          />
          <SettingInput
            label="Minimum Experience Years"
            value={settings.verification_requirements.minimum_experience_years}
            onChange={(v) => onChange('verification_requirements', 'minimum_experience_years', v)}
            type="number"
            suffix="years"
          />
          <SettingInput
            label="Insurance Required"
            value={settings.verification_requirements.insurance_required}
            onChange={(v) => onChange('verification_requirements', 'insurance_required', v)}
            type="boolean"
          />
        </CardContent>
      </Card>

      {/* Response Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Response Requirements</CardTitle>
          <CardDescription>
            Agent response time and proposal limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Max Response Time"
            value={settings.response_requirements.max_response_time_hours}
            onChange={(v) => onChange('response_requirements', 'max_response_time_hours', v)}
            type="number"
            suffix="hours"
          />
          <SettingInput
            label="Proposal Validity"
            value={settings.response_requirements.proposal_validity_days}
            onChange={(v) => onChange('response_requirements', 'proposal_validity_days', v)}
            type="number"
            suffix="days"
          />
          <SettingInput
            label="Max Proposals Per Request"
            value={settings.response_requirements.max_proposals_per_request}
            onChange={(v) => onChange('response_requirements', 'max_proposals_per_request', v)}
            type="number"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function UserSettings({
  settings,
  onChange,
}: {
  settings: typeof mockSettings.user;
  onChange: (key: string, subKey: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Settings</CardTitle>
          <CardDescription>
            User account security and verification requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Require Email Verification"
            value={settings.account_settings.require_email_verification}
            onChange={(v) => onChange('account_settings', 'require_email_verification', v)}
            type="boolean"
          />
          <SettingInput
            label="Require Phone Verification"
            value={settings.account_settings.require_phone_verification}
            onChange={(v) => onChange('account_settings', 'require_phone_verification', v)}
            type="boolean"
          />
          <SettingInput
            label="Session Timeout"
            value={settings.account_settings.session_timeout_minutes}
            onChange={(v) => onChange('account_settings', 'session_timeout_minutes', v)}
            type="number"
            suffix="min"
          />
          <SettingInput
            label="Max Login Attempts"
            value={settings.account_settings.max_login_attempts}
            onChange={(v) => onChange('account_settings', 'max_login_attempts', v)}
            type="number"
          />
          <SettingInput
            label="Lockout Duration"
            value={settings.account_settings.lockout_duration_minutes}
            onChange={(v) => onChange('account_settings', 'lockout_duration_minutes', v)}
            type="number"
            suffix="min"
          />
        </CardContent>
      </Card>

      {/* Request Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Limits</CardTitle>
          <CardDescription>
            Limits on travel requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Max Active Requests"
            value={settings.request_limits.max_active_requests}
            onChange={(v) => onChange('request_limits', 'max_active_requests', v)}
            type="number"
          />
          <SettingInput
            label="Request Expiry"
            value={settings.request_limits.request_expiry_days}
            onChange={(v) => onChange('request_limits', 'request_expiry_days', v)}
            type="number"
            suffix="days"
          />
          <SettingInput
            label="Min Advance Booking"
            value={settings.request_limits.min_days_advance_booking}
            onChange={(v) => onChange('request_limits', 'min_days_advance_booking', v)}
            type="number"
            suffix="days"
          />
          <SettingInput
            label="Max Advance Booking"
            value={settings.request_limits.max_days_advance_booking}
            onChange={(v) => onChange('request_limits', 'max_days_advance_booking', v)}
            type="number"
            suffix="days"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DisputeSettings({
  settings,
  onChange,
}: {
  settings: typeof mockSettings.dispute;
  onChange: (key: string, subKey: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Filing Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filing Rules</CardTitle>
          <CardDescription>
            Rules for filing disputes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Filing Deadline"
            value={settings.filing_rules.filing_deadline_days}
            onChange={(v) => onChange('filing_rules', 'filing_deadline_days', v)}
            type="number"
            suffix="days"
            description="Days after trip completion to file a dispute"
          />
          <SettingInput
            label="Auto Escalation"
            value={settings.filing_rules.auto_escalation_days}
            onChange={(v) => onChange('filing_rules', 'auto_escalation_days', v)}
            type="number"
            suffix="days"
          />
          <SettingInput
            label="Max Resolution Time"
            value={settings.filing_rules.max_resolution_days}
            onChange={(v) => onChange('filing_rules', 'max_resolution_days', v)}
            type="number"
            suffix="days"
          />
        </CardContent>
      </Card>

      {/* Resolution Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resolution Policy</CardTitle>
          <CardDescription>
            How disputes are resolved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Mediation First"
            value={settings.resolution_policy.mediation_first}
            onChange={(v) => onChange('resolution_policy', 'mediation_first', v)}
            type="boolean"
            description="Require mediation before escalation"
          />
          <SettingInput
            label="Allow Partial Refunds"
            value={settings.resolution_policy.allow_partial_refunds}
            onChange={(v) => onChange('resolution_policy', 'allow_partial_refunds', v)}
            type="boolean"
          />
          <SettingInput
            label="Max Compensation"
            value={settings.resolution_policy.compensation_max_percentage}
            onChange={(v) => onChange('resolution_policy', 'compensation_max_percentage', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Admin Review Threshold"
            value={settings.resolution_policy.admin_review_required_amount}
            onChange={(v) => onChange('resolution_policy', 'admin_review_required_amount', v)}
            type="number"
            suffix="$"
            description="Amount above which admin review is required"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformSettings({
  settings,
  onChange,
}: {
  settings: typeof mockSettings.platform;
  onChange: (key: string, subKey: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Service Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Fees</CardTitle>
          <CardDescription>
            Platform fees and charges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Platform Fee"
            value={settings.service_fees.platform_fee_percentage}
            onChange={(v) => onChange('service_fees', 'platform_fee_percentage', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Payment Processing Fee"
            value={settings.service_fees.payment_processing_fee}
            onChange={(v) => onChange('service_fees', 'payment_processing_fee', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Tax Inclusive Pricing"
            value={settings.service_fees.tax_inclusive}
            onChange={(v) => onChange('service_fees', 'tax_inclusive', v)}
            type="boolean"
          />
        </CardContent>
      </Card>

      {/* Communication Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Communication Settings</CardTitle>
          <CardDescription>
            Notification and communication preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Email Notifications"
            value={settings.communication_settings.email_notifications_enabled}
            onChange={(v) => onChange('communication_settings', 'email_notifications_enabled', v)}
            type="boolean"
          />
          <SettingInput
            label="SMS Notifications"
            value={settings.communication_settings.sms_notifications_enabled}
            onChange={(v) => onChange('communication_settings', 'sms_notifications_enabled', v)}
            type="boolean"
          />
          <SettingInput
            label="Push Notifications"
            value={settings.communication_settings.push_notifications_enabled}
            onChange={(v) => onChange('communication_settings', 'push_notifications_enabled', v)}
            type="boolean"
          />
          <SettingInput
            label="Newsletter Default Opt-in"
            value={settings.communication_settings.newsletter_default_optin}
            onChange={(v) => onChange('communication_settings', 'newsletter_default_optin', v)}
            type="boolean"
          />
          <SettingInput
            label="Marketing Emails Allowed"
            value={settings.communication_settings.marketing_emails_allowed}
            onChange={(v) => onChange('communication_settings', 'marketing_emails_allowed', v)}
            type="boolean"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewSettings({
  settings,
  onChange,
}: {
  settings: typeof mockSettings.review;
  onChange: (key: string, subKey: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Submission Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Rules</CardTitle>
          <CardDescription>
            Rules for submitting reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Allow Anonymous Reviews"
            value={settings.submission_rules.allow_anonymous_reviews}
            onChange={(v) => onChange('submission_rules', 'allow_anonymous_reviews', v)}
            type="boolean"
          />
          <SettingInput
            label="Review Deadline"
            value={settings.submission_rules.review_deadline_days}
            onChange={(v) => onChange('submission_rules', 'review_deadline_days', v)}
            type="number"
            suffix="days"
          />
          <SettingInput
            label="Require Comment"
            value={settings.submission_rules.require_comment}
            onChange={(v) => onChange('submission_rules', 'require_comment', v)}
            type="boolean"
          />
          <SettingInput
            label="Min Comment Length"
            value={settings.submission_rules.min_comment_length}
            onChange={(v) => onChange('submission_rules', 'min_comment_length', v)}
            type="number"
            suffix="chars"
          />
          <SettingInput
            label="Max Comment Length"
            value={settings.submission_rules.max_comment_length}
            onChange={(v) => onChange('submission_rules', 'max_comment_length', v)}
            type="number"
            suffix="chars"
          />
        </CardContent>
      </Card>

      {/* Moderation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Moderation Rules</CardTitle>
          <CardDescription>
            Review moderation settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Auto Publish"
            value={settings.moderation_rules.auto_publish}
            onChange={(v) => onChange('moderation_rules', 'auto_publish', v)}
            type="boolean"
            description="Publish reviews without moderation"
          />
          <SettingInput
            label="Profanity Filter"
            value={settings.moderation_rules.profanity_filter}
            onChange={(v) => onChange('moderation_rules', 'profanity_filter', v)}
            type="boolean"
          />
          <SettingInput
            label="Spam Detection"
            value={settings.moderation_rules.spam_detection}
            onChange={(v) => onChange('moderation_rules', 'spam_detection', v)}
            type="boolean"
          />
          <SettingInput
            label="Allow Agent Response"
            value={settings.moderation_rules.allow_agent_response}
            onChange={(v) => onChange('moderation_rules', 'allow_agent_response', v)}
            type="boolean"
          />
          <SettingInput
            label="Response Deadline"
            value={settings.moderation_rules.response_deadline_days}
            onChange={(v) => onChange('moderation_rules', 'response_deadline_days', v)}
            type="number"
            suffix="days"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function InsuranceSettings({
  settings,
  onChange,
}: {
  settings: typeof mockSettings.insurance;
  onChange: (key: string, subKey: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Travel Insurance</CardTitle>
          <CardDescription>
            Insurance offering settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingInput
            label="Offer Insurance"
            value={settings.travel_insurance.offer_insurance}
            onChange={(v) => onChange('travel_insurance', 'offer_insurance', v)}
            type="boolean"
          />
          <SettingInput
            label="Basic Coverage Rate"
            value={settings.travel_insurance.basic_coverage_percentage}
            onChange={(v) => onChange('travel_insurance', 'basic_coverage_percentage', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Premium Coverage Rate"
            value={settings.travel_insurance.premium_coverage_percentage}
            onChange={(v) => onChange('travel_insurance', 'premium_coverage_percentage', v)}
            type="number"
            suffix="%"
          />
          <SettingInput
            label="Mandatory for International"
            value={settings.travel_insurance.mandatory_for_international}
            onChange={(v) => onChange('travel_insurance', 'mandatory_for_international', v)}
            type="boolean"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function SettingsPage() {
  const [settings, setSettings] = useState(mockSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (category: string) => (key: string, subKey: string, value: any) => {
    setSettings((prev: typeof mockSettings) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: {
          ...prev[category][key],
          [subKey]: value,
        },
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Replace with actual API call
    // await fetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setSettings(mockSettings);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure platform rules, regulations, and policies
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            ✓ Settings saved successfully
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="booking" className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="booking">📋 Booking</TabsTrigger>
          <TabsTrigger value="agent">👥 Agent</TabsTrigger>
          <TabsTrigger value="user">👤 User</TabsTrigger>
          <TabsTrigger value="dispute">⚖️ Dispute</TabsTrigger>
          <TabsTrigger value="platform">🌐 Platform</TabsTrigger>
          <TabsTrigger value="review">⭐ Review</TabsTrigger>
          <TabsTrigger value="insurance">🛡️ Insurance</TabsTrigger>
        </TabsList>

        <TabsContent value="booking">
          <BookingSettings settings={settings.booking} onChange={handleChange('booking')} />
        </TabsContent>

        <TabsContent value="agent">
          <AgentSettings settings={settings.agent} onChange={handleChange('agent')} />
        </TabsContent>

        <TabsContent value="user">
          <UserSettings settings={settings.user} onChange={handleChange('user')} />
        </TabsContent>

        <TabsContent value="dispute">
          <DisputeSettings settings={settings.dispute} onChange={handleChange('dispute')} />
        </TabsContent>

        <TabsContent value="platform">
          <PlatformSettings settings={settings.platform} onChange={handleChange('platform')} />
        </TabsContent>

        <TabsContent value="review">
          <ReviewSettings settings={settings.review} onChange={handleChange('review')} />
        </TabsContent>

        <TabsContent value="insurance">
          <InsuranceSettings settings={settings.insurance} onChange={handleChange('insurance')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
