'use client';

/**
 * Admin Itinerary Settings Page
 * 
 * Allows administrators to configure:
 * - Obfuscation rules (what details to hide pre-payment)
 * - Template categories and item types
 * - Copy protection settings
 * - Disclosure policies
 * - Preview mode configuration
 */

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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Shield,
  FileText,
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  RefreshCw,
  Hotel,
  Car,
  Camera,
  Utensils,
  Plane,
  MapPin,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle,
  Info,
  Copy,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ObfuscationRule {
  id: string;
  category: 'accommodation' | 'transport' | 'activity' | 'meal' | 'transfer';
  fieldName: string;
  obfuscationStrategy: 'hide' | 'generalize' | 'category_only' | 'star_rating_only';
  prePaymentVisibility: 'hidden' | 'obfuscated' | 'visible';
  postPaymentVisibility: 'visible' | 'on_request';
  description: string;
  isActive: boolean;
}

interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  isActive: boolean;
  displayOrder: number;
}

interface TimeSlotConfig {
  id: string;
  name: string;
  label: string;
  startHour: number;
  endHour: number;
  icon: string;
  isActive: boolean;
}

interface CopyProtectionSettings {
  enableCopyProtection: boolean;
  disableTextSelection: boolean;
  disableRightClick: boolean;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  blurOnScreenshot: boolean;
}

