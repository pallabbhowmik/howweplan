import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
