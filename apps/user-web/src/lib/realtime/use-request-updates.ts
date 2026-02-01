/**
 * Real-time Trip Request Updates Hook
 * ====================================
 * 
 * This hook provides real-time updates for trip requests, including:
 * - New proposals from agents
 * - Request state changes (matched, proposals_received, etc.)
 * - Agent responses to requests
 * 
 * Implementation Strategy:
 * 1. Primary: WebSocket connection to API Gateway
 * 2. Fallback: Smart polling with exponential backoff
 * 
 * Architecture:
 * Frontend → API Gateway WebSocket → Event Bus → Backend Services
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { apiConfig } from '@/config';

// ============================================================================
// Types
// ============================================================================

export interface RequestUpdateEvent {
  type: 'REQUEST_UPDATE' | 'NEW_PROPOSAL' | 'STATE_CHANGE' | 'AGENT_RESPONSE';
  requestId: string;
  data: {
    state?: string;
    proposalCount?: number;
    agentId?: string;
    agentName?: string;
    message?: string;
    timestamp: string;
  };
}

export interface UseRequestUpdatesOptions {
  /** The request ID to subscribe to */
  requestId: string;
  /** User ID for authentication */
  userId?: string;
  /** Callback when updates are received */
  onUpdate?: (event: RequestUpdateEvent) => void;
  /** Whether to enable real-time updates (default: true) */
  enabled?: boolean;
  /** Polling interval in ms when WebSocket is unavailable (default: 15000) */
  pollInterval?: number;
}

export interface UseRequestUpdatesReturn {
  /** Whether WebSocket connection is active */
  isConnected: boolean;
  /** Whether polling fallback is active */
  isPolling: boolean;
  /** Last event received */
  lastEvent: RequestUpdateEvent | null;
  /** Last update timestamp */
  lastUpdated: Date | null;
  /** Force a refresh */
  refresh: () => void;
  /** Connection error if any */
  error: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const WS_RECONNECT_DELAY_BASE = 1000; // 1 second
const WS_RECONNECT_MAX_DELAY = 30000; // 30 seconds
const WS_HEARTBEAT_INTERVAL = 30000; // 30 seconds
const DEFAULT_POLL_INTERVAL = 15000; // 15 seconds

// WebSocket is disabled on Render.com (free tier doesn't support it)
// Set to true to enable WebSocket attempts (for local dev or upgraded hosting)
const WEBSOCKET_ENABLED = false;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRequestUpdates(options: UseRequestUpdatesOptions): UseRequestUpdatesReturn {
  const {
    requestId,
    userId,
    onUpdate,
    enabled = true,
    pollInterval = DEFAULT_POLL_INTERVAL,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastEvent, setLastEvent] = useState<RequestUpdateEvent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Process incoming message
  const processMessage = useCallback((event: RequestUpdateEvent) => {
    if (!mountedRef.current) return;
    
    setLastEvent(event);
    setLastUpdated(new Date());
    onUpdate?.(event);
  }, [onUpdate]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!enabled || !requestId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Build WebSocket URL
      const wsUrl = new URL(apiConfig.wsUrl);
      wsUrl.pathname = '/ws/requests';
      wsUrl.searchParams.set('requestId', requestId);
      if (userId) {
        wsUrl.searchParams.set('userId', userId);
      }

      console.log('[RequestUpdates] Connecting WebSocket:', wsUrl.toString());
      
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        console.log('[RequestUpdates] WebSocket connected');
        setIsConnected(true);
        setIsPolling(false);
        setError(null);
        reconnectAttemptRef.current = 0;

        // Stop polling if active
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, WS_HEARTBEAT_INTERVAL);

        // Subscribe to request updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `request:${requestId}`,
          userId,
        }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong responses
          if (data.type === 'pong') {
            return;
          }

