import DashboardLayout from '@/components/layout/DashboardLayout';
import { AgentSessionProvider } from '@/lib/agent/session';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AgentSessionProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AgentSessionProvider>
  );
}
