/**
 * Agent Repository
 * 
 * Mock repository for agent data.
 * In production, this would connect to the database.
 * 
 * RULE: Validate all inputs, even from internal services.
 * RULE: Never expose agent identity externally.
 */

import { z } from 'zod';
import { logger } from '../lib/logger.js';
import {
  type InternalAgentData,
  type ObfuscatedAgent,
  type AgentId,
  AgentTier,
  AgentAvailability,
  AgentSpecialization,
  createAgentId,
} from '../types/index.js';
import { matchingConfig } from '../config/index.js';

/**
 * Agent query filters
 */
export interface AgentQueryFilters {
  readonly availability?: AgentAvailability;
  readonly tier?: AgentTier;
  readonly specializations?: readonly AgentSpecialization[];
  readonly regions?: readonly string[];
  readonly minRating?: number;
  readonly hasCapacity?: boolean;
}

/**
 * Validation schema for agent data
 */
const agentDataSchema = z.object({
  agentId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  photoUrl: z.string().url().nullable(),
  tier: z.nativeEnum(AgentTier),
  rating: z.number().min(0).max(5),
  completedBookings: z.number().int().min(0),
  averageResponseTimeHours: z.number().min(0),
  availability: z.nativeEnum(AgentAvailability),
  specializations: z.array(z.nativeEnum(AgentSpecialization)),
  regions: z.array(z.string()),
  currentWorkload: z.number().int().min(0),
  maxWorkload: z.number().int().min(1),
  isActive: z.boolean(),
  createdAt: z.date(),
  lastActiveAt: z.date(),
});

/**
 * Agent Repository class
 */
export class AgentRepository {
  /**
   * Get all available agents matching filters
   */
  async getAvailableAgents(filters?: AgentQueryFilters): Promise<InternalAgentData[]> {
    // In production, this would query the database
    // For now, return mock data filtered by criteria
    let agents = await this.getAllAgents();

    if (filters) {
      agents = this.applyFilters(agents, filters);
    }

    logger.debug({
      totalAgents: agents.length,
      filters,
    }, 'Retrieved available agents');

    return agents;
  }

  /**
   * Get agent by ID
   */
  async getAgentById(agentId: AgentId): Promise<InternalAgentData | null> {
    const agents = await this.getAllAgents();
    return agents.find(a => a.agentId === agentId) ?? null;
  }

  /**
   * Get obfuscated agent info (safe for external use)
   * RULE: Never expose agent identity
   */
  async getObfuscatedAgent(agentId: AgentId): Promise<ObfuscatedAgent | null> {
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      return null;
    }

