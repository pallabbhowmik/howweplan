/**
 * Audit Trail Component
 * 
 * Displays audit history for any entity.
 */

'use client';

import React from 'react';
import { formatDateTime, formatRelativeTime, snakeToTitle } from '@/lib/utils';
import { StatusBadge } from './status-badge';
import type { AuditEvent } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface AuditTrailProps {
  readonly events: readonly AuditEvent[];
  readonly title?: string;
  readonly showMetadata?: boolean;
  readonly maxItems?: number;
  readonly onViewAll?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AuditTrail({
  events,
  title = 'Audit Trail',
  showMetadata = false,
  maxItems,
  onViewAll,
}: AuditTrailProps) {
  const displayEvents = maxItems ? events.slice(0, maxItems) : events;
  const hasMore = maxItems && events.length > maxItems;

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        No audit events found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {hasMore && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:underline"
          >
            View all ({events.length})
          </button>
        )}
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {displayEvents.map((event, index) => (
            <AuditEventItem
              key={event.id}
              event={event}
              showMetadata={showMetadata}
              isFirst={index === 0}
              isLast={index === displayEvents.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EVENT ITEM COMPONENT
// ============================================================================

interface AuditEventItemProps {
  readonly event: AuditEvent;
  readonly showMetadata: boolean;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}

function AuditEventItem({ event, showMetadata, isFirst, isLast }: AuditEventItemProps) {
  const severityColors = {
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div
        className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${
          severityColors[event.severity]
        }`}
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{event.action}</span>
              <StatusBadge status={event.severity} size="sm" />
            </div>
            
            <p className="text-sm text-muted-foreground">
              by {event.actorEmail || event.actorId} ({snakeToTitle(event.actorType)})
            </p>

            {event.reason && (
              <p className="text-sm mt-2">
                <span className="font-medium">Reason:</span> {event.reason}
              </p>
            )}

            {event.targetType && event.targetId && (
              <p className="text-xs text-muted-foreground">
                Target: {snakeToTitle(event.targetType)} #{event.targetId.slice(0, 8)}...
              </p>
            )}
          </div>

          <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
            <div>{formatRelativeTime(event.timestamp)}</div>
            <div className="text-xs">{formatDateTime(event.timestamp)}</div>
          </div>
        </div>

        {showMetadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View metadata
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {(event.previousState || event.newState) && (
          <div className="mt-3 pt-3 border-t">
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View state changes
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {event.previousState && (
                  <div>
                    <div className="font-medium mb-1">Previous State</div>
                    <pre className="p-2 bg-red-50 dark:bg-red-900/20 rounded overflow-auto">
                      {JSON.stringify(event.previousState, null, 2)}
                    </pre>
                  </div>
                )}
                {event.newState && (
                  <div>
                    <div className="font-medium mb-1">New State</div>
                    <pre className="p-2 bg-green-50 dark:bg-green-900/20 rounded overflow-auto">
                      {JSON.stringify(event.newState, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
