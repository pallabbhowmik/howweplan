/**
 * Request Service
 * 
 * Core business logic for travel requests.
 * Orchestrates domain operations, events, and audit logging.
 */

import { randomUUID } from 'crypto';
import { config } from '../env';
import {
  TravelRequest,
  createTravelRequest,
  applyStateTransition,
  isTerminalState,
} from '../domain/request.entity';
import { RequestRepository } from '../domain/request.repository';
import {
  RequestState,
  validateTransition,
  getValidTransitions,
  TransitionTrigger,
} from '../domain/request.state-machine';
import {
  InvalidStateTransitionError,
  UnauthorizedRequestAccessError,
  RequestAlreadyCancelledError,
} from '../domain/request.errors';
import { ValidatedCreateRequest } from '../dto/create-request.dto';
import { EventEmitter, EventContext, EventTypes } from '../events/event-emitter';
import { toRequestSnapshot } from '../events/request.events';
import { CapEnforcementService } from './cap-enforcement.service';
import { AuditService } from './audit.service';
import { Logger } from './logger.service';
import { MatchingServiceClient, createMatchingServiceClient } from './matching.service';

export interface RequestService {
  createRequest(userId: string, input: ValidatedCreateRequest, context: EventContext): Promise<TravelRequest>;
  submitRequest(userId: string, requestId: string, context: EventContext): Promise<TravelRequest>;
  cancelRequest(userId: string, requestId: string, reason: string, context: EventContext): Promise<TravelRequest>;
  getRequest(userId: string, requestId: string): Promise<TravelRequest>;
  listUserRequests(userId: string, options?: ListOptions): Promise<{ requests: TravelRequest[]; total: number }>;
  
  // Admin operations
  adminCancelRequest(adminId: string, requestId: string, reason: string, context: EventContext): Promise<TravelRequest>;
  adminExpireRequest(adminId: string, requestId: string, reason: string, context: EventContext): Promise<TravelRequest>;
  adminTransition(adminId: string, requestId: string, toState: RequestState, reason: string, context: EventContext): Promise<TravelRequest>;
  adminGetRequest(adminId: string, requestId: string): Promise<TravelRequest>;
  
  // System operations (for background jobs)
  processExpiredRequests(): Promise<number>;
}

export interface ListOptions {
  states?: RequestState[];
  limit?: number;
  offset?: number;
}