          // Handle request update events
          if (data.type === 'REQUEST_UPDATE' || 
              data.type === 'NEW_PROPOSAL' || 
              data.type === 'STATE_CHANGE' ||
              data.type === 'AGENT_RESPONSE') {
            processMessage(data);
          }
        } catch (err) {
          console.error('[RequestUpdates] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[RequestUpdates] WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        console.log('[RequestUpdates] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt reconnection with exponential backoff
        if (enabled && event.code !== 1000) { // 1000 = normal closure
          const delay = Math.min(
            WS_RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttemptRef.current),
            WS_RECONNECT_MAX_DELAY
          );
          
          console.log(`[RequestUpdates] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current++;
            
            // Fall back to polling after 3 failed attempts
            if (reconnectAttemptRef.current > 3) {
              console.log('[RequestUpdates] Falling back to polling');
              startPolling();
            } else {
              connectWebSocket();
            }
          }, delay);
        }
      };
    } catch (err) {
      console.error('[RequestUpdates] Failed to create WebSocket:', err);
      setError('Failed to connect');
      startPolling();
    }
  }, [enabled, requestId, userId, processMessage]);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (!enabled || !requestId || pollIntervalRef.current) return;

    console.log('[RequestUpdates] Starting polling fallback');
    setIsPolling(true);

    const poll = async () => {
      if (!mountedRef.current) return;

      try {
        // Fetch latest request state via API
        const response = await fetch(`${apiConfig.baseUrl}/api/requests/${requestId}/status`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Create synthetic update event
        const event: RequestUpdateEvent = {
          type: 'REQUEST_UPDATE',
          requestId,
          data: {
            state: data.state,
            proposalCount: data.proposalCount,
            timestamp: new Date().toISOString(),
          },
        };

        processMessage(event);
      } catch (err) {
        console.error('[RequestUpdates] Polling error:', err);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollIntervalRef.current = setInterval(poll, pollInterval);
  }, [enabled, requestId, pollInterval, processMessage]);

  // Manual refresh
  const refresh = useCallback(() => {
    if (WEBSOCKET_ENABLED && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'refresh',
        channel: `request:${requestId}`,
      }));
    } else {
      // Trigger immediate poll
      startPolling();
    }
    setLastUpdated(new Date());
  }, [requestId, startPolling]);

  // Setup effect
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && requestId) {
      // Skip WebSocket if disabled (e.g., Render.com free tier doesn't support it)
      if (!WEBSOCKET_ENABLED) {
        console.log('[RequestUpdates] WebSocket disabled, using polling');
        startPolling();
        return;
      }

      // Try WebSocket first
      connectWebSocket();

      // If WebSocket doesn't connect within 5 seconds, fall back to polling
      const fallbackTimeout = setTimeout(() => {
        if (!isConnected && !isPolling) {
          console.log('[RequestUpdates] WebSocket timeout, starting polling');
          startPolling();
        }
      }, 5000);

      return () => {
        clearTimeout(fallbackTimeout);
      };
    }
    return undefined;
  }, [enabled, requestId, connectWebSocket, startPolling, isConnected, isPolling]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false;

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }

      // Clear timeouts/intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isPolling,
    lastEvent,
    lastUpdated,
    refresh,
    error,
  };
}

// ============================================================================
// Simplified Hook for Multiple Requests
// ============================================================================

export interface UseRequestListUpdatesOptions {
  /** User ID to filter requests */
  userId: string;
  /** Callback when any request is updated */
  onUpdate?: (event: RequestUpdateEvent) => void;
  /** Whether updates are enabled */
  enabled?: boolean;
}

export function useRequestListUpdates(options: UseRequestListUpdatesOptions) {
  const { userId, onUpdate, enabled = true } = options;

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;

    // For list view, use polling with longer interval
    const pollInterval = setInterval(async () => {
      try {
        const event: RequestUpdateEvent = {
          type: 'REQUEST_UPDATE',
          requestId: '*',
          data: {
            timestamp: new Date().toISOString(),
          },
        };
        setLastUpdate(new Date());
        onUpdate?.(event);
      } catch (err) {
        console.error('[RequestListUpdates] Poll error:', err);
      }
    }, 30000); // Poll every 30 seconds for list view

    return () => clearInterval(pollInterval);
  }, [enabled, userId, onUpdate]);

  return { lastUpdate };
}
