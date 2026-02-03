import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { TestSiteBanner } from '@/components/ui/test-site-banner';
import { ConsoleSilencer } from '@/components/console-silencer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HowWePlan - Plan Your Perfect Trip',
  description: 'Connect with expert travel agents to plan your dream vacation',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ConsoleSilencer />
        <TestSiteBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
