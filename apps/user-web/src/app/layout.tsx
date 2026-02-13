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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg">
          Skip to content
        </a>
        <ConsoleSilencer />
        <TestSiteBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
