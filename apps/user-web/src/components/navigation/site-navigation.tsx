'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useUserSession } from '@/lib/user/session';

export function SiteNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUserSession();
  const isAuthenticated = !!user && !loading;

  const logoHref = isAuthenticated ? '/dashboard' : '/';

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Logo href={logoHref} showWordmark size="md" />
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/requests/new">
                <Button>Plan Trip</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/how-it-works">
                <Button variant="ghost" className="hidden sm:inline-flex">How It Works</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/requests/new">
                <Button>Start Planning</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