interface DisclosureSettings {
  revealOnPaymentConfirmation: boolean;
  partialRevealOnDeposit: boolean;
  depositRevealPercentage: number;
  sendDisclosureEmail: boolean;
  disclosureEmailTemplate: string;
  allowManualReveal: boolean;
  manualRevealRequiresApproval: boolean;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const defaultObfuscationRules: ObfuscationRule[] = [
  {
    id: '1',
    category: 'accommodation',
    fieldName: 'vendorName',
    obfuscationStrategy: 'generalize',
    prePaymentVisibility: 'obfuscated',
    postPaymentVisibility: 'visible',
    description: 'Hotel/resort name shown as "4-star hotel in [area]"',
    isActive: true,
  },
  {
    id: '2',
    category: 'accommodation',
    fieldName: 'vendorAddress',
    obfuscationStrategy: 'hide',
    prePaymentVisibility: 'hidden',
    postPaymentVisibility: 'visible',
    description: 'Exact address hidden, only area/neighborhood shown',
    isActive: true,
  },
  {
    id: '3',
    category: 'accommodation',
    fieldName: 'vendorPhone',
    obfuscationStrategy: 'hide',
    prePaymentVisibility: 'hidden',
    postPaymentVisibility: 'visible',
    description: 'Contact numbers hidden until booking confirmation',
    isActive: true,
  },
  {
    id: '4',
    category: 'accommodation',
    fieldName: 'bookingReference',
    obfuscationStrategy: 'hide',
    prePaymentVisibility: 'hidden',
    postPaymentVisibility: 'visible',
    description: 'Booking/confirmation numbers hidden pre-payment',
    isActive: true,
  },
  {
    id: '5',
    category: 'transport',
    fieldName: 'vendorName',
    obfuscationStrategy: 'category_only',
    prePaymentVisibility: 'obfuscated',
    postPaymentVisibility: 'visible',
    description: 'Shown as "Private AC vehicle" or "Flight"',
    isActive: true,
  },
  {
    id: '6',
    category: 'activity',
    fieldName: 'vendorName',
    obfuscationStrategy: 'generalize',
    prePaymentVisibility: 'obfuscated',
    postPaymentVisibility: 'visible',
    description: 'Tour operator name generalized',
    isActive: true,
  },
  {
    id: '7',
    category: 'meal',
    fieldName: 'vendorName',
    obfuscationStrategy: 'star_rating_only',
    prePaymentVisibility: 'obfuscated',
    postPaymentVisibility: 'visible',
    description: 'Restaurant shown with cuisine type only',
    isActive: true,
  },
];

const defaultCategoryConfigs: CategoryConfig[] = [
  { id: '1', name: 'accommodation', icon: 'Hotel', color: 'text-blue-600', bgColor: 'bg-blue-50', isActive: true, displayOrder: 1 },
  { id: '2', name: 'transport', icon: 'Car', color: 'text-green-600', bgColor: 'bg-green-50', isActive: true, displayOrder: 2 },
  { id: '3', name: 'activity', icon: 'Camera', color: 'text-purple-600', bgColor: 'bg-purple-50', isActive: true, displayOrder: 3 },
  { id: '4', name: 'meal', icon: 'Utensils', color: 'text-orange-600', bgColor: 'bg-orange-50', isActive: true, displayOrder: 4 },
  { id: '5', name: 'transfer', icon: 'Plane', color: 'text-teal-600', bgColor: 'bg-teal-50', isActive: true, displayOrder: 5 },
];

const defaultTimeSlots: TimeSlotConfig[] = [
  { id: '1', name: 'morning', label: 'Morning', startHour: 6, endHour: 12, icon: 'Sun', isActive: true },
  { id: '2', name: 'afternoon', label: 'Afternoon', startHour: 12, endHour: 17, icon: 'Sun', isActive: true },
  { id: '3', name: 'evening', label: 'Evening', startHour: 17, endHour: 21, icon: 'Sunset', isActive: true },
  { id: '4', name: 'full_day', label: 'Full Day', startHour: 6, endHour: 21, icon: 'Calendar', isActive: true },
];

const defaultCopyProtection: CopyProtectionSettings = {
  enableCopyProtection: true,
  disableTextSelection: true,
  disableRightClick: true,
  showWatermark: true,
  watermarkText: 'PREVIEW',
  watermarkOpacity: 3,
  blurOnScreenshot: false,
};

const defaultDisclosure: DisclosureSettings = {
  revealOnPaymentConfirmation: true,
  partialRevealOnDeposit: false,
  depositRevealPercentage: 50,
  sendDisclosureEmail: true,
  disclosureEmailTemplate: 'full_itinerary_reveal',
  allowManualReveal: true,
  manualRevealRequiresApproval: true,
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-4 border-b last:border-b-0">
      <div className="flex-1 pr-4">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function CategoryIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    accommodation: <Hotel className="h-4 w-4" />,
    transport: <Car className="h-4 w-4" />,
    activity: <Camera className="h-4 w-4" />,
    meal: <Utensils className="h-4 w-4" />,
    transfer: <Plane className="h-4 w-4" />,
  };
  return icons[name] || <FileText className="h-4 w-4" />;
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    hidden: { color: 'bg-red-100 text-red-700', icon: <EyeOff className="h-3 w-3" /> },
    obfuscated: { color: 'bg-amber-100 text-amber-700', icon: <Eye className="h-3 w-3" /> },
    visible: { color: 'bg-green-100 text-green-700', icon: <Eye className="h-3 w-3" /> },
    on_request: { color: 'bg-blue-100 text-blue-700', icon: <Lock className="h-3 w-3" /> },
  };
  const { color, icon } = config[visibility] || config.hidden;
  
  return (
    <Badge className={`${color} gap-1`} variant="outline">
      {icon}
      {visibility.replace('_', ' ')}
    </Badge>
  );
}

// =============================================================================
// OBFUSCATION RULES SECTION
// =============================================================================

