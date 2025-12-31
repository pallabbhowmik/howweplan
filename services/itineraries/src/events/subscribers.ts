import amqplib, { type ConsumeMessage } from 'amqplib';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import type { DisclosureService } from '../services/disclosure.service.js';
import type { 
  BookingPaidEvent, 
  BookingCancelledEvent,
  EventTypes,
} from './types.js';

/**
 * Event handler function type.
 */
type EventHandler<T> = (event: T) => Promise<void>;

/**
 * Event subscriber configuration.
 */
interface SubscriberConfig {
  disclosureService: DisclosureService;
}

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

/**
 * Subscription state.
 */
let connection: AmqpConnection | null = null;
let channel: AmqpChannel | null = null;

/**
 * Initialize event subscribers.
 */
export async function initializeSubscribers(config: SubscriberConfig): Promise<void> {
  try {
    connection = await amqplib.connect(env.EVENT_BUS_URL);
    channel = await connection.createChannel();

    // Set prefetch for fair dispatch
    await channel.prefetch(1);

    // Declare exchange
    await channel.assertExchange(env.EVENT_BUS_EXCHANGE, 'topic', {
      durable: true,
    });

    // Subscribe to booking events
    await subscribeToBookingEvents(channel, config);

    logger.info('Event subscribers initialized');

    // Handle connection errors
    connection.on('error', (err: Error) => {
      logger.error('Subscriber connection error', { error: err.message });
    });

    connection.on('close', () => {
      logger.warn('Subscriber connection closed');
      connection = null;
      channel = null;
    });
  } catch (error) {
    logger.error('Failed to initialize subscribers', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Close subscriber connection.
 */
export async function closeSubscribers(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('Subscriber connection closed');
  } catch (error) {
    logger.error('Error closing subscribers', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Subscribe to booking events.
 */
async function subscribeToBookingEvents(
  channel: AmqpChannel,
  config: SubscriberConfig
): Promise<void> {
  const queueName = `${env.EVENT_BUS_QUEUE_PREFIX}.booking`;

  // Declare queue
  await channel.assertQueue(queueName, {
    durable: true,
    deadLetterExchange: `${env.EVENT_BUS_EXCHANGE}.dlx`,
  });

  // Bind to booking events
  await channel.bindQueue(queueName, env.EVENT_BUS_EXCHANGE, 'booking.paid');
  await channel.bindQueue(queueName, env.EVENT_BUS_EXCHANGE, 'booking.cancelled');

  // Consume messages
  await channel.consume(queueName, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      
      await handleBookingEvent(event, config);
      
      channel.ack(msg);
      
      logger.debug('Booking event processed', {
        type: event.type,
        correlationId: event.metadata?.correlationId,
      });
    } catch (error) {
      logger.error('Error processing booking event', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Reject and requeue on error
      channel.nack(msg, false, true);
    }
  });

  logger.info('Subscribed to booking events', { queue: queueName });
}

/**
 * Handle booking events.
 */
async function handleBookingEvent(
  event: BookingPaidEvent | BookingCancelledEvent,
  config: SubscriberConfig
): Promise<void> {
  const { disclosureService } = config;

  switch (event.type) {
    case 'booking.paid':
      await handleBookingPaid(event as BookingPaidEvent, disclosureService);
      break;
      
    case 'booking.cancelled':
      await handleBookingCancelled(event as BookingCancelledEvent, disclosureService);
      break;
      
    default:
      logger.warn('Unknown booking event type', { type: event.type });
  }
}

/**
 * Handle booking.paid event.
 * Reveals itinerary details after payment.
 */
async function handleBookingPaid(
  event: BookingPaidEvent,
  disclosureService: DisclosureService
): Promise<void> {
  const { bookingId, itineraryId } = event.payload;
  const correlationId = event.metadata.correlationId;

  logger.info('Processing booking.paid event', {
    bookingId,
    itineraryId,
    correlationId,
  });

  await disclosureService.handleBookingPaid(
    bookingId,
    itineraryId,
    correlationId
  );

  logger.info('Itinerary revealed after payment', {
    bookingId,
    itineraryId,
  });
}

/**
 * Handle booking.cancelled event.
 * Reverts itinerary to obfuscated state.
 */
async function handleBookingCancelled(
  event: BookingCancelledEvent,
  disclosureService: DisclosureService
): Promise<void> {
  const { bookingId, itineraryId } = event.payload;
  const correlationId = event.metadata.correlationId;

  logger.info('Processing booking.cancelled event', {
    bookingId,
    itineraryId,
    correlationId,
  });

  await disclosureService.handleBookingCancelled(
    bookingId,
    itineraryId,
    correlationId
  );

  logger.info('Itinerary obfuscated after cancellation', {
    bookingId,
    itineraryId,
  });
}
