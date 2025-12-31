'use client';

import * as React from 'react';
import { demoAgents, type DemoAgent } from './demo-agents';

const STORAGE_KEY = 'howweplan.agent.selectedAgentId';

export type AgentSession = DemoAgent;

type AgentSessionContextValue = {
  agent: AgentSession;
  setAgentById: (agentId: string) => void;
  agents: readonly DemoAgent[];
};

const AgentSessionContext = React.createContext<AgentSessionContextValue | null>(null);

export function AgentSessionProvider({ children }: { children: React.ReactNode }) {
  const [agentId, setAgentId] = React.useState<string>(() => {
    if (typeof window === 'undefined') return demoAgents[0]!.agentId;
    return window.localStorage.getItem(STORAGE_KEY) ?? demoAgents[0]!.agentId;
  });

  const agent = React.useMemo(() => {
    return demoAgents.find((a) => a.agentId === agentId) ?? demoAgents[0]!;
  }, [agentId]);

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
      agents: demoAgents,
    };
  }, [agent, setAgentById]);

  return <AgentSessionContext.Provider value={value}>{children}</AgentSessionContext.Provider>;
}

export function useAgentSession(): AgentSessionContextValue {
  const ctx = React.useContext(AgentSessionContext);
  if (!ctx) {
    throw new Error('useAgentSession must be used within AgentSessionProvider');
  }
  return ctx;
}
