'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  getRequestLimits, 
  updateRequestLimits, 
  defaultRequestLimits,
  type RequestLimitsSettings 
} from '@/lib/api/system-settings';
import { 
  Settings2, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2,
  Users,
  Clock,
  FileText,
  Info
} from 'lucide-react';

export default function RequestLimitsPage() {
  const [limits, setLimits] = useState<RequestLimitsSettings>(defaultRequestLimits);
  const [originalLimits, setOriginalLimits] = useState<RequestLimitsSettings>(defaultRequestLimits);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchLimits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getRequestLimits();
      setLimits(data);
      setOriginalLimits(data);
      setHasChanges(false);
    } catch (err) {
      setError('Failed to load request limits. Using default values.');
      console.error('Error fetching limits:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  useEffect(() => {
    // Check if any values have changed
    const changed = 
      limits.maxOpenRequestsPerUser !== originalLimits.maxOpenRequestsPerUser ||
      limits.dailyRequestCapPerUser !== originalLimits.dailyRequestCapPerUser ||
      limits.requestExpiryHours !== originalLimits.requestExpiryHours;
    setHasChanges(changed);
  }, [limits, originalLimits]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Validate inputs
      if (limits.maxOpenRequestsPerUser < 1 || limits.maxOpenRequestsPerUser > 50) {
        setError('Max open requests must be between 1 and 50');
        return;
      }
      if (limits.dailyRequestCapPerUser < 1 || limits.dailyRequestCapPerUser > 100) {
        setError('Daily request cap must be between 1 and 100');
        return;
      }
      if (limits.requestExpiryHours < 1 || limits.requestExpiryHours > 720) {
        setError('Request expiry must be between 1 and 720 hours (30 days)');
        return;
      }

      const updated = await updateRequestLimits(limits);
      setLimits(updated);
      setOriginalLimits(updated);
      setHasChanges(false);
      setSuccess('Request limits updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save request limits. Please try again.');
      console.error('Error saving limits:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLimits(originalLimits);
    setHasChanges(false);
    setError(null);
    setSuccess(null);
  };

  const handleRestoreDefaults = () => {
    setLimits(defaultRequestLimits);
    setHasChanges(true);
    setError(null);
    setSuccess(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            Request Limits
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure system-wide limits for travel requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchLimits}
            disabled={isSaving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRestoreDefaults}
            disabled={isSaving}
          >
            Restore Defaults
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {/* Info Banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These limits apply to all users. Changes take effect immediately for new requests.
          Existing requests are not affected.
        </AlertDescription>
      </Alert>

      {/* Settings Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Max Open Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Max Open Requests
            </CardTitle>
            <CardDescription>
              Maximum number of open (non-completed) requests a user can have at once
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxOpenRequests">Limit per user</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="maxOpenRequests"
                  type="number"
                  min={1}
                  max={50}
                  value={limits.maxOpenRequestsPerUser}
                  onChange={(e) => setLimits(prev => ({
                    ...prev,
                    maxOpenRequestsPerUser: parseInt(e.target.value) || 1
                  }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">requests</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Default: {defaultRequestLimits.maxOpenRequestsPerUser}</Badge>
              {limits.maxOpenRequestsPerUser !== originalLimits.maxOpenRequestsPerUser && (
                <Badge variant="secondary">Modified</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Request Cap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Daily Request Cap
            </CardTitle>
            <CardDescription>
              Maximum number of new requests a user can create per day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dailyCap">Limit per user per day</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="dailyCap"
                  type="number"
                  min={1}
                  max={100}
                  value={limits.dailyRequestCapPerUser}
                  onChange={(e) => setLimits(prev => ({
                    ...prev,
                    dailyRequestCapPerUser: parseInt(e.target.value) || 1
                  }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">requests/day</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Default: {defaultRequestLimits.dailyRequestCapPerUser}</Badge>
              {limits.dailyRequestCapPerUser !== originalLimits.dailyRequestCapPerUser && (
                <Badge variant="secondary">Modified</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Request Expiry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Request Expiry
            </CardTitle>
            <CardDescription>
              How long before an unanswered request automatically expires
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry time</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="expiry"
                  type="number"
                  min={1}
                  max={720}
                  value={limits.requestExpiryHours}
                  onChange={(e) => setLimits(prev => ({
                    ...prev,
                    requestExpiryHours: parseInt(e.target.value) || 1
                  }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
              <p className="text-xs text-muted-foreground">
                ≈ {Math.round(limits.requestExpiryHours / 24 * 10) / 10} days
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Default: {defaultRequestLimits.requestExpiryHours}h</Badge>
              {limits.requestExpiryHours !== originalLimits.requestExpiryHours && (
                <Badge variant="secondary">Modified</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Configuration Summary</CardTitle>
          <CardDescription>
            Overview of how these limits affect user experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="p-4 bg-muted rounded-lg">
              <div className="font-medium mb-1">Open Requests</div>
              <div className="text-2xl font-bold text-blue-600">
                {limits.maxOpenRequestsPerUser}
              </div>
              <div className="text-muted-foreground">
                Users can have up to {limits.maxOpenRequestsPerUser} active requests at a time
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="font-medium mb-1">Daily Creation</div>
              <div className="text-2xl font-bold text-purple-600">
                {limits.dailyRequestCapPerUser}
              </div>
              <div className="text-muted-foreground">
                Users can create {limits.dailyRequestCapPerUser} new requests per day
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="font-medium mb-1">Request Lifetime</div>
              <div className="text-2xl font-bold text-orange-600">
                {limits.requestExpiryHours}h
              </div>
              <div className="text-muted-foreground">
                Unanswered requests expire after {Math.round(limits.requestExpiryHours / 24 * 10) / 10} days
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          Cancel Changes
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
