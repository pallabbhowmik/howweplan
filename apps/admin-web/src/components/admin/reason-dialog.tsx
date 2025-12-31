/**
 * Reason Dialog Component
 * 
 * CRITICAL: Every admin action MUST include a reason.
 * This dialog enforces that requirement with validation.
 */

'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ReasonDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly actionLabel: string;
  readonly actionVariant?: 'default' | 'destructive';
  readonly onConfirm: (reason: string) => Promise<void>;
  readonly minReasonLength?: number;
  readonly placeholder?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MIN_LENGTH = 10;
const DEFAULT_PLACEHOLDER = 'Enter a clear reason for this action (minimum 10 characters)...';

// ============================================================================
// COMPONENT
// ============================================================================

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  actionLabel,
  actionVariant = 'default',
  onConfirm,
  minReasonLength = DEFAULT_MIN_LENGTH,
  placeholder = DEFAULT_PLACEHOLDER,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidReason = reason.trim().length >= minReasonLength;

  const handleConfirm = async () => {
    if (!isValidReason) {
      setError(`Reason must be at least ${minReasonLength} characters`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(reason.trim());
      setReason('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {children}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setReason(e.target.value);
                setError(null);
              }}
              placeholder={placeholder}
              className={cn(
                'min-h-[100px] resize-none',
                error && 'border-destructive focus-visible:ring-destructive'
              )}
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-xs">
              <span className={cn(
                'text-muted-foreground',
                !isValidReason && reason.length > 0 && 'text-destructive'
              )}>
                {reason.trim().length} / {minReasonLength} minimum characters
              </span>
              {error && <span className="text-destructive">{error}</span>}
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <strong>Note:</strong> This action and your reason will be permanently recorded
            in the audit log for compliance purposes.
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isValidReason || isSubmitting}
            className={cn(
              actionVariant === 'destructive' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            {isSubmitting ? 'Processing...' : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