function ObfuscationRulesSection({
  rules,
  onUpdateRule,
  onAddRule,
  onDeleteRule,
}: {
  rules: ObfuscationRule[];
  onUpdateRule: (id: string, updates: Partial<ObfuscationRule>) => void;
  onAddRule: (rule: ObfuscationRule) => void;
  onDeleteRule: (id: string) => void;
}) {
  const [editingRule, setEditingRule] = useState<ObfuscationRule | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Obfuscation Rules</h3>
          <p className="text-sm text-muted-foreground">
            Configure what details are hidden or generalized before payment
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Rules by Category */}
      {['accommodation', 'transport', 'activity', 'meal', 'transfer'].map((category) => {
        const categoryRules = rules.filter((r) => r.category === category);
        if (categoryRules.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                <CategoryIcon name={category} />
                <CardTitle className="text-base capitalize">{category}</CardTitle>
                <Badge variant="secondary">{categoryRules.length} rules</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Pre-Payment</TableHead>
                    <TableHead>Post-Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{rule.fieldName}</span>
                          <p className="text-xs text-muted-foreground">{rule.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.obfuscationStrategy.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <VisibilityBadge visibility={rule.prePaymentVisibility} />
                      </TableCell>
                      <TableCell>
                        <VisibilityBadge visibility={rule.postPaymentVisibility} />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => onUpdateRule(rule.id, { isActive: checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Obfuscation Rule</DialogTitle>
            <DialogDescription>
              Modify how this field is displayed before and after payment
            </DialogDescription>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editingRule.category}
                    onValueChange={(v) => setEditingRule({ ...editingRule, category: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accommodation">Accommodation</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="meal">Meal</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Field Name</Label>
                  <Input
                    value={editingRule.fieldName}
                    onChange={(e) => setEditingRule({ ...editingRule, fieldName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Obfuscation Strategy</Label>
                <Select
                  value={editingRule.obfuscationStrategy}
                  onValueChange={(v) => setEditingRule({ ...editingRule, obfuscationStrategy: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hide">Hide Completely</SelectItem>
                    <SelectItem value="generalize">Generalize (e.g., "4-star hotel")</SelectItem>
                    <SelectItem value="category_only">Category Only (e.g., "Private Vehicle")</SelectItem>
                    <SelectItem value="star_rating_only">Star Rating Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pre-Payment Visibility</Label>
                  <Select
                    value={editingRule.prePaymentVisibility}
                    onValueChange={(v) => setEditingRule({ ...editingRule, prePaymentVisibility: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hidden">Hidden</SelectItem>
                      <SelectItem value="obfuscated">Obfuscated</SelectItem>
                      <SelectItem value="visible">Visible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Post-Payment Visibility</Label>
                  <Select
                    value={editingRule.postPaymentVisibility}
                    onValueChange={(v) => setEditingRule({ ...editingRule, postPaymentVisibility: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visible">Visible</SelectItem>
                      <SelectItem value="on_request">On Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingRule.description}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  placeholder="Describe how this field is displayed..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingRule) {
                  onUpdateRule(editingRule.id, editingRule);
                  setEditingRule(null);
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// COPY PROTECTION SECTION
// =============================================================================

function CopyProtectionSection({
  settings,
  onChange,
}: {
  settings: CopyProtectionSettings;
  onChange: (updates: Partial<CopyProtectionSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Copy Protection</h3>
        <p className="text-sm text-muted-foreground">
          Prevent unauthorized copying of itinerary content before payment
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Protection Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow
            label="Enable Copy Protection"
            description="Master toggle for all copy protection features"
          >
            <Switch
              checked={settings.enableCopyProtection}
              onCheckedChange={(v) => onChange({ enableCopyProtection: v })}
            />
          </SettingRow>

          <SettingRow
            label="Disable Text Selection"
            description="Prevent users from selecting text in preview mode"
          >
            <Switch
              checked={settings.disableTextSelection}
              disabled={!settings.enableCopyProtection}
              onCheckedChange={(v) => onChange({ disableTextSelection: v })}
            />
          </SettingRow>

          <SettingRow
            label="Disable Right-Click"
            description="Prevent context menu access in preview mode"
          >
            <Switch
              checked={settings.disableRightClick}
              disabled={!settings.enableCopyProtection}
              onCheckedChange={(v) => onChange({ disableRightClick: v })}
            />
          </SettingRow>

          <SettingRow
            label="Blur on Screenshot"
            description="Attempt to detect and blur content during screenshots (experimental)"
          >
            <Switch
              checked={settings.blurOnScreenshot}
              disabled={!settings.enableCopyProtection}
              onCheckedChange={(v) => onChange({ blurOnScreenshot: v })}
            />
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Watermark Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow
            label="Show Watermark"
            description="Display a watermark overlay on preview itineraries"
          >
            <Switch
              checked={settings.showWatermark}
              onCheckedChange={(v) => onChange({ showWatermark: v })}
            />
          </SettingRow>

          <SettingRow
            label="Watermark Text"
            description="Text displayed in the watermark overlay"
          >
            <Input
              value={settings.watermarkText}
              onChange={(e) => onChange({ watermarkText: e.target.value })}
              className="w-40"
              disabled={!settings.showWatermark}
            />
          </SettingRow>

          <SettingRow
            label="Watermark Opacity"
            description="Opacity level (1-10) for the watermark"
          >
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.watermarkOpacity}
              onChange={(e) => onChange({ watermarkOpacity: parseInt(e.target.value) || 3 })}
              className="w-20"
              disabled={!settings.showWatermark}
            />
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// DISCLOSURE SETTINGS SECTION
// =============================================================================

function DisclosureSettingsSection({
  settings,
  onChange,
}: {
  settings: DisclosureSettings;
  onChange: (updates: Partial<DisclosureSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Disclosure Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure when and how full itinerary details are revealed to travelers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Unlock className="h-4 w-4" />
            Automatic Reveal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow
            label="Reveal on Payment Confirmation"
            description="Automatically reveal full details when payment is confirmed"
          >
            <Switch
              checked={settings.revealOnPaymentConfirmation}
              onCheckedChange={(v) => onChange({ revealOnPaymentConfirmation: v })}
            />
          </SettingRow>

          <SettingRow
            label="Partial Reveal on Deposit"
            description="Reveal some details when deposit is paid"
          >
            <Switch
              checked={settings.partialRevealOnDeposit}
              onCheckedChange={(v) => onChange({ partialRevealOnDeposit: v })}
            />
          </SettingRow>

          {settings.partialRevealOnDeposit && (
            <SettingRow
              label="Deposit Reveal Percentage"
              description="Percentage of details to reveal on deposit"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.depositRevealPercentage}
                  onChange={(e) => onChange({ depositRevealPercentage: parseInt(e.target.value) || 50 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </SettingRow>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow
            label="Send Disclosure Email"
            description="Email full itinerary details to traveler after payment"
          >
            <Switch
              checked={settings.sendDisclosureEmail}
              onCheckedChange={(v) => onChange({ sendDisclosureEmail: v })}
            />
          </SettingRow>

          <SettingRow
            label="Email Template"
            description="Template to use for disclosure emails"
          >
            <Select
              value={settings.disclosureEmailTemplate}
              onValueChange={(v) => onChange({ disclosureEmailTemplate: v })}
              disabled={!settings.sendDisclosureEmail}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_itinerary_reveal">Full Itinerary Reveal</SelectItem>
                <SelectItem value="booking_confirmation">Booking Confirmation</SelectItem>
                <SelectItem value="detailed_with_contacts">Detailed with Contacts</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manual Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow
            label="Allow Manual Reveal"
            description="Let agents manually reveal itinerary details"
          >
            <Switch
              checked={settings.allowManualReveal}
              onCheckedChange={(v) => onChange({ allowManualReveal: v })}
            />
          </SettingRow>

          <SettingRow
            label="Require Admin Approval"
            description="Require admin approval for manual reveals"
          >
            <Switch
              checked={settings.manualRevealRequiresApproval}
              disabled={!settings.allowManualReveal}
              onCheckedChange={(v) => onChange({ manualRevealRequiresApproval: v })}
            />
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// CATEGORIES SECTION
// =============================================================================

function CategoriesSection({
  categories,
  onUpdateCategory,
}: {
  categories: CategoryConfig[];
  onUpdateCategory: (id: string, updates: Partial<CategoryConfig>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Item Categories</h3>
        <p className="text-sm text-muted-foreground">
          Configure the categories available for itinerary items
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Colors</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.sort((a, b) => a.displayOrder - b.displayOrder).map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium capitalize">{category.name}</TableCell>
                  <TableCell>
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${category.bgColor}`}>
                      <CategoryIcon name={category.name} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={category.color}>
                        {category.color}
                      </Badge>
                      <Badge variant="outline" className={category.bgColor}>
                        {category.bgColor}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={category.displayOrder}
                      onChange={(e) => onUpdateCategory(category.id, { displayOrder: parseInt(e.target.value) || 1 })}
                      className="w-16"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={category.isActive}
                      onCheckedChange={(v) => onUpdateCategory(category.id, { isActive: v })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// TIME SLOTS SECTION
// =============================================================================

function TimeSlotsSection({
  timeSlots,
  onUpdateTimeSlot,
}: {
  timeSlots: TimeSlotConfig[];
  onUpdateTimeSlot: (id: string, updates: Partial<TimeSlotConfig>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Time Slots</h3>
        <p className="text-sm text-muted-foreground">
          Configure the time-of-day options for itinerary items
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time Slot</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSlots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell className="font-medium">{slot.name}</TableCell>
                  <TableCell>
                    <Input
                      value={slot.label}
                      onChange={(e) => onUpdateTimeSlot(slot.id, { label: e.target.value })}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={slot.startHour}
                        onChange={(e) => onUpdateTimeSlot(slot.id, { startHour: parseInt(e.target.value) || 0 })}
                        className="w-16"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={slot.endHour}
                        onChange={(e) => onUpdateTimeSlot(slot.id, { endHour: parseInt(e.target.value) || 23 })}
                        className="w-16"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={slot.isActive}
                      onCheckedChange={(v) => onUpdateTimeSlot(slot.id, { isActive: v })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function ItinerarySettingsPage() {
  const [activeTab, setActiveTab] = useState('obfuscation');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // State for all settings
  const [obfuscationRules, setObfuscationRules] = useState<ObfuscationRule[]>(defaultObfuscationRules);
  const [categories, setCategories] = useState<CategoryConfig[]>(defaultCategoryConfigs);
  const [timeSlots, setTimeSlots] = useState<TimeSlotConfig[]>(defaultTimeSlots);
  const [copyProtection, setCopyProtection] = useState<CopyProtectionSettings>(defaultCopyProtection);
  const [disclosure, setDisclosure] = useState<DisclosureSettings>(defaultDisclosure);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
    setSaveSuccess(false);
  }, [obfuscationRules, categories, timeSlots, copyProtection, disclosure]);

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setHasChanges(false);
  };

  // Obfuscation rule handlers
  const handleUpdateRule = (id: string, updates: Partial<ObfuscationRule>) => {
    setObfuscationRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const handleAddRule = (rule: ObfuscationRule) => {
    setObfuscationRules((prev) => [...prev, { ...rule, id: String(Date.now()) }]);
  };

  const handleDeleteRule = (id: string) => {
    setObfuscationRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  // Category handler
  const handleUpdateCategory = (id: string, updates: Partial<CategoryConfig>) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );
  };

  // Time slot handler
  const handleUpdateTimeSlot = (id: string, updates: Partial<TimeSlotConfig>) => {
    setTimeSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, ...updates } : slot))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Itinerary Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure itinerary templates, obfuscation rules, and disclosure policies
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings saved successfully
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These settings control how itinerary details are displayed to travelers before and after payment.
          Changes will affect all new itinerary templates.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="obfuscation" className="gap-1">
            <EyeOff className="h-4 w-4" />
            Obfuscation
          </TabsTrigger>
          <TabsTrigger value="protection" className="gap-1">
            <Shield className="h-4 w-4" />
            Protection
          </TabsTrigger>
          <TabsTrigger value="disclosure" className="gap-1">
            <Unlock className="h-4 w-4" />
            Disclosure
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1">
            <FileText className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="timeslots" className="gap-1">
            <Clock className="h-4 w-4" />
            Time Slots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="obfuscation" className="mt-6">
          <ObfuscationRulesSection
            rules={obfuscationRules}
            onUpdateRule={handleUpdateRule}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
          />
        </TabsContent>

        <TabsContent value="protection" className="mt-6">
          <CopyProtectionSection
            settings={copyProtection}
            onChange={(updates) => setCopyProtection((prev) => ({ ...prev, ...updates }))}
          />
        </TabsContent>

        <TabsContent value="disclosure" className="mt-6">
          <DisclosureSettingsSection
            settings={disclosure}
            onChange={(updates) => setDisclosure((prev) => ({ ...prev, ...updates }))}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesSection
            categories={categories}
            onUpdateCategory={handleUpdateCategory}
          />
        </TabsContent>

        <TabsContent value="timeslots" className="mt-6">
          <TimeSlotsSection
            timeSlots={timeSlots}
            onUpdateTimeSlot={handleUpdateTimeSlot}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
