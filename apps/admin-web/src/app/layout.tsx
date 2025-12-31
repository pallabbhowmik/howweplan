import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { TestSiteBanner } from '@/components/ui/test-site-banner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HowWePlan Admin',
  description: 'Admin dashboard for HowWePlan',
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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TestSiteBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
