'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserSession } from '@/lib/user/session';

export function SiteNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUserSession();
  const isAuthenticated = !!user && !loading;

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <a href="/" onClick={handleLogoClick} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">HowWePlan</span>
        </a>
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
