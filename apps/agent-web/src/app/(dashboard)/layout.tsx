import type { Metadata } from 'next';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AgentSessionProvider } from '@/lib/agent/session';

export const metadata: Metadata = {
  title: {
    template: '%s | HowWePlan Agent',
    default: 'Dashboard | HowWePlan Agent',
  },
  description: 'Manage your travel agent business on HowWePlan',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AgentSessionProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AgentSessionProvider>
  );
}
