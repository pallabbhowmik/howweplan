/**
 * WebSocket Server for Real-time Updates
 * =======================================
 * 
 * Provides WebSocket connections for real-time updates to frontend apps:
 * - /ws/requests - User trip request updates
 * - /ws/agents - Agent match/request updates
 * 
 * Architecture:
 * - Clients connect with JWT for authentication
 * - Subscriptions are room-based (request:<id>, agent:<id>)
 * - Broadcasts updates to relevant subscribers
 */

import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from '../config';
import { logger } from '../middleware/logger';

// ============================================================================
// Types
// ============================================================================

interface Client {
  ws: WebSocket;
  userId?: string;
  agentId?: string;
  subscriptions: Set<string>;
  lastPing: number;
  isAlive: boolean;
}

interface BroadcastMessage {
  type: string;
  channel: string;
  data: unknown;
  timestamp: string;
}

// ============================================================================
// WebSocket Manager
// ============================================================================

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, Client> = new Map();
  private channels: Map<string, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server attached to HTTP server
   */
  initialize(server: HttpServer): void {
    this.wss = new WebSocketServer({ 
      noServer: true,
      path: '/ws',
    });

    // Handle upgrade requests
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const pathname = url.pathname;

      // Only handle /ws paths
      if (pathname.startsWith('/ws')) {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    // Start heartbeat monitoring
    this.startHeartbeat();

    logger.info({
      timestamp: new Date().toISOString(),
      event: 'websocket_server_initialized',
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathname = url.pathname;
    const params = url.searchParams;

    // Extract authentication info from query params
    const userId = params.get('userId') || undefined;
    const agentId = params.get('agentId') || undefined;
    const requestId = params.get('requestId') || undefined;

    // Create client record
    const client: Client = {
      ws,
      userId,
      agentId,
      subscriptions: new Set(),
      lastPing: Date.now(),
      isAlive: true,
    };

    this.clients.set(ws, client);

    logger.info({
      timestamp: new Date().toISOString(),
      event: 'websocket_connected',
      path: pathname,
      userId,
      agentId,
      requestId,
    });

    // Auto-subscribe based on path
    if (pathname === '/ws/requests' && requestId) {
      this.subscribe(ws, `request:${requestId}`);
      if (userId) {
        this.subscribe(ws, `user:${userId}`);
      }
    } else if (pathname === '/ws/agents' && agentId) {
      this.subscribe(ws, `agent:${agentId}`);
      if (requestId) {
        this.subscribe(ws, `request:${requestId}`);
      }
    }

    // Handle messages
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    // Handle close
    ws.on('close', () => {
      this.handleClose(ws);
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      logger.error({
        timestamp: new Date().toISOString(),
        event: 'websocket_error',
        error: error.message,
        userId: client.userId,
        agentId: client.agentId,
      });
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.isAlive = true;
        client.lastPing = Date.now();
      }
    });

    // Send welcome message
    this.send(ws, {
      type: 'connected',
      message: 'WebSocket connection established',
      subscriptions: Array.from(client.subscriptions),
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(ws: WebSocket, data: Buffer): void {
    const client = this.clients.get(ws);
    if (!client) return;

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping':
          this.send(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        case 'subscribe':
          if (message.channel) {
            this.subscribe(ws, message.channel);
            this.send(ws, { 
              type: 'subscribed', 
              channel: message.channel,
              subscriptions: Array.from(client.subscriptions),
            });
          }
          break;

        case 'unsubscribe':
          if (message.channel) {
            this.unsubscribe(ws, message.channel);
            this.send(ws, { 
              type: 'unsubscribed', 
              channel: message.channel,
              subscriptions: Array.from(client.subscriptions),
            });
          }
          break;

        case 'refresh':
          // Client is requesting a refresh - they should re-fetch via API
          this.send(ws, { 
            type: 'refresh_ack', 
            channel: message.channel,
            timestamp: new Date().toISOString(),
          });
          break;

        default:
          logger.debug({
            timestamp: new Date().toISOString(),
            event: 'websocket_unknown_message_type',
            messageType: message.type,
          });
      }
    } catch (error) {
      logger.warn({
        timestamp: new Date().toISOString(),
        event: 'websocket_invalid_message',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle connection close
   */
  private handleClose(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      // Remove from all subscribed channels
      for (const channel of client.subscriptions) {
        this.unsubscribe(ws, channel);
      }
      this.clients.delete(ws);

      logger.info({
        timestamp: new Date().toISOString(),
        event: 'websocket_disconnected',
        userId: client.userId,
        agentId: client.agentId,
      });
    }
  }

  /**
   * Subscribe client to a channel
   */
  private subscribe(ws: WebSocket, channel: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscriptions.add(channel);

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)?.add(ws);

    logger.debug({
      timestamp: new Date().toISOString(),
      event: 'websocket_subscribed',
      channel,
      userId: client.userId,
      agentId: client.agentId,
    });
  }

  /**
   * Unsubscribe client from a channel
   */
  private unsubscribe(ws: WebSocket, channel: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscriptions.delete(channel);
    this.channels.get(channel)?.delete(ws);

    // Clean up empty channels
    if (this.channels.get(channel)?.size === 0) {
      this.channels.delete(channel);
    }
  }

  /**
   * Send message to a single client
   */
  private send(ws: WebSocket, message: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to a channel
   */
  broadcast(channel: string, message: Omit<BroadcastMessage, 'channel' | 'timestamp'>): void {
    const subscribers = this.channels.get(channel);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const fullMessage: BroadcastMessage = {
      ...message,
      channel,
      timestamp: new Date().toISOString(),
    };

    const messageString = JSON.stringify(fullMessage);
    let delivered = 0;

    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageString);
        delivered++;
      }
    }

    logger.debug({
      timestamp: new Date().toISOString(),
      event: 'websocket_broadcast',
      channel,
      messageType: message.type,
      subscribers: subscribers.size,
      delivered,
    });
  }

  /**
   * Broadcast to multiple channels
   */
  broadcastToChannels(channels: string[], message: Omit<BroadcastMessage, 'channel' | 'timestamp'>): void {
    for (const channel of channels) {
      this.broadcast(channel, message);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [ws, client] of this.clients) {
        if (!client.isAlive) {
          // Client didn't respond to last ping - terminate
          ws.terminate();
          continue;
        }

        // Mark as not alive until pong received
        client.isAlive = false;
        ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { clients: number; channels: number } {
    return {
      clients: this.clients.size,
      channels: this.channels.size,
    };
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections gracefully
    for (const [ws] of this.clients) {
      ws.close(1001, 'Server shutting down');
    }

    this.wss?.close();
    this.clients.clear();
    this.channels.clear();

    logger.info({
      timestamp: new Date().toISOString(),
      event: 'websocket_server_shutdown',
    });
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

// ============================================================================
// Event Bridge Functions
// ============================================================================

/**
 * Notify when a trip request state changes
 */
export function notifyRequestUpdate(requestId: string, data: {
  state: string;
  proposalCount?: number;
  message?: string;
}): void {
  wsManager.broadcast(`request:${requestId}`, {
    type: 'REQUEST_UPDATE',
    data: {
      requestId,
      ...data,
    },
  });
}

/**
 * Notify user when a new proposal is received
 */
export function notifyNewProposal(requestId: string, userId: string, data: {
  agentId: string;
  agentName?: string;
  proposalId: string;
}): void {
  wsManager.broadcastToChannels(
    [`request:${requestId}`, `user:${userId}`],
    {
      type: 'NEW_PROPOSAL',
      data: {
        requestId,
        ...data,
      },
    }
  );
}

/**
 * Notify agent when matched to a new request
 */
export function notifyNewMatch(agentId: string, data: {
  matchId: string;
  requestId: string;
  matchScore?: number;
  expiresAt?: string;
}): void {
  wsManager.broadcast(`agent:${agentId}`, {
    type: 'NEW_MATCH',
    data,
  });
}

/**
 * Notify agent when a match expires
 */
export function notifyMatchExpired(agentId: string, matchId: string, requestId: string): void {
  wsManager.broadcast(`agent:${agentId}`, {
    type: 'MATCH_EXPIRED',
    data: {
      matchId,
      requestId,
    },
  });
}

/**
 * Notify agent when user responds to proposal
 */
export function notifyUserResponse(agentId: string, data: {
  requestId: string;
  proposalId?: string;
  action: 'accepted' | 'rejected' | 'revision_requested';
  message?: string;
}): void {
  wsManager.broadcast(`agent:${agentId}`, {
    type: 'USER_RESPONSE',
    data,
  });
}
