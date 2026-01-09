'use client';

/**
 * Agent Proposals List Component
 * 
 * Displays multiple agent proposals with reputation-only cards.
 * Enforces pre-payment privacy rules.
 */

import * as React from 'react';
import { AgentOptionCard, AgentOptionCardSkeleton, type AgentPublicProfile } from './AgentOptionCard';

interface Proposal {
  id: string;
  agentId: string;
  agentProfile: AgentPublicProfile;
  price: number;
  currency: string;
  submittedAt: string;
}

interface AgentProposalsListProps {
  proposals: Proposal[];
  onSelectProposal: (proposalId: string, agentId: string) => void;
  selectedProposalId?: string;
  isLoading?: boolean;
}

export function AgentProposalsList({
  proposals,
  onSelectProposal,
  selectedProposalId,
  isLoading = false,
}: AgentProposalsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Agent Proposals</h2>
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <AgentOptionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-muted/30 rounded-lg">
        <h3 className="text-lg font-medium mb-2">No proposals yet</h3>
        <p className="text-muted-foreground">
          Matched agents are reviewing your request. You'll see proposals here soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {proposals.length} Agent Proposal{proposals.length !== 1 ? 's' : ''}
        </h2>
        <p className="text-sm text-muted-foreground">
          Compare options based on reputation & price
        </p>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Your privacy matters.</strong> Agent identities are protected until you confirm 
          payment. Compare proposals based on verified reputation metrics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {proposals.map((proposal) => (
          <AgentOptionCard
            key={proposal.id}
            agent={proposal.agentProfile}
            proposalPrice={proposal.price}
            currency={proposal.currency}
            onSelect={() => onSelectProposal(proposal.id, proposal.agentId)}
            isSelected={selectedProposalId === proposal.id}
          />
        ))}
      </div>

      {/* Trust Explanation */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-medium mb-2">How reputation works</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Ratings come only from completed bookings on our platform</li>
          <li>• Badges are automatically earned and verified by our system</li>
          <li>• Platform Protection means your booking is fully covered</li>
          <li>• Agent details are revealed only after secure payment</li>
        </ul>
      </div>
    </div>
  );
}

export default AgentProposalsList;
