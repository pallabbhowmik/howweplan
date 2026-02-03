import type { Metadata } from 'next';
import './globals.css';
import { TestSiteBanner } from '@/components/ui/test-site-banner';
import { ConsoleSilencer } from '@/components/console-silencer';

export const metadata: Metadata = {
  title: 'HowWePlan Agent Portal',
  description: 'Travel agent interface for managing requests, itineraries, and bookings',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConsoleSilencer />
        <TestSiteBanner />
        {children}
      </body>
    </html>
  );
}
