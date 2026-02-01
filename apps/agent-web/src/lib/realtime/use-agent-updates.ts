/**
 * Real-time Updates Hook for Agent Portal
 * ========================================
 * 
 * This hook provides real-time updates for agents, including:
 * - New matched requests from users
 * - Match status changes
 * - User responses to proposals
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
import { env } from '@/config/env';

// ============================================================================
// Types
// ============================================================================

export interface AgentUpdateEvent {
  type: 'NEW_MATCH' | 'MATCH_EXPIRED' | 'USER_RESPONSE' | 'REQUEST_UPDATE' | 'ITINERARY_ACCEPTED';
  matchId?: string;
  requestId: string;
  data: {
    state?: string;
    matchScore?: number;
    expiresAt?: string;
    userAction?: string;
    message?: string;
    timestamp: string;
  };
}

export interface UseAgentUpdatesOptions {
  /** The agent ID to subscribe to */
  agentId: string;
  /** Optional specific request ID to monitor */
  requestId?: string;
  /** Callback when updates are received */
  onUpdate?: (event: AgentUpdateEvent) => void;
  /** Whether to enable real-time updates (default: true) */
  enabled?: boolean;
  /** Polling interval in ms when WebSocket is unavailable (default: 15000) */
  pollInterval?: number;
}

export interface UseAgentUpdatesReturn {
  /** Whether WebSocket connection is active */
  isConnected: boolean;
  /** Whether polling fallback is active */
  isPolling: boolean;
  /** Last event received */
  lastEvent: AgentUpdateEvent | null;
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

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAgentUpdates(options: UseAgentUpdatesOptions): UseAgentUpdatesReturn {
  const {
    agentId,
    requestId,
    onUpdate,
    enabled = true,
    pollInterval = DEFAULT_POLL_INTERVAL,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastEvent, setLastEvent] = useState<AgentUpdateEvent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Process incoming message
  const processMessage = useCallback((event: AgentUpdateEvent) => {
    if (!mountedRef.current) return;
    
    setLastEvent(event);
    setLastUpdated(new Date());
    onUpdate?.(event);
  }, [onUpdate]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!enabled || !agentId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Build WebSocket URL
      const wsUrl = new URL(env.NEXT_PUBLIC_WS_URL);
      wsUrl.pathname = '/ws/agents';
      wsUrl.searchParams.set('agentId', agentId);
      if (requestId) {
        wsUrl.searchParams.set('requestId', requestId);
      }

      console.log('[AgentUpdates] Connecting WebSocket:', wsUrl.toString());
      
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        console.log('[AgentUpdates] WebSocket connected');
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

        // Subscribe to agent updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `agent:${agentId}`,
          requestId,
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

          // Handle agent update events
          if (data.type === 'NEW_MATCH' || 
              data.type === 'MATCH_EXPIRED' || 
              data.type === 'USER_RESPONSE' ||
              data.type === 'REQUEST_UPDATE' ||
              data.type === 'ITINERARY_ACCEPTED') {
            processMessage(data);
          }
        } catch (err) {
          console.error('[AgentUpdates] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[AgentUpdates] WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        console.log('[AgentUpdates] WebSocket closed:', event.code, event.reason);
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
          
          console.log(`[AgentUpdates] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current++;
            
            // Fall back to polling after 3 failed attempts
            if (reconnectAttemptRef.current > 3) {
              console.log('[AgentUpdates] Falling back to polling');
              startPolling();
            } else {
              connectWebSocket();
            }
          }, delay);
        }
      };
    } catch (err) {
      console.error('[AgentUpdates] Failed to create WebSocket:', err);
      setError('Failed to connect');
      startPolling();
    }
  }, [enabled, agentId, requestId, processMessage]);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (!enabled || !agentId || pollIntervalRef.current) return;

    console.log('[AgentUpdates] Starting polling fallback');
    setIsPolling(true);

    const poll = async () => {
      if (!mountedRef.current) return;

      try {
        // Fetch latest matches via the correct API endpoint
        // The matching service uses /api/v1/matches and derives agent from JWT
        const url = `${env.NEXT_PUBLIC_API_BASE_URL}/api/matching/api/v1/matches`;
        
        const token = typeof window !== 'undefined' ? localStorage.getItem('tc_access_token') : null;
        
        const response = await fetch(url, {
          credentials: 'include',
          headers: token ? {
            'Authorization': `Bearer ${token}`,
          } : {},
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Parse response (data used for validation)
        await response.json();
        
        // Create synthetic update event
        const event: AgentUpdateEvent = {
          type: 'REQUEST_UPDATE',
          requestId: requestId || '*',
          data: {
            timestamp: new Date().toISOString(),
          },
        };

        processMessage(event);
      } catch (err) {
        console.error('[AgentUpdates] Polling error:', err);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollIntervalRef.current = setInterval(poll, pollInterval);
  }, [enabled, agentId, requestId, pollInterval, processMessage]);

  // Manual refresh
  const refresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'refresh',
        channel: `agent:${agentId}`,
      }));
    } else {
      // Trigger immediate poll
      startPolling();
    }
    setLastUpdated(new Date());
  }, [agentId, startPolling]);

  // Setup effect
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && agentId) {
      // Try WebSocket first
      connectWebSocket();

      // If WebSocket doesn't connect within 5 seconds, fall back to polling
      const fallbackTimeout = setTimeout(() => {
        if (!isConnected && !isPolling) {
          console.log('[AgentUpdates] WebSocket timeout, starting polling');
          startPolling();
        }
      }, 5000);

      return () => {
        clearTimeout(fallbackTimeout);
      };
    }
  }, [enabled, agentId, connectWebSocket, startPolling, isConnected, isPolling]);

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
// Simplified Hook for New Matches Notification
// ============================================================================

export interface UseNewMatchesOptions {
  /** Agent ID to monitor */
  agentId: string;
  /** Callback when a new match is received */
  onNewMatch?: (event: AgentUpdateEvent) => void;
  /** Whether updates are enabled */
  enabled?: boolean;
}

export function useNewMatches(options: UseNewMatchesOptions) {
  const { agentId, onNewMatch, enabled = true } = options;
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleUpdate = useCallback((event: AgentUpdateEvent) => {
    if (event.type === 'NEW_MATCH') {
      setNewMatchCount(prev => prev + 1);
      setLastUpdate(new Date());
      onNewMatch?.(event);
    }
  }, [onNewMatch]);

  const { isConnected, isPolling } = useAgentUpdates({
    agentId,
    enabled,
    onUpdate: handleUpdate,
    pollInterval: 30000, // Poll every 30 seconds for new matches
  });

  const clearNewMatches = useCallback(() => {
    setNewMatchCount(0);
  }, []);

  return {
    isConnected,
    isPolling,
    newMatchCount,
    lastUpdate,
    clearNewMatches,
  };
}