    return {
      agentId: agent.agentId,
      firstName: agent.firstName,
      photoUrl: agent.photoUrl,
      tier: agent.tier,
      rating: agent.rating,
      completedBookings: agent.completedBookings,
      responseTimeHours: agent.averageResponseTimeHours,
      specializations: agent.specializations,
      regions: agent.regions,
    };
  }

  /**
   * Update agent workload (after match acceptance)
   */
  async incrementAgentWorkload(agentId: AgentId): Promise<void> {
    // In production, this would update the database
    logger.info({ agentId }, 'Agent workload incremented');
  }

  /**
   * Update agent availability
   */
  async updateAgentAvailability(
    agentId: AgentId,
    availability: AgentAvailability
  ): Promise<void> {
    // In production, this would update the database
    logger.info({ agentId, availability }, 'Agent availability updated');
  }

  /**
   * Apply filters to agent list
   */
  private applyFilters(
    agents: InternalAgentData[],
    filters: AgentQueryFilters
  ): InternalAgentData[] {
    return agents.filter(agent => {
      if (filters.availability && agent.availability !== filters.availability) {
        return false;
      }

      if (filters.tier && agent.tier !== filters.tier) {
        return false;
      }

      if (filters.minRating && agent.rating < filters.minRating) {
        return false;
      }

      if (filters.hasCapacity && agent.currentWorkload >= agent.maxWorkload) {
        return false;
      }

      if (filters.specializations && filters.specializations.length > 0) {
        const hasSpecialization = filters.specializations.some(s =>
          agent.specializations.includes(s)
        );
        if (!hasSpecialization) {
          return false;
        }
      }

      if (filters.regions && filters.regions.length > 0) {
        const hasRegion = filters.regions.some(r =>
          agent.regions.some(ar => 
            ar.toLowerCase().includes(r.toLowerCase()) ||
            r.toLowerCase().includes(ar.toLowerCase())
          )
        );
        if (!hasRegion) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get all agents (mock data for development)
   * In production, replace with actual database queries
   */
  private async getAllAgents(): Promise<InternalAgentData[]> {
    // Mock data representing a realistic agent pool
    const mockAgents: InternalAgentData[] = [
      {
        agentId: createAgentId('a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.j@agency.com',
        phone: '+1-555-0101',
        photoUrl: 'https://example.com/photos/sarah.jpg',
        tier: AgentTier.STAR,
        rating: 4.9,
        completedBookings: 156,
        averageResponseTimeHours: 2,
        availability: AgentAvailability.AVAILABLE,
        specializations: [AgentSpecialization.HONEYMOON, AgentSpecialization.LUXURY],
        regions: ['Europe', 'Caribbean'],
        currentWorkload: 3,
        maxWorkload: 10,
        isActive: true,
        createdAt: new Date('2022-01-15'),
        lastActiveAt: new Date(),
      },
      {
        agentId: createAgentId('b2c3d4e5-f6a7-8901-bcde-f23456789012'),
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.c@agency.com',
        phone: '+1-555-0102',
        photoUrl: 'https://example.com/photos/michael.jpg',
        tier: AgentTier.STAR,
        rating: 4.7,
        completedBookings: 89,
        averageResponseTimeHours: 4,
        availability: AgentAvailability.AVAILABLE,
        specializations: [AgentSpecialization.ADVENTURE, AgentSpecialization.SAFARI],
        regions: ['Africa', 'Asia', 'South America'],
        currentWorkload: 5,
        maxWorkload: 8,
        isActive: true,
        createdAt: new Date('2022-06-20'),
        lastActiveAt: new Date(),
      },
      {
        agentId: createAgentId('c3d4e5f6-a7b8-9012-cdef-345678901234'),
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.r@agency.com',
        phone: '+1-555-0103',
        photoUrl: 'https://example.com/photos/emily.jpg',
        tier: AgentTier.STAR,
        rating: 4.8,
        completedBookings: 203,
        averageResponseTimeHours: 1,
        availability: AgentAvailability.AVAILABLE,
        specializations: [AgentSpecialization.FAMILY, AgentSpecialization.CRUISE],
        regions: ['North America', 'Caribbean', 'Europe'],
        currentWorkload: 7,
        maxWorkload: 12,
        isActive: true,
        createdAt: new Date('2021-03-10'),
        lastActiveAt: new Date(),
      },
      {
        agentId: createAgentId('d4e5f6a7-b8c9-0123-defa-456789012345'),
        firstName: 'James',
        lastName: 'Wilson',
        email: 'james.w@agency.com',
        phone: '+1-555-0104',
        photoUrl: null,
        tier: AgentTier.BENCH,
        rating: 4.3,
        completedBookings: 24,
        averageResponseTimeHours: 6,
        availability: AgentAvailability.AVAILABLE,
        specializations: [AgentSpecialization.BUDGET, AgentSpecialization.SOLO],
        regions: ['Southeast Asia', 'Central America'],
        currentWorkload: 2,
        maxWorkload: 6,
        isActive: true,
        createdAt: new Date('2023-09-01'),
        lastActiveAt: new Date(),
      },
      {
        agentId: createAgentId('e5f6a7b8-c9d0-1234-efab-567890123456'),
        firstName: 'Lisa',
        lastName: 'Thompson',
        email: 'lisa.t@agency.com',
        phone: '+1-555-0105',
        photoUrl: 'https://example.com/photos/lisa.jpg',
        tier: AgentTier.BENCH,
        rating: 4.5,
        completedBookings: 45,
        averageResponseTimeHours: 8,
        availability: AgentAvailability.AVAILABLE,
        specializations: [AgentSpecialization.BUSINESS, AgentSpecialization.LUXURY],
        regions: ['Europe', 'Middle East'],
        currentWorkload: 4,
        maxWorkload: 8,
        isActive: true,
        createdAt: new Date('2023-02-15'),
        lastActiveAt: new Date(),
      },
      {
        agentId: createAgentId('f6a7b8c9-d0e1-2345-fabc-678901234567'),
        firstName: 'David',
        lastName: 'Kim',
        email: 'david.k@agency.com',
        phone: '+1-555-0106',
        photoUrl: 'https://example.com/photos/david.jpg',
        tier: AgentTier.BENCH,
        rating: 4.1,
        completedBookings: 12,
        averageResponseTimeHours: 12,
        availability: AgentAvailability.AVAILABLE,
        specializations: [AgentSpecialization.GROUP, AgentSpecialization.ADVENTURE],
        regions: ['Asia', 'Oceania'],
        currentWorkload: 1,
        maxWorkload: 5,
        isActive: true,
        createdAt: new Date('2024-01-10'),
        lastActiveAt: new Date(),
      },
      {
        agentId: createAgentId('a7b8c9d0-e1f2-3456-abcd-789012345678'),
        firstName: 'Amanda',
        lastName: 'Martinez',
        email: 'amanda.m@agency.com',
        phone: '+1-555-0107',
        photoUrl: 'https://example.com/photos/amanda.jpg',
        tier: AgentTier.STAR,
        rating: 4.6,
        completedBookings: 78,
        averageResponseTimeHours: 3,
        availability: AgentAvailability.BUSY,
        specializations: [AgentSpecialization.HONEYMOON, AgentSpecialization.FAMILY],
        regions: ['Mexico', 'Caribbean', 'South America'],
        currentWorkload: 10,
        maxWorkload: 10,
        isActive: true,
        createdAt: new Date('2022-08-22'),
        lastActiveAt: new Date(),
      },
      {
        agentId: createAgentId('b8c9d0e1-f2a3-4567-bcde-890123456789'),
        firstName: 'Robert',
        lastName: 'Brown',
        email: 'robert.b@agency.com',
        phone: '+1-555-0108',
        photoUrl: null,
        tier: AgentTier.BENCH,
        rating: 3.9,
        completedBookings: 8,
        averageResponseTimeHours: 24,
        availability: AgentAvailability.AVAILABLE,
        specializations: [AgentSpecialization.BUDGET],
        regions: ['North America'],
        currentWorkload: 0,
        maxWorkload: 4,
        isActive: true,
        createdAt: new Date('2024-06-01'),
        lastActiveAt: new Date(),
      },
    ];

    return mockAgents;
  }

  /**
   * Validate agent data
   */
  validateAgentData(data: unknown): InternalAgentData {
    const result = agentDataSchema.parse(data);
    return {
      ...result,
      agentId: createAgentId(result.agentId),
    } as InternalAgentData;
  }
}

/**
 * Singleton repository instance
 */
let repositoryInstance: AgentRepository | null = null;

/**
 * Get or create repository instance
 */
export function getAgentRepository(): AgentRepository {
  if (!repositoryInstance) {
    repositoryInstance = new AgentRepository();
  }
  return repositoryInstance;
}
