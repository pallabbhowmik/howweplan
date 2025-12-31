import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryEventBus } from './in-memory-event-bus';
import { EventValidationError } from './errors';
import type { EventMetadata, EventEnvelope } from './types';

describe('InMemoryEventBus', () => {
  let eventBus: InMemoryEventBus;

  const validUserMetadata: EventMetadata = {
    actorId: 'user-123',
    actorType: 'user',
    source: 'test-service',
  };

  const validAdminMetadata: EventMetadata = {
    actorId: 'admin-001',
    actorType: 'admin',
    source: 'admin-panel',
    reason: 'Testing purposes',
  };

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
  });

  describe('publish', () => {
    it('should publish event and invoke handlers', async () => {
      const handler = vi.fn();
      eventBus.subscribe('test.event' as never, handler);

      await eventBus.publish(
        'test.event' as never,
        { data: 'test' } as never,
        validUserMetadata
      );

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'test.event',
          payload: { data: 'test' },
          metadata: validUserMetadata,
        })
      );
    });

    it('should return publish result with handler counts', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test.event' as never, handler1);
      eventBus.subscribe('test.event' as never, handler2);

      const result = await eventBus.publish(
        'test.event' as never,
        { data: 'test' } as never,
        validUserMetadata
      );

      expect(result.handlersInvoked).toBe(2);
      expect(result.handlersSucceeded).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should capture handler errors in result', async () => {
      const successHandler = vi.fn();
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));

      eventBus.subscribe('test.event' as never, successHandler, {
        priority: 10,
        continueOnError: true,
      });
      eventBus.subscribe('test.event' as never, errorHandler, {
        priority: 20,
        continueOnError: true,
      });

      const result = await eventBus.publish(
        'test.event' as never,
        { data: 'test' } as never,
        validUserMetadata
      );

      expect(result.handlersInvoked).toBe(2);
      expect(result.handlersSucceeded).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe('Handler failed');
    });

    it('should generate unique event IDs', async () => {
      const events: string[] = [];
      eventBus.subscribe('test.event' as never, (event) => {
        events.push(event.eventId);
      });

      await eventBus.publish('test.event' as never, {} as never, validUserMetadata);
      await eventBus.publish('test.event' as never, {} as never, validUserMetadata);

      expect(events[0]).not.toBe(events[1]);
    });
  });

  describe('metadata validation', () => {
    it('should reject events without metadata', async () => {
      await expect(
        eventBus.publish(
          'test.event' as never,
          {} as never,
          undefined as unknown as EventMetadata
        )
      ).rejects.toThrow(EventValidationError);
    });

    it('should reject events without actorId', async () => {
      const invalidMetadata = {
        actorType: 'user',
        source: 'test-service',
      } as EventMetadata;

      await expect(
        eventBus.publish('test.event' as never, {} as never, invalidMetadata)
      ).rejects.toThrow(EventValidationError);
    });

    it('should reject events without source', async () => {
      const invalidMetadata = {
        actorId: 'user-123',
        actorType: 'user',
      } as EventMetadata;

      await expect(
        eventBus.publish('test.event' as never, {} as never, invalidMetadata)
      ).rejects.toThrow(EventValidationError);
    });

    it('should reject admin events without reason', async () => {
      const adminWithoutReason: EventMetadata = {
        actorId: 'admin-001',
        actorType: 'admin',
        source: 'admin-panel',
        // Missing reason
      };

      await expect(
        eventBus.publish('test.event' as never, {} as never, adminWithoutReason)
      ).rejects.toThrow(EventValidationError);
    });

    it('should accept admin events with reason', async () => {
      const handler = vi.fn();
      eventBus.subscribe('test.event' as never, handler);

      await eventBus.publish(
        'test.event' as never,
        {} as never,
        validAdminMetadata
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('should return subscription with unsubscribe function', () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribe('test.event' as never, handler);

      expect(subscription.subscriptionId).toBeDefined();
      expect(subscription.eventType).toBe('test.event');
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    it('should allow custom handler IDs', () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribe('test.event' as never, handler, {
        handlerId: 'custom-handler-id',
      });

      expect(subscription.subscriptionId).toBe('custom-handler-id');
    });

    it('should execute handlers in priority order', async () => {
      const executionOrder: number[] = [];

      eventBus.subscribe(
        'test.event' as never,
        () => { executionOrder.push(3); },
        { priority: 300 }
      );
      eventBus.subscribe(
        'test.event' as never,
        () => { executionOrder.push(1); },
        { priority: 100 }
      );
      eventBus.subscribe(
        'test.event' as never,
        () => { executionOrder.push(2); },
        { priority: 200 }
      );

      await eventBus.publish('test.event' as never, {} as never, validUserMetadata);

      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('subscribeAll', () => {
    it('should receive all events', async () => {
      const events: string[] = [];
      eventBus.subscribeAll((event) => {
        events.push(event.eventType);
      });

      await eventBus.publish('event.one' as never, {} as never, validUserMetadata);
      await eventBus.publish('event.two' as never, {} as never, validUserMetadata);
      await eventBus.publish('event.three' as never, {} as never, validUserMetadata);

      expect(events).toEqual(['event.one', 'event.two', 'event.three']);
    });

    it('should combine with specific handlers', async () => {
      const allEvents: string[] = [];
      const specificEvents: string[] = [];

      eventBus.subscribeAll((event) => {
        allEvents.push(event.eventType);
      });
      eventBus.subscribe('specific.event' as never, () => {
        specificEvents.push('specific');
      });

      await eventBus.publish('specific.event' as never, {} as never, validUserMetadata);
      await eventBus.publish('other.event' as never, {} as never, validUserMetadata);

      expect(allEvents).toEqual(['specific.event', 'other.event']);
      expect(specificEvents).toEqual(['specific']);
    });
  });

  describe('unsubscribe', () => {
    it('should remove handler via subscription.unsubscribe()', async () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribe('test.event' as never, handler);

      subscription.unsubscribe();

      await eventBus.publish('test.event' as never, {} as never, validUserMetadata);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove handler via eventBus.unsubscribe()', async () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribe('test.event' as never, handler);

      const result = eventBus.unsubscribe(subscription.subscriptionId);

      expect(result).toBe(true);
      await eventBus.publish('test.event' as never, {} as never, validUserMetadata);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return false for unknown subscription', () => {
      const result = eventBus.unsubscribe('unknown-id');
      expect(result).toBe(false);
    });
  });

  describe('hasSubscribers / subscriberCount', () => {
    it('should report no subscribers for unknown event', () => {
      expect(eventBus.hasSubscribers('unknown.event')).toBe(false);
      expect(eventBus.subscriberCount('unknown.event')).toBe(0);
    });

    it('should count specific subscribers', () => {
      eventBus.subscribe('test.event' as never, vi.fn());
      eventBus.subscribe('test.event' as never, vi.fn());

      expect(eventBus.hasSubscribers('test.event')).toBe(true);
      expect(eventBus.subscriberCount('test.event')).toBe(2);
    });

    it('should include wildcard subscribers in count', () => {
      eventBus.subscribe('test.event' as never, vi.fn());
      eventBus.subscribeAll(vi.fn());

      expect(eventBus.subscriberCount('test.event')).toBe(2);
      expect(eventBus.subscriberCount('other.event')).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all subscriptions', async () => {
      eventBus.subscribe('test.event' as never, vi.fn());
      eventBus.subscribeAll(vi.fn());

      eventBus.clear();

      expect(eventBus.hasSubscribers('test.event')).toBe(false);
      expect(eventBus.subscriberCount('test.event')).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should reject operations after dispose', async () => {
      await eventBus.dispose();

      await expect(
        eventBus.publish('test.event' as never, {} as never, validUserMetadata)
      ).rejects.toThrow('EventBus has been disposed');

      expect(() => {
        eventBus.subscribe('test.event' as never, vi.fn());
      }).toThrow('EventBus has been disposed');
    });
  });

  describe('publishRaw', () => {
    it('should publish a complete event envelope', async () => {
      const handler = vi.fn();
      eventBus.subscribe('raw.event' as never, handler);

      const envelope: EventEnvelope = {
        eventId: 'custom-event-id',
        eventType: 'raw.event',
        timestamp: '2024-01-01T00:00:00.000Z',
        correlationId: 'custom-correlation-id',
        causationId: 'custom-causation-id',
        payload: { custom: 'data' },
        metadata: validUserMetadata,
      };

      await eventBus.publishRaw(envelope);

      expect(handler).toHaveBeenCalledWith(envelope);
    });
  });

  describe('async handlers', () => {
    it('should support async handlers', async () => {
      const results: number[] = [];

      eventBus.subscribe('async.event' as never, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(1);
      });

      eventBus.subscribe('async.event' as never, async () => {
        results.push(2);
      });

      await eventBus.publish('async.event' as never, {} as never, validUserMetadata);

      expect(results).toEqual([1, 2]);
    });

    it('should support fire-and-forget mode', async () => {
      const handler = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      eventBus.subscribe('fire.event' as never, handler);

      const result = await eventBus.publish(
        'fire.event' as never,
        {} as never,
        validUserMetadata,
        { awaitHandlers: false }
      );

      // Should return immediately
      expect(result.handlersInvoked).toBe(1);
      
      // Handler may not have been called yet
      // Wait for it to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(handler).toHaveBeenCalled();
    });
  });
});
