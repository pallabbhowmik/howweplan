import amqplib from 'amqplib';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import type { PublishedEvent, AuditEvent } from './types.js';

/**
 * Event bus connection state.
 */
let connection: Awaited<ReturnType<typeof amqplib.connect>> | null = null;
let channel: Awaited<ReturnType<Awaited<ReturnType<typeof amqplib.connect>>['createChannel']>> | null = null;

/**
 * Initialize event bus connection.
 */
export async function initializeEventBus(): Promise<void> {
  try {
    connection = await amqplib.connect(env.EVENT_BUS_URL);
    channel = await connection.createChannel();

    // Declare exchange
    await channel.assertExchange(env.EVENT_BUS_EXCHANGE, 'topic', {
      durable: true,
    });

    logger.info('Event bus connected', {
      exchange: env.EVENT_BUS_EXCHANGE,
    });

    // Handle connection errors
    connection.on('error', (err: Error) => {
      logger.error('Event bus connection error', { error: err.message });
    });

    connection.on('close', () => {
      logger.warn('Event bus connection closed');
      connection = null;
      channel = null;
    });
  } catch (error) {
    logger.error('Failed to connect to event bus', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Close event bus connection.
 */
export async function closeEventBus(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('Event bus connection closed');
  } catch (error) {
    logger.error('Error closing event bus', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Publish an event to the event bus.
 */
export async function publishEvent(event: PublishedEvent | AuditEvent): Promise<void> {
  if (!channel) {
    logger.warn('Event bus not connected, event not published', {
      eventType: event.type,
    });
    return;
  }

  try {
    const routingKey = event.type;
    const message = Buffer.from(JSON.stringify(event));

    channel.publish(env.EVENT_BUS_EXCHANGE, routingKey, message, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
      headers: {
        source: env.SERVICE_NAME,
        correlationId: event.metadata.correlationId,
      },
    });

    logger.debug('Event published', {
      type: event.type,
      correlationId: event.metadata.correlationId,
    });
  } catch (error) {
    logger.error('Failed to publish event', {
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Publish multiple events in order.
 */
export async function publishEvents(events: (PublishedEvent | AuditEvent)[]): Promise<void> {
  for (const event of events) {
    await publishEvent(event);
  }
}

/**
 * Get event bus health status.
 */
export function getEventBusHealth(): { connected: boolean } {
  return {
    connected: connection !== null && channel !== null,
  };
}
