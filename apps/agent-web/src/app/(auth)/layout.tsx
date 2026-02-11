import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | HowWePlan Agent',
    default: 'Sign In | HowWePlan Agent',
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
