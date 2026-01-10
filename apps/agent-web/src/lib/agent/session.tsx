'use client';

import * as React from 'react';
import { demoAgents, type DemoAgent } from './demo-agents';
import { getStoredUser, type AuthUser } from '@/lib/api/auth';

const STORAGE_KEY = 'howweplan.agent.selectedAgentId';

export type AgentSession = DemoAgent;

type AgentSessionContextValue = {
  agent: AgentSession;
  setAgentById: (agentId: string) => void;
  agents: readonly DemoAgent[];
  authUser: AuthUser | null;
};

const AgentSessionContext = React.createContext<AgentSessionContextValue | null>(null);

/**
 * Creates an AgentSession from authenticated user data.
 * Falls back to demo agents if no auth user or for demo mode.
 */
function createAgentFromAuthUser(authUser: AuthUser | null): DemoAgent | null {
  if (!authUser || authUser.role !== 'AGENT') return null;
  
  return {
    // For now, use the user ID as both agentId and userId
    // In production, we'd fetch the actual agent profile from the backend
    agentId: authUser.id,
    userId: authUser.id,
    email: authUser.email,
    firstName: authUser.firstName,
    lastName: authUser.lastName,
  };
}

export function AgentSessionProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = React.useState<AuthUser | null>(null);
  const [agentId, setAgentId] = React.useState<string>(() => {
    if (typeof window === 'undefined') return demoAgents[0]!.agentId;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // Guard against 'undefined' string
      if (!stored || stored === 'undefined') return demoAgents[0]!.agentId;
      return stored;
    } catch {
      return demoAgents[0]!.agentId;
    }
  });

  // Load auth user on mount
  React.useEffect(() => {
    try {
      const user = getStoredUser();
      if (user) {
        setAuthUser(user);
      }
    } catch {
      // Ignore errors from corrupted localStorage
    }
  }, []);

  // Build agents list: real user + demo agents for development
  const agents = React.useMemo(() => {
    const authAgent = createAgentFromAuthUser(authUser);
    if (authAgent) {
      // Check if auth agent is different from demo agents
      const isDemoAgent = demoAgents.some(d => d.email === authAgent.email);
      if (!isDemoAgent) {
        return [authAgent, ...demoAgents] as const;
      }
    }
    return demoAgents as readonly DemoAgent[];
  }, [authUser]);

  const agent = React.useMemo(() => {
    // First try to find by stored agentId
    const found = agents.find((a) => a.agentId === agentId);
    if (found) return found;
    
    // If we have an auth user, default to them
    const authAgent = createAgentFromAuthUser(authUser);
    if (authAgent) return authAgent;
    
    // Otherwise fallback to first demo agent
    return demoAgents[0]!;
  }, [agentId, agents, authUser]);

  // Auto-select auth user's agent on login
  React.useEffect(() => {
    if (authUser) {
      const authAgent = createAgentFromAuthUser(authUser);
      if (authAgent && authAgent.agentId !== agentId) {
        setAgentId(authAgent.agentId);
        try {
          window.localStorage.setItem(STORAGE_KEY, authAgent.agentId);
        } catch {
          // ignore
        }
      }
    }
  }, [authUser, agentId]);

  const setAgentById = React.useCallback((nextAgentId: string) => {
    setAgentId(nextAgentId);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextAgentId);
    } catch {
      // ignore
    }
  }, []);

  const value = React.useMemo<AgentSessionContextValue>(() => {
    return {
      agent,
      setAgentById,
      agents,
      authUser,
    };
  }, [agent, setAgentById, agents, authUser]);

  return <AgentSessionContext.Provider value={value}>{children}</AgentSessionContext.Provider>;
}

export function useAgentSession(): AgentSessionContextValue {
  const ctx = React.useContext(AgentSessionContext);
  if (!ctx) {
    throw new Error('useAgentSession must be used within AgentSessionProvider');
  }
  return ctx;
}