export function createRequestService(
  repository: RequestRepository,
  capEnforcement: CapEnforcementService,
  eventEmitter: EventEmitter,
  auditService: AuditService,
  logger: Logger,
  matchingService?: MatchingServiceClient
): RequestService {
  const emitStateChangeEvent = async (
    request: TravelRequest,
    fromState: RequestState,
    trigger: TransitionTrigger,
    triggeredBy: string,
    reason: string,
    context: EventContext
  ): Promise<void> => {
    await eventEmitter.emit(
      {
        eventType: EventTypes.REQUEST_STATE_CHANGED,
        aggregateType: 'TravelRequest',
        aggregateId: request.id,
        payload: {
          requestId: request.id,
          userId: request.userId,
          fromState,
          toState: request.state,
          trigger,
          triggeredBy,
          reason,
        },
      },
      context
    );
  };

  return {
    async createRequest(
      userId: string,
      input: ValidatedCreateRequest,
      context: EventContext
    ): Promise<TravelRequest> {
      // Enforce caps before creating
      await capEnforcement.checkCanCreateRequest(userId);

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + config.limits.requestExpiryHours);

      // Create the request entity
      const request = createTravelRequest({
        id: randomUUID(),
        userId,
        destination: input.destination,
        departureLocation: input.departureLocation,
        departureDate: input.departureDate,
        returnDate: input.returnDate,
        travelers: input.travelers,
        travelStyle: input.travelStyle,
        budgetRange: input.budgetRange,
        notes: input.notes,
        expiresAt,
      });

      // Persist
      const saved = await repository.create(request);

      // Emit event
      await eventEmitter.emit(
        {
          eventType: EventTypes.REQUEST_CREATED,
          aggregateType: 'TravelRequest',
          aggregateId: saved.id,
          payload: {
            request: toRequestSnapshot(saved),
          },
        },
        context
      );

      // Audit log
      await auditService.log({
        action: 'CREATE',
        entityId: saved.id,
        actor: { type: 'user', id: userId },
        context: {
          correlationId: context.correlationId,
          metadata: {
            destination: input.destination,
            departureDate: input.departureDate.toISOString(),
          },
        },
      });

      logger.info('Request created', { requestId: saved.id, userId });
      return saved;
    },

    async submitRequest(
      userId: string,
      requestId: string,
      context: EventContext
    ): Promise<TravelRequest> {
      const request = await repository.findByIdOrThrow(requestId);

      // Verify ownership
      if (request.userId !== userId) {
        throw new UnauthorizedRequestAccessError(userId, requestId);
      }

      // Validate transition
      const fromState = request.state;
      const transitionResult = validateTransition({
        requestId,
        fromState,
        toState: 'submitted',
        trigger: 'user_action',
        triggeredBy: userId,
        reason: 'User submitted request for matching',
      });

      if (!transitionResult.success) {
        throw new InvalidStateTransitionError(
          requestId,
          fromState,
          'submitted',
          getValidTransitions(fromState)
        );
      }

      // Apply transition
      const updated = applyStateTransition(request, 'submitted');
      const saved = await repository.update(updated);

      // Emit events
      await emitStateChangeEvent(
        saved,
        fromState,
        'user_action',
        userId,
        'User submitted request',
        context
      );

      await eventEmitter.emit(
        {
          eventType: EventTypes.REQUEST_SUBMITTED,
          aggregateType: 'TravelRequest',
          aggregateId: saved.id,
          payload: {
            request: toRequestSnapshot(saved),
          },
        },
        context
      );

      // Audit log
      await auditService.log({
        action: 'STATE_CHANGE',
        entityId: saved.id,
        actor: { type: 'user', id: userId },
        changes: [{ field: 'state', oldValue: fromState, newValue: 'submitted' }],
        context: {
          correlationId: context.correlationId,
          reason: 'User submitted request',
        },
      });

      // Trigger matching service (non-blocking, errors are logged but don't fail submission)
      if (matchingService) {
        matchingService.triggerMatching({
          requestId: saved.id,
          request: {
            requestId: saved.id,
            userId: saved.userId,
            title: saved.title || '',
            description: saved.description,
            destination: saved.destination,
            departureDate: saved.departureDate.toISOString(),
            returnDate: saved.returnDate.toISOString(),
            budgetMin: saved.budgetMin,
            budgetMax: saved.budgetMax,
            budgetCurrency: saved.budgetCurrency,
            travelers: saved.travelers,
            travelStyle: saved.travelStyle,
            preferences: saved.preferences,
          },
          correlationId: context.correlationId,
        }).catch((err) => {
          // Log but don't fail - matching can be triggered later
          logger.warn('Failed to trigger matching', { requestId: saved.id, error: err });
        });
      }

      logger.info('Request submitted', { requestId: saved.id, userId });
      return saved;
    },

    async cancelRequest(
      userId: string,
      requestId: string,
      reason: string,
      context: EventContext
    ): Promise<TravelRequest> {
      const request = await repository.findByIdOrThrow(requestId);

      // Verify ownership
      if (request.userId !== userId) {
        throw new UnauthorizedRequestAccessError(userId, requestId);
      }

      if (request.state === 'cancelled') {
        throw new RequestAlreadyCancelledError(requestId);
      }

      // Validate transition
      const fromState = request.state;
      const transitionResult = validateTransition({
        requestId,
        fromState,
        toState: 'cancelled',
        trigger: 'user_action',
        triggeredBy: userId,
        reason,
      });

      if (!transitionResult.success) {
        throw new InvalidStateTransitionError(
          requestId,
          fromState,
          'cancelled',
          getValidTransitions(fromState)
        );
      }

      // Apply transition with cancellation details
      const updated = applyStateTransition(request, 'cancelled', {
        reason,
        by: 'user',
      });
      const saved = await repository.update(updated);

      // Emit events
      await emitStateChangeEvent(
        saved,
        fromState,
        'user_action',
        userId,
        reason,
        context
      );

      await eventEmitter.emit(
        {
          eventType: EventTypes.REQUEST_CANCELLED,
          aggregateType: 'TravelRequest',
          aggregateId: saved.id,
          payload: {
            requestId: saved.id,
            userId: saved.userId,
            cancelledBy: 'user',
            reason,
            previousState: fromState,
          },
        },
        context
      );

      // Audit log
      await auditService.log({
        action: 'STATE_CHANGE',
        entityId: saved.id,
        actor: { type: 'user', id: userId },
        changes: [{ field: 'state', oldValue: fromState, newValue: 'cancelled' }],
        context: {
          correlationId: context.correlationId,
          reason,
        },
      });

      logger.info('Request cancelled by user', { requestId: saved.id, userId, reason });
      return saved;
    },

    async getRequest(userId: string, requestId: string): Promise<TravelRequest> {
      const request = await repository.findByIdOrThrow(requestId);

      if (request.userId !== userId) {
        throw new UnauthorizedRequestAccessError(userId, requestId);
      }

      return request;
    },

    async listUserRequests(
      userId: string,
      options: ListOptions = {}
    ): Promise<{ requests: TravelRequest[]; total: number }> {
      const requests = await repository.findByUserId(userId, {
        states: options.states,
        limit: options.limit ?? 20,
        offset: options.offset ?? 0,
        orderBy: 'created_at',
        orderDir: 'desc',
      });

      // For pagination, we'd need a separate count query
      // For now, return the fetched count
      return {
        requests,
        total: requests.length,
      };
    },

    // Admin operations
    async adminCancelRequest(
      adminId: string,
      requestId: string,
      reason: string,
      context: EventContext
    ): Promise<TravelRequest> {
      const request = await repository.findByIdOrThrow(requestId);

      if (request.state === 'cancelled') {
        throw new RequestAlreadyCancelledError(requestId);
      }

      const fromState = request.state;

      // Admin can cancel from any non-terminal state
      if (isTerminalState(request)) {
        throw new InvalidStateTransitionError(
          requestId,
          fromState,
          'cancelled',
          []
        );
      }

      const updated = applyStateTransition(request, 'cancelled', {
        reason,
        by: 'admin',
      });
      const saved = await repository.update(updated);

      await emitStateChangeEvent(
        saved,
        fromState,
        'admin_action',
        adminId,
        reason,
        context
      );

      await eventEmitter.emit(
        {
          eventType: EventTypes.REQUEST_CANCELLED,
          aggregateType: 'TravelRequest',
          aggregateId: saved.id,
          payload: {
            requestId: saved.id,
            userId: saved.userId,
            cancelledBy: 'admin',
            reason,
            previousState: fromState,
          },
        },
        context
      );

      await auditService.log({
        action: 'ADMIN_ACTION',
        entityId: saved.id,
        actor: { type: 'admin', id: adminId },
        changes: [{ field: 'state', oldValue: fromState, newValue: 'cancelled' }],
        context: {
          correlationId: context.correlationId,
          reason,
          metadata: { actionType: 'cancel' },
        },
      });

      logger.info('Request cancelled by admin', { requestId: saved.id, adminId, reason });
      return saved;
    },

    async adminExpireRequest(
      adminId: string,
      requestId: string,
      reason: string,
      context: EventContext
    ): Promise<TravelRequest> {
      const request = await repository.findByIdOrThrow(requestId);
      const fromState = request.state;

      const transitionResult = validateTransition({
        requestId,
        fromState,
        toState: 'expired',
        trigger: 'admin_action',
        triggeredBy: adminId,
        reason,
      });

      if (!transitionResult.success) {
        throw new InvalidStateTransitionError(
          requestId,
          fromState,
          'expired',
          getValidTransitions(fromState)
        );
      }

      const updated = applyStateTransition(request, 'expired');
      const saved = await repository.update(updated);

      await emitStateChangeEvent(
        saved,
        fromState,
        'admin_action',
        adminId,
        reason,
        context
      );

      await eventEmitter.emit(
        {
          eventType: EventTypes.REQUEST_EXPIRED,
          aggregateType: 'TravelRequest',
          aggregateId: saved.id,
          payload: {
            requestId: saved.id,
            userId: saved.userId,
            expiredAt: new Date().toISOString(),
            previousState: fromState,
          },
        },
        context
      );

      await auditService.log({
        action: 'ADMIN_ACTION',
        entityId: saved.id,
        actor: { type: 'admin', id: adminId },
        changes: [{ field: 'state', oldValue: fromState, newValue: 'expired' }],
        context: {
          correlationId: context.correlationId,
          reason,
          metadata: { actionType: 'expire' },
        },
      });

      logger.info('Request expired by admin', { requestId: saved.id, adminId, reason });
      return saved;
    },

    async adminTransition(
      adminId: string,
      requestId: string,
      toState: RequestState,
      reason: string,
      context: EventContext
    ): Promise<TravelRequest> {
      const request = await repository.findByIdOrThrow(requestId);
      const fromState = request.state;

      const transitionResult = validateTransition({
        requestId,
        fromState,
        toState,
        trigger: 'admin_action',
        triggeredBy: adminId,
        reason,
      });

      if (!transitionResult.success) {
        throw new InvalidStateTransitionError(
          requestId,
          fromState,
          toState,
          getValidTransitions(fromState)
        );
      }

      const updated = applyStateTransition(request, toState);
      const saved = await repository.update(updated);

      await emitStateChangeEvent(
        saved,
        fromState,
        'admin_action',
        adminId,
        reason,
        context
      );

      await auditService.log({
        action: 'ADMIN_ACTION',
        entityId: saved.id,
        actor: { type: 'admin', id: adminId },
        changes: [{ field: 'state', oldValue: fromState, newValue: toState }],
        context: {
          correlationId: context.correlationId,
          reason,
          metadata: { actionType: 'transition' },
        },
      });

      logger.info('Request transitioned by admin', {
        requestId: saved.id,
        adminId,
        fromState,
        toState,
        reason,
      });
      return saved;
    },

    async adminGetRequest(_adminId: string, requestId: string): Promise<TravelRequest> {
      // Admins can view any request (adminId used for audit context if needed)
      return repository.findByIdOrThrow(requestId);
    },

    async processExpiredRequests(): Promise<number> {
      const expiredRequests = await repository.findExpiredRequests(100);
      let processedCount = 0;

      for (const request of expiredRequests) {
        try {
          const updated = applyStateTransition(request, 'expired');
          await repository.update(updated);

          const context: EventContext = {
            correlationId: randomUUID(),
          };

          await eventEmitter.emit(
            {
              eventType: EventTypes.REQUEST_EXPIRED,
              aggregateType: 'TravelRequest',
              aggregateId: request.id,
              payload: {
                requestId: request.id,
                userId: request.userId,
                expiredAt: new Date().toISOString(),
                previousState: request.state,
              },
            },
            context
          );

          await auditService.log({
            action: 'SYSTEM_ACTION',
            entityId: request.id,
            actor: { type: 'system', id: 'expiry-processor' },
            changes: [{ field: 'state', oldValue: request.state, newValue: 'expired' }],
            context: {
              correlationId: context.correlationId,
              reason: 'Request expired due to no agent match within time limit',
            },
          });

          processedCount++;
        } catch (error) {
          logger.error('Failed to process expired request', {
            requestId: request.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      if (processedCount > 0) {
        logger.info('Processed expired requests', { count: processedCount });
      }

      return processedCount;
    },
  };
}
