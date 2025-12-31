/**
 * Seed Data for Development
 * 
 * Initializes the in-memory dispute store with sample data
 * for development and testing purposes.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Dispute, DisputeCategory, DisputeState } from '../types/domain.js';
import { logger } from '../audit/logger.js';

// Import the dispute store from the service
// We need to use a different approach - expose a seed function

/**
 * Generate sample disputes for development.
 * Using correct DisputeCategory values from domain.ts:
 * - service_not_provided
 * - service_significantly_different
 * - safety_concern
 * - unauthorized_charges
 * - cancellation_policy
 * - agent_misconduct
 * - other
 */
export function generateSeedDisputes(): Dispute[] {
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;

  // User and Agent IDs from seed data
  const userId = 'a0000000-0000-0000-0000-000000000004'; // Amit Patel
  const starAgentId = 'b0000000-0000-0000-0000-000000000001'; // Priya Sharma
  const benchAgentId = 'b0000000-0000-0000-0000-000000000002'; // Rahul Verma
  const adminId = 'a0000000-0000-0000-0000-000000000001'; // Admin User

  const disputes: Dispute[] = [
    // Dispute 1: Open dispute - service significantly different
    {
      id: 'disp-0001-0000-0000-000000000001',
      bookingId: 'ba000000-0000-0000-0000-000000000001',
      travelerId: userId,
      agentId: starAgentId,
      category: 'service_significantly_different' as DisputeCategory,
      state: 'pending_evidence' as DisputeState,
      title: 'Hotel accommodation was not as described',
      description: 'The palace hotel in Udaipur that was promised was actually a much smaller property. The room did not have the lake view that was shown in the itinerary photos. We had to switch rooms twice during our stay.',
      isSubjectiveComplaint: false,
      bookingAmount: 24975000, // INR paisa
      currency: 'INR',
      createdAt: new Date(now.getTime() - 2 * oneDay),
      updatedAt: new Date(now.getTime() - 1 * oneDay),
      agentResponseDeadline: new Date(now.getTime() + 1 * oneDay),
      adminAssignedId: null,
      adminAssignedAt: null,
      resolution: null,
      metadata: {
        bookingStartDate: new Date(now.getTime() - 30 * oneDay),
        bookingEndDate: new Date(now.getTime() - 16 * oneDay),
        destination: 'Rajasthan, India',
        originalItineraryId: 'e0000000-0000-0000-0000-000000000001',
        chatThreadId: 'c0000001-0000-0000-0000-000000000001',
        disputeOpenedWithinWindow: true,
      },
    },
    
    // Dispute 2: Under review - unauthorized charges
    {
      id: 'disp-0002-0000-0000-000000000002',
      bookingId: 'ba000000-0000-0000-0000-000000000002',
      travelerId: 'a0000000-0000-0000-0000-000000000005', // Arjun Kumar
      agentId: starAgentId,
      category: 'unauthorized_charges' as DisputeCategory,
      state: 'under_admin_review' as DisputeState,
      title: 'Extra charges added without notice',
      description: 'I was charged an additional ₹35,000 for "seasonal supplements" that were never mentioned in the original quote. The agent added these charges after I had already confirmed the booking.',
      isSubjectiveComplaint: false,
      bookingAmount: 18500000,
      currency: 'INR',
      createdAt: new Date(now.getTime() - 5 * oneDay),
      updatedAt: new Date(now.getTime() - 4 * oneHour),
      agentResponseDeadline: new Date(now.getTime() - 3 * oneDay),
      adminAssignedId: adminId,
      adminAssignedAt: new Date(now.getTime() - 4 * oneHour),
      resolution: null,
      metadata: {
        bookingStartDate: new Date(now.getTime() - 45 * oneDay),
        bookingEndDate: new Date(now.getTime() - 35 * oneDay),
        destination: 'Kerala, India',
        originalItineraryId: 'e0000000-0000-0000-0000-000000000002',
        chatThreadId: 'c0000002-0000-0000-0000-000000000001',
        disputeOpenedWithinWindow: true,
      },
    },
    
    // Dispute 3: Agent responded - agent misconduct
    {
      id: 'disp-0003-0000-0000-000000000003',
      bookingId: 'ba000000-0000-0000-0000-000000000003',
      travelerId: 'a0000000-0000-0000-0000-000000000006', // Sneha Gupta
      agentId: benchAgentId,
      category: 'agent_misconduct' as DisputeCategory,
      state: 'agent_responded' as DisputeState,
      title: 'Agent was unresponsive during trip emergency',
      description: 'Our flight was cancelled due to weather and I tried to reach the agent for help rebooking. I called and messaged multiple times but got no response for 8 hours. We had to arrange everything ourselves at significant extra cost.',
      isSubjectiveComplaint: false,
      bookingAmount: 8500000,
      currency: 'INR',
      createdAt: new Date(now.getTime() - 3 * oneDay),
      updatedAt: new Date(now.getTime() - 12 * oneHour),
      agentResponseDeadline: new Date(now.getTime() - 1 * oneDay),
      adminAssignedId: null,
      adminAssignedAt: null,
      resolution: null,
      metadata: {
        bookingStartDate: new Date(now.getTime() - 20 * oneDay),
        bookingEndDate: new Date(now.getTime() - 10 * oneDay),
        destination: 'Ladakh, India',
        originalItineraryId: 'e0000000-0000-0000-0000-000000000003',
        chatThreadId: 'c0000003-0000-0000-0000-000000000001',
        disputeOpenedWithinWindow: true,
      },
    },
    
    // Dispute 4: Escalated - safety concern
    {
      id: 'disp-0004-0000-0000-000000000004',
      bookingId: 'ba000000-0000-0000-0000-000000000004',
      travelerId: 'a0000000-0000-0000-0000-000000000007', // Vikram Singh
      agentId: benchAgentId,
      category: 'safety_concern' as DisputeCategory,
      state: 'escalated' as DisputeState,
      title: 'Unsafe vehicle provided for mountain travel',
      description: 'The vehicle arranged for our Himalayan trek was in terrible condition. The brakes were making grinding noises and the driver seemed inexperienced with mountain roads. We felt unsafe the entire journey and had to cut our trip short.',
      isSubjectiveComplaint: false,
      bookingAmount: 12000000,
      currency: 'INR',
      createdAt: new Date(now.getTime() - 4 * oneDay),
      updatedAt: new Date(now.getTime() - 2 * oneHour),
      agentResponseDeadline: new Date(now.getTime() - 2 * oneDay),
      adminAssignedId: adminId,
      adminAssignedAt: new Date(now.getTime() - 6 * oneHour),
      resolution: null,
      metadata: {
        bookingStartDate: new Date(now.getTime() - 15 * oneDay),
        bookingEndDate: new Date(now.getTime() - 8 * oneDay),
        destination: 'Himachal Pradesh, India',
        originalItineraryId: 'e0000000-0000-0000-0000-000000000004',
        chatThreadId: 'c0000004-0000-0000-0000-000000000001',
        disputeOpenedWithinWindow: true,
      },
    },
    
    // Dispute 5: Resolved - full refund
    {
      id: 'disp-0005-0000-0000-000000000005',
      bookingId: 'ba000000-0000-0000-0000-000000000005',
      travelerId: 'a0000000-0000-0000-0000-000000000010', // Meera Joshi
      agentId: starAgentId,
      category: 'service_not_provided' as DisputeCategory,
      state: 'resolved_refund' as DisputeState,
      title: 'Safari trip was cancelled without notice',
      description: 'The wildlife safari that was the highlight of our trip was cancelled. The agent claimed the park was closed but we found out later it was open. We never received the alternative activity that was promised.',
      isSubjectiveComplaint: false,
      bookingAmount: 9500000,
      currency: 'INR',
      createdAt: new Date(now.getTime() - 10 * oneDay),
      updatedAt: new Date(now.getTime() - 7 * oneDay),
      agentResponseDeadline: new Date(now.getTime() - 8 * oneDay),
      adminAssignedId: adminId,
      adminAssignedAt: new Date(now.getTime() - 9 * oneDay),
      resolution: {
        type: 'full_refund',
        refundAmount: 9500000,
        currency: 'INR',
        adminId: adminId,
        reason: 'Service was not delivered as promised. Safari was available but not booked by the agent.',
        internalNotes: 'Agent failed to make the booking despite receiving payment. Full refund warranted.',
        resolvedAt: new Date(now.getTime() - 7 * oneDay),
      },
      metadata: {
        bookingStartDate: new Date(now.getTime() - 25 * oneDay),
        bookingEndDate: new Date(now.getTime() - 18 * oneDay),
        destination: 'Madhya Pradesh, India',
        originalItineraryId: 'e0000000-0000-0000-0000-000000000005',
        chatThreadId: 'c0000005-0000-0000-0000-000000000001',
        disputeOpenedWithinWindow: true,
      },
    },
    
    // Dispute 6: Resolved - partial refund
    {
      id: 'disp-0006-0000-0000-000000000006',
      bookingId: 'ba000000-0000-0000-0000-000000000006',
      travelerId: userId,
      agentId: benchAgentId,
      category: 'service_significantly_different' as DisputeCategory,
      state: 'resolved_partial' as DisputeState,
      title: 'Tour guide spoke limited English',
      description: 'The tour guide for our heritage walk could barely communicate in English. We missed out on a lot of historical context and had difficulty understanding directions. The experience was significantly diminished.',
      isSubjectiveComplaint: false,
      bookingAmount: 5500000,
      currency: 'INR',
      createdAt: new Date(now.getTime() - 14 * oneDay),
      updatedAt: new Date(now.getTime() - 12 * oneDay),
      agentResponseDeadline: new Date(now.getTime() - 12 * oneDay),
      adminAssignedId: adminId,
      adminAssignedAt: new Date(now.getTime() - 13 * oneDay),
      resolution: {
        type: 'partial_refund',
        refundAmount: 1650000, // 30% refund
        currency: 'INR',
        adminId: adminId,
        reason: 'Guide language proficiency was below expected standard. Partial refund for the guided tour portion.',
        internalNotes: 'Verified through chat logs that English-speaking guide was requested. Refund 30% of total.',
        resolvedAt: new Date(now.getTime() - 12 * oneDay),
      },
      metadata: {
        bookingStartDate: new Date(now.getTime() - 28 * oneDay),
        bookingEndDate: new Date(now.getTime() - 22 * oneDay),
        destination: 'Delhi, India',
        originalItineraryId: 'e0000000-0000-0000-0000-000000000006',
        chatThreadId: 'c0000006-0000-0000-0000-000000000001',
        disputeOpenedWithinWindow: true,
      },
    },
    
    // Dispute 7: Pending - subjective complaint (no refund eligible)
    {
      id: 'disp-0007-0000-0000-000000000007',
      bookingId: 'ba000000-0000-0000-0000-000000000007',
      travelerId: 'a0000000-0000-0000-0000-000000000005',
      agentId: starAgentId,
      category: 'other' as DisputeCategory,
      state: 'pending_evidence' as DisputeState,
      title: 'Destination was too crowded',
      description: 'We didn\'t like how crowded Jaipur was during our visit. We expected a more peaceful experience. The markets were overwhelming and not my taste at all.',
      isSubjectiveComplaint: true,
      bookingAmount: 15000000,
      currency: 'INR',
      createdAt: new Date(now.getTime() - 1 * oneDay),
      updatedAt: new Date(now.getTime() - 1 * oneDay),
      agentResponseDeadline: new Date(now.getTime() + 2 * oneDay),
      adminAssignedId: null,
      adminAssignedAt: null,
      resolution: null,
      metadata: {
        bookingStartDate: new Date(now.getTime() - 12 * oneDay),
        bookingEndDate: new Date(now.getTime() - 5 * oneDay),
        destination: 'Jaipur, India',
        originalItineraryId: 'e0000000-0000-0000-0000-000000000007',
        chatThreadId: 'c0000007-0000-0000-0000-000000000001',
        disputeOpenedWithinWindow: true,
      },
    },
    
    // Dispute 8: Closed - withdrawn by user
    {
      id: 'disp-0008-0000-0000-000000000008',
      bookingId: 'ba000000-0000-0000-0000-000000000008',
      travelerId: 'a0000000-0000-0000-0000-000000000006',
      agentId: benchAgentId,
      category: 'cancellation_policy' as DisputeCategory,
      state: 'closed_withdrawn' as DisputeState,
      title: 'Unexpected baggage charges',
      description: 'I was charged for excess baggage that I thought was included. After reviewing the itinerary terms, I realize this was clearly stated. Withdrawing my dispute.',
      isSubjectiveComplaint: false,
      bookingAmount: 7800000,
      currency: 'INR',
      createdAt: new Date(now.getTime() - 8 * oneDay),
      updatedAt: new Date(now.getTime() - 6 * oneDay),
      agentResponseDeadline: new Date(now.getTime() - 6 * oneDay),
      adminAssignedId: null,
      adminAssignedAt: null,
      resolution: null,
      metadata: {
        bookingStartDate: new Date(now.getTime() - 22 * oneDay),
        bookingEndDate: new Date(now.getTime() - 15 * oneDay),
        destination: 'Goa, India',
        originalItineraryId: 'e0000000-0000-0000-0000-000000000008',
        chatThreadId: 'c0000008-0000-0000-0000-000000000001',
        disputeOpenedWithinWindow: true,
      },
    },
  ];

  return disputes;
}

/**
 * Seed the dispute store for development.
 */
export function seedDisputeStore(store: Map<string, Dispute>): void {
  const disputes = generateSeedDisputes();
  
  for (const dispute of disputes) {
    store.set(dispute.id, dispute);
  }

  logger.info({
    msg: 'Dispute store seeded with sample data',
    count: disputes.length,
  });
}
